// src/lib/avm.js
// Automated Valuation Model (AVM) — weighted comparable sales engine
// This is the CORE valuation engine. AI is used only for explanation + bounded adjustment.
//
// Architecture:
// 1. Clean and validate comps
// 2. Remove outliers (±25% from median OR 2 std deviations)
// 3. Time-adjust comp prices to current date using price index
// 4. Weight each comp by distance (40%) + recency (30%) + similarity (30%)
// 5. Calculate weighted median estimate
// 6. Compute real confidence score from comp count, variance, proximity
// 7. Return AVM result — AI then explains and adjusts within ±10-15%

// ─── MAIN ENTRY POINT ────────────────────────────────────────────────────────

/**
 * Run the full AVM pipeline on raw comps
 * @param {Array} comps - raw comps from Redfin/Realtor.ca
 * @param {Object} subject - { lat, lon, beds, baths, sqft, propertyType }
 * @param {Object} priceIndex - { multipliers: { 2019: 0.72, ... } } from FHFA/StatCan
 * @param {Object} censusData - { medianHomeValueUSD } fallback anchor
 * @returns {Object} avmResult
 */
export function runAVM(comps, subject, priceIndex, censusData) {
  if (!comps || comps.length === 0) {
    return buildFallbackResult(censusData, priceIndex)
  }

  // Step 1: Clean and validate comps
  const cleaned = cleanComps(comps, subject)
  if (cleaned.length === 0) {
    return buildFallbackResult(censusData, priceIndex)
  }

  // Step 2: Time-adjust prices to today using price index
  const adjusted = timeAdjustComps(cleaned, priceIndex)

  // Step 3: Remove outliers
  const filtered = removeOutliers(adjusted)
  if (filtered.length === 0) {
    return buildFallbackResult(censusData, priceIndex)
  }

  // Step 4: Score and weight each comp
  const weighted = scoreAndWeightComps(filtered, subject)

  // Step 5: Calculate weighted estimate
  const estimate = calculateWeightedEstimate(weighted)

  // Step 6: Calculate confidence score
  const confidence = calculateConfidence(weighted, estimate)

  // Step 7: Calculate price per sqft if subject sqft known
  const pricePerSqft = subject.sqft && subject.sqft > 0
    ? Math.round(estimate / subject.sqft)
    : null

  return {
    estimatedValue: Math.round(estimate),
    pricePerSqft,
    confidenceScore: confidence.score,        // 0-100
    confidenceLevel: confidence.level,        // 'low' | 'medium' | 'high'
    confidenceFactors: confidence.factors,
    compsUsed: weighted.length,
    compsDropped: comps.length - filtered.length,
    priceRange: {
      low: Math.round(estimate * 0.92),
      mid: Math.round(estimate),
      high: Math.round(estimate * 1.08),
    },
    topComps: weighted.slice(0, 3).map(c => ({
      address: c.address,
      adjustedPrice: Math.round(c.adjustedPrice),
      weight: Math.round(c.weight * 100) / 100,
      beds: c.beds,
      baths: c.baths,
      sqft: c.sqft,
      soldDate: c.soldDate,
      distanceMiles: c.distanceMiles,
    })),
    source: 'AVM — Weighted Comparable Sales Model',
    methodology: 'Distance (40%) + Recency (30%) + Similarity (30%)',
  }
}

// ─── STEP 1: CLEAN AND VALIDATE ──────────────────────────────────────────────

function cleanComps(comps, subject) {
  return comps
    .filter(c => {
      // Must have a price
      if (!c.price || c.price <= 0) return false
      // Price must be realistic (not under $10k or over $50M)
      if (c.price < 10000 || c.price > 50000000) return false
      // Must have some location info (address at minimum)
      if (!c.address) return false
      return true
    })
    .map(c => ({
      ...c,
      // Parse sold date to a Date object
      saleDateObj: parseSaleDate(c.soldDate || c.listedDate),
      // Calculate distance from subject if lat/lon available
      distanceMiles: c.lat && c.lon && subject.lat && subject.lon
        ? haversineDistance(subject.lat, subject.lon, c.lat, c.lon)
        : estimateDistanceFromAddress(c.address, subject),
    }))
}

function parseSaleDate(dateStr) {
  if (!dateStr) return null
  try {
    // Handle various date formats: "2024-01-15", "January 2024", "1/15/2024"
    const d = new Date(dateStr)
    return isNaN(d.getTime()) ? null : d
  } catch {
    return null
  }
}

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 3958.8 // Earth radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function estimateDistanceFromAddress(address, subject) {
  // When we don't have lat/lon for comps (Realtor.ca case),
  // estimate ~0.5 miles since comps are pulled from nearby search radius
  return 0.5
}

// ─── STEP 2: TIME-ADJUST PRICES ──────────────────────────────────────────────

function timeAdjustComps(comps, priceIndex) {
  const currentYear = 2025
  const multipliers = priceIndex?.multipliers || priceIndex?.nhpi?.multipliers || null

  return comps.map(c => {
    if (!c.saleDateObj || !multipliers) {
      return { ...c, adjustedPrice: c.price, timeAdjustmentFactor: 1.0 }
    }

    const saleYear = c.saleDateObj.getFullYear()

    // Get index values — interpolate for the sale year
    const currentIndex = multipliers[currentYear] || 1.0
    const saleIndex = getIndexAtYear(multipliers, saleYear)

    if (!saleIndex || saleIndex === 0) {
      return { ...c, adjustedPrice: c.price, timeAdjustmentFactor: 1.0 }
    }

    // adjustedPrice = compPrice × (currentIndex / indexAtSaleDate)
    const factor = currentIndex / saleIndex
    const adjustedPrice = Math.round(c.price * factor)

    return {
      ...c,
      adjustedPrice,
      timeAdjustmentFactor: factor,
      originalPrice: c.price,
    }
  })
}

function getIndexAtYear(multipliers, year) {
  // Direct lookup first
  if (multipliers[year] != null) return multipliers[year]

  // Interpolate between nearest known years
  const years = Object.keys(multipliers).map(Number).sort()
  const lower = years.filter(y => y <= year).pop()
  const upper = years.filter(y => y >= year).shift()

  if (lower == null) return multipliers[years[0]]
  if (upper == null) return multipliers[years[years.length - 1]]
  if (lower === upper) return multipliers[lower]

  // Linear interpolation
  const t = (year - lower) / (upper - lower)
  return multipliers[lower] + t * (multipliers[upper] - multipliers[lower])
}

// ─── STEP 3: OUTLIER REMOVAL ──────────────────────────────────────────────────

function removeOutliers(comps) {
  if (comps.length <= 2) return comps // can't remove from tiny set

  const prices = comps.map(c => c.adjustedPrice || c.price)
  const median = calculateMedian(prices)
  const mean = prices.reduce((a, b) => a + b, 0) / prices.length
  const stdDev = Math.sqrt(prices.reduce((sum, p) => sum + (p - mean) ** 2, 0) / prices.length)

  return comps.filter(c => {
    const price = c.adjustedPrice || c.price
    // Rule 1: must be within ±25% of median
    const withinMedian = price >= median * 0.75 && price <= median * 1.25
    // Rule 2: must be within 2 standard deviations
    const withinStdDev = stdDev === 0 || Math.abs(price - mean) <= 2 * stdDev
    return withinMedian && withinStdDev
  })
}

function calculateMedian(arr) {
  const sorted = [...arr].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2
}

// ─── STEP 4: SCORE AND WEIGHT COMPS ──────────────────────────────────────────

function scoreAndWeightComps(comps, subject) {
  const now = new Date()

  return comps.map(c => {
    // Distance score (40% weight) — decay function
    // 0 miles = 1.0, 0.5 miles = 0.85, 1 mile = 0.65, 2 miles = 0.35, 5+ miles = 0.05
    const dist = c.distanceMiles || 0.5
    const distanceScore = Math.max(0.05, Math.exp(-0.5 * dist))

    // Recency score (30% weight) — decay function
    // Sale today = 1.0, 6 months ago = 0.85, 1 year = 0.65, 2 years = 0.35, 3+ years = 0.10
    let recencyScore = 0.5 // default if no date
    if (c.saleDateObj) {
      const monthsAgo = (now - c.saleDateObj) / (1000 * 60 * 60 * 24 * 30.4)
      recencyScore = Math.max(0.05, Math.exp(-0.04 * monthsAgo))
    } else if (c.type === 'active_listing') {
      recencyScore = 0.75 // active listings are current but not sold
    }

    // Similarity score (30% weight) — based on beds, baths, property type
    let similarityScore = 0.5 // baseline
    let matchPoints = 0
    let matchChecks = 0

    if (subject.beds && c.beds) {
      matchChecks++
      const bedDiff = Math.abs(subject.beds - c.beds)
      matchPoints += bedDiff === 0 ? 1.0 : bedDiff === 1 ? 0.6 : 0.2
    }
    if (subject.baths && c.baths) {
      matchChecks++
      const bathDiff = Math.abs(subject.baths - c.baths)
      matchPoints += bathDiff === 0 ? 1.0 : bathDiff <= 0.5 ? 0.7 : 0.3
    }
    if (subject.sqft && c.sqft) {
      matchChecks++
      const sqftRatio = Math.min(subject.sqft, c.sqft) / Math.max(subject.sqft, c.sqft)
      matchPoints += sqftRatio > 0.9 ? 1.0 : sqftRatio > 0.75 ? 0.6 : 0.3
    }

    if (matchChecks > 0) {
      similarityScore = matchPoints / matchChecks
    }

    // Final weighted score
    // weight = (distanceScore × 0.4) + (recencyScore × 0.3) + (similarityScore × 0.3)
    const weight = (distanceScore * 0.4) + (recencyScore * 0.3) + (similarityScore * 0.3)

    return {
      ...c,
      distanceScore: Math.round(distanceScore * 100) / 100,
      recencyScore: Math.round(recencyScore * 100) / 100,
      similarityScore: Math.round(similarityScore * 100) / 100,
      weight: Math.round(weight * 1000) / 1000,
    }
  }).sort((a, b) => b.weight - a.weight) // sort by weight descending
}

// ─── STEP 5: WEIGHTED ESTIMATE ────────────────────────────────────────────────

function calculateWeightedEstimate(weightedComps) {
  const totalWeight = weightedComps.reduce((sum, c) => sum + c.weight, 0)
  if (totalWeight === 0) {
    // Fallback to simple average
    const prices = weightedComps.map(c => c.adjustedPrice || c.price)
    return prices.reduce((a, b) => a + b, 0) / prices.length
  }

  // estimatedValue = Σ(compPrice × weight) / Σ(weight)
  const weightedSum = weightedComps.reduce((sum, c) => {
    return sum + (c.adjustedPrice || c.price) * c.weight
  }, 0)

  return weightedSum / totalWeight
}

// ─── STEP 6: CONFIDENCE SCORE ─────────────────────────────────────────────────

function calculateConfidence(weightedComps, estimate) {
  const n = weightedComps.length
  const prices = weightedComps.map(c => c.adjustedPrice || c.price)

  // Component 1: Comp count score (40%)
  // 1 comp = 0.2, 2 = 0.45, 3 = 0.65, 4 = 0.80, 5+ = 0.95
  const compCountScore = Math.min(0.95, 0.2 + (n - 1) * 0.175)

  // Component 2: Low variance score (30%)
  // Low spread = high confidence. Coefficient of variation used.
  const mean = prices.reduce((a, b) => a + b, 0) / prices.length
  const variance = prices.reduce((sum, p) => sum + (p - mean) ** 2, 0) / prices.length
  const cv = mean > 0 ? Math.sqrt(variance) / mean : 1 // coefficient of variation
  // CV of 0 = perfect agreement, CV of 0.3+ = high disagreement
  const lowVarianceScore = Math.max(0.1, 1 - (cv / 0.3))

  // Component 3: Proximity score (30%)
  // Average distance of comps weighted by their weight
  const avgDistance = weightedComps.reduce((sum, c) => sum + (c.distanceMiles || 0.5), 0) / n
  // 0.1 miles = 1.0, 0.5 miles = 0.8, 1 mile = 0.5, 2+ miles = 0.2
  const proximityScore = Math.max(0.1, Math.exp(-0.4 * avgDistance))

  // confidence = (compCountScore × 0.4) + (lowVarianceScore × 0.3) + (proximityScore × 0.3)
  const rawScore = (compCountScore * 0.4) + (lowVarianceScore * 0.3) + (proximityScore * 0.3)
  const score = Math.round(rawScore * 100)

  const level = score >= 70 ? 'high' : score >= 45 ? 'medium' : 'low'

  return {
    score,
    level,
    factors: {
      compCount: Math.round(compCountScore * 100),
      priceConsistency: Math.round(lowVarianceScore * 100),
      proximity: Math.round(proximityScore * 100),
      compsAnalyzed: n,
      avgDistanceMiles: Math.round(avgDistance * 10) / 10,
      coefficientOfVariation: Math.round(cv * 100),
    },
  }
}

// ─── STEP 7: BOUNDED AI ADJUSTMENT ───────────────────────────────────────────

/**
 * Apply AI's valuation adjustment, bounded to ±15% of the AVM estimate
 * This prevents AI hallucination while still allowing market knowledge adjustments
 * @param {number} avmValue - from runAVM()
 * @param {number} aiValue - what the AI returned
 * @param {string} confidenceLevel - 'high' | 'medium' | 'low'
 * @returns {number} finalValue
 */
export function applyBoundedAIAdjustment(avmValue, aiValue, confidenceLevel) {
  if (!avmValue || avmValue <= 0) return aiValue
  if (!aiValue || aiValue <= 0) return avmValue

  // The higher the AVM confidence, the tighter the AI can adjust
  const maxAdjustment = {
    high: 0.10,   // AI can move ±10% from AVM
    medium: 0.15, // AI can move ±15% from AVM
    low: 0.20,    // AI can move ±20% from AVM (more room when comps are sparse)
  }[confidenceLevel] || 0.15

  const ratio = aiValue / avmValue
  const boundedRatio = Math.max(1 - maxAdjustment, Math.min(1 + maxAdjustment, ratio))

  return Math.round(avmValue * boundedRatio)
}

// ─── FALLBACK ─────────────────────────────────────────────────────────────────

function buildFallbackResult(censusData, priceIndex) {
  return {
    estimatedValue: null,
    pricePerSqft: null,
    confidenceScore: 0,
    confidenceLevel: 'low',
    confidenceFactors: { compCount: 0, priceConsistency: 0, proximity: 0, compsAnalyzed: 0 },
    compsUsed: 0,
    compsDropped: 0,
    priceRange: null,
    topComps: [],
    source: 'No comps available — AI estimation only',
    methodology: 'Fallback to AI-only estimate',
    fallback: true,
  }
}

// ─── UTILITIES ────────────────────────────────────────────────────────────────

/**
 * Format AVM result as context string for the AI prompt
 * AI uses this to explain the value and apply its bounded adjustment
 */
export function formatAVMForPrompt(avmResult, currency) {
  if (!avmResult || avmResult.fallback || !avmResult.estimatedValue) {
    return '\nAVM ENGINE: No comparable sales available — use your market knowledge for valuation.'
  }

  const sym = currency === 'GBP' ? '£' : '$'
  const fmt = (n) => n != null ? `${sym}${Math.round(n).toLocaleString()}` : 'N/A'

  const lines = [
    `\nAVM ENGINE RESULT (Weighted Comparable Sales Model):`,
    `Calculated value: ${fmt(avmResult.estimatedValue)} ${currency}`,
    `Confidence: ${avmResult.confidenceScore}/100 (${avmResult.confidenceLevel})`,
    `Based on: ${avmResult.compsUsed} comparable ${avmResult.compsUsed === 1 ? 'sale' : 'sales'} (${avmResult.compsDropped} outliers removed)`,
    `Price range: ${fmt(avmResult.priceRange?.low)} – ${fmt(avmResult.priceRange?.high)}`,
  ]

  if (avmResult.topComps?.length) {
    lines.push(`\nTop comparable sales used:`)
    avmResult.topComps.forEach((c, i) => {
      const parts = [
        `${i + 1}. ${c.address}`,
        fmt(c.adjustedPrice),
        c.beds ? `${c.beds}bd` : '',
        c.baths ? `${c.baths}ba` : '',
        c.sqft ? `${c.sqft.toLocaleString()} sqft` : '',
        c.distanceMiles ? `${c.distanceMiles.toFixed(1)}mi away` : '',
        c.soldDate ? `sold ${c.soldDate}` : '',
        `weight: ${c.weight}`,
      ].filter(Boolean)
      lines.push(parts.join(' | '))
    })
  }

  lines.push(`\nINSTRUCTIONS FOR AI:`)
  lines.push(`1. Your estimatedValue MUST be the AVM value (${fmt(avmResult.estimatedValue)}) adjusted by at most ±${avmResult.confidenceLevel === 'high' ? '10' : '15'}% for factors the model cannot capture (property condition, major renovations, unique features, lot premium/discount).`)
  lines.push(`2. In priceContext, EXPLAIN the AVM result — what comparable sales support it, what market factors justify any adjustment you make.`)
  lines.push(`3. Do NOT invent a completely different value. The AVM is based on real transaction data. Justify any deviation clearly.`)

  return lines.join('\n')
}
