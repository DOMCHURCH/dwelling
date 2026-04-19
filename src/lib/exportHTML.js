export function downloadAnalysisHTML(result, config = {}) {
  const { brandName = "Dwelling", clientName = "", logoUrl = "", sections = null } = config
  const inc = (key) => !sections || sections[key] !== false
  const html = buildHTML(result, { brandName, clientName, logoUrl, inc })
  const blob = new Blob([html], { type: "text/html;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  const slug = (result?.geo?.displayName || "area").replace(/[^a-z0-9]/gi, "-").toLowerCase()
  a.href = url
  a.download = `${(brandName || "dwelling").toLowerCase().replace(/\s+/g, "-")}-report-${slug}.html`
  document.body.appendChild(a); a.click(); document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/* ── HTML output encoding — applied to all AI-sourced and user-supplied strings ── */
const esc = (s) => String(s ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#039;")

/* ── value helpers ── */
// n() auto-escapes: all AI text goes through this before HTML interpolation
const n = (v, fb = "—") => (v == null || v === "" || v === 0) ? fb : esc(String(v))
const fmtK = (v, sym = "$") => {
  if (!v || v === 0) return "—"
  if (v >= 1_000_000) return `${sym}${(v / 1_000_000).toFixed(2).replace(/\.?0+$/, "")}M`
  if (v >= 1_000) return `${sym}${Math.round(v / 1_000)}K`
  return `${sym}${Number(v).toLocaleString()}`
}
const sc = (s) => s == null ? "#94a3b8" : s >= 70 ? "#16a34a" : s >= 45 ? "#ca8a04" : "#dc2626"
const vc = (v) => !v ? "#64748b" : (v === "Excellent" || v === "Good") ? "#16a34a" : v === "Caution" ? "#ca8a04" : v === "Avoid" ? "#dc2626" : "#64748b"

function scoreBar(label, score) {
  if (score == null) return ""
  return `<div class="sr"><span class="sl">${label}</span><div class="st"><div style="width:${score}%;height:100%;background:${sc(score)};border-radius:3px"></div></div><span class="sn" style="color:${sc(score)}">${score}</span></div>`
}

function buildHTML(result, { brandName: _brandName, clientName: _clientName, logoUrl: _logoUrl, inc }) {
  // Escape user-supplied config values — these come from BrandingModal inputs
  const brandName = esc(_brandName || "Dwelling")
  const clientName = esc(_clientName || "")
  const logoUrl = esc(_logoUrl || "")
  const geo = result?.geo || {}
  const ai = result?.ai || {}
  const weather = result?.weather || {}
  const realData = result?.realData || {}
  const climate = result?.climate || {}

  /* Destructure exactly as Dashboard.jsx does */
  const { propertyEstimate = {}, costOfLiving = {}, neighborhood = {},
          investment = {}, localInsights = {}, areaIntelligence = {}, riskData: aiRiskData } = ai
  const { areaMetrics, marketTemperature } = realData || {}
  const risk = realData?.riskData || aiRiskData || {}
  const priceHistory = ai.priceHistory || {}

  const sym = priceHistory?.currencySymbol || priceHistory?.currency_symbol || "$"
  const areaName = n(geo.displayName, "Area Report")
  const country = n(geo.country || geo.userCountry, "")
  const generated = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })

  /* Area Intelligence */
  const verdict = n(areaIntelligence.verdict, "")
  const verdictReason = n(areaIntelligence.verdictReason || areaIntelligence.reason, "")
  const aiSummary = n(areaIntelligence.summary || areaIntelligence.aiSummary || areaIntelligence.description, "")
  const bestFor = n(areaIntelligence.bestFor, "")

  /* Property estimate — area mode: estimatedValueUSD seeded from areaMetrics.medianPrice */
  const estValue = fmtK(
    propertyEstimate.estimatedValueUSD || areaMetrics?.medianPrice,
    sym
  )
  const pricePerSqft = fmtK(propertyEstimate.pricePerSqftUSD, sym)
  const rentMonthly = fmtK(propertyEstimate.rentEstimateMonthlyUSD, sym)
  const priceLow = fmtK(propertyEstimate.priceRange?.low, sym)
  const priceHigh = fmtK(propertyEstimate.priceRange?.high, sym)
  const priceRange = priceLow !== "—" && priceHigh !== "—" ? `${priceLow} – ${priceHigh}` : ""
  const priceContext = n(propertyEstimate.priceContext, "")
  const confidence = n(propertyEstimate.confidenceLevel || (propertyEstimate.confidenceScore ? `${propertyEstimate.confidenceScore}/100` : ""), "")

  /* areaMetrics from realData */
  const medianPrice = fmtK(areaMetrics?.medianPrice, sym)
  const avgPrice = fmtK(areaMetrics?.avgPrice, sym)
  const medianDOM = areaMetrics?.medianDOM != null ? `${areaMetrics.medianDOM} days` : "—"
  const medianPPSF = areaMetrics?.medianPPSF ? fmtK(areaMetrics.medianPPSF, sym) : "—"
  const activeListings = n(areaMetrics?.count, "")
  const mktTempRaw = marketTemperature || areaMetrics?.marketTemperature
  const mktTemp = n(mktTempRaw?.label || (typeof mktTempRaw === "string" ? mktTempRaw : null), "")

  /* Cost of living — exact field names */
  const monthlyBudget = fmtK(costOfLiving.monthlyBudgetUSD, sym)
  /* 1-BR rent lives on propertyEstimate in area mode, costOfLiving in property mode */
  const rent1br = fmtK(
    costOfLiving.rent1BRUSD || costOfLiving.rentOneBedroomUSD ||
    propertyEstimate.rentEstimateMonthlyUSD,
    sym
  )
  const groceries = fmtK(costOfLiving.groceriesMonthlyUSD, sym)
  const transport = fmtK(costOfLiving.transportMonthlyUSD, sym)
  const utilities = fmtK(costOfLiving.utilitiesMonthlyUSD, sym)
  const dining = fmtK(costOfLiving.diningOutMonthlyUSD, sym)
  const colIdx = costOfLiving.indexVsUSAverage != null ? `${costOfLiving.indexVsUSAverage > 0 ? "+" : ""}${Math.round(costOfLiving.indexVsUSAverage)}% vs US avg` : ""
  const colSummary = n(costOfLiving.summary, "")

  /* Investment — area mode uses rentYield (string), property mode uses rentYieldPercent (number) */
  const investScore = investment.investmentScore ?? null
  const rentYieldRaw = investment.rentYieldPercent != null
    ? `${investment.rentYieldPercent}%`
    : n(investment.rentYield, "")
  const rentYield = rentYieldRaw === "—" ? "" : rentYieldRaw
  /* area mode: outlook, property mode: appreciationOutlook */
  const outlook = n(investment.appreciationOutlook || investment.outlook, "")
  const outlookText = n(investment.appreciationOutlookText, "")
  const investSummary = n(investment.investmentSummary || investment.summary, "")

  /* Neighbourhood scores */
  const walkScore = realData?.neighborhoodScores?.walkScore ?? neighborhood.walkScore ?? null
  const transitScore = realData?.neighborhoodScores?.transitScore ?? neighborhood.transitScore ?? null
  const schoolScore = realData?.neighborhoodScores?.schoolScore ?? neighborhood.schoolScore ?? neighborhood.schoolRating ?? null
  const safetyScore = realData?.neighborhoodScores?.safetyScore ?? neighborhood.safetyScore ?? neighborhood.safetyRating ?? null
  const hoodSummary = n(neighborhood.summary || neighborhood.description || neighborhood.character, "")
  const hoodPros = Array.isArray(neighborhood.pros) ? neighborhood.pros : []
  const hoodCons = Array.isArray(neighborhood.cons) ? neighborhood.cons : []

  /* Risk — exact field names from detailedRisk */
  const dr = risk.detailedRisk || risk
  const floodRisk = n(dr.floodRisk, "")
  const fireRisk = n(dr.fireRisk, "")
  const seismicRisk = n(dr.seismicRisk, "")
  const pollutionRisk = n(dr.pollutionRisk, "")
  const noiseRisk = n(dr.noiseRisk, "")
  const riskSummary = n(risk.summary || risk.riskSummary, "")

  /* Climate — exact field names */
  const avgHighC = climate.avgHighC != null ? `${climate.avgHighC}°C` : ""
  const avgLowC = climate.avgLowC != null ? `${climate.avgLowC}°C` : ""
  const avgPrecip = climate.avgPrecipMm != null ? `${climate.avgPrecipMm}mm/day` : ""
  const climateSummary = n(climate.summary || climate.description, "")

  /* Weather */
  const currentTemp = weather?.current?.temperature_2m ?? weather?.temperature_2m ?? null
  const tempDisplay = currentTemp != null ? `${Math.round(currentTemp)}°C / ${Math.round(currentTemp * 9 / 5 + 32)}°F` : ""
  const weatherDesc = n(weather?.current?.description || weather?.description, "")

  /* Price history */
  const phData = priceHistory.data || []
  const phCurrent = phData.length ? fmtK(phData[phData.length - 1]?.value, sym) : "—"
  const phFirst = phData.length ? phData[0]?.year : null
  const phLast = phData.length ? phData[phData.length - 1]?.year : null
  const phNote = n(priceHistory.marketNote, "")

  /* Local insights — exact field names */
  const knownFor = n(localInsights.knownFor, "")
  const attractions = Array.isArray(localInsights.topAttractions) ? localInsights.topAttractions : []
  const localTip = n(localInsights.localTip, "")
  const languageNote = n(localInsights.languageNote, "")

  /* Areawide pros/cons (from areaIntelligence if neighborhood doesn't have them) */
  const pros = hoodPros.length ? hoodPros : (Array.isArray(areaIntelligence.pros) ? areaIntelligence.pros : [])
  const cons = hoodCons.length ? hoodCons : (Array.isArray(areaIntelligence.cons) ? areaIntelligence.cons : [])

  const CSS = `
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Georgia',serif;background:#f9f8f5;color:#1a1a1a;line-height:1.65}
.page{max-width:900px;margin:0 auto;padding:48px 40px}
.brand-bar{display:flex;align-items:center;justify-content:space-between;margin-bottom:40px;padding-bottom:20px;border-bottom:3px solid #1a1a1a}
.brand-left{display:flex;align-items:center;gap:14px}
.bl img{height:40px;width:auto;object-fit:contain}
.bn{font-family:sans-serif;font-size:18px;font-weight:700}
.bm{font-family:sans-serif;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#888;margin-top:2px}
.br{text-align:right}
.bd{font-family:sans-serif;font-size:11px;color:#aaa;letter-spacing:.08em;text-transform:uppercase}
.area-name{font-size:clamp(2rem,5vw,3rem);font-weight:700;letter-spacing:-.02em;line-height:1.05;margin-bottom:10px}
.vrow{display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-bottom:12px}
.vbadge{display:inline-block;padding:6px 20px;border-radius:40px;font-family:sans-serif;font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;border:2px solid currentColor}
.iscore{font-family:sans-serif;font-size:28px;font-weight:700;line-height:1}
.ilabel{font-family:sans-serif;font-size:9px;color:#aaa;letter-spacing:.1em;text-transform:uppercase;margin-top:2px}
.reason{font-size:14px;color:#555;max-width:660px;line-height:1.75;margin:8px 0 16px}
.sec{margin-bottom:38px;page-break-inside:avoid}
.st{font-family:sans-serif;font-size:9px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:#aaa;margin-bottom:14px;padding-bottom:8px;border-bottom:1px solid #e8e5e0}
.sb{font-size:14px;color:#333;line-height:1.8}
.g2{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}
.g3{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
.g4{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
.g5{display:grid;grid-template-columns:repeat(5,1fr);gap:10px}
.stat{background:#fff;border:1px solid #e8e5e0;border-radius:10px;padding:14px 16px}
.sl2{font-family:sans-serif;font-size:8px;letter-spacing:.14em;text-transform:uppercase;color:#aaa;margin-bottom:5px}
.sv{font-size:1.4rem;font-weight:700;line-height:1.1}
.ssub{font-family:sans-serif;font-size:10px;color:#999;margin-top:3px}
.sr{display:flex;align-items:center;gap:12px;margin-bottom:10px}
.sl{font-family:sans-serif;font-size:11px;color:#666;width:110px;flex-shrink:0}
.st2{flex:1;height:6px;background:#eee;border-radius:3px;overflow:hidden}
.sn{font-family:sans-serif;font-size:12px;font-weight:700;width:28px;text-align:right;flex-shrink:0}
.pcg{display:grid;grid-template-columns:1fr 1fr;gap:20px}
.pcl{font-family:sans-serif;font-size:9px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;margin-bottom:8px}
.plist{list-style:none}
.plist li{font-size:13px;color:#333;padding:5px 0;border-bottom:1px solid #f0ede8;display:flex;gap:8px}
.plist li::before{flex-shrink:0;font-weight:900;font-family:sans-serif}
.pros .pcl{color:#15803d}.cons .pcl{color:#b91c1c}
.pros li::before{content:"+";color:#15803d}.cons li::before{content:"−";color:#b91c1c}
.rrow{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:14px}
.rc{background:#fff;border:1px solid #e8e5e0;border-radius:8px;padding:10px 14px;min-width:90px}
.ri{font-size:18px;margin-bottom:2px}
.rn{font-family:sans-serif;font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:#aaa}
.rv{font-family:sans-serif;font-size:13px;font-weight:600}
.quote{border-left:3px solid #d4c89a;padding:12px 20px;margin:14px 0;font-style:italic;font-size:14px;color:#555;line-height:1.75;background:#faf9f5}
.alist{list-style:none;display:flex;flex-direction:column;gap:6px}
.alist li{font-size:13px;color:#333;display:flex;align-items:center;gap:10px}
.anum{font-family:sans-serif;font-size:9px;font-weight:700;color:#aaa;width:20px}
.tip{margin-top:16px;padding:12px 16px;background:#f0ede8;border-radius:8px;font-size:13px;color:#444;line-height:1.7}
.tag{display:inline-block;background:#f0ede8;border-radius:4px;padding:3px 8px;font-family:sans-serif;font-size:10px;color:#888;margin:2px}
.footer{margin-top:48px;padding-top:20px;border-top:2px solid #1a1a1a;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px}
.fb{font-family:sans-serif;font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase}
.fn{font-family:sans-serif;font-size:10px;color:#bbb}
@media print{body{background:#fff}.page{padding:20px}}
@media(max-width:640px){.g4,.g5{grid-template-columns:repeat(2,1fr)}.g3{grid-template-columns:1fr 1fr}.pcg{grid-template-columns:1fr}}
`

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${areaName} — ${brandName}</title>
<style>${CSS}</style>
</head>
<body><div class="page">

<!-- Brand -->
<div class="brand-bar">
  <div class="brand-left bl">
    ${logoUrl ? `<img src="${logoUrl}" alt="${brandName}"/>` : ""}
    <div><div class="bn">${brandName}</div><div class="bm">Area Intelligence Report${clientName ? ` · ${clientName}` : ""}</div></div>
  </div>
  <div class="br"><div class="bd">Generated ${generated}</div>${clientName ? `<div style="font-family:sans-serif;font-size:12px;color:#555;margin-top:4px">${clientName}</div>` : ""}</div>
</div>

<!-- Header -->
<div style="margin-bottom:36px">
  <div class="area-name">${areaName}${country && !areaName.includes(country) ? ", " + country : ""}</div>
  <div class="vrow">
    ${verdict ? `<div class="vbadge" style="color:${vc(verdict)}">${verdict}</div>` : ""}
    ${investScore != null ? `<div><div class="iscore" style="color:${sc(investScore)}">${investScore}<span style="font-size:14px;color:#aaa">/100</span></div><div class="ilabel">Investment Score</div></div>` : ""}
    ${rentYield ? `<div><div class="iscore" style="font-size:20px">${rentYield}</div><div class="ilabel">Rent Yield</div></div>` : ""}
    ${bestFor ? `<div style="font-family:sans-serif;font-size:12px;color:#888">Best for: ${bestFor}</div>` : ""}
  </div>
  ${verdictReason ? `<div class="reason">${verdictReason}</div>` : ""}
</div>

${inc("overview") && aiSummary ? `
<div class="sec"><div class="st">Overview</div><div class="sb">${aiSummary}</div></div>` : ""}

${inc("market") ? `
<div class="sec">
  <div class="st">Market & Property Estimate</div>
  <div class="g4" style="margin-bottom:12px">
    <div class="stat"><div class="sl2">Estimated Value</div><div class="sv">${estValue}</div>${priceRange ? `<div class="ssub">${priceRange}</div>` : ""}</div>
    ${medianPrice !== "—" ? `<div class="stat"><div class="sl2">Median Price</div><div class="sv">${medianPrice}</div></div>` : ""}
    ${avgPrice !== "—" ? `<div class="stat"><div class="sl2">Avg Price</div><div class="sv">${avgPrice}</div></div>` : ""}
    ${rentMonthly !== "—" ? `<div class="stat"><div class="sl2">Rent / Month</div><div class="sv">${rentMonthly}</div><div class="ssub">area avg</div></div>` : ""}
    ${pricePerSqft !== "—" ? `<div class="stat"><div class="sl2">Price / sqft</div><div class="sv">${pricePerSqft}</div></div>` : ""}
    ${medianPPSF !== "—" ? `<div class="stat"><div class="sl2">Median $/sqft</div><div class="sv">${medianPPSF}</div></div>` : ""}
    ${medianDOM !== "—" ? `<div class="stat"><div class="sl2">Median DOM</div><div class="sv">${medianDOM}</div></div>` : ""}
    ${activeListings ? `<div class="stat"><div class="sl2">Active Listings</div><div class="sv">${activeListings}</div></div>` : ""}
    ${mktTemp ? `<div class="stat"><div class="sl2">Market Temp</div><div class="sv" style="font-size:1rem">${mktTemp}</div></div>` : ""}
    ${confidence ? `<div class="stat"><div class="sl2">Confidence</div><div class="sv" style="font-size:1rem">${confidence}</div></div>` : ""}
  </div>
  ${priceContext ? `<p class="sb">${priceContext}</p>` : ""}
</div>` : ""}

${inc("col") ? `
<div class="sec">
  <div class="st">Cost of Living</div>
  <div class="g5" style="margin-bottom:12px">
    <div class="stat"><div class="sl2">Monthly Budget</div><div class="sv">${monthlyBudget}</div>${colIdx ? `<div class="ssub">${colIdx}</div>` : ""}</div>
    ${rent1br !== "—" ? `<div class="stat"><div class="sl2">1-BR Rent</div><div class="sv">${rent1br}</div></div>` : ""}
    <div class="stat"><div class="sl2">Groceries</div><div class="sv">${groceries}</div><div class="ssub">per month</div></div>
    <div class="stat"><div class="sl2">Transport</div><div class="sv">${transport}</div><div class="ssub">per month</div></div>
    <div class="stat"><div class="sl2">Utilities</div><div class="sv">${utilities}</div><div class="ssub">per month</div></div>
  </div>
  ${dining !== "—" ? `<div class="g5" style="margin-bottom:12px"><div class="stat"><div class="sl2">Dining Out</div><div class="sv">${dining}</div><div class="ssub">per month</div></div></div>` : ""}
  ${colSummary ? `<p class="sb">${colSummary}</p>` : ""}
</div>` : ""}

${inc("investment") && (investScore != null || investSummary) ? `
<div class="sec">
  <div class="st">Investment Analysis</div>
  <div class="g4" style="margin-bottom:12px">
    ${investScore != null ? `<div class="stat"><div class="sl2">Investment Score</div><div class="sv" style="color:${sc(investScore)}">${investScore}<span style="font-size:14px;color:#aaa">/100</span></div></div>` : ""}
    ${rentYield ? `<div class="stat"><div class="sl2">Rent Yield</div><div class="sv">${rentYield}</div><div class="ssub">annual gross</div></div>` : ""}
    ${outlook ? `<div class="stat"><div class="sl2">Outlook</div><div class="sv" style="font-size:1rem;text-transform:capitalize">${outlook}</div></div>` : ""}
  </div>
  ${outlookText ? `<p class="sb" style="margin-bottom:10px">${outlookText}</p>` : ""}
  ${investSummary ? `<p class="sb">${investSummary}</p>` : ""}
</div>` : ""}

${inc("scores") ? `
<div class="sec">
  <div class="st">Liveability Scores</div>
  <div style="max-width:480px">
    ${scoreBar("Walk Score", walkScore)}
    ${scoreBar("Transit Score", transitScore)}
    ${scoreBar("School Score", schoolScore)}
    ${scoreBar("Safety Score", safetyScore)}
  </div>
</div>` : ""}

${inc("hood") && hoodSummary ? `
<div class="sec"><div class="st">Neighbourhood</div><p class="sb">${hoodSummary}</p></div>` : ""}

${inc("proscons") && (pros.length > 0 || cons.length > 0) ? `
<div class="sec">
  <div class="st">Pros & Cons</div>
  <div class="pcg">
    <div class="pros"><div class="pcl">Pros</div><ul class="plist">${pros.map(p => `<li>${esc(String(p ?? ""))}</li>`).join("")}</ul></div>
    <div class="cons"><div class="pcl">Cons</div><ul class="plist">${cons.map(c => `<li>${esc(String(c ?? ""))}</li>`).join("")}</ul></div>
  </div>
</div>` : ""}

${inc("risk") && (floodRisk || fireRisk || seismicRisk || pollutionRisk || noiseRisk || riskSummary) ? `
<div class="sec">
  <div class="st">Environmental & Risk</div>
  <div class="rrow">
    ${floodRisk ? `<div class="rc"><div class="ri">🌊</div><div class="rn">Flood</div><div class="rv">${floodRisk}</div></div>` : ""}
    ${fireRisk ? `<div class="rc"><div class="ri">🔥</div><div class="rn">Fire</div><div class="rv">${fireRisk}</div></div>` : ""}
    ${seismicRisk ? `<div class="rc"><div class="ri">🌍</div><div class="rn">Seismic</div><div class="rv">${seismicRisk}</div></div>` : ""}
    ${pollutionRisk ? `<div class="rc"><div class="ri">💨</div><div class="rn">Pollution</div><div class="rv">${pollutionRisk}</div></div>` : ""}
    ${noiseRisk ? `<div class="rc"><div class="ri">🔊</div><div class="rn">Noise</div><div class="rv">${noiseRisk}</div></div>` : ""}
  </div>
  ${riskSummary ? `<p class="sb">${riskSummary}</p>` : ""}
</div>` : ""}

${inc("climate") && (avgHighC || avgLowC || avgPrecip || climateSummary || tempDisplay) ? `
<div class="sec">
  <div class="st">Climate & Weather</div>
  <div class="g4" style="margin-bottom:12px">
    ${tempDisplay ? `<div class="stat"><div class="sl2">Current Temp</div><div class="sv">${tempDisplay}</div>${weatherDesc ? `<div class="ssub">${weatherDesc}</div>` : ""}</div>` : ""}
    ${avgHighC ? `<div class="stat"><div class="sl2">Avg High</div><div class="sv">${avgHighC}</div></div>` : ""}
    ${avgLowC ? `<div class="stat"><div class="sl2">Avg Low</div><div class="sv">${avgLowC}</div></div>` : ""}
    ${avgPrecip ? `<div class="stat"><div class="sl2">Daily Precip</div><div class="sv">${avgPrecip}</div></div>` : ""}
  </div>
  ${climateSummary ? `<p class="sb">${climateSummary}</p>` : ""}
</div>` : ""}

${phData.length > 0 && inc("market") ? `
<div class="sec">
  <div class="st">Price History${phFirst && phLast ? ` (${phFirst}–${phLast})` : ""}</div>
  <div class="g3" style="margin-bottom:12px">
    ${phCurrent !== "—" ? `<div class="stat"><div class="sl2">Latest Median</div><div class="sv">${phCurrent}</div></div>` : ""}
    ${phData.length >= 2 ? (() => { const first = phData[0]?.value, last = phData[phData.length-1]?.value; if(first && last && first > 0) { const chg = ((last-first)/first*100).toFixed(1); return `<div class="stat"><div class="sl2">Since ${phData[0].year}</div><div class="sv" style="color:${chg>=0?"#16a34a":"#dc2626"}">${chg>=0?"+":""}${chg}%</div></div>`} return ""})() : ""}
  </div>
  ${phNote ? `<p class="sb">${phNote}</p>` : ""}
</div>` : ""}

${inc("insights") && (knownFor || attractions.length > 0 || localTip) ? `
<div class="sec">
  <div class="st">Local Insights</div>
  ${knownFor ? `<div class="quote">${knownFor}</div>` : ""}
  ${attractions.length > 0 ? `<div style="margin-top:14px"><div style="font-family:sans-serif;font-size:9px;color:#aaa;letter-spacing:.1em;text-transform:uppercase;margin-bottom:10px">Top Attractions</div><ul class="alist">${attractions.map((a,i)=>`<li><span class="anum">${String(i+1).padStart(2,"00")}</span>${esc(String(a ?? ""))}</li>`).join("")}</ul></div>` : ""}
  ${localTip ? `<div class="tip"><strong>Local tip:</strong> ${localTip}</div>` : ""}
  ${languageNote ? `<p class="sb" style="margin-top:12px">${languageNote}</p>` : ""}
</div>` : ""}

<div class="footer">
  <div class="fb">${brandName}</div>
  <div class="fn">AI-generated · Informational purposes only · Not financial or legal advice · dwelling.one</div>
</div>

</div></body></html>`
}
