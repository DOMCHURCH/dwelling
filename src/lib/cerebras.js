import { supabase } from './supabase'

const CEREBRAS_BASE = '/api/cerebras'
const MODEL = 'llama-3.1-8b'

async function getAuthToken() {
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.access_token) return session.access_token
  const { data: refreshed } = await supabase.auth.refreshSession()
  if (refreshed?.session?.access_token) return refreshed.session.access_token
  return null
}

async function cerebrasChat(messages, json = false) {
  const token = await getAuthToken()
  if (!token) throw new Error('Not authenticated. Please sign in again.')

  const res = await fetch(CEREBRAS_BASE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      temperature: 0.3,
      max_tokens: 8000,
      ...(json && { response_format: { type: 'json_object' } }),
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error?.message ?? `Cerebras error ${res.status}`)
  }

  const data = await res.json()
  return data.choices[0].message.content
}

function validateEstimate(est, known, realScores) {
  // Known facts override AI
  if (known.sqft) {
    const minBeds = Math.floor(known.sqft / 500)
    const maxBeds = Math.ceil(known.sqft / 150)
    if (est.floorPlan.typicalBedrooms < minBeds) est.floorPlan.typicalBedrooms = minBeds
    if (est.floorPlan.typicalBedrooms > maxBeds) est.floorPlan.typicalBedrooms = maxBeds
    est.floorPlan.typicalSqft = known.sqft
  }
  if (known.beds) est.floorPlan.typicalBedrooms = known.beds
  if (known.baths) est.floorPlan.typicalBathrooms = known.baths
  if (known.yearBuilt) est.floorPlan.builtEra = `${known.yearBuilt}s`.replace(/(\d{3})\ds/, '$10s')

  if (known.purchasePrice) {
    const aiVal = est.propertyEstimate.estimatedValueUSD
    const ratio = aiVal / known.purchasePrice
    if (ratio < 0.6 || ratio > 1.4) {
      est.propertyEstimate.estimatedValueUSD = Math.round(known.purchasePrice * 1.05)
      est.propertyEstimate.confidenceLevel = 'high'
      est.propertyEstimate.priceContext = `Based on the known purchase price of $${known.purchasePrice.toLocaleString()}, current market value is estimated with slight appreciation. ` + est.propertyEstimate.priceContext
    }
  }

  // Enforce price/history consistency — only when both values are non-zero
  if (est.priceHistory?.data?.length) {
    const lastHistorical = [...est.priceHistory.data]
      .filter(d => d.type === 'historical' && d.value > 0)
      .sort((a, b) => b.year - a.year)[0]
    if (lastHistorical) {
      if (est.propertyEstimate.estimatedValueUSD === 0) {
        // AI returned 0 for estimate but filled history — use last historical
        est.propertyEstimate.estimatedValueUSD = lastHistorical.value
      } else {
        const ratio = est.propertyEstimate.estimatedValueUSD / lastHistorical.value
        if (ratio < 0.85 || ratio > 1.15) {
          est.propertyEstimate.estimatedValueUSD = lastHistorical.value
        }
      }
    }
  }

  const nb = est.neighborhood
  nb.safetyRating = Math.min(Math.max(Math.round(nb.safetyRating), 0), 100)
  nb.schoolRating = Math.min(Math.max(Math.round(nb.schoolRating), 0), 100)
  est.investment.investmentScore = Math.min(Math.max(Math.round(est.investment.investmentScore), 0), 100)

  // Lock walk/transit/school to real Overpass data
  if (realScores) {
    nb.walkScore = realScores.walkScore
    nb.transitScore = realScores.transitScore
    nb.schoolRating = realScores.schoolScore
  } else {
    nb.walkScore = Math.min(Math.max(Math.round(nb.walkScore), 0), 100)
    nb.transitScore = Math.min(Math.max(Math.round(nb.transitScore), 0), 100)
  }

  // Strip placeholder text
  const isPlaceholder = (s) => /^(pro|con|feature|attraction)\s*\d+$/i.test(s?.trim())
  if (est.neighborhood.pros?.some(isPlaceholder)) est.neighborhood.pros = ['Established residential neighborhood', 'Access to public transit', 'Proximity to parks and green space']
  if (est.neighborhood.cons?.some(isPlaceholder)) est.neighborhood.cons = ['Car dependent for some errands', 'Limited walkable retail']
  if (est.floorPlan.commonFeatures?.some(isPlaceholder)) est.floorPlan.commonFeatures = ['Attached garage', 'Hardwood floors', 'Updated kitchen', 'Private backyard', 'Finished basement']
  if (est.localInsights.topAttractions?.some(isPlaceholder)) est.localInsights.topAttractions = ['Local parks', 'Shopping centres', 'Community centres']

  return est
}

const ASSESSOR_LINKS = {
  'united states': (geo) => {
    const state = (geo.userState ?? '').trim()
    const city = (geo.userCity ?? '').trim()
    const street = geo.userStreet ?? ''
    const stateMap = {
      'Colorado': `https://www.google.com/search?q=${encodeURIComponent(street + ' ' + city + ' CO county assessor property record')}`,
      'California': `https://www.google.com/search?q=${encodeURIComponent(street + ' ' + city + ' CA county assessor property record')}`,
      'Texas': `https://www.google.com/search?q=${encodeURIComponent(street + ' ' + city + ' TX county appraisal district property record')}`,
      'Florida': `https://www.google.com/search?q=${encodeURIComponent(street + ' ' + city + ' FL county property appraiser record')}`,
      'New York': `https://www.google.com/search?q=${encodeURIComponent(street + ' ' + city + ' NY property assessment record')}`,
      'Illinois': 'https://www.cookcountyassessor.com/address-search',
      'Washington': 'https://blue.kingcounty.com/Assessor/eRealProperty/default.aspx',
      'Arizona': 'https://mcassessor.maricopa.gov',
      'Georgia': `https://www.google.com/search?q=${encodeURIComponent(street + ' ' + city + ' GA county tax assessor property record')}`,
      'Nevada': 'https://assessor.clarkcountynv.gov',
    }
    return stateMap[state] ?? `https://www.google.com/search?q=${encodeURIComponent(street + ' ' + city + ' ' + state + ' county assessor property record')}`
  },
  'united kingdom': () => 'https://www.gov.uk/search-property-information-land-registry',
  'canada': (geo) => {
    const province = (geo.userState ?? '').trim()
    const map = {
      'Ontario': 'https://www.mpac.ca/en/CheckYourAssessment/AboutMyProperty',
      'British Columbia': 'https://www.bcassessment.ca/Property/Search',
      'Alberta': 'https://www.alberta.ca/assessment-services.aspx',
      'Quebec': 'https://www.roles.montreal.qc.ca',
    }
    return map[province] ?? `https://www.google.com/search?q=${encodeURIComponent((geo.userStreet ?? '') + ' ' + (geo.userCity ?? '') + ' ' + province + ' property assessment record')}`
  },
  'australia': (geo) => {
    const state = (geo.userState ?? '').trim()
    const map = {
      'New South Wales': 'https://www.valuergeneral.nsw.gov.au/land_values/search_for_land_value',
      'Victoria': 'https://www.land.vic.gov.au/valuations/find-a-valuation',
      'Queensland': 'https://www.qld.gov.au/environment/land/title/valuation',
      'Western Australia': 'https://www.landgate.wa.gov.au/property-and-location/property-valuation',
    }
    return map[state] ?? `https://www.google.com/search?q=${encodeURIComponent((geo.userStreet ?? '') + ' ' + (geo.userCity ?? '') + ' ' + state + ' property valuation')}`
  },
  'germany': () => 'https://www.grundbuch.de',
  'france': () => 'https://www.cadastre.gouv.fr/scpc/rechercherPlan.do',
  'united arab emirates': () => 'https://dubailand.gov.ae/en/eServices/real-estate-services/',
  'japan': () => 'https://www.moj.go.jp/MINJI/minji05_00076.html',
  'spain': () => 'https://www.catastro.minhap.es/esp/busqueda_por_localidad.asp',
  'mexico': () => 'https://www.rppc.cdmx.gob.mx',
}

export function getAssessorLink(geo) {
  const country = (geo.userCountry ?? geo.address?.country ?? '').toLowerCase().trim()
  const handler = ASSESSOR_LINKS[country]
  if (!handler) return `https://www.google.com/search?q=${encodeURIComponent((geo.userStreet ?? '') + ' ' + (geo.userCity ?? '') + ' ' + (geo.userCountry ?? '') + ' property public records assessor')}`
  return handler(geo)
}

export function getZillowLink(geo) {
  const parts = [geo.userStreet, geo.userCity, geo.userState].filter(Boolean).join(' ')
  return `https://www.zillow.com/homes/${encodeURIComponent(parts)}_rb/`
}

export function getFloorPlanSearchLink(geo) {
  const parts = [geo.userStreet, geo.userCity, geo.userState, geo.userCountry].filter(Boolean).join(' ')
  return `https://www.google.com/search?q=${encodeURIComponent(parts + ' floor plan')}&tbm=isch`
}

export async function analyzeProperty(geoData, weatherData, climateData, knownFacts = {}, realData = {}) {
  const { address, lat, lon, userStreet, userCity, userState, userCountry } = geoData

  const street = userStreet || address?.road || ''
  const city = userCity || address?.city || address?.town || address?.village || ''
  const state = userState || address?.state || ''
  const country = userCountry || address?.country || ''
  const postcode = address?.postcode || ''
  const county = address?.county || ''

  const weatherSummary = weatherData?.current
    ? `${weatherData.current.temperature_2m}C feels like ${weatherData.current.apparent_temperature}C, ${weatherData.current.relative_humidity_2m}% humidity`
    : 'unavailable'

  const climateSummary = climateData
    ? `5yr avg high: ${climateData.avgHighC}C, avg low: ${climateData.avgLowC}C, avg precip: ${climateData.avgPrecipMm}mm/day`
    : 'unavailable'

  const knownLines = []
  if (knownFacts.beds) knownLines.push(`CONFIRMED bedrooms: ${knownFacts.beds}`)
  if (knownFacts.baths) knownLines.push(`CONFIRMED bathrooms: ${knownFacts.baths}`)
  if (knownFacts.sqft) knownLines.push(`CONFIRMED square footage: ${knownFacts.sqft} sqft`)
  if (knownFacts.yearBuilt) knownLines.push(`CONFIRMED year built: ${knownFacts.yearBuilt}`)
  if (knownFacts.purchasePrice) knownLines.push(`CONFIRMED purchase price: $${knownFacts.purchasePrice.toLocaleString()} — anchor your current value estimate to this`)

  const knownFactsSection = knownLines.length > 0
    ? `\nCONFIRMED PROPERTY FACTS (do not contradict these):\n${knownLines.join('\n')}\n`
    : '\nNo confirmed facts — estimate based on location and neighborhood type.\n'

  const { neighborhoodScores, censusData, fmr, floodZone } = realData ?? {}
  const realParts = []

  if (neighborhoodScores) {
    realParts.push(
      'REAL NEIGHBORHOOD DATA (OpenStreetMap):\n' +
      '- Schools nearby: ' + (neighborhoodScores.nearbySchools.join(', ') || 'none mapped') + '\n' +
      '- Parks nearby: ' + (neighborhoodScores.nearbyParks.join(', ') || 'none mapped') + '\n' +
      '- Transit stops: ' + (neighborhoodScores.nearbyTransit.join(', ') || 'none mapped') + '\n' +
      '- Grocery stores: ' + (neighborhoodScores.nearbyGrocery.join(', ') || 'none mapped') + '\n' +
      'NOTE: walkScore, transitScore, schoolRating in your JSON will be overridden by real data. Only provide safetyRating.'
    )
  }

  if (censusData) {
    realParts.push(
      'REAL US CENSUS DATA:\n' +
      '- Median home value: $' + (censusData.medianHomeValueUSD?.toLocaleString() ?? 'N/A') + '\n' +
      '- Median rent: $' + (censusData.medianGrossRentUSD?.toLocaleString() ?? 'N/A') + '/month\n' +
      '- Median household income: $' + (censusData.medianHouseholdIncomeUSD?.toLocaleString() ?? 'N/A') + '/year\n' +
      'Your estimate must be within 20% of the census median unless the specific street is notably more affluent.'
    )
  }

  if (fmr) {
    realParts.push(
      'REAL HUD FAIR MARKET RENT:\n' +
      '- 2BR: $' + fmr.twoBed + '/month\n' +
      '- 3BR: $' + fmr.threeBed + '/month\n' +
      'Base your rental estimate on these.'
    )
  }

  if (floodZone) {
    realParts.push(
      'FEMA FLOOD ZONE: ' + floodZone.zone +
      (floodZone.inSpecialFloodHazardArea ? ' — HIGH RISK. Mention this in investment analysis.' : ' — Low risk.')
    )
  }

  const realDataContext = realParts.length > 0
    ? 'AUTHORITATIVE DATA — treat as ground truth:\n' + realParts.join('\n\n')
    : 'No external data available — use your training knowledge for this location.'

  const prompt = `You are a senior real estate appraiser. Your job is to produce a highly accurate property analysis for the exact address below. Use your training knowledge of local real estate markets, neighborhood reputations, and price trends for this specific city and neighborhood.

PROPERTY ADDRESS:
${street}, ${city}, ${state}, ${country} ${postcode}
GPS: ${lat}, ${lon}
County/District: ${county}
Current weather: ${weatherSummary}
Climate: ${climateSummary}
${knownFactsSection}
${realDataContext}

ACCURACY RULES — follow these precisely:
1. estimatedValueUSD must reflect the SPECIFIC NEIGHBORHOOD, not the city average. Affluent areas command premiums.
2. The last historical value in priceHistory.data (2024) must be within 5% of estimatedValueUSD. They must be consistent.
3. priceHistory values must reflect real market events in ${city}: the COVID boom (2020-2022), correction (2022-2023), and current stabilization.
4. costOfLiving figures must reflect the actual cost of living in ${city}, ${country} — not a generic estimate.
5. pros, cons, commonFeatures, topAttractions must all be specific to ${city} and this neighborhood — no generic placeholders.
6. safetyRating must reflect real knowledge of this specific street/neighborhood's safety reputation.
7. appreciationOutlook: exactly one of bearish, neutral, bullish.
8. confidenceLevel: exactly one of low, medium, high.
9. investmentScore: integer between 40 and 80.
10. All monetary values must be in the local currency of ${country}.

Return ONLY raw JSON (no markdown, no backticks):

{
  "propertyEstimate": {
    "estimatedValueUSD": 0,
    "pricePerSqftUSD": 0,
    "rentEstimateMonthlyUSD": 0,
    "confidenceLevel": "medium",
    "priceContext": "Cite 2-3 specific comparable sales or price ranges for this exact neighborhood in ${city}."
  },
  "costOfLiving": {
    "monthlyBudgetUSD": 0,
    "groceriesMonthlyUSD": 0,
    "transportMonthlyUSD": 0,
    "utilitiesMonthlyUSD": 0,
    "diningOutMonthlyUSD": 0,
    "indexVsUSAverage": 0,
    "summary": "One specific sentence about cost of living in ${city}."
  },
  "neighborhood": {
    "character": "2-3 sentences specific to this street/neighborhood in ${city}.",
    "walkScore": 50,
    "transitScore": 50,
    "safetyRating": 75,
    "schoolRating": 75,
    "pros": ["Specific pro for this neighborhood", "Specific pro 2", "Specific pro 3"],
    "cons": ["Specific con for this neighborhood", "Specific con 2"],
    "bestFor": "Specific description of who suits this area."
  },
  "investment": {
    "rentYieldPercent": 4.0,
    "appreciationOutlook": "neutral",
    "appreciationOutlookText": "Specific outlook for ${city} market in 2025-2026.",
    "investmentScore": 65,
    "investmentSummary": "Specific investment summary for this property."
  },
  "floorPlan": {
    "typicalSqft": 0,
    "typicalBedrooms": 0,
    "typicalBathrooms": 0,
    "architecturalStyle": "Specific style for this neighborhood.",
    "builtEra": "1970s",
    "typicalLayout": "Specific layout description for homes on this street.",
    "commonFeatures": ["Real feature 1", "Real feature 2", "Real feature 3", "Real feature 4", "Real feature 5"]
  },
  "localInsights": {
    "topAttractions": ["Real nearby attraction 1", "Real nearby attraction 2", "Real nearby attraction 3"],
    "knownFor": "What this specific neighborhood in ${city} is known for.",
    "localTip": "A genuine insider tip about this area.",
    "languageNote": null
  },
  "priceHistory": {
    "currency": "Local currency code e.g. CAD USD GBP AUD EUR",
    "currencySymbol": "Local symbol e.g. $ £ €",
    "data": [
      {"year": 2019, "value": 0, "type": "historical"},
      {"year": 2020, "value": 0, "type": "historical"},
      {"year": 2021, "value": 0, "type": "historical"},
      {"year": 2022, "value": 0, "type": "historical"},
      {"year": 2023, "value": 0, "type": "historical"},
      {"year": 2024, "value": 0, "type": "historical"},
      {"year": 2025, "value": 0, "type": "projected"},
      {"year": 2026, "value": 0, "type": "projected"},
      {"year": 2027, "value": 0, "type": "projected"}
    ],
    "marketNote": "One sentence about what specifically drove prices in ${city} over this period."
  }
}

CRITICAL: Replace every 0 with a real number. The 2024 historical value and estimatedValueUSD must be within 5% of each other. All strings must be specific to ${street}, ${city}, ${country} — no generic filler text.`

  let raw = await cerebrasChat([{ role: 'user', content: prompt }], true)
  let result = JSON.parse(raw.replace(/```json|```/g, '').trim())

  // If AI returned 0 for key fields, retry once with a simpler focused prompt
  if (!result.propertyEstimate?.estimatedValueUSD || !result.costOfLiving?.monthlyBudgetUSD) {
    const retryPrompt = `You are a real estate appraiser. For the property at ${street}, ${city}, ${state}, ${country}, provide realistic estimates. This is a residential property in an established neighborhood.

Return ONLY this JSON with ALL zeros replaced by real numbers:
${JSON.stringify(result, null, 2)}

Fill every 0 with a real estimate for ${city}, ${country}. estimatedValueUSD must be a realistic home value for this city and neighborhood. monthlyBudgetUSD must be a realistic monthly cost of living for ${city}. All price history values must show the real market trajectory.`

    const retryRaw = await cerebrasChat([{ role: 'user', content: retryPrompt }], true)
    const retryResult = JSON.parse(retryRaw.replace(/```json|```/g, '').trim())
    // Merge — only replace zeros with retry values
    if (retryResult.propertyEstimate?.estimatedValueUSD > 0) result.propertyEstimate = retryResult.propertyEstimate
    if (retryResult.costOfLiving?.monthlyBudgetUSD > 0) result.costOfLiving = retryResult.costOfLiving
    if (retryResult.priceHistory?.data?.some(d => d.value > 0)) result.priceHistory = retryResult.priceHistory
  }

  return validateEstimate(result, knownFacts, neighborhoodScores)
}
