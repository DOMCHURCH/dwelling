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
      temperature: 0.15,
      max_tokens: 4096,
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

function finalizeAnalysis(est, known, realData) {
  if (known.sqft)  est.floorPlan.typicalSqft      = known.sqft
  if (known.beds)  est.floorPlan.typicalBedrooms   = known.beds
  if (known.baths) est.floorPlan.typicalBathrooms  = known.baths

  // Anchor to purchase price if provided
  if (known.purchasePrice && known.purchasePrice > 0) {
    const years = Math.max(0, 2025 - (known.yearPurchased || 2022))
    est.propertyEstimate.estimatedValueUSD = Math.round(known.purchasePrice * Math.pow(1.04, years))
    est.propertyEstimate.confidenceLevel = 'high'
  }

  // Recalculate pricePerSqft from final value
  const sqft = est.floorPlan.typicalSqft
  const val  = est.propertyEstimate.estimatedValueUSD
  if (sqft > 0 && val > 0) {
    est.propertyEstimate.pricePerSqftUSD = Math.round(val / sqft)
  }

  // Validate rent yield (2.5–7%)
  const annualRent = (est.propertyEstimate.rentEstimateMonthlyUSD || 0) * 12
  const yieldPct   = val > 0 ? (annualRent / val) * 100 : 0
  if (yieldPct < 2.5 || yieldPct > 7) {
    est.propertyEstimate.rentEstimateMonthlyUSD = Math.round((val * 0.04) / 12)
  }

  // Apply real OSM scores
  if (realData.neighborhoodScores) {
    est.neighborhood.walkScore    = realData.neighborhoodScores.walkScore
    est.neighborhood.transitScore = realData.neighborhoodScores.transitScore
    est.neighborhood.schoolRating = realData.neighborhoodScores.schoolScore
  }

  // Normalize price history
  if (est.priceHistory?.data?.length && val > 0) {
    const m = { 2021:0.82, 2022:0.95, 2023:0.97, 2024:1.0, 2025:1.04, 2026:1.07 }
    est.priceHistory.data = est.priceHistory.data.map(d => ({
      ...d,
      value: Math.round(val * (m[d.year] || 1.0)),
      type: d.year >= 2025 ? 'projected' : 'historical',
    }))
  }

  return est
}

export async function analyzeProperty(geoData, weatherData, climateData, knownFacts = {}, realData = {}) {
  const street       = geoData.userStreet   || geoData.address?.road        || ''
  const city         = geoData.userCity     || geoData.address?.city         || ''
  const country      = geoData.userCountry  || geoData.address?.country      || ''
  const neighbourhood= geoData.address?.neighbourhood || geoData.address?.suburb || ''
  const postcode     = geoData.address?.postcode || ''

  const isCanada  = country.toLowerCase().includes('canada')
  const isUK      = country.toLowerCase().includes('united kingdom') || country.toLowerCase().includes('england')
  const currency  = isCanada ? 'CAD' : isUK ? 'GBP' : 'USD'
  const currencySymbol = isUK ? '£' : '$'

  // Build real-data context for the model to reason from
  const dataContext = [
    realData.censusData?.medianHomeValueUSD
      ? `Census median home value in this tract: ${currency} ${Math.round(realData.censusData.medianHomeValueUSD * (isCanada ? 1.35 : 1)).toLocaleString()}`
      : '',
    realData.censusData?.medianGrossRentUSD
      ? `Census median rent: ${currency} ${Math.round(realData.censusData.medianGrossRentUSD * (isCanada ? 1.35 : 1)).toLocaleString()}/mo`
      : '',
    realData.fmr?.rent_50_2
      ? `Fair Market Rent (2BR): ${currency} ${realData.fmr.rent_50_2}/mo`
      : '',
    knownFacts.sqft        ? `Known sqft: ${knownFacts.sqft}`                              : '',
    knownFacts.beds        ? `Known bedrooms: ${knownFacts.beds}`                          : '',
    knownFacts.baths       ? `Known bathrooms: ${knownFacts.baths}`                        : '',
    knownFacts.purchasePrice ? `Purchase price: ${currency} ${knownFacts.purchasePrice.toLocaleString()}` : '',
  ].filter(Boolean).join('\n')

  // STEP 1: Chain-of-thought reasoning pass
  // Force the model to reason before outputting numbers
  const cotPrompt = `You are a senior real estate appraiser with 20 years of experience in ${city}, ${country}.

PROPERTY: ${street}${neighbourhood ? ', ' + neighbourhood : ''}, ${city}, ${country} ${postcode}

AVAILABLE DATA:
${dataContext || 'No additional data available — use your knowledge of this market.'}

Before giving any numbers, reason through the following steps out loud:

STEP 1 - MARKET TIER: Is ${neighbourhood || city} luxury, premium, standard, or affordable? What is the typical price per sqft for this exact area?
STEP 2 - PROPERTY TYPE: What type of home is typical at this address (detached, semi-detached, condo, townhouse)? What size and era?
STEP 3 - VALUATION: Based on your knowledge of recent sales in ${neighbourhood || city}, what is a realistic market value? Show your math (sqft × ppsf).
STEP 4 - COST OF LIVING: What does a single person or family actually spend per month in ${city}? Give real ${city}-specific numbers, not US/world averages.
STEP 5 - INVESTMENT: Is this a good investment? What is the realistic rent yield and outlook?

Write your reasoning clearly, then end with: READY_FOR_JSON`

  const reasoning = await cerebrasChat([
    {
      role: 'system',
      content: `You are a real estate expert specializing in ${city}, ${country}. You give accurate, locally-grounded analysis. You never fabricate data. You think step by step before concluding.`
    },
    { role: 'user', content: cotPrompt }
  ])

  // STEP 2: JSON generation pass using the reasoning as context
  const jsonPrompt = `Based on your analysis above, produce the final property intelligence report as a JSON object.

CRITICAL RULES:
- All monetary values in ${currency} (${currencySymbol})
- Use the EXACT numbers you reasoned through above — do not change them
- priceContext: 2 sentences explaining what drives the value in ${neighbourhood || city} right now
- costOfLiving summary: be specific to ${city}, not generic
- indexVsUSAverage: an INTEGER representing % difference from US average cost of living (e.g. Ottawa is about +15, London is about +45, rural US is about -20)
- Do NOT use placeholder text anywhere — every field must have real content
- Return ONLY valid JSON, no markdown

{
  "propertyEstimate": {
    "estimatedValueUSD": <integer in ${currency}>,
    "pricePerSqftUSD": <integer in ${currency}>,
    "rentEstimateMonthlyUSD": <integer in ${currency}>,
    "confidenceLevel": "<low|medium|high>",
    "priceContext": "<2 real sentences about ${neighbourhood || city} market>"
  },
  "costOfLiving": {
    "monthlyBudgetUSD": <realistic total monthly cost in ${city}>,
    "groceriesMonthlyUSD": <realistic groceries for ${city}>,
    "transportMonthlyUSD": <realistic transport for ${city}>,
    "utilitiesMonthlyUSD": <realistic utilities for ${city}>,
    "diningOutMonthlyUSD": <realistic dining for ${city}>,
    "indexVsUSAverage": <integer, % vs US average>,
    "summary": "<1-2 sentences specific to ${city} cost of living>"
  },
  "neighborhood": {
    "character": "<2-3 sentences about ${neighbourhood || city} specifically>",
    "walkScore": <0-100>,
    "transitScore": <0-100>,
    "safetyRating": <0-100>,
    "schoolRating": <0-100>,
    "pros": ["<specific local pro>", "<specific local pro>", "<specific local pro>"],
    "cons": ["<specific local con>", "<specific local con>"],
    "bestFor": "<specific demographic>"
  },
  "investment": {
    "rentYieldPercent": <realistic annual gross yield %>,
    "appreciationOutlook": "<bullish|neutral|bearish>",
    "appreciationOutlookText": "<2 sentences on ${city} market 2025-2026>",
    "investmentScore": <0-100>,
    "investmentSummary": "<2 honest sentences on this specific investment>"
  },
  "floorPlan": {
    "typicalSqft": <integer>,
    "typicalBedrooms": <integer>,
    "typicalBathrooms": <number>,
    "architecturalStyle": "<style typical to ${neighbourhood || city}>",
    "builtEra": "<decade>",
    "typicalLayout": "<1 sentence on typical layout>",
    "commonFeatures": ["<feature>", "<feature>", "<feature>", "<feature>"]
  },
  "localInsights": {
    "topAttractions": ["<specific nearby attraction>", "<specific nearby attraction>", "<specific nearby attraction>"],
    "knownFor": "<what ${neighbourhood || city} is genuinely known for>",
    "localTip": "<a real insider tip about ${neighbourhood || city}>"
  },
  "priceHistory": {
    "currency": "${currency}",
    "currencySymbol": "${currencySymbol}",
    "marketNote": "<1 sentence on recent price trend in ${city}>",
    "data": [
      {"year": 2021, "value": <integer>, "type": "historical"},
      {"year": 2022, "value": <integer>, "type": "historical"},
      {"year": 2023, "value": <integer>, "type": "historical"},
      {"year": 2024, "value": <integer>, "type": "historical"},
      {"year": 2025, "value": <integer>, "type": "projected"},
      {"year": 2026, "value": <integer>, "type": "projected"}
    ]
  }
}`

  const raw = await cerebrasChat([
    {
      role: 'system',
      content: `You are a real estate expert specializing in ${city}, ${country}. Return only valid JSON.`
    },
    { role: 'user', content: cotPrompt },
    { role: 'assistant', content: reasoning },
    { role: 'user', content: jsonPrompt }
  ], true)

  const result = JSON.parse(raw.replace(/```json|```/g, '').trim())
  return finalizeAnalysis(result, knownFacts, realData)
}

export function getAssessorLink(geo) {
  return `https://www.google.com/search?q=${encodeURIComponent((geo.userStreet || '') + ' ' + (geo.userCity || '') + ' property assessment')}`
}
export function getZillowLink(geo) {
  return `https://www.zillow.com/homes/${encodeURIComponent(geo.userStreet || '')}_rb/`
}
export function getFloorPlanSearchLink(geo) {
  return `https://www.google.com/search?q=${encodeURIComponent((geo.userStreet || '') + ' floor plan')}&tbm=isch`
}
