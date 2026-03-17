const GROQ_BASE = 'https://api.groq.com/openai/v1/chat/completions'
const MODEL = 'llama-3.3-70b-versatile'

async function groqChat(messages, json = false) {
  const key = import.meta.env.VITE_GROQ_API_KEY
  if (!key) throw new Error('Missing VITE_GROQ_API_KEY in .env')

  const res = await fetch(GROQ_BASE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      temperature: 0.2,
      max_tokens: 2400,
      ...(json && { response_format: { type: 'json_object' } }),
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error?.message ?? `Groq error ${res.status}`)
  }

  const data = await res.json()
  return data.choices[0].message.content
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
      'Nova Scotia': 'https://www.pvsc.ca/en/home/propertysearch/default.aspx',
      'Manitoba': 'https://www.gov.mb.ca/finance/propertytax/pubs/prop_ass_searching.pdf',
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
      'South Australia': 'https://www.sa.gov.au/topics/planning-and-property/land-and-property-information/land-valuation',
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
  if (!handler) {
    return `https://www.google.com/search?q=${encodeURIComponent((geo.userStreet ?? '') + ' ' + (geo.userCity ?? '') + ' ' + (geo.userCountry ?? '') + ' property public records assessor')}`
  }
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

export async function analyzeProperty(geoData, weatherData, climateData) {
  const { address, lat, lon, userStreet, userCity, userState, userCountry } = geoData

  const street = userStreet || address?.road || ''
  const city = userCity || address?.city || address?.town || address?.village || ''
  const state = userState || address?.state || ''
  const country = userCountry || address?.country || ''
  const postcode = address?.postcode || ''
  const county = address?.county || ''

  const weatherSummary = weatherData?.current
    ? `Current: ${weatherData.current.temperature_2m}C, feels like ${weatherData.current.apparent_temperature}C, ${weatherData.current.relative_humidity_2m}% humidity`
    : 'unavailable'

  const climateSummary = climateData
    ? `5yr avg high: ${climateData.avgHighC}C, avg low: ${climateData.avgLowC}C, avg precip: ${climateData.avgPrecipMm}mm/day`
    : 'unavailable'

  const prompt = `You are a senior real estate appraiser with 20 years of experience. Analyze this property and return a JSON report.

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

RULES:
- Use ONLY the exact city and state above for pricing. Do not substitute a nearby city.
- For affluent US/Canada/Australia suburbs, homes are typically $600k-$2M+. Do not use city-wide averages.
- Single family homes in affluent suburbs: 2500-5000 sqft, 4-6 bedrooms, 3-4 bathrooms.
- All scores (walkScore, transitScore, safetyRating, schoolRating, investmentScore) must be integers from 0 to 100.
- investmentScore for typical residential: 40-80 range.
- appreciationOutlook must be exactly one of: bearish, neutral, bullish
- confidenceLevel must be exactly one of: low, medium, high

Return ONLY a JSON object with NO extra text, NO markdown, NO backticks. Just the raw JSON object starting with { and ending with }:

{
  "propertyEstimate": {
    "estimatedValueUSD": 950000,
    "pricePerSqftUSD": 290,
    "rentEstimateMonthlyUSD": 3800,
    "confidenceLevel": "medium",
    "priceContext": "Replace this with 2-3 sentences about comparable sales in the specific neighborhood."
  },
  "costOfLiving": {
    "monthlyBudgetUSD": 4200,
    "groceriesMonthlyUSD": 700,
    "transportMonthlyUSD": 300,
    "utilitiesMonthlyUSD": 220,
    "diningOutMonthlyUSD": 500,
    "indexVsUSAverage": 18,
    "summary": "Replace with a summary sentence."
  },
  "neighborhood": {
    "character": "Replace with 2-3 sentences about the neighborhood character.",
    "walkScore": 45,
    "transitScore": 30,
    "safetyRating": 82,
    "schoolRating": 88,
    "pros": ["Good schools", "Safe streets", "Green spaces"],
    "cons": ["Car dependent", "Limited nightlife"],
    "bestFor": "Families and professionals"
  },
  "investment": {
    "rentYieldPercent": 4.2,
    "appreciationOutlook": "bullish",
    "appreciationOutlookText": "Replace with outlook explanation.",
    "investmentScore": 68,
    "investmentSummary": "Replace with investment summary."
  },
  "floorPlan": {
    "typicalSqft": 3200,
    "typicalBedrooms": 5,
    "typicalBathrooms": 3,
    "architecturalStyle": "Replace with style.",
    "builtEra": "2000s",
    "typicalLayout": "Replace with layout description.",
    "commonFeatures": ["Hardwood floors", "Double garage", "Finished basement", "Open kitchen", "Main floor office"]
  },
  "localInsights": {
    "topAttractions": ["Attraction 1", "Attraction 2", "Attraction 3"],
    "knownFor": "Replace with what the area is known for.",
    "localTip": "Replace with a local insider tip.",
    "languageNote": null
  }
}

Fill in all placeholder values with accurate data for ${street}, ${city}, ${state}, ${country}.`

  const raw = await groqChat([{ role: 'user', content: prompt }], true)

  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch (e) {
    // Strip any accidental markdown fences and retry
    const cleaned = raw.replace(/```json|```/g, '').trim()
    parsed = JSON.parse(cleaned)
  }
  return parsed
}
