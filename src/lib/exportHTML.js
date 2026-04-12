export function downloadAnalysisHTML(result, config = {}) {
  const { brandName = "Dwelling", clientName = "", logoUrl = "", sections = null } = config
  const inc = (key) => !sections || sections[key] !== false

  const html = buildHTML(result, { brandName, clientName, logoUrl, inc })
  const blob = new Blob([html], { type: "text/html;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  const slug = (result?.geo?.displayName || "area").replace(/[^a-z0-9]/gi, "-").toLowerCase()
  a.href = url
  a.download = `${brandName.toLowerCase().replace(/\s+/g, "-")}-report-${slug}.html`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/* ── Helpers ── */
const safe = (v, fb = "—") => (v == null || v === "" || v === 0) ? fb : String(v)
const fmtNum = (n) => n == null || n === 0 ? "—" : Number(n).toLocaleString("en-US", { maximumFractionDigits: 0 })
function fmtMoney(n, sym = "$") {
  if (n == null || n === 0) return "—"
  if (n >= 1_000_000) return `${sym}${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${sym}${Math.round(n / 1_000)}K`
  return `${sym}${fmtNum(n)}`
}
const scoreColor = (s) => s == null ? "#94a3b8" : s >= 70 ? "#16a34a" : s >= 45 ? "#ca8a04" : "#dc2626"
const verdictColor = (v) => !v ? "#64748b" : (v === "Excellent" || v === "Good") ? "#16a34a" : v === "Caution" ? "#ca8a04" : v === "Avoid" ? "#dc2626" : "#64748b"

function scoreRow(label, score) {
  if (score == null) return ""
  const col = scoreColor(score)
  return `<div class="score-row"><span class="score-label">${label}</span><div class="score-track"><div class="score-fill" style="width:${score}%;background:${col}"></div></div><span class="score-num" style="color:${col}">${score}</span></div>`
}

function buildHTML(result, { brandName, clientName, logoUrl, inc }) {
  const geo = result?.geo || {}
  const ai = result?.ai || {}
  const weather = result?.weather || {}
  const realData = result?.realData || {}
  const climate = result?.climate || {}

  const areaName = safe(geo.displayName, "Area Report")
  const country = safe(geo.country || geo.userCountry, "")
  const generated = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })

  const intel = ai.areaIntelligence || {}
  const verdict = safe(intel.verdict, "")
  const verdictReason = safe(intel.verdictReason, "")
  const aiSummary = safe(intel.summary || intel.aiSummary || ai.summary, "")

  const inv = ai.investment || {}
  const investScore = inv.investmentScore ?? null
  const investSummary = safe(inv.investmentSummary || inv.summary, "")
  const roi = safe(inv.estimatedROI || inv.roi, "")
  const priceGrowth = safe(inv.projectedPriceGrowth || inv.priceGrowth, "")
  const outlook = safe(inv.outlook, "")

  const col = ai.costOfLiving || {}
  const sym = ai.priceHistory?.currencySymbol || "$"
  const monthlyBudget = fmtMoney(col.monthlyBudgetUSD, sym)
  const rent1br = fmtMoney(col.rent1BRUSD || col.rentOneBedroomUSD, sym)
  const groceries = fmtMoney(col.groceriesMonthlyUSD, sym)
  const transport = fmtMoney(col.transportMonthlyUSD, sym)
  const utilities = fmtMoney(col.utilitiesMonthlyUSD, sym)
  const dining = fmtMoney(col.diningOutMonthlyUSD, sym)
  const colSummary = safe(col.summary, "")
  const colIndex = col.indexVsUSAverage != null ? `${col.indexVsUSAverage > 0 ? "+" : ""}${Math.round(col.indexVsUSAverage)}% vs US avg` : ""

  const hood = ai.neighborhood || {}
  const hoodSummary = safe(hood.summary || hood.description, "")
  const safetyScore = hood.safetyScore ?? realData?.safetyScore ?? null
  const walkScore = realData?.walkScore ?? hood.walkScore ?? null
  const transitScore = realData?.transitScore ?? hood.transitScore ?? null
  const schoolScore = realData?.schoolScore ?? hood.schoolScore ?? null

  const risk = ai.riskData || {}
  const floodRisk = safe(risk.floodRisk || risk.flood, "")
  const fireRisk = safe(risk.fireRisk || risk.fire, "")
  const seismicRisk = safe(risk.seismicRisk || risk.seismic, "")
  const pollution = safe(risk.airQuality || risk.pollution, "")
  const noise = safe(risk.noise || risk.noiseLevel, "")
  const riskSummary = safe(risk.summary, "")

  const propEst = ai.propertyEstimate || {}
  const estPrice = fmtMoney(propEst.estimatedPriceUSD || propEst.medianPriceUSD, sym)
  const priceLow = fmtMoney(propEst.priceLowUSD, sym)
  const priceHigh = fmtMoney(propEst.priceHighUSD, sym)
  const priceRange = priceLow !== "—" && priceHigh !== "—" ? `${priceLow} – ${priceHigh}` : ""
  const propSummary = safe(propEst.summary, "")
  const pricePerSqft = safe(propEst.pricePerSqft, "")
  const medianDOM = safe(propEst.medianDOM || propEst.medianDaysOnMarket, "")
  const marketTemp = safe(propEst.marketTemperature || propEst.marketCondition, "")

  const tempC = weather?.temperature_2m ?? weather?.temp ?? null
  const tempDisplay = tempC != null ? `${Math.round(tempC)}°C / ${Math.round(tempC * 9 / 5 + 32)}°F` : "—"
  const weatherDesc = safe(weather?.description || weather?.condition, "")
  const climateSummary = safe(climate?.summary || ai.climateSummary, "")
  const avgHigh = safe(climate?.avgHigh, "")
  const avgLow = safe(climate?.avgLow, "")

  const insights = ai.localInsights || {}
  const pros = Array.isArray(insights.pros) ? insights.pros : []
  const cons = Array.isArray(insights.cons) ? insights.cons : []
  const attractions = Array.isArray(insights.topAttractions) ? insights.topAttractions : []
  const localTip = safe(insights.localTip || insights.tip, "")
  const insightQuote = safe(insights.quote || insights.summary, "")

  const priceHistory = ai.priceHistory || {}
  const phSince = safe(priceHistory.sinceYear, "")
  const phChange = safe(priceHistory.percentChange || priceHistory.change, "")
  const phSummary = safe(priceHistory.summary, "")
  const phCurrent = fmtMoney(priceHistory.currentMedianUSD || priceHistory.currentPrice, sym)

  const mkt = ai.marketIntelligence || propEst
  const stabilityScore = safe(mkt.stabilityScore, "")
  const activeListing = safe(propEst.activeListings, "")
  const rentYield = safe(inv.rentYield || inv.yieldPct, "")

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${areaName} — ${brandName} Report</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Georgia',serif;background:#f9f8f5;color:#1a1a1a;line-height:1.6}
.page{max-width:900px;margin:0 auto;padding:48px 40px}

/* Brand bar */
.brand-bar{display:flex;align-items:center;justify-content:space-between;margin-bottom:40px;padding-bottom:20px;border-bottom:3px solid #1a1a1a}
.brand-left{display:flex;align-items:center;gap:14px}
.brand-logo{height:40px;width:auto;object-fit:contain}
.brand-name{font-family:sans-serif;font-size:18px;font-weight:700;letter-spacing:-0.01em}
.brand-meta{font-family:sans-serif;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#888;margin-top:2px}
.brand-right{text-align:right}
.brand-date{font-family:sans-serif;font-size:11px;color:#aaa;letter-spacing:0.08em;text-transform:uppercase}

/* Area header */
.area-header{margin-bottom:36px}
.area-name{font-size:clamp(2rem,5vw,3.2rem);font-weight:700;letter-spacing:-0.02em;line-height:1.05;margin-bottom:8px}
.verdict-row{display:flex;align-items:center;gap:14px;margin-bottom:12px}
.verdict-badge{display:inline-block;padding:6px 20px;border-radius:40px;font-family:sans-serif;font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;border:2px solid currentColor}
.invest-score{font-family:sans-serif;font-size:28px;font-weight:700}
.invest-label{font-family:sans-serif;font-size:10px;color:#888;letter-spacing:0.1em;text-transform:uppercase}
.area-reason{font-size:14px;color:#555;max-width:640px;line-height:1.7;margin-top:8px}

/* Section */
.section{margin-bottom:36px;page-break-inside:avoid}
.section-title{font-family:sans-serif;font-size:9px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#aaa;margin-bottom:14px;padding-bottom:8px;border-bottom:1px solid #e8e5e0}
.section-body{font-size:14px;color:#333;line-height:1.8}

/* Grids */
.g2{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}
.g3{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
.g4{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
.g5{display:grid;grid-template-columns:repeat(5,1fr);gap:10px}

/* Stat box */
.stat{background:#fff;border:1px solid #e8e5e0;border-radius:10px;padding:14px 16px}
.stat-label{font-family:sans-serif;font-size:8px;letter-spacing:0.14em;text-transform:uppercase;color:#aaa;margin-bottom:5px}
.stat-value{font-size:1.4rem;font-weight:700;line-height:1.1}
.stat-sub{font-family:sans-serif;font-size:10px;color:#999;margin-top:3px}

/* Score bars */
.score-row{display:flex;align-items:center;gap:12px;margin-bottom:10px}
.score-label{font-family:sans-serif;font-size:11px;color:#666;width:100px;flex-shrink:0}
.score-track{flex:1;height:6px;background:#eee;border-radius:3px;overflow:hidden}
.score-fill{height:100%;border-radius:3px}
.score-num{font-family:sans-serif;font-size:12px;font-weight:700;width:28px;text-align:right;flex-shrink:0}

/* Pro/Con */
.pc-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px}
.pc-label{font-family:sans-serif;font-size:9px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;margin-bottom:8px}
.pc-list{list-style:none}
.pc-list li{font-size:13px;color:#333;padding:5px 0;border-bottom:1px solid #f0ede8;display:flex;gap:8px;align-items:flex-start}
.pc-list li::before{flex-shrink:0;font-weight:900;font-family:sans-serif}
.pros-label{color:#15803d}.cons-label{color:#b91c1c}
.pros li::before{content:"+";color:#15803d}.cons li::before{content:"−";color:#b91c1c}

/* Risk chips */
.risk-row{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:14px}
.risk-chip{background:#fff;border:1px solid #e8e5e0;border-radius:8px;padding:10px 14px;display:flex;flex-direction:column;gap:3px;min-width:100px}
.risk-icon{font-size:18px;margin-bottom:2px}
.risk-name{font-family:sans-serif;font-size:9px;letter-spacing:0.1em;text-transform:uppercase;color:#aaa}
.risk-value{font-family:sans-serif;font-size:13px;font-weight:600;color:#1a1a1a}

/* Attractions */
.attr-list{list-style:none;display:flex;flex-direction:column;gap:6px}
.attr-list li{font-size:13px;color:#333;display:flex;align-items:center;gap:10px}
.attr-num{font-family:sans-serif;font-size:9px;font-weight:700;color:#aaa;width:18px}

/* Quote */
.quote{border-left:3px solid #d4c89a;padding:12px 20px;margin:14px 0;font-style:italic;font-size:14px;color:#555;line-height:1.75;background:#faf9f5}

/* Divider */
.div{border:none;border-top:1px solid #e8e5e0;margin:32px 0}

/* Footer */
.footer{margin-top:48px;padding-top:20px;border-top:2px solid #1a1a1a;display:flex;justify-content:space-between;align-items:center;flex-wrap:gap}
.footer-brand{font-family:sans-serif;font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#1a1a1a}
.footer-note{font-family:sans-serif;font-size:10px;color:#bbb}
.tag{display:inline-block;background:#f0ede8;border-radius:4px;padding:3px 8px;font-family:sans-serif;font-size:10px;color:#888;margin:2px}

@media print{body{background:#fff}.page{padding:20px}}
@media(max-width:640px){.g4,.g5{grid-template-columns:repeat(2,1fr)}.g3{grid-template-columns:1fr 1fr}.pc-grid{grid-template-columns:1fr}}
</style>
</head>
<body>
<div class="page">

<!-- Brand bar -->
<div class="brand-bar">
  <div class="brand-left">
    ${logoUrl ? `<img src="${logoUrl}" class="brand-logo" alt="${brandName}" onerror="this.style.display='none'"/>` : ""}
    <div>
      <div class="brand-name">${brandName}</div>
      <div class="brand-meta">Area Intelligence Report${clientName ? ` · Prepared for ${clientName}` : ""}</div>
    </div>
  </div>
  <div class="brand-right">
    <div class="brand-date">Generated ${generated}</div>
    ${clientName ? `<div class="brand-date" style="margin-top:4px;color:#555;font-size:12px">${clientName}</div>` : ""}
  </div>
</div>

<!-- Area header -->
<div class="area-header">
  <div class="area-name">${areaName}${country ? ", " + country : ""}</div>
  <div class="verdict-row">
    ${verdict ? `<div class="verdict-badge" style="color:${verdictColor(verdict)}">${verdict}</div>` : ""}
    ${investScore != null ? `<div><div class="invest-score" style="color:${scoreColor(investScore)}">${investScore}<span style="font-size:14px;color:#aaa">/100</span></div><div class="invest-label">Investment Score</div></div>` : ""}
    ${rentYield ? `<div><div class="invest-score" style="font-size:20px">${rentYield}</div><div class="invest-label">Rent Yield</div></div>` : ""}
  </div>
  ${verdictReason ? `<div class="area-reason">${verdictReason}</div>` : ""}
</div>

${inc("overview") && aiSummary ? `
<!-- Overview -->
<div class="section">
  <div class="section-title">Overview</div>
  <div class="section-body">${aiSummary}</div>
</div>` : ""}

${inc("market") ? `
<!-- Market -->
<div class="section">
  <div class="section-title">Market & Property Estimate</div>
  <div class="g4" style="margin-bottom:12px">
    <div class="stat"><div class="stat-label">Est. Property Price</div><div class="stat-value">${estPrice}</div>${priceRange ? `<div class="stat-sub">${priceRange}</div>` : ""}</div>
    ${pricePerSqft ? `<div class="stat"><div class="stat-label">Price / sqft</div><div class="stat-value">${pricePerSqft}</div></div>` : ""}
    ${marketTemp ? `<div class="stat"><div class="stat-label">Market Temp</div><div class="stat-value" style="font-size:1rem">${marketTemp}</div></div>` : ""}
    ${medianDOM ? `<div class="stat"><div class="stat-label">Median DOM</div><div class="stat-value">${medianDOM}<span style="font-size:14px;color:#aaa">d</span></div></div>` : ""}
    ${activeListing ? `<div class="stat"><div class="stat-label">Active Listings</div><div class="stat-value">${activeListing}</div></div>` : ""}
    ${stabilityScore ? `<div class="stat"><div class="stat-label">Stability Score</div><div class="stat-value">${stabilityScore}</div></div>` : ""}
  </div>
  ${propSummary ? `<p class="section-body">${propSummary}</p>` : ""}
</div>` : ""}

${inc("col") ? `
<!-- Cost of Living -->
<div class="section">
  <div class="section-title">Cost of Living</div>
  <div class="g5" style="margin-bottom:12px">
    <div class="stat"><div class="stat-label">Monthly Budget</div><div class="stat-value">${monthlyBudget}</div>${colIndex ? `<div class="stat-sub">${colIndex}</div>` : ""}</div>
    <div class="stat"><div class="stat-label">1-BR Rent</div><div class="stat-value">${rent1br}</div></div>
    <div class="stat"><div class="stat-label">Groceries</div><div class="stat-value">${groceries}</div><div class="stat-sub">per month</div></div>
    <div class="stat"><div class="stat-label">Transport</div><div class="stat-value">${transport}</div><div class="stat-sub">per month</div></div>
    <div class="stat"><div class="stat-label">Utilities</div><div class="stat-value">${utilities}</div><div class="stat-sub">per month</div></div>
  </div>
  ${dining !== "—" ? `<div class="g5" style="margin-bottom:12px"><div class="stat"><div class="stat-label">Dining Out</div><div class="stat-value">${dining}</div><div class="stat-sub">per month</div></div></div>` : ""}
  ${colSummary ? `<p class="section-body">${colSummary}</p>` : ""}
</div>` : ""}

${inc("investment") && (investScore != null || investSummary) ? `
<!-- Investment -->
<div class="section">
  <div class="section-title">Investment Analysis</div>
  <div class="g4" style="margin-bottom:12px">
    ${investScore != null ? `<div class="stat"><div class="stat-label">Investment Score</div><div class="stat-value" style="color:${scoreColor(investScore)}">${investScore}<span style="font-size:14px;color:#aaa">/100</span></div></div>` : ""}
    ${roi ? `<div class="stat"><div class="stat-label">Est. ROI</div><div class="stat-value">${roi}</div></div>` : ""}
    ${priceGrowth ? `<div class="stat"><div class="stat-label">Price Growth</div><div class="stat-value">${priceGrowth}</div></div>` : ""}
    ${outlook ? `<div class="stat"><div class="stat-label">Outlook</div><div class="stat-value" style="font-size:1rem">${outlook}</div></div>` : ""}
    ${rentYield ? `<div class="stat"><div class="stat-label">Rent Yield</div><div class="stat-value">${rentYield}</div><div class="stat-sub">annual gross</div></div>` : ""}
  </div>
  ${investSummary ? `<p class="section-body">${investSummary}</p>` : ""}
</div>` : ""}

${inc("scores") ? `
<!-- Scores -->
<div class="section">
  <div class="section-title">Liveability Scores</div>
  <div style="max-width:460px">
    ${scoreRow("Walk Score", walkScore)}
    ${scoreRow("Transit Score", transitScore)}
    ${scoreRow("School Score", schoolScore)}
    ${scoreRow("Safety Score", safetyScore)}
  </div>
</div>` : ""}

${inc("hood") && hoodSummary ? `
<!-- Neighbourhood -->
<div class="section">
  <div class="section-title">Neighbourhood</div>
  <p class="section-body">${hoodSummary}</p>
</div>` : ""}

${inc("proscons") && (pros.length > 0 || cons.length > 0) ? `
<!-- Pros & Cons -->
<div class="section">
  <div class="section-title">Pros & Cons</div>
  <div class="pc-grid">
    <div><div class="pc-label pros-label">Pros</div><ul class="pc-list pros">${pros.map(p => `<li>${safe(p)}</li>`).join("")}</ul></div>
    <div><div class="pc-label cons-label">Cons</div><ul class="pc-list cons">${cons.map(p => `<li>${safe(p)}</li>`).join("")}</ul></div>
  </div>
</div>` : ""}

${inc("risk") && (floodRisk || fireRisk || seismicRisk || pollution || noise || riskSummary) ? `
<!-- Risk -->
<div class="section">
  <div class="section-title">Environmental & Risk</div>
  <div class="risk-row">
    ${floodRisk ? `<div class="risk-chip"><div class="risk-icon">🌊</div><div class="risk-name">Flood</div><div class="risk-value">${floodRisk}</div></div>` : ""}
    ${fireRisk ? `<div class="risk-chip"><div class="risk-icon">🔥</div><div class="risk-name">Fire</div><div class="risk-value">${fireRisk}</div></div>` : ""}
    ${seismicRisk ? `<div class="risk-chip"><div class="risk-icon">🌍</div><div class="risk-name">Seismic</div><div class="risk-value">${seismicRisk}</div></div>` : ""}
    ${pollution ? `<div class="risk-chip"><div class="risk-icon">💨</div><div class="risk-name">Pollution</div><div class="risk-value">${pollution}</div></div>` : ""}
    ${noise ? `<div class="risk-chip"><div class="risk-icon">🔊</div><div class="risk-name">Noise</div><div class="risk-value">${noise}</div></div>` : ""}
  </div>
  ${riskSummary ? `<p class="section-body">${riskSummary}</p>` : ""}
</div>` : ""}

${inc("climate") && (tempDisplay !== "—" || climateSummary) ? `
<!-- Climate -->
<div class="section">
  <div class="section-title">Climate & Weather</div>
  <div class="g4" style="margin-bottom:12px">
    ${tempDisplay !== "—" ? `<div class="stat"><div class="stat-label">Current Temp</div><div class="stat-value">${tempDisplay}</div>${weatherDesc ? `<div class="stat-sub">${weatherDesc}</div>` : ""}</div>` : ""}
    ${avgHigh ? `<div class="stat"><div class="stat-label">Avg High</div><div class="stat-value">${avgHigh}</div></div>` : ""}
    ${avgLow ? `<div class="stat"><div class="stat-label">Avg Low</div><div class="stat-value">${avgLow}</div></div>` : ""}
  </div>
  ${climateSummary ? `<p class="section-body">${climateSummary}</p>` : ""}
</div>` : ""}

${inc("insights") ? `
<!-- Local Insights -->
${(insightQuote || pros.length > 0 || attractions.length > 0 || localTip) ? `
<div class="section">
  <div class="section-title">Local Insights</div>
  ${insightQuote ? `<div class="quote">${insightQuote}</div>` : ""}
  ${attractions.length > 0 ? `<div style="margin-top:14px"><div style="font-family:sans-serif;font-size:10px;color:#aaa;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:10px">Top Attractions</div><ul class="attr-list">${attractions.map((a, i) => `<li><span class="attr-num">${String(i + 1).padStart(2, "0")}</span>${safe(a)}</li>`).join("")}</ul></div>` : ""}
  ${localTip ? `<div style="margin-top:16px;padding:12px 16px;background:#f0ede8;border-radius:8px;font-size:13px;color:#444;line-height:1.7"><strong>Local tip:</strong> ${localTip}</div>` : ""}
</div>` : ""}` : ""}

${(phSummary || phChange) && inc("market") ? `
<!-- Price History -->
<div class="section">
  <div class="section-title">Price History & Projection</div>
  <div class="g3" style="margin-bottom:12px">
    ${phCurrent !== "—" ? `<div class="stat"><div class="stat-label">Area Average</div><div class="stat-value">${phCurrent}</div></div>` : ""}
    ${phSince ? `<div class="stat"><div class="stat-label">Since ${phSince}</div><div class="stat-value">${phChange || "—"}</div></div>` : ""}
  </div>
  ${phSummary ? `<p class="section-body">${phSummary}</p>` : ""}
</div>` : ""}

<!-- Footer -->
<div class="footer">
  <div class="footer-brand">${brandName}</div>
  <div class="footer-note">AI-generated · Informational purposes only · Not financial or legal advice · dwelling.one</div>
</div>

</div>
</body>
</html>`
}
