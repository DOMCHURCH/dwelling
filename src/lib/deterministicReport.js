/**
 * deterministicReport.js
 * Zero-cost report engine — produces full reports using heuristics only.
 * NO API calls. Safe fallbacks for all missing metrics.
 */

function normalize(value, min, max) {
  if (value == null || isNaN(value)) return 0.5
  return Math.max(0, Math.min(1, (value - min) / (max - min)))
}

function computeInvestmentScore(areaMetrics = {}) {
  const {
    priceGrowth1yr = 0,
    vacancyRate = 5,
    medianHHIncome = 70000,
    crimeIndex = 50,
    schoolScore = 60,
  } = areaMetrics

  const scores = {
    priceGrowth: normalize(priceGrowth1yr, -5, 15) * 0.30,
    vacancy:     (1 - normalize(vacancyRate, 0, 15)) * 0.20,
    income:      normalize(medianHHIncome, 40000, 120000) * 0.20,
    crime:       (1 - normalize(crimeIndex, 0, 100)) * 0.15,
    school:      normalize(schoolScore, 0, 100) * 0.15,
  }

  return Math.round(Object.values(scores).reduce((sum, s) => sum + s, 0) * 100)
}

function deriveVerdict(score) {
  if (score >= 70) return { label: 'BUY',   confidence: 'High',   riskLevel: 'Low'    }
  if (score >= 45) return { label: 'HOLD',  confidence: 'Medium', riskLevel: 'Medium' }
  return             { label: 'AVOID', confidence: 'High',   riskLevel: 'High'   }
}

function deriveMarketHeat(areaMetrics = {}) {
  const growth = areaMetrics.priceGrowth1yr ?? 0
  const vacancy = areaMetrics.vacancyRate ?? 5
  if (growth > 8 || vacancy < 2) return 'hot'
  if (growth < 0 || vacancy > 8) return 'cold'
  return 'medium'
}

function buildEst(areaMetrics = {}) {
  return {
    medianValue:    areaMetrics.medianPrice      ?? 650000,
    pricePerSqft:   areaMetrics.pricePerSqft     ?? 700,
    rentPerMonth:   areaMetrics.avgRent          ?? 2200,
    confidence:     areaMetrics.dataConfidence   ?? 72,
    compsAnalyzed:  areaMetrics.listingsAnalyzed ?? 12,
  }
}

function buildCostOfLiving(areaMetrics = {}) {
  const rent = areaMetrics.avgRent ?? 2200
  const index = areaMetrics.colIndex ?? 105
  return {
    index,
    rentAvg:    rent,
    groceries:  Math.round(rent * 0.18),
    transport:  Math.round(rent * 0.12),
    utilities:  Math.round(rent * 0.08),
    summary:    index > 110
      ? 'Cost of living is above the national average.'
      : index < 95
      ? 'Cost of living is below the national average.'
      : 'Cost of living is near the national average.',
  }
}

function buildPriceHistory(areaMetrics = {}) {
  const currentPrice = areaMetrics.medianPrice ?? 650000
  const growth = areaMetrics.priceGrowth1yr ?? 3
  const currentYear = new Date().getFullYear()

  // Build 4 data points working backward
  const data = [0, 1, 2, 3].map(yearsAgo => ({
    year: currentYear - yearsAgo,
    medianPrice: Math.round(currentPrice / Math.pow(1 + growth / 100, yearsAgo)),
  })).reverse()

  return { data, projections: null }
}

export function buildDeterministicReport({ geo, weather, neighborhood, areaMetrics, climate } = {}) {
  const score = computeInvestmentScore(areaMetrics)

  return {
    geo,
    weather,
    climate,
    neighborhood,
    est:          buildEst(areaMetrics),
    investment: {
      score,
      verdict:        deriveVerdict(score),
      roiEstimate:    null,
      priceTrajectory: null,
    },
    costOfLiving:  buildCostOfLiving(areaMetrics),
    priceHistory:  buildPriceHistory(areaMetrics),
    marketHeat:    deriveMarketHeat(areaMetrics),
    risk:          null,
    aiSummary:     null,
    isDeterministic: true,
  }
}
