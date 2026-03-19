import { supabase } from './supabase'

const CEREBRAS_BASE = '/api/cerebras'
const MODEL = 'llama-3.1-8b'

async function getAuthToken() {
  // Try getting session, refresh if expired
  const { data: { session }, error } = await supabase.auth.getSession()
  if (session?.access_token) return session.access_token

  // Try refreshing the session
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

  const nb = est.neighborhood
  nb.safetyRating = Math.min(Math.max(Math.round(nb.safetyRating), 0), 100)
  nb.schoolRating = Math.min(Math.max(Math.round(nb.schoolRating), 0), 100)
  est.investment.investmentScore = Math.min(Math.max(Math.round(est.investment.investmentScore), 0), 100)

  // Lock walk/transit/school to real Overpass data — AI cannot override
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
    ? `\nCONFIRMED FACTS — treat these as ground truth:\n${knownLines.join('\n')}\n`
    : '\nNo confirmed property facts provided — use your best estimate.\n'

  const { neighborhoodScores, censusData, fmr, floodZone } = realData ?? {}
  const realParts = []

  if (neighborhoodScores) {
    realParts.push(
      'REAL NEIGHBORHOOD DATA (OpenStreetMap):' +
      '\n- Nearby schools: ' + (neighborhoodScores.nearbySchools.join(', ') || 'none found') +
      '\n- Nearby parks: ' + (neighborhoodScores.nearbyParks.join(', ') || 'none found') +
      '\n- Nearby transit stops: ' + (neighborhoodScores.nearbyTransit.join(', ') || 'none found') +
      '\n- Nearby grocery stores: ' + (neighborhoodScores.nearbyGrocery.join(', ') || 'none found') +
      '\nNOTE: Walk, transit, and school scores are computed from real data and will override your JSON values. Only provide safetyRating in the neighborhood section.'
    )
  }

  if (censusData) {
    realParts.push(
      'REAL US CENSUS DATA:' +
      '\n- Median home value: $' + (censusData.medianHomeValueUSD?.toLocaleString() ?? 'N/A') +
      '\n- Median gross rent: $' + (censusData.medianGrossRentUSD?.toLocaleString() ?? 'N/A') + '/month' +
      '\n- Median household income: $' + (censusData.medianHouseholdIncomeUSD?.toLocaleString() ?? 'N/A') + '/year' +
      '\nYOUR ESTIMATE must be within 20% of census median unless justified.'
    )
  }

  if (fmr) {
    realParts.push(
      'REAL HUD FAIR MARKET RENT:' +
      '\n- 2 bedroom: $' + fmr.twoBed + '/month' +
      '\n- 3 bedroom: $' + fmr.threeBed + '/month' +
      '\nBase your rent estimate on these figures.'
    )
  }

  if (floodZone) {
    realParts.push(
      'REAL FEMA FLOOD ZONE:' +
      '\n- Zone: ' + floodZone.zone +
      '\n- High Risk: ' + (floodZone.inSpecialFloodHazardArea ? 'YES' : 'No') +
      '\nMention flood risk in investment analysis if high risk.'
    )
  }

  const realDataContext = realParts.length > 0
    ? 'REAL DATA FROM AUTHORITATIVE SOURCES:\n' + realParts.join('\n\n')
    : 'No real property data available — use your best estimate.'

  const prompt = `You are a senior real estate appraiser with 20 years of experience. Analyze this specific property and fill in ALL fields with real, specific data. Do NOT use placeholder text like "pro 1", "feature 1", "attraction 1" — replace every placeholder with actual specific content.

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

CRITICAL RULES:
- Replace ALL placeholder values with real specific content for ${city}, ${state}, ${country}
- pros must be real specific pros of this exact neighborhood (not "pro 1")
- cons must be real specific cons (not "con 1")
- commonFeatures must be real features typical of homes in this area (not "feature 1")
- topAttractions must be real nearby attractions (not "attraction 1")
- priceContext must cite real comparable sales with specific addresses or price ranges
- All price history values must be real estimates (not 0)
- appreciationOutlook: exactly one of bearish, neutral, bullish
- confidenceLevel: exactly one of low, medium, high
- investmentScore: integer 40-80
- safetyRating: use real knowledge of this neighborhood's safety

Return ONLY raw JSON, no markdown, no backticks, no explanations:

{
  "propertyEstimate": {
    "estimatedValueUSD": 950000,
    "pricePerSqftUSD": 290,
    "rentEstimateMonthlyUSD": 3800,
    "confidenceLevel": "medium",
    "priceContext": "Real comparable sales context for ${city}."
  },
  "costOfLiving": {
    "monthlyBudgetUSD": 4200,
    "groceriesMonthlyUSD": 700,
    "transportMonthlyUSD": 300,
    "utilitiesMonthlyUSD": 220,
    "diningOutMonthlyUSD": 500,
    "indexVsUSAverage": 18,
    "summary": "One sentence about cost of living in ${city}."
  },
  "neighborhood": {
    "character": "2-3 specific sentences about this exact neighborhood in ${city}.",
    "walkScore": 45,
    "transitScore": 30,
    "safetyRating": 82,
    "schoolRating": 88,
    "pros": ["Specific pro 1 for this area", "Specific pro 2", "Specific pro 3"],
    "cons": ["Specific con 1 for this area", "Specific con 2"],
    "bestFor": "Specific description of who this area suits."
  },
  "investment": {
    "rentYieldPercent": 4.2,
    "appreciationOutlook": "bullish",
    "appreciationOutlookText": "Specific outlook for ${city} market.",
    "investmentScore": 68,
    "investmentSummary": "Specific investment summary for this property."
  },
  "floorPlan": {
    "typicalSqft": 3200,
    "typicalBedrooms": 4,
    "typicalBathrooms": 3,
    "architecturalStyle": "Real architectural style for this area.",
    "builtEra": "1990s",
    "typicalLayout": "Specific layout description for homes in this neighborhood.",
    "commonFeatures": ["Real feature 1", "Real feature 2", "Real feature 3", "Real feature 4", "Real feature 5"]
  },
  "localInsights": {
    "topAttractions": ["Real attraction near ${city}", "Real attraction 2", "Real attraction 3"],
    "knownFor": "What ${city} and this neighborhood are actually known for.",
    "localTip": "Real insider tip about this area.",
    "languageNote": null
  },
  "priceHistory": {
    "currency": "CAD",
    "currencySymbol": "$",
    "data": [
      {"year": 2019, "value": 750000, "type": "historical"},
      {"year": 2020, "value": 820000, "type": "historical"},
      {"year": 2021, "value": 980000, "type": "historical"},
      {"year": 2022, "value": 1050000, "type": "historical"},
      {"year": 2023, "value": 980000, "type": "historical"},
      {"year": 2024, "value": 1000000, "type": "historical"},
      {"year": 2025, "value": 1020000, "type": "projected"},
      {"year": 2026, "value": 1050000, "type": "projected"},
      {"year": 2027, "value": 1080000, "type": "projected"}
    ],
    "marketNote": "Specific note about ${city} market trends."
  }
}

IMPORTANT: The example numbers above are just format examples. Replace ALL values with real accurate estimates for ${street}, ${city}, ${state}, ${country}. Every string placeholder must be replaced with real specific content.`

  const raw = await cerebrasChat([{ role: 'user', content: prompt }], true)
  const result = JSON.parse(raw.replace(/```json|```/g, '').trim())
  return validateEstimate(result, knownFacts, neighborhoodScores)
}
