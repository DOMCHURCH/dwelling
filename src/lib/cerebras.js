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

async function cerebrasChat(messages, json = false, skipCount = false) {
  const token = await getAuthToken()
  if (!token) throw new Error('Not authenticated. Please sign in again.')

  const res = await fetch(CEREBRAS_BASE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...(skipCount && { 'X-Skip-Count': 'true' }),
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      temperature: 0.15,
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

function finalizeAnalysis(est, known, realData) {
  if (known.sqft)  est.floorPlan.typicalSqft     = known.sqft
  if (known.beds)  est.floorPlan.typicalBedrooms  = known.beds
  if (known.baths) est.floorPlan.typicalBathrooms = known.baths

  if (known.purchasePrice && known.purchasePrice > 0) {
    const years = Math.max(0, 2025 - (known.yearPurchased || 2022))
    est.propertyEstimate.estimatedValueUSD = Math.round(known.purchasePrice * Math.pow(1.04, years))
    est.propertyEstimate.confidenceLevel = 'high'
  }

  const sqft = est.floorPlan.typicalSqft
  const val  = est.propertyEstimate.estimatedValueUSD
  if (sqft > 0 && val > 0) {
    est.propertyEstimate.pricePerSqftUSD = Math.round(val / sqft)
  }

  const annualRent = (est.propertyEstimate.rentEstimateMonthlyUSD || 0) * 12
  const yieldPct   = val > 0 ? (annualRent / val) * 100 : 0
  if (yieldPct < 2.5 || yieldPct > 7) {
    est.propertyEstimate.rentEstimateMonthlyUSD = Math.round((val * 0.04) / 12)
  }

  if (realData.neighborhoodScores) {
    est.neighborhood.walkScore    = realData.neighborhoodScores.walkScore
    est.neighborhood.transitScore = realData.neighborhoodScores.transitScore
    est.neighborhood.schoolRating = realData.neighborhoodScores.schoolScore
  }

  if (est.priceHistory?.data?.length && val > 0) {
    const m = { 2022:0.88, 2023:0.93, 2024:0.97, 2025:1.0, 2026:1.04, 2027:1.07 }
    est.priceHistory.data = est.priceHistory.data.map(d => ({
      ...d,
      value: Math.round(val * (m[d.year] || 1.0)),
      type: d.year >= 2025 ? 'projected' : 'historical',
    }))
  }

  return est
}

export async function analyzeProperty(geoData, weatherData, climateData, knownFacts = {}, realData = {}) {
  const street        = geoData.userStreet  || geoData.address?.road        || ''
  const city          = geoData.userCity    || geoData.address?.city         || ''
  const country       = geoData.userCountry || geoData.address?.country      || ''
  const neighbourhood = geoData.address?.neighbourhood || geoData.address?.suburb || ''
  const postcode      = geoData.address?.postcode || ''

  const isCanada = country.toLowerCase().includes('canada')
  const isUK     = country.toLowerCase().includes('united kingdom') || country.toLowerCase().includes('england')
  const currency = isCanada ? 'CAD' : isUK ? 'GBP' : 'USD'
  const currencySymbol = isUK ? '£' : '$'

  const dataContext = [
    realData.censusData?.medianHomeValueUSD
      ? `Census median home value: ${currency} ${Math.round(realData.censusData.medianHomeValueUSD * (isCanada ? 1.35 : 1)).toLocaleString()}`
      : '',
    realData.censusData?.medianGrossRentUSD
      ? `Census median rent: ${currency} ${Math.round(realData.censusData.medianGrossRentUSD * (isCanada ? 1.35 : 1)).toLocaleString()}/mo`
      : '',
    realData.fmr?.rent_50_2
      ? `Fair Market Rent (2BR): ${currency} ${realData.fmr.rent_50_2}/mo`
      : '',
    knownFacts.sqft         ? `Known sqft: ${knownFacts.sqft}`                                          : '',
    knownFacts.beds         ? `Known bedrooms: ${knownFacts.beds}`                                      : '',
    knownFacts.baths        ? `Known bathrooms: ${knownFacts.baths}`                                    : '',
    knownFacts.purchasePrice? `Purchase price: ${currency} ${knownFacts.purchasePrice.toLocaleString()}`: '',
  ].filter(Boolean).join('\n')

  // Pass 1: chain-of-thought reasoning
  const cotPrompt = `You are a senior real estate appraiser and local market expert with 20 years of experience in ${city}, ${country}.

PROPERTY: ${street}${neighbourhood ? ', ' + neighbourhood : ''}, ${city}, ${country} ${postcode}

REAL DATA AVAILABLE:
${dataContext || 'No additional data — use your deep knowledge of this local market.'}

Think through this property carefully before producing any numbers. Work through each step:

STEP 1 — MARKET TIER
Is ${neighbourhood || city} luxury, premium, standard, or affordable? How does it compare to the broader ${city} market? What kinds of buyers live here and why?

STEP 2 — PROPERTY PROFILE
What type of home is most common at this address — detached, semi-detached, condo, townhouse? What era were most homes built? What is the typical size, layout, and architectural character of homes in ${neighbourhood || city}?

STEP 3 — VALUATION
What is the realistic price per sqft for this specific neighbourhood right now in ${currency}? Show your math: sqft × ppsf = estimated value. Cross-check against any census or market data provided. What is a confident but honest estimate?

STEP 4 — COST OF LIVING
What does a household actually spend per month in ${city}? Give specific numbers for groceries, transport, utilities, and dining. Is ${city} more or less expensive than the US average and by how much?

STEP 5 — INVESTMENT OUTLOOK
What is the realistic gross rent yield for this type of property? Is the ${city} market bullish, neutral, or bearish heading into 2025-2026 and why? What are the specific risks and opportunities?

STEP 6 — LOCAL CHARACTER
What makes ${neighbourhood || city} genuinely unique? What do residents love about it? What are the real downsides? What specific attractions, schools, and amenities are nearby?

End your reasoning with: READY_FOR_JSON`

  const reasoning = await cerebrasChat([
    {
      role: 'system',
      content: `You are a professional real estate appraiser and local market expert specializing in ${city}, ${country}. You give precise, locally-grounded analysis with specific numbers. You never use placeholder text or generic descriptions. You think carefully before concluding.`
    },
    { role: 'user', content: cotPrompt }
  ])

  // Pass 2: structured JSON using the reasoning as context
  const jsonPrompt = `Based on your detailed analysis above, produce the final property intelligence report as a JSON object.

QUALITY RULES — every field must meet these standards:
- priceContext: 3-4 sentences. Explain what specifically drives value in ${neighbourhood || city}, mention comparable sales or price trends, and give honest context about market conditions.
- neighborhood.character: 3-4 sentences. Describe the actual feel and demographics of ${neighbourhood || city}, not generic praise. Include what makes it distinct from other parts of ${city}.
- investment summary: 3-4 sentences. Give a real, honest opinion — mention specific risks, rental demand drivers, and who this property suits as an investment.
- appreciationOutlookText: 3 sentences on the specific ${city} market outlook for 2025-2026, including interest rate context, supply/demand, and any local government or development factors.
- costOfLiving summary: 2-3 sentences specific to ${city} — compare to nearby cities, mention what drives costs up or down locally.
- localInsights.knownFor: a vivid, specific 1-2 sentence description, not a list.
- localInsights.localTip: a genuine insider tip that only someone who knows ${neighbourhood || city} well would know.
- All monetary values in ${currency}
- indexVsUSAverage: INTEGER only — % difference from US average (Ottawa ~+15, London UK ~+45, rural US ~-25, NYC ~+65)
- Return ONLY valid JSON, no markdown, no explanation

{
  "propertyEstimate": {
    "estimatedValueUSD": <integer, realistic market value in ${currency}>,
    "pricePerSqftUSD": <integer, local price per sqft in ${currency}>,
    "rentEstimateMonthlyUSD": <integer, realistic monthly rent in ${currency}>,
    "confidenceLevel": "<low|medium|high>",
    "priceContext": "<3-4 sentences on ${neighbourhood || city} market with specific price context>"
  },
  "costOfLiving": {
    "monthlyBudgetUSD": <realistic total monthly cost in ${city}>,
    "groceriesMonthlyUSD": <realistic monthly groceries for ${city}>,
    "transportMonthlyUSD": <realistic monthly transport for ${city}>,
    "utilitiesMonthlyUSD": <realistic monthly utilities for ${city}>,
    "diningOutMonthlyUSD": <realistic monthly dining for ${city}>,
    "indexVsUSAverage": <integer % vs US average>,
    "summary": "<2-3 sentences specific to ${city} cost of living>"
  },
  "neighborhood": {
    "character": "<3-4 sentences describing ${neighbourhood || city} specifically — feel, demographics, what makes it distinct>",
    "walkScore": <0-100>,
    "transitScore": <0-100>,
    "safetyRating": <0-100>,
    "schoolRating": <0-100>,
    "pros": ["<specific local pro>", "<specific local pro>", "<specific local pro>"],
    "cons": ["<specific local con>", "<specific local con>"],
    "bestFor": "<specific demographic with reason>"
  },
  "investment": {
    "rentYieldPercent": <realistic annual gross yield %>,
    "appreciationOutlook": "<bullish|neutral|bearish>",
    "appreciationOutlookText": "<3 sentences on ${city} 2026-2027 outlook with specific factors>",
    "investmentScore": <0-100>,
    "investmentSummary": "<3-4 sentences of honest investment analysis — risks, opportunities, who it suits>"
  },
  "floorPlan": {
    "typicalSqft": <integer>,
    "typicalBedrooms": <integer>,
    "typicalBathrooms": <number>,
    "architecturalStyle": "<style typical to ${neighbourhood || city}>",
    "builtEra": "<decade or range>",
    "typicalLayout": "<2 sentences describing typical layout and character of homes in ${neighbourhood || city}>",
    "commonFeatures": ["<feature>", "<feature>", "<feature>", "<feature>", "<feature>"]
  },
  "localInsights": {
    "topAttractions": ["<specific nearby attraction>", "<specific nearby attraction>", "<specific nearby attraction>"],
    "knownFor": "<vivid 1-2 sentence description of what makes ${neighbourhood || city} genuinely distinctive>",
    "localTip": "<a real insider tip only a local would know about ${neighbourhood || city}>"
  },
  "priceHistory": {
    "currency": "${currency}",
    "currencySymbol": "${currencySymbol}",
    "marketNote": "<2 sentences on recent price trends and what drove them in ${city}>",
    "data": [
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
      content: `You are a professional real estate appraiser specializing in ${city}, ${country}. You write detailed, specific, locally-grounded reports. Every field must be substantive — no generic filler. Return only valid JSON.`
    },
    { role: 'user', content: cotPrompt },
    { role: 'assistant', content: reasoning },
    { role: 'user', content: jsonPrompt }
  ], true, true)

  if (!raw || typeof raw !== 'string') throw new Error('AI returned an empty response. Please try again.')
  let result
  try {
    result = JSON.parse(raw.replace(/```json|```/g, '').trim())
  } catch {
    throw new Error('AI response could not be parsed. Please try again.')
  }
  if (!result?.propertyEstimate) throw new Error('AI response was incomplete. Please try again.')

  // Sanitize — model returns strings like "2,500,000" or "$1.2M" — strip and parse
  const toNum = (v) => {
    if (typeof v === 'number') return Math.round(v)
    if (!v) return 0
    const s = String(v).replace(/[^0-9.]/g, '') // strip $, commas, CAD, spaces
    const n = parseFloat(s)
    return isNaN(n) ? 0 : Math.round(n)
  }
  const p = result.propertyEstimate
  p.estimatedValueUSD      = toNum(p.estimatedValueUSD)
  p.pricePerSqftUSD        = toNum(p.pricePerSqftUSD)
  p.rentEstimateMonthlyUSD = toNum(p.rentEstimateMonthlyUSD)
  const c = result.costOfLiving
  c.monthlyBudgetUSD    = toNum(c.monthlyBudgetUSD)
  c.groceriesMonthlyUSD = toNum(c.groceriesMonthlyUSD)
  c.transportMonthlyUSD = toNum(c.transportMonthlyUSD)
  c.utilitiesMonthlyUSD = toNum(c.utilitiesMonthlyUSD)
  c.diningOutMonthlyUSD = toNum(c.diningOutMonthlyUSD)
  c.indexVsUSAverage    = toNum(c.indexVsUSAverage)
  result.floorPlan.typicalSqft = toNum(result.floorPlan.typicalSqft) || 1500

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
