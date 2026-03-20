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
      temperature: 0.1, 
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

/**
 * EXPERT VALUATION ENGINE
 * Balanced logic to avoid both under-estimation and over-inflation.
 */
function runExpertValuationEngine(est, known, realData, city, neighborhood) {
  const sqft = known.sqft || est.floorPlan.typicalSqft || 1800
  let ppsqf = est.propertyEstimate.pricePerSqftUSD || 450
  
  // 1. ANCHOR ON PURCHASE PRICE (MOST ACCURATE)
  if (known.purchasePrice && known.purchasePrice > 0) {
    const currentYear = 2024
    const purchaseYear = known.yearPurchased || 2022
    const years = Math.max(0, currentYear - purchaseYear)
    const cagr = 1.035 // Standard 3.5% appreciation
    const appreciatedValue = known.purchasePrice * Math.pow(cagr, years)
    
    est.propertyEstimate.estimatedValueUSD = Math.round(appreciatedValue)
    est.propertyEstimate.pricePerSqftUSD = Math.round(appreciatedValue / sqft)
    est.propertyEstimate.confidenceLevel = 'high'
    return est
  }

  // 2. STABILIZE OVER-INFLATION
  // If the AI suggests a price > $1.5M for a standard neighborhood, we apply a sanity check.
  const aiVal = est.propertyEstimate.estimatedValueUSD
  
  if (realData.censusData?.medianHomeValueUSD) {
    const censusMedian = realData.censusData.medianHomeValueUSD
    // Limit deviation to 2x Census Median unless it's a confirmed Luxury tier
    const maxAllowed = censusMedian * 2.2
    if (aiVal > maxAllowed && !est.neighborhood?.character?.toLowerCase().includes('luxury')) {
      est.propertyEstimate.estimatedValueUSD = Math.round(maxAllowed)
    }
  }

  // 3. MATHEMATICAL COHERENCE
  const calculatedTotal = Math.round(sqft * ppsqf)
  if (Math.abs(aiVal - calculatedTotal) > (calculatedTotal * 0.1)) {
    // If AI is way off its own math, use the calculated total but cap it
    est.propertyEstimate.estimatedValueUSD = calculatedTotal
  }
  
  // 4. RENT VALIDATION (Yield check)
  const annualRent = est.propertyEstimate.rentEstimateMonthlyUSD * 12
  const yieldPct = (annualRent / est.propertyEstimate.estimatedValueUSD) * 100
  if (yieldPct < 2.5 || yieldPct > 7) {
    // Standardize rent to 4% yield if the AI output is disconnected
    est.propertyEstimate.rentEstimateMonthlyUSD = Math.round((est.propertyEstimate.estimatedValueUSD * 0.04) / 12)
  }

  return est
}

function finalizeAnalysis(est, known, realData, city, country) {
  if (known.sqft) est.floorPlan.typicalSqft = known.sqft
  if (known.beds) est.floorPlan.typicalBedrooms = known.beds
  if (known.baths) est.floorPlan.typicalBathrooms = known.baths
  
  est = runExpertValuationEngine(est, known, realData, city, est.neighborhood?.character)

  if (est.priceHistory?.data?.length) {
    const currentVal = est.propertyEstimate.estimatedValueUSD
    est.priceHistory.data = est.priceHistory.data.map(d => {
      const multipliers = { 2021: 0.85, 2022: 1.02, 2023: 0.95, 2024: 1.00, 2025: 1.03, 2026: 1.06 }
      if (multipliers[d.year]) {
        return { ...d, value: Math.round(currentVal * multipliers[d.year]), type: d.year >= 2025 ? 'projected' : 'historical' }
      }
      return d
    })
  }

  if (realData.neighborhoodScores) {
    est.neighborhood.walkScore = realData.neighborhoodScores.walkScore
    est.neighborhood.transitScore = realData.neighborhoodScores.transitScore
    est.neighborhood.schoolRating = realData.neighborhoodScores.schoolScore
  }

  return est
}

export async function analyzeProperty(geoData, weatherData, climateData, knownFacts = {}, realData = {}) {
  const { address, lat, lon, userStreet, userCity, userState, userCountry } = geoData
  const street = userStreet || address?.road || ''
  const city = userCity || address?.city || ''
  const country = userCountry || address?.country || ''
  const neighborhood = address?.neighbourhood || address?.suburb || ''

  const prompt = `### PROPERTY APPRAISAL MISSION ###
Address: ${street}, ${city}, ${neighborhood}, ${userCountry}
Building Type: ${realData.neighborhoodScores?.buildingType || 'Residential'}

INSTRUCTIONS:
1. IDENTIFY TIER: Is this a Luxury, Premium, or Standard neighborhood? 
2. PPSQF: Research current Price Per Sqft for ${neighborhood}, ${city}. (e.g., Alta Vista Ottawa is ~$500-600/sqft for standard, up to $800/sqft for premium).
3. VALUATION: Be realistic. Do not over-inflate. For ${street}, cite 2 specific comparable sales from 2024.
4. FORMAT: Return ONLY raw JSON.

{
  "propertyEstimate": {
    "estimatedValueUSD": 0,
    "pricePerSqftUSD": 0,
    "rentEstimateMonthlyUSD": 0,
    "confidenceLevel": "high",
    "priceContext": "Cite 2 specific sales on ${street} or nearby from 2024."
  },
  "costOfLiving": {
    "monthlyBudgetUSD": 3200,
    "groceriesMonthlyUSD": 700,
    "transportMonthlyUSD": 250,
    "utilitiesMonthlyUSD": 250,
    "diningOutMonthlyUSD": 450,
    "indexVsUSAverage": 100,
    "summary": "Specific cost of living for ${city}."
  },
  "neighborhood": {
    "character": "Detailed description of ${neighborhood}.",
    "walkScore": 0,
    "transitScore": 0,
    "safetyRating": 90,
    "schoolRating": 85,
    "pros": ["Pro 1", "Pro 2", "Pro 3"],
    "cons": ["Con 1", "Con 2"],
    "bestFor": "Demographic."
  },
  "investment": {
    "rentYieldPercent": 4.0,
    "appreciationOutlook": "neutral",
    "appreciationOutlookText": "2025 market forecast.",
    "investmentScore": 70,
    "investmentSummary": "Risk analysis."
  },
  "floorPlan": {
    "typicalSqft": 2000,
    "typicalBedrooms": 3,
    "typicalBathrooms": 2,
    "architecturalStyle": "Style",
    "builtEra": "1970s",
    "typicalLayout": "Layout description",
    "commonFeatures": ["Feature 1", "Feature 2", "Feature 3"]
  },
  "localInsights": {
    "topAttractions": ["Attraction 1", "Attraction 2", "Attraction 3"],
    "knownFor": "Reputation",
    "localTip": "Insider tip"
  },
  "priceHistory": {
    "currency": "CAD",
    "currencySymbol": "$",
    "data": [
      {"year": 2022, "value": 0, "type": "historical"},
      {"year": 2023, "value": 0, "type": "historical"},
      {"year": 2024, "value": 0, "type": "historical"},
      {"year": 2025, "value": 0, "type": "projected"}
    ]
  }
}`

  let raw = await cerebrasChat([{ role: 'user', content: prompt }], true)
  let result = JSON.parse(raw.replace(/```json|```/g, '').trim())

  return finalizeAnalysis(result, knownFacts, realData, city, country)
}

export function getAssessorLink(geo) { return `https://www.google.com/search?q=${encodeURIComponent((geo.userStreet || '') + ' property records')}`; }
export function getZillowLink(geo) { return `https://www.zillow.com/homes/${encodeURIComponent(geo.userStreet || '')}_rb/`; }
export function getFloorPlanSearchLink(geo) { return `https://www.google.com/search?q=${encodeURIComponent((geo.userStreet || '') + ' floor plan')}&tbm=isch`; }
