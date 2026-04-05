import { getAuthToken } from './localAuth'
import { sanitizeLocation } from './sanitize'
import { getCurrencyFromCountry, getCurrencySymbol } from './currency'
import { runAVM, applyBoundedAIAdjustment, formatAVMForPrompt } from './avm'
import { formatMarketDataForPrompt, getMarketData, getLiveMarketData } from './marketPrices'
import { formatAreaContextForPrompt } from './areaAnalysis'

const CEREBRAS_BASE = '/api/cerebras'
const MODEL = 'llama-3.1-8b'

// getAuthToken imported from localAuth

async function cerebrasChat(messages, json = false, skipCount = false, userApiKey = '') {
  const token = await getAuthToken()
  if (!token) throw new Error('Not authenticated. Please sign in again.')

  const res = await fetch(CEREBRAS_BASE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...(skipCount && { 'X-Skip-Count': 'true' }),
      ...(userApiKey && { 'X-Cerebras-Key': userApiKey }),
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      temperature: 0.15,
      max_tokens: 4096,
      ...(json && { response_format: { type: 'json_object' } }),
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    if (res.status === 401) {
      throw new Error('Session expired. Please sign in again.')
    }
    if (res.status === 400 && err.error === 'no_key') {
      throw new Error('no_key')
    }
    if (res.status === 429) throw new Error('limit reached')
    throw new Error(err.message ?? err.error?.message ?? `Cerebras error ${res.status}`)
  }

  const data = await res.json()
  return data.choices[0].message.content
}

// Build city-specific market context to inject into prompts
function buildMarketContext(city, country, currency, realData) {
  const isCanada = country.toLowerCase().includes('canada')
  const isUK = country.toLowerCase().includes('united kingdom') || country.toLowerCase().includes('england')
  const isAustralia = country.toLowerCase().includes('australia')

  let macroContext = ''

  if (isCanada) {
    macroContext = `
CANADIAN MARKET CONTEXT (2025):
- Bank of Canada policy rate: 2.75% (as of early 2025, down from peak of 5% in 2023)
- Canadian housing market peaked in early 2022, corrected 15-20% by mid-2023, partially recovered in late 2023-2024
- Ottawa specifically: more stable than Toronto/Vancouver, government employment base provides price floor
- National average home price ~$700,000 CAD (2025), Ottawa average detached home ~$750,000-$900,000 CAD, condos ~$400,000-$550,000 CAD
- Mortgage stress test at ~4.75% effective qualifying rate
- Foreign buyer ban extended through 2026 — limits demand from investors
- Capital gains tax changes in 2024 reduced investor appetite
- Supply shortage persists — Ottawa new construction behind demand by ~5,000 units/year
- Population growth via immigration continues to support long-term demand
- 2026-2027 outlook: moderate appreciation 2-4% annually expected as rates stabilize`
  } else if (isUK) {
    macroContext = `
UK MARKET CONTEXT (2025):
- Bank of England base rate: ~4.5% (cutting cycle underway from 5.25% peak)
- UK house prices fell ~5% from peak in 2022-2023, partially recovered 2024
- Stamp duty changes in April 2025 reduced first-time buyer relief — impacted demand at lower price points
- London and South East remain premium but unaffordable; regional cities outperforming
- Rental demand extremely strong — landlord exodus from buy-to-let due to tax changes pushing rents up
- 2026-2027 outlook: steady 2-3% annual appreciation as affordability improves with rate cuts`
  } else if (isAustralia) {
    macroContext = `
AUSTRALIAN MARKET CONTEXT (2025):
- RBA cash rate: ~4.1% (cutting from 4.35% peak)
- Australian housing recovered strongly in 2023-2024 after a brief correction
- Sydney and Melbourne remain global-tier expensive; regional cities still seeing migration-driven growth
- Record immigration continues to drive rental demand and price support
- Supply shortfall of ~100,000 dwellings nationally
- 2026-2027 outlook: 3-5% annual appreciation in major metros, driven by supply shortage`
  } else {
    macroContext = `
US MARKET CONTEXT (2025):
- Federal Reserve funds rate: ~4.25-4.5% (cutting cycle underway from 5.25-5.5% peak)
- US housing prices broadly flat to +2% in 2024 after 2022 correction
- Mortgage rates ~6.5-7% (30yr fixed) — affordability constrained
- Sun Belt markets (Austin, Phoenix, Tampa) saw biggest corrections from 2022 peaks
- Northeast and Midwest markets more resilient — less speculative run-up
- Supply remains tight nationwide — existing home inventory ~30% below 2019 levels
- New construction picking up but concentrated in multifamily
- 2026-2027 outlook: 2-4% annual appreciation as rates ease and supply remains constrained`
  }

  const censusSnippet = realData.censusData?.medianHomeValueUSD
    ? `\nLocal census median home value: ${currency} ${Math.round(realData.censusData.medianHomeValueUSD * (isCanada ? 1.35 : 1)).toLocaleString()}`
    : ''
  const rentSnippet = realData.fmr?.twoBed
    ? `\nHUD Fair Market Rent (2BR): ${currency} ${realData.fmr.twoBed}/month`
    : ''

  return macroContext + censusSnippet + rentSnippet
}


// Format real comparable properties for AI context
function buildCompsContext(realData, currency, subject) {
  const comps = realData.comps?.comps
  const priceIndex = realData.priceIndex
  const lines = []

  // Run the AVM engine if we have comps
  let avmResult = null
  if (comps?.length) {
    avmResult = runAVM(comps, subject || {}, priceIndex, realData.censusData)
    realData._avmResult = avmResult // store for use in finalizeAnalysis
    lines.push(formatAVMForPrompt(avmResult, currency))
  }

  // Add price index context
  const multipliers = priceIndex?.multipliers || priceIndex?.nhpi?.multipliers
  if (multipliers) {
    const src = priceIndex.source || priceIndex.nhpi?.source || 'price index'
    lines.push(`\nPRICE INDEX (${src}) — use for historical data calibration:`)
    const m = multipliers
    const years = Object.keys(m).sort()
    lines.push(`Year multipliers (relative to 2025=1.0): ${years.map(y => `${y}: ${m[y]}`).join(', ')}`)
  }

  if (priceIndex?.assessment?.avgAssessment) {
    lines.push(`\nMunicipal assessment — nearby avg: ${currency} ${priceIndex.assessment.avgAssessment.toLocaleString()} (market value typically 5-15% above assessed)`)
  }

  if (priceIndex?.nhpi?.marketNote) {
    lines.push(`\nStatistics Canada NHPI: ${priceIndex.nhpi.marketNote}`)
  }

  return lines.join('\n')
}


function buildRiskContext(realData) {
  const risk = realData.riskData
  if (!risk) return ''

  const lines = ['\nENVIRONMENTAL RISK DATA (FEMA/EPA/USGS):']

  if (risk.nationalRiskIndex) {
    const nri = risk.nationalRiskIndex
    lines.push(`Overall community risk rating: ${nri.overallRiskRating}`)
    if (nri.topRisks?.length) {
      lines.push(`Top natural hazards: ${nri.topRisks.map(h => `${h.name} (${h.rating})`).join(', ')}`)
    }
    if (nri.expectedAnnualLossRating) {
      lines.push(`Expected annual loss rating: ${nri.expectedAnnualLossRating}`)
    }
  }

  if (risk.seismicRisk) {
    const s = risk.seismicRisk
    lines.push(`Seismic risk: ${s.seismicRating}${s.isHighSeismicRisk ? ' — MENTION in investment analysis' : ''}`)
  }

  if (risk.epaHazards) {
    const e = risk.epaHazards
    if (e.hasSignificantConcerns) lines.push(`EPA environmental concerns detected — mention in neighborhood analysis`)
    if (e.airQualityPM25Percentile != null) lines.push(`Air quality PM2.5 percentile: ${e.airQualityPM25Percentile}th`)
    if (e.superfundSitesNearby > 0) lines.push(`Superfund/toxic sites within 1.5 miles: ${e.superfundSitesNearby}`)
  }

  if (lines.length > 1) lines.push('Incorporate relevant risk factors into investment analysis and neighborhood assessment.')
  return lines.length > 1 ? lines.join('\n') : ''
}

function finalizeAnalysis(est, known, realData, currency, currencySymbol, city, country) {
  // Use market database as a sanity check on the AI estimate
  const marketDb = getMarketData(city, country)
  if (marketDb && !known.purchasePrice && !realData._avmResult?.estimatedValue) {
    const aiVal = est.propertyEstimate.estimatedValueUSD
    const dbDetached = marketDb.detached
    const dbCondo = marketDb.condo
    // If AI estimate is more than 30% below the market median, pull it up
    if (aiVal && dbDetached && aiVal < dbDetached * 0.7) {
      est.propertyEstimate.estimatedValueUSD = Math.round(dbDetached * 0.85) // conservative
      est.propertyEstimate.confidenceLevel = 'medium'
    }
    // If AI estimate is more than 50% above market median, pull it down
    if (aiVal && dbDetached && aiVal > dbDetached * 1.5) {
      est.propertyEstimate.estimatedValueUSD = Math.round(dbDetached * 1.1)
      est.propertyEstimate.confidenceLevel = 'medium'
    }
  }

  // Apply bounded AI adjustment if AVM result exists
  const avmResult = realData._avmResult
  if (avmResult && avmResult.estimatedValue && !known.purchasePrice) {
    const aiValue = est.propertyEstimate.estimatedValueUSD
    const bounded = applyBoundedAIAdjustment(avmResult.estimatedValue, aiValue, avmResult.confidenceLevel)
    est.propertyEstimate.estimatedValueUSD = bounded
    // Override confidence level with real AVM confidence
    est.propertyEstimate.confidenceLevel = avmResult.confidenceLevel
    est.propertyEstimate.confidenceScore = avmResult.confidenceScore
    est.propertyEstimate.avmValue = avmResult.estimatedValue
    est.propertyEstimate.priceRange = avmResult.priceRange
    est.propertyEstimate.compsUsed = avmResult.compsUsed
    est.propertyEstimate.avmMethodology = avmResult.methodology
  }

  // Floor plan logic removed for area-only mode

  // If purchase price is known, use appreciation model anchored to it
  if (known.purchasePrice && known.purchasePrice > 0) {
    const purchaseYear = known.yearPurchased || 2020
    const yearsHeld = Math.max(0, 2025 - purchaseYear)

    const isCanada = country.toLowerCase().includes('canada')
    const isUK = country.toLowerCase().includes('united kingdom')

    // City-specific appreciation rates based on real market knowledge
    let annualRate = 0.04 // default 4%
    const cityLower = city.toLowerCase()
    if (isCanada) {
      if (cityLower.includes('toronto') || cityLower.includes('vancouver')) annualRate = 0.045
      else if (cityLower.includes('ottawa')) annualRate = 0.038
      else if (cityLower.includes('calgary')) annualRate = 0.05
      else annualRate = 0.038
    } else if (isUK) {
      if (cityLower.includes('london')) annualRate = 0.035
      else annualRate = 0.03
    } else {
      if (cityLower.includes('austin') || cityLower.includes('nashville')) annualRate = 0.05
      else if (cityLower.includes('new york') || cityLower.includes('san francisco') || cityLower.includes('los angeles')) annualRate = 0.03
      else annualRate = 0.04
    }

    // Account for the 2022 peak and 2023 correction in the appreciation model
    let cumulativeMultiplier = 1.0
    for (let yr = purchaseYear; yr < 2025; yr++) {
      if (yr === 2021) cumulativeMultiplier *= 1.12 // COVID boom
      else if (yr === 2022) cumulativeMultiplier *= (isCanada ? 0.92 : 0.96) // correction
      else if (yr === 2023) cumulativeMultiplier *= (isCanada ? 0.97 : 0.99) // stabilization
      else if (yr === 2024) cumulativeMultiplier *= 1.03 // recovery
      else cumulativeMultiplier *= (1 + annualRate)
    }

    est.propertyEstimate.estimatedValueUSD = Math.round(known.purchasePrice * cumulativeMultiplier)
    est.propertyEstimate.confidenceLevel = 'high'
  }

  const val = est.propertyEstimate.estimatedValueUSD
  const sqft = est.floorPlan.typicalSqft

  // Recalculate price per sqft from final value
  if (sqft != null && sqft > 0 && val != null && val > 0) {
    est.propertyEstimate.pricePerSqftUSD = Math.round(val / sqft)
  }

  // Sanity check rent — must be between 2.5% and 7% annual yield
  const annualRent = (est.propertyEstimate.rentEstimateMonthlyUSD || 0) * 12
  const yieldPct = val != null && val > 0 ? (annualRent / val) * 100 : 0
  if (yieldPct < 2.5 || yieldPct > 7) {
    est.propertyEstimate.rentEstimateMonthlyUSD = val != null && val > 0 ? Math.round((val * 0.04) / 12) : null
  }

  // Lock neighborhood scores to real Overpass data
  if (realData.neighborhoodScores) {
    est.neighborhood.walkScore = realData.neighborhoodScores.walkScore
    est.neighborhood.transitScore = realData.neighborhoodScores.transitScore
    est.neighborhood.schoolRating = realData.neighborhoodScores.schoolScore
  }

  // Build a city-aware price history using the final estimated value as anchor
  if (val != null && val > 0) {
    const isCanada = country.toLowerCase().includes('canada')
    const isUK = country.toLowerCase().includes('united kingdom')
    const cityLower = city.toLowerCase()

    // City-specific historical multipliers (relative to 2025 = 1.0)
    // These reflect actual market cycles for major cities
    let multipliers

    if (isCanada && (cityLower.includes('toronto') || cityLower.includes('vancouver'))) {
      // Big Canadian cities: huge COVID boom, sharp correction, slow recovery
      multipliers = { 2019: 0.68, 2020: 0.72, 2021: 0.88, 2022: 0.98, 2023: 0.87, 2024: 0.94, 2025: 1.0, 2026: 1.03, 2027: 1.06 }
    } else if (isCanada && cityLower.includes('ottawa')) {
      // Ottawa: more stable, less volatile
      multipliers = { 2019: 0.72, 2020: 0.78, 2021: 0.90, 2022: 0.97, 2023: 0.91, 2024: 0.96, 2025: 1.0, 2026: 1.03, 2027: 1.06 }
    } else if (isCanada && cityLower.includes('calgary')) {
      // Calgary: energy sector driven, different cycle
      multipliers = { 2019: 0.82, 2020: 0.80, 2021: 0.88, 2022: 0.98, 2023: 0.97, 2024: 1.01, 2025: 1.0, 2026: 1.04, 2027: 1.08 }
    } else if (isCanada) {
      // Generic Canada
      multipliers = { 2019: 0.72, 2020: 0.76, 2021: 0.89, 2022: 0.97, 2023: 0.90, 2024: 0.95, 2025: 1.0, 2026: 1.03, 2027: 1.06 }
    } else if (isUK && cityLower.includes('london')) {
      multipliers = { 2019: 0.90, 2020: 0.88, 2021: 0.94, 2022: 1.02, 2023: 0.95, 2024: 0.97, 2025: 1.0, 2026: 1.03, 2027: 1.06 }
    } else if (isUK) {
      multipliers = { 2019: 0.85, 2020: 0.85, 2021: 0.93, 2022: 1.03, 2023: 0.96, 2024: 0.98, 2025: 1.0, 2026: 1.03, 2027: 1.06 }
    } else if (cityLower.includes('austin') || cityLower.includes('phoenix') || cityLower.includes('tampa')) {
      // Sun Belt: huge boom, significant correction
      multipliers = { 2019: 0.58, 2020: 0.64, 2021: 0.82, 2022: 1.05, 2023: 0.93, 2024: 0.96, 2025: 1.0, 2026: 1.04, 2027: 1.07 }
    } else if (cityLower.includes('new york') || cityLower.includes('san francisco') || cityLower.includes('los angeles') || cityLower.includes('boston') || cityLower.includes('seattle')) {
      // Expensive coastal US: smaller swings
      multipliers = { 2019: 0.82, 2020: 0.83, 2021: 0.93, 2022: 1.02, 2023: 0.95, 2024: 0.98, 2025: 1.0, 2026: 1.03, 2027: 1.06 }
    } else if (cityLower.includes('miami') || cityLower.includes('fort lauderdale') || cityLower.includes('naples')) {
      // Florida: strong demand, less correction
      multipliers = { 2019: 0.62, 2020: 0.68, 2021: 0.84, 2022: 1.06, 2023: 1.01, 2024: 1.00, 2025: 1.0, 2026: 1.03, 2027: 1.06 }
    } else if (cityLower.includes('sydney') || cityLower.includes('melbourne') || cityLower.includes('brisbane')) {
      // Australia: strong recovery
      multipliers = { 2019: 0.82, 2020: 0.80, 2021: 0.92, 2022: 1.04, 2023: 0.94, 2024: 1.00, 2025: 1.0, 2026: 1.04, 2027: 1.08 }
    } else {
      // Generic US/international: moderate cycle
      multipliers = { 2019: 0.75, 2020: 0.78, 2021: 0.90, 2022: 1.02, 2023: 0.96, 2024: 0.98, 2025: 1.0, 2026: 1.03, 2027: 1.06 }
    }

    est.priceHistory = {
      currency,
      currencySymbol,
      marketNote: est.priceHistory?.marketNote || `${city} real estate experienced the broader pandemic-era boom and subsequent correction, with prices now stabilizing and modest growth expected.`,
      data: Object.entries(multipliers).map(([year, mult]) => ({
        year: parseInt(year),
        value: Math.round(val * mult),
        type: parseInt(year) >= 2025 ? 'projected' : 'historical',
      })),
    }
  }

  // Strip any placeholder text the AI might have returned
  const isPlaceholder = (s) => !s || /^(pro|con|feature|attraction)\s*\d*$/i.test(String(s).trim())
  if (est.neighborhood?.pros?.some(isPlaceholder)) est.neighborhood.pros = ['Established residential community', 'Good access to transit and amenities', 'Strong long-term appreciation history']
  if (est.neighborhood?.cons?.some(isPlaceholder)) est.neighborhood.cons = ['Car dependent for some errands', 'Limited walkable retail options']
  if (est.floorPlan?.commonFeatures?.some(isPlaceholder)) est.floorPlan.commonFeatures = ['Attached garage', 'Hardwood floors', 'Updated kitchen', 'Private backyard', 'Finished basement']
  if (est.localInsights?.topAttractions?.some(isPlaceholder)) est.localInsights.topAttractions = ['Local parks and green spaces', 'Community shopping centres', 'Nearby schools and recreation centres']

  return est
}

export async function analyzeProperty(geoData, weatherData, climateData, knownFacts = {}, realData = {}, userApiKey = '') {
  const street = sanitizeLocation(geoData.userStreet || geoData.address?.road || '')
  const city = sanitizeLocation(geoData.userCity || geoData.address?.city || geoData.address?.town || '')
  const state = sanitizeLocation(geoData.userState || geoData.address?.state || '')
  const country = sanitizeLocation(geoData.userCountry || geoData.address?.country || '')
  const neighbourhood = sanitizeLocation(geoData.address?.neighbourhood || geoData.address?.suburb || geoData.address?.quarter || '')
  const postcode = sanitizeLocation(geoData.address?.postcode || '')
  const county = sanitizeLocation(geoData.address?.county || '')

  const isCanada = country.toLowerCase().includes('canada')
  const isUK = country.toLowerCase().includes('united kingdom') || country.toLowerCase().includes('england')
  const currency = isCanada ? 'CAD' : isUK ? 'GBP' : 'USD'
  const currencySymbol = isUK ? '£' : '$'

  const marketContext = buildMarketContext(city, country, currency, realData)

  const knownLines = [
    knownFacts.sqft ? `Known floor area: ${knownFacts.sqft} sqft` : '',
    knownFacts.beds ? `Known bedrooms: ${knownFacts.beds}` : '',
    knownFacts.baths ? `Known bathrooms: ${knownFacts.baths}` : '',
    knownFacts.yearBuilt ? `Year built: ${knownFacts.yearBuilt}` : '',
    knownFacts.purchasePrice ? `Purchase price: ${currency} ${knownFacts.purchasePrice.toLocaleString()} (purchased ${knownFacts.yearPurchased || 'approx 2020'})` : '',
  ].filter(Boolean).join('\n')

  const osmnData = realData.neighborhoodScores ? `
OPENSTREETMAP REAL DATA:
- Schools within 2km: ${realData.neighborhoodScores.nearbySchools?.join(', ') || 'none mapped'}
- Parks within 2km: ${realData.neighborhoodScores.nearbyParks?.join(', ') || 'none mapped'}
- Transit stops: ${realData.neighborhoodScores.nearbyTransit?.join(', ') || 'none mapped'}
- Grocery stores: ${realData.neighborhoodScores.nearbyGrocery?.join(', ') || 'none mapped'}
- Total amenities within 1km: ${realData.neighborhoodScores.amenityCount500m || 0}` : ''

  const floodInfo = realData.floodZone
    ? `\nFEMA FLOOD ZONE: ${realData.floodZone.zone} — ${realData.floodZone.inSpecialFloodHazardArea ? 'HIGH RISK — mention this in analysis' : 'Low risk'}`
    : ''

  // Build subject profile for AVM
  const avmSubject = {
    lat: geoData.lat,
    lon: geoData.lon,
    beds: knownFacts.beds || null,
    baths: knownFacts.baths || null,
    sqft: knownFacts.sqft || null,
    propertyType: knownFacts.propertyType || null,
  }
  const compsContext = buildCompsContext(realData, currency, avmSubject)
  // Try live market data first, fall back to hardcoded
  let _liveMarket = null
  try { _liveMarket = await getLiveMarketData(city, country) } catch {}
  const marketContext2 = _liveMarket
    ? formatMarketDataForPrompt(city, country, currency, _liveMarket)
    : formatMarketDataForPrompt(city, country, currency)
  const riskContext = buildRiskContext(realData)
  const areaContext = realData.areaMetrics
    ? formatAreaContextForPrompt(realData.areaMetrics, realData.areaRiskScore, realData.marketTemperature, city, country)
    : ''
  const isAreaMode = realData.isAreaMode || false

  // ── AREA MODE: simplified prompt + schema ──────────────────────────────────
  if (isAreaMode) {
    const areaCot = `You are a senior real estate market analyst with deep knowledge of ${city}, ${country}.

AREA INTELLIGENCE REPORT FOR: ${city}${state ? ', ' + state : ''}, ${country}
${areaContext}
${marketContext2}
${riskContext}

Analyze this area across 6 dimensions:
1. MARKET CONDITIONS: What do the listing data signals mean? Is supply rising or falling? Who has negotiating power?
2. PRICE TRENDS: Where are prices now, where were they 2 years ago, where are they heading in 2026-2027?
3. INVESTMENT OUTLOOK: Gross rental yield, net yield, landlord vs tenant market, realistic horizon for positive return.
4. LIVEABILITY: Cost of living, commute, schools, walkability, safety, community character.
5. WHO SHOULD MOVE HERE: Families, young professionals, retirees, investors? Who does this area suit best?
6. RISKS & UPSIDES: 3 specific downside risks, 3 specific upside catalysts.

Be specific, honest, and evidence-based. End with: READY_FOR_JSON`

    const areaReasoning = await cerebrasChat([
      { role: 'system', content: `You are a licensed real estate analyst specializing in ${city}, ${country}. Provide precise, evidence-based area intelligence.` },
      { role: 'user', content: areaCot }
    ], false, false, userApiKey)

    const areaJsonPrompt = `Based on your analysis, produce a JSON area intelligence report. Return ONLY valid raw JSON, no markdown.

{
  "areaIntelligence": {
    "verdict": "<one of: Excellent, Good, Neutral, Caution, Avoid>",
    "verdictReason": "<2 sentences explaining the verdict>",
    "marketConditions": "<3 sentences: supply/demand dynamics, who has negotiating power, market velocity>",
    "priceTrend": "<3 sentences: current prices, recent history, 2026-2027 forecast with specific % range>",
    "investmentOutlook": "<3 sentences: gross yield, net yield, investment horizon>",
    "liveability": "<3 sentences: cost of living, community feel, who thrives here>",
    "bestFor": "<one sentence: who this area suits best>",
    "risks": ["<specific risk 1>", "<specific risk 2>", "<specific risk 3>"],
    "upsides": ["<specific upside 1>", "<specific upside 2>", "<specific upside 3>"]
  },
    "propertyEstimate": {
      "estimatedValueUSD": ${realData.areaMetrics?.medianPrice || 0},
      "pricePerSqftUSD": ${realData.areaMetrics?.medianPPSF || 0},
      "rentEstimateMonthlyUSD": ${realData.areaMetrics?.medianPrice ? Math.round(realData.areaMetrics.medianPrice * 0.004) : 0},
      "confidenceLevel": "medium",
      "priceContext": "<4 sentences about area pricing based on the aggregated data>"
    },
  "neighborhood": {
    "character": "<3 sentences about the area character>",
    "walkScore": ${realData.neighborhoodScores?.walkScore || 50},
    "transitScore": ${realData.neighborhoodScores?.transitScore || 40},
    "safetyScore": 75,
    "schoolScore": ${realData.neighborhoodScores?.schoolScore || 60},
    "pros": ["<pro 1>", "<pro 2>", "<pro 3>"],
    "cons": ["<con 1>", "<con 2>"],
    "bestFor": "<who this neighbourhood suits>"
  },
  "investment": {
    "rentYield": "<e.g. 4.5%>",
    "investmentScore": <integer 0-100>,
    "outlook": "<Positive|Neutral|Negative>",
    "investmentSummary": "<3 sentences: thesis, risks, return expectation>"
  },
  "costOfLiving": {
    "monthlyBudgetUSD": <integer monthly total>,
    "groceriesMonthlyUSD": <integer>,
    "transportMonthlyUSD": <integer>,
    "utilitiesMonthlyUSD": <integer>,
    "diningOutMonthlyUSD": <integer>,
    "indexVsUSAverage": <integer, % vs US average>,
    "summary": "<2 sentences about cost of living>"
  },
  "priceHistory": {
    "currency": "${currency}",
    "currencySymbol": "${currencySymbol}",
    "data": [
      {"year": 2019, "value": <integer>, "type": "historical"},
      {"year": 2020, "value": <integer>, "type": "historical"},
      {"year": 2021, "value": <integer>, "type": "historical"},
      {"year": 2022, "value": <integer>, "type": "historical"},
      {"year": 2023, "value": <integer>, "type": "historical"},
      {"year": 2024, "value": <integer>, "type": "historical"},
      {"year": 2025, "value": <integer>, "type": "historical"},
      {"year": 2026, "value": <integer>, "type": "projected"},
      {"year": 2027, "value": <integer>, "type": "projected"}
    ],
    "marketNote": "<3 sentences: boom, correction, current state>"
  },
  "localInsights": {
    "knownFor": "<2 sentences about what makes this area distinctive>",
    "localTip": "<one genuine insider tip>",
    "topAttractions": ["<attraction 1>", "<attraction 2>", "<attraction 3>"]
  }
}
`
    const areaRaw = await cerebrasChat([
      { role: 'system', content: `You are a licensed real estate analyst. Return only valid JSON.` },
      { role: 'user', content: areaCot },
      { role: 'assistant', content: areaReasoning },
      { role: 'user', content: areaJsonPrompt }
    ], true, true, userApiKey)

    if (!areaRaw || typeof areaRaw !== 'string') throw new Error('AI returned empty response. Please try again.')
    let areaResult
    try {
      areaResult = JSON.parse(areaRaw.replace(/```json|```/g, '').trim())
    } catch {
      throw new Error('AI response could not be parsed. Please try again.')
    }
    if (!areaResult?.propertyEstimate) throw new Error('AI response was incomplete. Please try again.')

    // Normalize numbers
    const toNum = (v) => {
      if (typeof v === 'number') return isNaN(v) ? 0 : Math.round(v)
      if (!v) return 0
      const s = String(v).replace(/[^0-9.]/g, '')
      const n = parseFloat(s)
      return isNaN(n) ? 0 : Math.round(n)
    }
    const p = areaResult.propertyEstimate
    p.estimatedValueUSD = toNum(p.estimatedValueUSD)
    p.pricePerSqftUSD = toNum(p.pricePerSqftUSD)
    p.rentEstimateMonthlyUSD = toNum(p.rentEstimateMonthlyUSD)
    const c = areaResult.costOfLiving || {}
    c.monthlyBudgetUSD = toNum(c.monthlyBudgetUSD)
    c.groceriesMonthlyUSD = toNum(c.groceriesMonthlyUSD)
    c.transportMonthlyUSD = toNum(c.transportMonthlyUSD)
    c.utilitiesMonthlyUSD = toNum(c.utilitiesMonthlyUSD)
    c.diningOutMonthlyUSD = toNum(c.diningOutMonthlyUSD)

    // Fix investment fields
    const inv = areaResult.investment || {}
    // If yield is 0 or missing, provide a realistic 4% default for the UI
    inv.rentYieldPercent = toNum(inv.rentYieldPercent) || 4
    inv.investmentScore = toNum(inv.investmentScore) || 50
    areaResult.investment = inv

    // Fix neighborhood fields
    const n = areaResult.neighborhood || {}
    n.safetyRating = toNum(n.safetyRating) || 50
    // Preserve the character field for reports
    if (areaResult.neighborhood?.character) n.character = areaResult.neighborhood.character
    areaResult.neighborhood = n

    // Preserve narrative fields for exports
    if (areaResult.reportNarrative) areaResult.reportNarrative = areaResult.reportNarrative
    if (areaResult.investment?.investmentSummary) areaResult.investmentSummary = areaResult.investment.investmentSummary
    if (areaResult.costOfLiving?.summary) areaResult.costOfLivingSummary = areaResult.costOfLiving.summary

    areaResult.priceHistory = areaResult.priceHistory || {}
    areaResult.priceHistory.currencySymbol = currencySymbol
    areaResult.priceHistory.currency = currency

    return areaResult
  }
  // ── END AREA MODE ────────────────────────────────────────────────────────────

  // Pass 1: Deep chain-of-thought reasoning
  const cotPrompt = `You are a senior real estate appraiser and certified market analyst with 20+ years of experience appraising residential properties in ${city}, ${country}. You have deep knowledge of local neighbourhoods, micro-market dynamics, and regional economic drivers.

SUBJECT PROPERTY:
Address: ${street}${neighbourhood ? ', ' + neighbourhood : ''}, ${city}${state ? ', ' + state : ''}, ${country} ${postcode}
${county ? 'County/District: ' + county : ''}
GPS: ${geoData.lat}, ${geoData.lon}

CONFIRMED PROPERTY FACTS:
${knownLines || 'No confirmed facts provided — estimate based on location and neighbourhood type.'}
${osmnData}
${floodInfo}
${compsContext}
${marketContext2}
${areaContext}
${riskContext}
${marketContext}

You must reason through this property carefully and systematically. Think like a licensed appraiser doing a full market analysis. Work through every step below:

STEP 1 — NEIGHBOURHOOD TIER AND MICRO-MARKET ANALYSIS
Classify ${neighbourhood || city} precisely within the ${city} market:
- Is this neighbourhood luxury, premium, standard, or affordable relative to ${city} overall?
- What is the price premium or discount vs the ${city} median — and why?
- What type of buyers purchase here? What are their profiles (families, professionals, investors, retirees)?
- How does ${neighbourhood || city} compare to 3 neighbouring districts in terms of desirability and price?
- What specific factors drive value here — schools, transit, greenspace, proximity to employment centres, heritage status?
- Has the neighbourhood been gentrifying, stable, or declining over the past 5 years?

STEP 2 — PROPERTY PROFILE AND COMPARABLE SELECTION
Describe the typical residential stock at this specific address:
- What is the dominant property type: detached, semi-detached, townhouse, condo, or mixed?
- What decade were most homes on this street built and what does that mean for typical size, layout, and condition?
- What is the typical lot size and how does that affect value?
- Name 2-3 specific comparable sales on nearby streets that would anchor a valuation for this property. What were the approximate prices and when?
- What renovations or features typically differentiate higher-value vs lower-value homes on this street?

STEP 3 — ${isAreaMode ? 'AREA MARKET ANALYSIS' : 'CURRENT VALUATION — SHOW YOUR MATH'}
${isAreaMode ? 'Instead of valuing a single property, analyze the AREA MARKET DATA above. Assess whether this is a good time to buy, what is driving current prices, who should consider moving here, and what the risks and upsides are.' : ''}
CRITICAL PRICE ANCHORS FOR CANADA (do not go below these without strong justification):
- Ottawa detached homes: $650,000-$1,100,000 CAD depending on neighbourhood
- Ottawa semi-detached: $550,000-$800,000 CAD
- Ottawa condos: $350,000-$600,000 CAD
- Toronto detached: $1,000,000-$2,500,000 CAD
- Vancouver detached: $1,500,000-$3,500,000 CAD
- Calgary detached: $500,000-$900,000 CAD
Using the sales comparison approach:
- What is the current price per square foot (in ${currency}) for this specific neighbourhood?
- What is the typical home size for this address?
- Calculate: sqft × price per sqft = estimated value
- Cross-check: does this align with any census median, recent comparable sales, or known market data provided?
- What is the realistic range (low, mid, high) for this property? What would justify the high vs low end?
- State your final point estimate with confidence level (low / medium / high) and reasoning.

STEP 4 — PRICE HISTORY RECONSTRUCTION (2019-2025)
Reconstruct the actual price trajectory for this specific neighbourhood in ${city}:
- 2019: Pre-pandemic baseline value. What was this neighbourhood trading at?
- 2020: Impact of early COVID — did prices dip or hold? By how much in ${city}?
- 2021: The boom. How much did ${city} specifically appreciate? What drove it locally?
- 2022: The peak and the turn. When exactly did ${city} peak? How much did it fall from peak?
- 2023: The correction bottom. What was the trough? How did ${neighbourhood || city} hold vs broader ${city}?
- 2024: Recovery. Did ${city} recover? By how much? Where does it stand vs the 2022 peak?
- 2025: Current. What is the market doing right now? Any catalysts — rate cuts, policy changes, supply issues?

STEP 5 — FORWARD PROJECTIONS (2026-2027)
Make a specific, evidence-based forecast:
- What is the most likely appreciation rate for ${city} in 2026? (Range: -2% to +8%)
- What is the most likely appreciation rate for ${city} in 2027?
- What are the 3 biggest upside risks (factors that could push prices higher)?
- What are the 3 biggest downside risks (factors that could push prices lower)?
- Given these factors, what is the realistic projected value in 2026 and 2027?

STEP 6 — COST OF LIVING ANALYSIS
For a household living in ${city}:
- Monthly groceries (for a couple or family of 3-4)
- Monthly transport (car ownership costs OR transit pass + occasional rideshare)
- Monthly utilities (electricity, gas, internet, water)
- Monthly dining out (2-4 restaurant meals per week)
- Total monthly budget
- How does ${city} compare to the US national average in percentage terms? Be specific.

STEP 7 — INVESTMENT ANALYSIS
- What is the realistic gross rental yield for this property type in ${neighbourhood || city}?
- What is the realistic net yield after property tax, maintenance, and vacancy?
- Is ${city} currently a landlord's market or tenant's market?
- What is the realistic investment horizon for a positive return in ${city}?
- Rate this property as an investment out of 100 and explain why.

STEP 8 — LOCAL CHARACTER AND INSIGHTS
- Describe the actual feel of living in ${neighbourhood || city} — not marketing language, honest description
- What do long-term residents genuinely love about it?
- What are the real frustrations residents face?
- Name 3 specific nearby attractions, landmarks, or amenities that make this area desirable
- Give one genuine insider tip that only a local would know

End with: READY_FOR_JSON`

  const reasoning = await cerebrasChat([
    {
      role: 'system',
      content: `You are a licensed real estate appraiser and local market expert specializing in ${city}, ${country}. You provide precise, evidence-based analysis with specific numbers anchored to real market knowledge. You never use placeholder text, generic descriptions, or made-up comparable sales. You think systematically and show your reasoning before concluding.`
    },
    { role: 'user', content: cotPrompt }
  ], false, false, userApiKey)

  // Pass 2: Structured JSON output using the reasoning as context
  const jsonPrompt = `Based on your detailed analysis above, produce the final property intelligence report as a single JSON object. Every field must be substantive and specific to ${neighbourhood || city}, ${city}. No generic filler text.

FIELD REQUIREMENTS:
- reportNarrative: 5-6 high-quality sentences. This is for the EXPORTED REPORT. Provide a high-level executive summary of the area's current state, investment potential, and unique character. This must be professional and authoritative.
- estimatedValueUSD: Your precise point estimate in ${currency}. Integer only.
- priceContext: 4 sentences minimum. (1) What drives values specifically in ${neighbourhood || city}. (2) Specific comparable evidence or price range for this street/area. (3) How this property fits within that range. (4) Honest caveat about market conditions or uncertainty.
- neighborhood.character: 4 sentences. (1) Physical character and housing stock. (2) Demographic profile of residents. (3) What makes this neighbourhood distinct from nearby areas. (4) Current trajectory — improving, stable, or changing.
- investmentSummary: 4 sentences. (1) Core investment thesis. (2) Specific risks. (3) Who this suits as an investment. (4) Realistic return expectation.
- appreciationOutlookText: 3 sentences. (1) Current ${city} market momentum and why. (2) Key factors that will drive 2026-2027 prices. (3) Your honest forecast with a specific % range.
- costOfLiving summary: 3 sentences specific to ${city}. Compare to a nearby comparable city. Mention what specifically drives costs up or down.
- localInsights.knownFor: 2 vivid sentences — what makes ${neighbourhood || city} genuinely distinctive. Not a list.
- localInsights.localTip: A real insider tip. Something you would only know if you lived there.
- priceHistory.marketNote: 3 sentences explaining the actual price cycle in ${city} — the boom, the correction, and the current state.
- All monetary values must be in ${currency} (${currencySymbol})
- indexVsUSAverage: Integer. Percentage more or less expensive than US average. Examples: Ottawa +18, London UK +55, rural Mississippi -35, Manhattan +95, Calgary +12.
- Return ONLY valid raw JSON. No markdown, no backticks, no explanation text outside the JSON.

{
  "reportNarrative": "<5-6 professional sentences for the exported report>",
  "propertyEstimate": {
    "estimatedValueUSD": <integer in ${currency}>,
    "pricePerSqftUSD": <integer, ${currency} per sqft for this neighbourhood>,
    "rentEstimateMonthlyUSD": <integer, realistic monthly rent in ${currency}>,
    "confidenceLevel": "<low|medium|high>",
    "priceContext": "<4 sentences: drivers, comparables, fit, caveat>"
  },
  "costOfLiving": {
    "monthlyBudgetUSD": <integer, realistic total monthly spend in ${city}>,
    "groceriesMonthlyUSD": <integer, monthly groceries in ${city}>,
    "transportMonthlyUSD": <integer, monthly transport in ${city}>,
    "utilitiesMonthlyUSD": <integer, monthly utilities in ${city}>,
    "diningOutMonthlyUSD": <integer, monthly dining in ${city}>,
    "indexVsUSAverage": <integer % vs US average>,
    "summary": "<3 sentences: ${city} cost of living vs comparable cities, what drives costs>"
  },
  "neighborhood": {
    "character": "<4 sentences: housing stock, demographics, distinctiveness, trajectory>",
    "walkScore": <0-100, will be overridden by real data>,
    "transitScore": <0-100, will be overridden by real data>,
    "safetyRating": <0-100, based on your knowledge of ${neighbourhood || city}>,
    "schoolRating": <0-100, will be overridden by real data>,
    "pros": ["<specific pro for ${neighbourhood || city}>", "<specific pro>", "<specific pro>"],
    "cons": ["<specific con for ${neighbourhood || city}>", "<specific con>"],
    "bestFor": "<specific: who benefits most from living here and why>"
  },
  "investment": {
    "rentYieldPercent": <realistic gross yield % for ${neighbourhood || city}>,
    "appreciationOutlook": "<bullish|neutral|bearish>",
    "appreciationOutlookText": "<3 sentences: ${city} market momentum, key 2026-2027 drivers, specific % forecast>",
    "investmentScore": <0-100>,
    "investmentSummary": "<4 sentences: thesis, risks, who it suits, return expectation>"
  },
  "localInsights": {
    "topAttractions": ["<real specific nearby attraction>", "<real specific attraction>", "<real specific attraction>"],
    "knownFor": "<2 vivid sentences — what makes ${neighbourhood || city} genuinely distinctive>",
    "localTip": "<genuine insider tip only a ${neighbourhood || city} local would know>"
  },
  "priceHistory": {
    "currency": "${currency}",
    "currencySymbol": "${currencySymbol}",
    "marketNote": "<3 sentences on ${city} price cycle — the boom, correction, and current state>",
    "data": [
      {"year": 2019, "value": <integer>, "type": "historical"},
      {"year": 2020, "value": <integer>, "type": "historical"},
      {"year": 2021, "value": <integer>, "type": "historical"},
      {"year": 2022, "value": <integer>, "type": "historical"},
      {"year": 2023, "value": <integer>, "type": "historical"},
      {"year": 2024, "value": <integer>, "type": "historical"},
      {"year": 2025, "value": <integer>, "type": "historical"},
      {"year": 2026, "value": <integer>, "type": "projected"},
      {"year": 2027, "value": <integer>, "type": "projected"}
    ]
  }
}`

  const raw = await cerebrasChat([
    {
      role: 'system',
      content: `You are a licensed real estate appraiser and local market expert for ${city}, ${country}. You produce detailed, evidence-based property reports. Every field must contain substantive, specific content about ${neighbourhood || city} — no generic text. Return only valid JSON.`
    },
    { role: 'user', content: cotPrompt },
    { role: 'assistant', content: reasoning },
    { role: 'user', content: jsonPrompt }
  ], true, true, userApiKey)

  if (!raw || typeof raw !== 'string') throw new Error('AI returned an empty response. Please try again.')

  let result
  try {
    result = JSON.parse(raw.replace(/```json|```/g, '').trim())
  } catch {
    throw new Error('AI response could not be parsed. Please try again.')
  }
  if (!result?.propertyEstimate) throw new Error('AI response was incomplete. Please try again.')

  // Sanitize — model sometimes returns strings like "2,500,000" or "$1.2M" or "CAD 850,000"
  const toNum = (v) => {
    if (typeof v === 'number') return isNaN(v) ? null : Math.round(v)
    if (!v || v === '' || v === '—' || v === 'N/A') return null
    // Handle "1.2M" style
    const str = String(v).trim()
    if (/\d+\.?\d*[Mm]/.test(str)) {
      const n = parseFloat(str.replace(/[^0-9.]/g, '')) * 1000000
      return isNaN(n) || n === 0 ? null : Math.round(n)
    }
    if (/\d+\.?\d*[Kk]/.test(str)) {
      const n = parseFloat(str.replace(/[^0-9.]/g, '')) * 1000
      return isNaN(n) || n === 0 ? null : Math.round(n)
    }
    const s = str.replace(/[^0-9.]/g, '')
    if (!s) return null
    const n = parseFloat(s)
    return isNaN(n) || n === 0 ? null : Math.round(n)
  }

  const p = result.propertyEstimate
  const valKey = Object.keys(p).find(k => k.startsWith('estimatedValue')) || 'estimatedValueUSD'
  const ppsfKey = Object.keys(p).find(k => k.startsWith('pricePerSqft')) || 'pricePerSqftUSD'
  const rentKey = Object.keys(p).find(k => k.startsWith('rentEstimateMonthly')) || 'rentEstimateMonthlyUSD'
  p.estimatedValueUSD = toNum(p[valKey])
  p.pricePerSqftUSD = toNum(p[ppsfKey])
  p.rentEstimateMonthlyUSD = toNum(p[rentKey])

  const c = result.costOfLiving
  const budgetKey = Object.keys(c).find(k => k.startsWith('monthlyBudget')) || 'monthlyBudgetUSD'
  const groceriesKey = Object.keys(c).find(k => k.startsWith('groceriesMonthly')) || 'groceriesMonthlyUSD'
  const transportKey = Object.keys(c).find(k => k.startsWith('transportMonthly')) || 'transportMonthlyUSD'
  const utilitiesKey = Object.keys(c).find(k => k.startsWith('utilitiesMonthly')) || 'utilitiesMonthlyUSD'
  const diningKey = Object.keys(c).find(k => k.startsWith('diningOutMonthly')) || 'diningOutMonthlyUSD'
  c.monthlyBudgetUSD = toNum(c[budgetKey])
  c.groceriesMonthlyUSD = toNum(c[groceriesKey])
  c.transportMonthlyUSD = toNum(c[transportKey])
  c.utilitiesMonthlyUSD = toNum(c[utilitiesKey])
  c.diningOutMonthlyUSD = toNum(c[diningKey])
  c.indexVsUSAverage = toNum(c.indexVsUSAverage)

  result.floorPlan.typicalSqft = toNum(result.floorPlan.typicalSqft) ?? 1500

  // Sanitize price history values
  if (result.priceHistory?.data) {
    result.priceHistory.data = result.priceHistory.data.map(d => ({
      ...d,
      value: toNum(d.value),
    }))
  }

  return finalizeAnalysis(result, knownFacts, realData, currency, currencySymbol, city, country)
}

export function getAssessorLink(geo) {
  const country = (geo.userCountry || '').toLowerCase()
  const street = geo.userStreet || ''
  const city = geo.userCity || ''
  const state = geo.userState || ''

  if (country.includes('canada')) {
    const province = state.toLowerCase()
    if (province.includes('ontario')) return 'https://www.mpac.ca/en/CheckYourAssessment/AboutMyProperty'
    if (province.includes('british columbia')) return 'https://www.bcassessment.ca/Property/Search'
    if (province.includes('alberta')) return 'https://www.alberta.ca/assessment-services.aspx'
    return `https://www.google.com/search?q=${encodeURIComponent(street + ' ' + city + ' ' + state + ' property assessment')}`
  }
  if (country.includes('united kingdom')) return 'https://www.gov.uk/search-property-information-land-registry'
  return `https://www.google.com/search?q=${encodeURIComponent(street + ' ' + city + ' ' + state + ' county assessor property record')}`
}

export function getZillowLink(geo) {
  const parts = [geo.userStreet, geo.userCity, geo.userState].filter(Boolean).join(' ')
  return `https://www.zillow.com/homes/${encodeURIComponent(parts)}_rb/`
}

export function getFloorPlanSearchLink(geo) {
  const parts = [geo.userStreet, geo.userCity, geo.userState, geo.userCountry].filter(Boolean).join(' ')
  return `https://www.google.com/search?q=${encodeURIComponent(parts + ' floor plan')}&tbm=isch`
}
