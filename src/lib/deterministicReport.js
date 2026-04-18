/**
 * deterministicReport.js
 * Zero-cost report engine — produces full reports using heuristics only.
 * Output shape mirrors the AI response so Dashboard renders without changes.
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

function deriveOutlook(score) {
  if (score >= 70) return 'bullish'
  if (score >= 45) return 'neutral'
  return 'bearish'
}

export function buildDeterministicReport({ geo, weather, neighborhood, areaMetrics, climate } = {}) {
  const am = areaMetrics || {}
  const score = computeInvestmentScore(am)
  const verdict = deriveVerdict(score)
  const outlook = deriveOutlook(score)

  const medianPrice = am.medianPrice ?? 650_000
  const rent = am.avgRent ?? 2_200
  const pricePerSqft = am.pricePerSqft ?? Math.round(medianPrice / 1000)
  const growth = am.priceGrowth1yr ?? 3
  const colIndex = am.colIndex ?? 105
  const currentYear = new Date().getFullYear()

  const rentYield = medianPrice > 0 ? +((rent * 12 / medianPrice) * 100).toFixed(1) : 4.0

  // Price history — 4 historical years + 2 projected
  const histData = [3, 2, 1, 0].map(yearsAgo => ({
    year: currentYear - yearsAgo,
    value: Math.round(medianPrice / Math.pow(1 + growth / 100, yearsAgo)),
    type: 'historical',
  }))
  const projData = [1, 2].map(yearsAhead => ({
    year: currentYear + yearsAhead,
    value: Math.round(medianPrice * Math.pow(1 + growth / 100, yearsAhead)),
    type: 'projected',
  }))

  const colSummary = colIndex > 110
    ? 'Cost of living is above the national average.'
    : colIndex < 95
    ? 'Cost of living is below the national average.'
    : 'Cost of living is near the national average.'

  return {
    propertyEstimate: {
      estimatedValueUSD:       medianPrice,
      pricePerSqftUSD:         pricePerSqft,
      rentEstimateMonthlyUSD:  rent,
      confidenceScore:         am.dataConfidence ?? 68,
      confidenceLevel:         'medium',
      compsAnalyzed:           am.listingsAnalyzed ?? am.count ?? 10,
      compsUsed:               am.listingsAnalyzed ?? am.count ?? 10,
      dataQuality:             'estimated',
    },
    costOfLiving: {
      index:                   colIndex,
      indexVsUSAverage:        colIndex - 100,
      monthlyBudgetUSD:        Math.round(rent + rent * 0.38),
      rentEstimateMonthlyUSD:  rent,
      groceriesMonthlyUSD:     Math.round(rent * 0.18),
      transportMonthlyUSD:     Math.round(rent * 0.12),
      utilitiesMonthlyUSD:     Math.round(rent * 0.08),
      diningOutMonthlyUSD:     Math.round(rent * 0.14),
      summary:                 colSummary,
    },
    neighborhood: {
      walkScore:    neighborhood?.walkScore   ?? 55,
      transitScore: neighborhood?.transitScore ?? 45,
      schoolRating: neighborhood?.schoolScore  ?? neighborhood?.schoolRating ?? 55,
      safetyScore:  neighborhood?.safetyScore  ?? neighborhood?.safetyRating ?? 55,
    },
    investment: {
      investmentScore:          score,
      appreciationOutlook:      outlook,
      appreciationOutlookText:  `Market fundamentals suggest a ${outlook} outlook for this area.`,
      investmentSummary:        `Based on available data, this area ${score >= 70 ? 'presents a solid investment opportunity' : score >= 45 ? 'warrants a hold-and-monitor approach' : 'carries elevated risk for investors'}.`,
      rentYieldPercent:         rentYield,
      capRatePercent:           +(rentYield * 0.85).toFixed(1),
      verdict,
      roiEstimate:              null,
      priceTrajectory:          growth,
    },
    priceHistory: {
      currency: 'CAD',
      data: [...histData, ...projData],
      marketNote: `Based on ${am.count ?? 'available'} local listings.`,
    },
    areaIntelligence: {
      verdict:          score >= 70 ? 'Good' : score >= 45 ? 'Fair' : 'Caution',
      verdictReason:    `Area analysis based on market data. ${colSummary}`,
      marketConditions: am.medianDOM != null
        ? `Median days on market: ${am.medianDOM}. ${am.count ?? ''} active listings.`
        : 'Market conditions estimated from available data.',
      upsides:  [],
      risks:    [],
      bestFor:  'Buyers and investors seeking data-driven area insights.',
    },
    riskData:      null,
    localInsights: null,
    isDeterministic: true,
  }
}
