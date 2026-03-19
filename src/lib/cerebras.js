const CEREBRAS_BASE = '/api/cerebras'
const MODEL = 'llama-3.1-8b'

async function cerebrasChat(messages, json = false) {
  const res = await fetch(CEREBRAS_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      messages,
      temperature: 0.7,
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
      est.propertyEstimate.priceContext = `Based on the known purchase price of $${known.purchasePrice.toLocaleString()}, current market value is estimated at a slight appreciation. ` + est.propertyEstimate.priceContext
    }
  }

  // Cap scores at 100
  const nb = est.neighborhood
  nb.safetyRating = Math.min(Math.max(Math.round(nb.safetyRating), 0), 100)
  nb.schoolRating = Math.min(Math.max(Math.round(nb.schoolRating), 0), 100)
  est.investment.investmentScore = Math.min(Math.max(Math.round(est.investment.investmentScore), 0), 100)

  // LOCK walk/transit/school scores to real Overpass data — AI cannot override these
  if (realScores) {
    nb.walkScore = realScores.walkScore
    nb.transitScore = realScores.transitScore
    nb.schoolRating = realScores.schoolScore
  } else {
    nb.walkScore = Math.min(Math.max(Math.round(nb.walkScore), 0), 100)
    nb.transitScore = Math.min(Math.max(Math.round(nb.transitScore), 0), 100)
  }

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
      'Illinois': `https://www.cookcountyassessor.com/address-search`,
      'Washington': `https://blue.kingcounty.com/Assessor/eRealProperty/default.aspx`,
      'Arizona': `https://mcassessor.maricopa.gov`,
      'Georgia': `https://www.google.com/search?q=${encodeURIComponent(street + ' ' + city + ' GA county tax assessor property record')}`,
      'Nevada': `https://assessor.clarkcountynv.gov`,
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
  if (knownFacts.beds) knownLines.push(`CONFIRMED bedrooms: ${knownFacts.beds} (do not change this)`)
  if (knownFacts.baths) knownLines.push(`CONFIRMED bathrooms: ${knownFacts.baths} (do not change this)`)
  if (knownFacts.sqft) knownLines.push(`CONFIRMED square footage: ${knownFacts.sqft} sqft (do not change this)`)
  if (knownFacts.yearBuilt) knownLines.push(`CONFIRMED year built: ${knownFacts.yearBuilt} (do not change this)`)
  if (knownFacts.purchasePrice) knownLines.push(`CONFIRMED purchase price: $${knownFacts.purchasePrice.toLocaleString()} — use this as your primary anchor for current value estimation`)

  const knownFactsSection = knownLines.length > 0
    ? `\nCONFIRMED FACTS — treat these as ground truth, do not estimate differently:\n${knownLines.join('\n')}\n`
    : '\nNo confirmed property facts provided — use your best estimate based on location and neighborhood.\n'

  const { neighborhoodScores, censusData, fmr, floodZone } = realData ?? {}
  const realParts = []

  if (neighborhoodScores) {
    realParts.push(
      'REAL NEIGHBORHOOD DATA (OpenStreetMap):' +
      '\n- Nearby schools: ' + (neighborhoodScores.nearbySchools.join(', ') || 'none found') +
      '\n- Nearby parks: ' + (neighborhoodScores.nearbyParks.join(', ') || 'none found') +
      '\n- Nearby transit stops: ' + (neighborhoodScores.nearbyTransit.join(', ') || 'none found') +
      '\n- Nearby grocery stores: ' + (neighborhoodScores.nearbyGrocery.join(', ') || 'none found') +
      '\nNOTE: Walk, transit, and school scores are computed separately from real data and will override your estimates. Focus on safetyRating only.'
    )
  }

  if (censusData) {
    realParts.push(
      'REAL US CENSUS DATA (ACS 2022):' +
      '\n- Median home value: $' + (censusData.medianHomeValueUSD?.toLocaleString() ?? 'N/A') +
      '\n- Median gross rent: $' + (censusData.medianGrossRentUSD?.toLocaleString() ?? 'N/A') + '/month' +
      '\n- Median household income: $' + (censusData.medianHouseholdIncomeUSD?.toLocaleString() ?? 'N/A') + '/year' +
      '\n- Owner occupancy rate: ' + (censusData.ownerOccupancyRate ?? 'N/A') + '%' +
      '\nYOUR ESTIMATE must be within 20% of census median $' + (censusData.medianHomeValueUSD?.toLocaleString() ?? 'N/A') + ' unless justified.'
    )
  }

  if (fmr) {
    realParts.push(
      'REAL HUD FAIR MARKET RENT (2024):' +
      '\n- 2 bedroom: $' + fmr.twoBed + '/month' +
      '\n- 3 bedroom: $' + fmr.threeBed + '/month' +
      '\n- 4 bedroom: $' + fmr.fourBed + '/month' +
      '\nBase your rent estimate on these HUD figures.'
    )
  }

  if (floodZone) {
    realParts.push(
      'REAL FEMA FLOOD ZONE DATA:' +
      '\n- Zone: ' + floodZone.zone +
      '\n- In Special Flood Hazard Area: ' + (floodZone.inSpecialFloodHazardArea ? 'YES - HIGH RISK' : 'No') +
      '\n- ' + floodZone.description +
      '\nMention flood risk in investment analysis and pros/cons.'
    )
  }

  const realDataContext = realParts.length > 0
    ? 'REAL DATA FROM AUTHORITATIVE SOURCES:\n' + realParts.join('\n\n')
    : 'No real property data available — use your best estimate.'

  const prompt = `You are a senior real estate appraiser with 20 years of experience. Analyze this specific property.

PROPERTY:
Street: ${street}
City: ${city}
State/Province: ${state}
Country: ${country}
Postcode: ${postcode}
County: ${county}
GPS: ${lat}, ${lon}
Weather: ${weatherSummary}
Climate: ${climateSummary}
${knownFactsSection}
${realDataContext}

ESTIMATION RULES:
- Use ONLY the exact city and state above. Do not substitute a nearby city.
- For affluent suburbs: single family homes are typically $600k-$2M+, do NOT use city-wide averages.
- All scores must be integers 0-100. investmentScore realistic range: 40-80.
- appreciationOutlook: exactly one of bearish, neutral, bullish.
- confidenceLevel: exactly one of low, medium, high.
- If purchase price is confirmed, current value should reflect real market appreciation since purchase.
- NEVER underestimate — reflect real compounding appreciation for that specific market.
- For safetyRating: use your knowledge of this specific neighborhood's crime and safety reputation.

Return ONLY raw JSON, no markdown, no backticks:

{
  "propertyEstimate": {
    "estimatedValueUSD": 950000,
    "pricePerSqftUSD": 290,
    "rentEstimateMonthlyUSD": 3800,
    "confidenceLevel": "medium",
    "priceContext": "Write 2-3 sentences citing specific comparable sales in ${city}, ${state}."
  },
  "costOfLiving": {
    "monthlyBudgetUSD": 4200,
    "groceriesMonthlyUSD": 700,
    "transportMonthlyUSD": 300,
    "utilitiesMonthlyUSD": 220,
    "diningOutMonthlyUSD": 500,
    "indexVsUSAverage": 18,
    "summary": "One sentence summary."
  },
  "neighborhood": {
    "character": "2-3 sentences about this specific neighborhood.",
    "walkScore": 45,
    "transitScore": 30,
    "safetyRating": 82,
    "schoolRating": 88,
    "pros": ["pro 1", "pro 2", "pro 3"],
    "cons": ["con 1", "con 2"],
    "bestFor": "Who this area suits best."
  },
  "investment": {
    "rentYieldPercent": 4.2,
    "appreciationOutlook": "bullish",
    "appreciationOutlookText": "Explain the outlook.",
    "investmentScore": 68,
    "investmentSummary": "Investment summary."
  },
  "floorPlan": {
    "typicalSqft": 3200,
    "typicalBedrooms": 5,
    "typicalBathrooms": 3,
    "architecturalStyle": "Style name.",
    "builtEra": "2000s",
    "typicalLayout": "Describe the typical floor plan layout.",
    "commonFeatures": ["feature 1", "feature 2", "feature 3", "feature 4", "feature 5"]
  },
  "localInsights": {
    "topAttractions": ["attraction 1", "attraction 2", "attraction 3"],
    "knownFor": "What the area is known for.",
    "localTip": "Insider tip.",
    "languageNote": null
  },
  "priceHistory": {
    "currency": "FILL_IN_LOCAL_CURRENCY_CODE",
    "currencySymbol": "FILL_IN_SYMBOL",
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
    "marketNote": "One sentence about what drove price changes in this market."
  }
}

PRICE HISTORY RULES:
- Replace all 0 values with real estimates for ${city}, ${state}, ${country}
- Reflect actual market events specific to this city/region
- Values must be realistic for this specific neighborhood
- Projected values should reflect current local market momentum

Fill ALL values with accurate data for ${street}, ${city}, ${state}, ${country}.`

  const raw = await cerebrasChat([{ role: 'user', content: prompt }], true)
  const result = JSON.parse(raw.replace(/```json|```/g, '').trim())
  // Pass real scores to validateEstimate so they permanently override AI values
  return validateEstimate(result, knownFacts, neighborhoodScores)
}
