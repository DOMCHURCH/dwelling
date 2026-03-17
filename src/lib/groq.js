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
  'united states': (address) => {
    const state = address?.state ?? ''
    const county = address?.county ?? ''
    const stateMap = {
      'Colorado': `https://www.assessor.${county.toLowerCase().replace(/ /g,'')}co.us`,
      'California': `https://assessor.lacounty.gov`,
      'Texas': `https://www.hcad.org`,
      'Florida': `https://www.bcpa.net`,
      'New York': `https://www.nyc.gov/site/finance/property/property-search.page`,
      'Illinois': `https://www.cookcountyassessor.com`,
      'Washington': `https://blue.kingcounty.com/Assessor/eRealProperty/default.aspx`,
      'Arizona': `https://mcassessor.maricopa.gov`,
      'Georgia': `https://qpublic.schneidercorp.com`,
      'Nevada': `https://assessor.clarkcountynv.gov`,
    }
    return stateMap[state] ?? `https://www.google.com/search?q=${encodeURIComponent(county + ' ' + state + ' county assessor property search')}`
  },
  'united kingdom': () => 'https://www.gov.uk/search-property-information-land-registry',
  'canada': (address) => {
    const province = address?.state ?? ''
    const map = {
      'Ontario': 'https://www.mpac.ca/en/UnderstandingYourAssessment/HowToReadYourPropertyAssessmentNotice',
      'British Columbia': 'https://www.bcassessment.ca',
      'Alberta': 'https://www.alberta.ca/assessment-services.aspx',
      'Quebec': 'https://www.roles.montreal.qc.ca',
    }
    return map[province] ?? 'https://www.google.com/search?q=property+assessment+' + encodeURIComponent(province)
  },
  'australia': (address) => {
    const state = address?.state ?? ''
    const map = {
      'New South Wales': 'https://www.valuergeneral.nsw.gov.au',
      'Victoria': 'https://www.land.vic.gov.au',
      'Queensland': 'https://www.qld.gov.au/environment/land/title/valuation',
      'Western Australia': 'https://www.landgate.wa.gov.au',
    }
    return map[state] ?? 'https://www.google.com/search?q=property+records+' + encodeURIComponent(state + ' australia')
  },
  'germany': () => 'https://www.grundbuch.de',
  'france': () => 'https://www.cadastre.gouv.fr',
  'united arab emirates': () => 'https://dubailand.gov.ae/en/eServices/real-estate-services/',
  'japan': () => 'https://www.moj.go.jp/MINJI/minji05_00076.html',
  'spain': () => 'https://www.registradores.org/actualidad/portal-estadistico-registral',
  'mexico': () => 'https://www.rppc.cdmx.gob.mx',
}

export function getAssessorLink(address) {
  const country = (address?.country ?? '').toLowerCase()
  const handler = ASSESSOR_LINKS[country]
  if (!handler) {
    return `https://www.google.com/search?q=${encodeURIComponent((address?.country ?? '') + ' property public records ' + (address?.city ?? ''))}`
  }
  return handler(address)
}

export function getZillowLink(displayName) {
  const query = displayName.split(',').slice(0, 3).join(',')
  return `https://www.zillow.com/homes/${encodeURIComponent(query)}_rb/`
}

export async function analyzeProperty(addressData, weatherData, climateData) {
  const { displayName, address, lat, lon } = addressData
  const country = address?.country ?? ''
  const city = address?.city ?? address?.town ?? address?.village ?? ''
  const state = address?.state ?? ''
  const county = address?.county ?? ''
  const road = address?.road ?? ''
  const postcode = address?.postcode ?? ''

  const weatherSummary = weatherData?.current
    ? `Current: ${weatherData.current.temperature_2m}°C, ${weatherData.current.relative_humidity_2m}% humidity`
    : 'unavailable'

  const climateSummary = climateData
    ? `5yr avg high: ${climateData.avgHighC}°C, avg low: ${climateData.avgLowC}°C, avg precip: ${climateData.avgPrecipMm}mm/day`
    : 'unavailable'

  const prompt = `You are a senior real estate appraiser and market analyst with 20 years of experience. You have deep knowledge of property values, neighborhood characteristics, and real estate markets worldwide.

PROPERTY LOCATION:
Full address: ${displayName}
Street: ${road}
City: ${city}
County: ${county}
State/Province: ${state}
Country: ${country}
Postcode: ${postcode}
Coordinates: ${lat}, ${lon}
Weather: ${weatherSummary}
Climate (5yr normals): ${climateSummary}

CRITICAL INSTRUCTIONS FOR ACCURACY:
- Use your knowledge of THIS SPECIFIC neighborhood and street, not just the city average
- For US properties, consider the specific suburb, school district, and ZIP code when estimating value
- Luxury suburbs and gated communities command 2-5x the city average — account for this
- Square footage for single family homes in affluent US suburbs typically ranges 2,500-6,000 sqft
- Do NOT use city-wide averages for specific upscale neighborhoods — this causes severe underestimation
- For bedroom count: affluent suburban homes in the US typically have 4-6 bedrooms
- Base your estimate on actual comparable sales in THAT specific zip code and neighborhood
- If the address is in a known high-value area (e.g. Parker CO, Highlands Ranch CO, Scottsdale AZ, Newport Beach CA), reflect that in ALL estimates
- ALL scores (walkScore, transitScore, safetyRating, schoolRating) must be 0-100, never exceed 100
- investmentScore must be a realistic number 0-100, most properties score between 40-80
- Do not return safetyRating or schoolRating as decimals like 8.5 — return them as integers 0-100 (e.g. 85)

Respond ONLY with a valid JSON object with this exact structure:
{
  "propertyEstimate": {
    "estimatedValueUSD": number,
    "pricePerSqftUSD": number,
    "rentEstimateMonthlyUSD": number,
    "confidenceLevel": "low" | "medium" | "high",
    "priceContext": "string (2-3 sentences explaining the estimate, referencing the specific neighborhood and comparable sales)"
  },
  "costOfLiving": {
    "monthlyBudgetUSD": number,
    "groceriesMonthlyUSD": number,
    "transportMonthlyUSD": number,
    "utilitiesMonthlyUSD": number,
    "diningOutMonthlyUSD": number,
    "indexVsUSAverage": number,
    "summary": "string"
  },
  "neighborhood": {
    "character": "string (2-3 sentences describing the specific neighborhood vibe, not just the city)",
    "walkScore": number,
    "transitScore": number,
    "safetyRating": number,
    "schoolRating": number,
    "pros": ["string", "string", "string"],
    "cons": ["string", "string"],
    "bestFor": "string"
  },
  "investment": {
    "rentYieldPercent": number,
    "appreciationOutlook": "bearish" | "neutral" | "bullish",
    "appreciationOutlookText": "string",
    "investmentScore": number,
    "investmentSummary": "string"
  },
  "floorPlan": {
    "typicalSqft": number,
    "typicalBedrooms": number,
    "typicalBathrooms": number,
    "architecturalStyle": "string",
    "builtEra": "string",
    "typicalLayout": "string (describe the typical floor plan layout for homes in this specific neighborhood — room flow, garage, basement, open plan etc)",
    "commonFeatures": ["string", "string", "string", "string", "string"]
  },
  "localInsights": {
    "topAttractions": ["string", "string", "string"],
    "knownFor": "string",
    "localTip": "string",
    "languageNote": "string or null"
  }
}`

  const raw = await groqChat([{ role: 'user', content: prompt }], true)
  return JSON.parse(raw)
}
