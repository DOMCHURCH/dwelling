// src/lib/areaAnalysis.js
// Aggregates listing data into area intelligence metrics
// Computes composite risk score, market temperature, and investment signals

/**
 * Aggregate raw listings into area market metrics
 * @param {Array} listings - array of { price, pricePerSqft, daysOnMarket, beds, baths, sqft, status }
 * @returns {Object} aggregated market metrics
 */
export function aggregateListings(listings) {
  if (!listings || listings.length === 0) return null

  const prices = listings.map(l => l.price).filter(p => p > 50000).sort((a, b) => a - b)
  const doms   = listings.map(l => l.daysOnMarket).filter(d => d != null && d >= 0)
  const ppsfs  = listings.map(l => l.pricePerSqft).filter(p => p > 0)

  if (prices.length === 0) return null

  const median = arr => {
    const s = [...arr].sort((a, b) => a - b)
    const m = Math.floor(s.length / 2)
    return s.length % 2 === 0 ? (s[m - 1] + s[m]) / 2 : s[m]
  }
  const mean = arr => arr.reduce((a, b) => a + b, 0) / arr.length
  const stdDev = arr => {
    const m = mean(arr)
    return Math.sqrt(arr.reduce((sum, x) => sum + (x - m) ** 2, 0) / arr.length)
  }

  const medianPrice    = Math.round(median(prices))
  const avgPrice       = Math.round(mean(prices))
  const minPrice       = prices[0]
  const maxPrice       = prices[prices.length - 1]
  const priceStdDev    = stdDev(prices)
  const priceCV        = priceStdDev / avgPrice // coefficient of variation = volatility
  const medianDOM      = doms.length > 0 ? Math.round(median(doms)) : null
  const medianPPSF     = ppsfs.length > 0 ? Math.round(median(ppsfs)) : null

  // Price tiers
  const p25 = prices[Math.floor(prices.length * 0.25)]
  const p75 = prices[Math.floor(prices.length * 0.75)]

  // % of listings with DOM > 60 (slow/stale)
  const slowListings = doms.filter(d => d > 60).length
  const slowPct = doms.length > 0 ? slowListings / doms.length : 0

  // % of listings with DOM < 14 (hot market signal)
  const fastListings = doms.filter(d => d <= 14).length
  const fastPct = doms.length > 0 ? fastListings / doms.length : 0

  return {
    count: listings.length,
    medianPrice,
    avgPrice,
    minPrice,
    maxPrice,
    priceRange: { low: p25, high: p75 },
    priceVolatility: Math.round(priceCV * 100) / 100, // 0 = stable, >0.3 = volatile
    medianDOM,
    medianPPSF,
    slowListingPct: Math.round(slowPct * 100),  // % sitting > 60 days
    fastListingPct: Math.round(fastPct * 100),  // % selling < 14 days
  }
}

/**
 * Compute composite risk score (0 = very risky, 100 = very safe/stable)
 * Based on: price volatility, days on market, slow listing %, market data
 */
export function computeRiskScore(metrics, marketData) {
  if (!metrics) return null

  let score = 100
  const factors = []

  // 1. Price volatility (CV > 0.25 is high, > 0.4 is very high)
  const cv = metrics.priceVolatility || 0
  if (cv > 0.4) {
    score -= 25
    factors.push({ label: 'High price volatility', impact: -25, icon: '📉' })
  } else if (cv > 0.25) {
    score -= 12
    factors.push({ label: 'Moderate price spread', impact: -12, icon: '📊' })
  } else {
    factors.push({ label: 'Stable pricing', impact: 0, icon: '✅' })
  }

  // 2. Days on market (higher = weaker demand)
  const dom = metrics.medianDOM
  if (dom !== null) {
    if (dom > 90) {
      score -= 25
      factors.push({ label: `Slow sales (${dom} days avg)`, impact: -25, icon: '🐌' })
    } else if (dom > 45) {
      score -= 12
      factors.push({ label: `Below-average velocity (${dom} days)`, impact: -12, icon: '⏱' })
    } else if (dom < 14) {
      score += 5
      factors.push({ label: `Hot market (${dom} days avg)`, impact: +5, icon: '🔥' })
    } else {
      factors.push({ label: `Normal market pace (${dom} days)`, impact: 0, icon: '✅' })
    }
  }

  // 3. Stale listing percentage
  if (metrics.slowListingPct > 40) {
    score -= 15
    factors.push({ label: `${metrics.slowListingPct}% of listings stale (>60 days)`, impact: -15, icon: '📦' })
  } else if (metrics.slowListingPct > 20) {
    score -= 7
    factors.push({ label: `${metrics.slowListingPct}% of listings slow-moving`, impact: -7, icon: '⚠️' })
  }

  // 4. YoY price trend from market data
  if (marketData?.yoy != null) {
    if (marketData.yoy < -5) {
      score -= 20
      factors.push({ label: `Price decline ${marketData.yoy}% YoY`, impact: -20, icon: '📉' })
    } else if (marketData.yoy < -2) {
      score -= 10
      factors.push({ label: `Softening prices ${marketData.yoy}% YoY`, impact: -10, icon: '📉' })
    } else if (marketData.yoy > 5) {
      score += 5
      factors.push({ label: `Strong appreciation ${marketData.yoy}% YoY`, impact: +5, icon: '📈' })
    } else if (marketData.yoy > 0) {
      factors.push({ label: `Positive trend +${marketData.yoy}% YoY`, impact: 0, icon: '✅' })
    }
  }

  // 5. Fast listing % (demand signal)
  if (metrics.fastListingPct > 30) {
    score += 5
    factors.push({ label: `${metrics.fastListingPct}% of homes sell in <2 weeks`, impact: +5, icon: '🚀' })
  }

  const finalScore = Math.max(0, Math.min(100, score))

  const getRating = (s) => {
    if (s >= 75) return { label: 'Stable Market', color: '#4ade80', emoji: '🟢' }
    if (s >= 50) return { label: 'Transitional Market', color: '#fbbf24', emoji: '🟡' }
    if (s >= 30) return { label: 'Soft Market', color: '#fb923c', emoji: '🟠' }
    return { label: 'High Risk Market', color: '#f87171', emoji: '🔴' }
  }

  return {
    score: finalScore,
    ...getRating(finalScore),
    factors,
  }
}

/**
 * Determine market temperature from DOM and fast listing %
 */
export function getMarketTemperature(metrics) {
  if (!metrics) return null
  const dom = metrics.medianDOM
  const fastPct = metrics.fastListingPct

  if (dom !== null && dom < 20 && fastPct > 25) return { label: "Seller's Market 🔥", color: '#f87171' }
  if (dom !== null && dom < 35) return { label: 'Competitive Market', color: '#fb923c' }
  if (dom !== null && dom > 75) return { label: "Buyer's Market 🎯", color: '#4ade80' }
  return { label: 'Balanced Market', color: '#a78bfa' }
}

/**
 * Format area metrics as context string for AI prompt
 */
export function formatAreaContextForPrompt(metrics, riskScore, marketTemp, city, country) {
  if (!metrics) return ''

  const fmt = (n) => n != null ? `$${Math.round(n).toLocaleString()}` : 'N/A'

  return `
AREA MARKET DATA (aggregated from ${metrics.count} active listings in ${city}, ${country}):
- Median listing price: ${fmt(metrics.medianPrice)}
- Average listing price: ${fmt(metrics.avgPrice)}
- Price range (25th-75th percentile): ${fmt(metrics.priceRange?.low)} – ${fmt(metrics.priceRange?.high)}
- Median price per sqft: ${metrics.medianPPSF ? fmt(metrics.medianPPSF) + '/sqft' : 'N/A'}
- Median days on market: ${metrics.medianDOM != null ? metrics.medianDOM + ' days' : 'N/A'}
- Slow listings (>60 days): ${metrics.slowListingPct}%
- Fast listings (<14 days): ${metrics.fastListingPct}%
- Price volatility (CV): ${metrics.priceVolatility}
- Market temperature: ${marketTemp?.label || 'Unknown'}
- Composite stability score: ${riskScore?.score}/100 — ${riskScore?.label || 'Unknown'}

Do NOT estimate a single property value. Instead, analyze what these market signals mean for someone considering living or investing in this area. Focus on: demand dynamics, price trends, investment potential, and whether now is a good time to buy vs wait.`
}
