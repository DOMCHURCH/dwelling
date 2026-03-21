// api/exchange.js
// Fetches live exchange rates using Frankfurter API — completely free, no key needed
// Frankfurter is maintained by the European Central Bank
// https://www.frankfurter.app

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  // Cache for 1 hour — rates don't change that fast
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate')
  if (req.method === 'OPTIONS') return res.status(204).end()

  const { base = 'USD' } = req.query

  try {
    // Frankfurter API — ECB rates, free, no key, updates daily
    const url = `https://api.frankfurter.app/latest?from=${base.toUpperCase()}`
    const response = await fetch(url)
    if (!response.ok) throw new Error(`Frankfurter API error: ${response.status}`)
    const data = await response.json()

    // Add the base currency itself as 1.0
    const rates = { ...data.rates, [data.base]: 1.0 }

    return res.status(200).json({
      base: data.base,
      date: data.date,
      rates,
    })
  } catch (err) {
    console.error('Exchange rate error:', err.message)
    // Return hardcoded fallback rates if API fails
    return res.status(200).json({
      base: 'USD',
      date: new Date().toISOString().split('T')[0],
      rates: getFallbackRates(base.toUpperCase()),
      fallback: true,
    })
  }
}

function getFallbackRates(base) {
  // Approximate rates as of early 2025 — used only if API is down
  const usdRates = {
    USD: 1.0,
    CAD: 1.38,
    GBP: 0.79,
    EUR: 0.92,
    AUD: 1.55,
    NZD: 1.68,
    JPY: 149.5,
    CHF: 0.89,
    CNY: 7.24,
    INR: 83.1,
    MXN: 17.2,
    BRL: 4.97,
    KRW: 1325.0,
    SGD: 1.34,
    HKD: 7.82,
    SEK: 10.4,
    NOK: 10.6,
    DKK: 6.88,
    ZAR: 18.6,
    AED: 3.67,
    SAR: 3.75,
    THB: 35.1,
    MYR: 4.72,
    IDR: 15650.0,
    PHP: 56.5,
    TRY: 32.2,
    PLN: 4.02,
    CZK: 23.1,
    HUF: 357.0,
    ILS: 3.67,
    CLP: 945.0,
    COP: 3920.0,
    PEN: 3.72,
    ARS: 860.0,
  }

  if (base === 'USD') return usdRates

  // Convert from USD base to requested base
  const baseRate = usdRates[base] || 1.0
  const converted = {}
  for (const [currency, rate] of Object.entries(usdRates)) {
    converted[currency] = Math.round((rate / baseRate) * 10000) / 10000
  }
  return converted
}
