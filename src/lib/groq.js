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
      temperature: 0.4,
      max_tokens: 1800,
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

export async function analyzeProperty(addressData, weatherData, climateData) {
  const { displayName, address, lat, lon } = addressData
  const country = address?.country ?? ''
  const city = address?.city ?? address?.town ?? address?.village ?? ''
  const state = address?.state ?? ''

  const weatherSummary = weatherData?.current
    ? `Current: ${weatherData.current.temperature_2m}°C, ${weatherData.current.relative_humidity_2m}% humidity`
    : 'unavailable'

  const climateSummary = climateData
    ? `5yr avg high: ${climateData.avgHighC}°C, avg low: ${climateData.avgLowC}°C, avg precip: ${climateData.avgPrecipMm}mm/day`
    : 'unavailable'

  const prompt = `You are a world-class real estate and urban intelligence analyst. Given the following location, provide a detailed property intelligence report.

Location: ${displayName}
City: ${city}, ${state}, ${country}
Coordinates: ${lat}, ${lon}
Weather: ${weatherSummary}
Climate (5yr): ${climateSummary}

Respond ONLY with a valid JSON object with this exact structure:
{
  "propertyEstimate": {
    "estimatedValueUSD": number,
    "pricePerSqftUSD": number,
    "rentEstimateMonthlyUSD": number,
    "confidenceLevel": "low" | "medium" | "high",
    "priceContext": "string (1-2 sentences on why this price)"
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
    "character": "string (2-3 sentences describing the vibe)",
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
    "typicalLayout": "string (describe the typical floor plan layout for this area)",
    "commonFeatures": ["string", "string", "string", "string"]
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
