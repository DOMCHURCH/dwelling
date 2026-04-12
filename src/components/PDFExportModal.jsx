import { useState, useEffect } from 'react'
import { getBrandLogo, getBrandName } from './BrandingModal'

const SECTIONS = [
  { id: 'verdict',      label: 'Area Verdict & AI Analysis',  icon: '🎯', defaultOn: true },
  { id: 'market',       label: 'Market Intelligence',          icon: '📊', defaultOn: true },
  { id: 'estimate',     label: 'Market Estimate',              icon: '🏠', defaultOn: true },
  { id: 'investment',   label: 'Investment Analysis',          icon: '📈', defaultOn: true },
  { id: 'neighborhood', label: 'Neighborhood Scores',          icon: '🏘', defaultOn: true },
  { id: 'pricehistory', label: 'Price History & Projection',   icon: '📉', defaultOn: true },
  { id: 'costliving',   label: 'Cost of Living',               icon: '💰', defaultOn: true },
  { id: 'climate',      label: 'Climate & Weather',            icon: '🌤', defaultOn: true },
  { id: 'risk',         label: 'Environmental Risk',           icon: '🛡', defaultOn: true },
  { id: 'news',         label: 'Local Market News',            icon: '📰', defaultOn: false },
  { id: 'insights',     label: 'Local Insights',               icon: '🗺', defaultOn: false },
]

/* ── helpers ── */
function fmt(n) {
  return n != null && n !== 0
    ? n.toLocaleString('en-US', { maximumFractionDigits: 0 })
    : '—'
}
function fmtK(n, sym = '$') {
  if (!n && n !== 0) return '—'
  if (n >= 1_000_000) return `${sym}${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${sym}${Math.round(n / 1_000)}K`
  return `${sym}${fmt(n)}`
}
function sc(score) {
  if (score >= 70) return '#16a34a'
  if (score >= 45) return '#d97706'
  return '#dc2626'
}
function vc(verdict) {
  if (verdict === 'Excellent') return '#16a34a'
  if (verdict === 'Good')      return '#22c55e'
  if (verdict === 'Caution')   return '#d97706'
  if (verdict === 'Avoid')     return '#dc2626'
  return '#6b7280'
}
function safe(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
}

/* ── HTML report generator ── */
function buildHTML(result, selected, clientName, clientEmail, notes) {
  const { geo, ai, realData, weather, climate } = result || {}
  const { areaIntelligence, propertyEstimate, investment, priceHistory, costOfLiving, localInsights } = ai || {}
  const { areaMetrics, areaRiskScore, marketTemperature, neighborhoodScores, newsData, riskData } = realData || {}

  const areaName   = geo?.displayName?.split(',')[0] || 'Unknown Area'
  const fullAddr   = geo?.displayName || ''
  const brandLogo  = getBrandLogo()
  const brandName  = safe(getBrandName() || 'Dwelling')
  const today      = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

  const parts = []

  /* ── VERDICT ── */
  if (selected.verdict && areaIntelligence) {
    const color = vc(areaIntelligence.verdict)
    parts.push(`
<section class="card">
  <h2>Area Verdict</h2>
  <span class="badge" style="background:${color}18;border:1.5px solid ${color}50;color:${color}">${safe(areaIntelligence.verdict)}</span>
  ${areaIntelligence.bestFor ? `<p class="meta"><b>Best for:</b> ${safe(areaIntelligence.bestFor)}</p>` : ''}
  ${areaIntelligence.marketConditions ? `<p class="body">${safe(areaIntelligence.marketConditions)}</p>` : ''}
  ${areaIntelligence.outlook12Months  ? `<p class="body"><b>12-month outlook:</b> ${safe(areaIntelligence.outlook12Months)}</p>` : ''}
  ${areaRiskScore ? `
  <div class="chips">
    <div class="chip">
      <span class="chip-label">Stability Score</span>
      <span class="chip-value" style="color:${sc(areaRiskScore.score)}">${areaRiskScore.score}<span class="chip-unit">/100</span></span>
      <span class="chip-sub">${safe(areaRiskScore.label)}</span>
    </div>
    ${marketTemperature ? `<div class="chip">
      <span class="chip-label">Market Temp</span>
      <span class="chip-value" style="color:${marketTemperature.color || '#111'}">${safe(marketTemperature.label)}</span>
    </div>` : ''}
  </div>` : ''}
  ${(areaIntelligence.upsides?.length || areaIntelligence.risks?.length) ? `
  <div class="two-col" style="margin-top:18px">
    <div>
      <h4 style="color:#16a34a">Strengths</h4>
      <ul>${(areaIntelligence.upsides || []).map(u => `<li>${safe(u)}</li>`).join('')}</ul>
    </div>
    <div>
      <h4 style="color:#dc2626">Watch Points</h4>
      <ul>${(areaIntelligence.risks || []).map(r => `<li>${safe(r)}</li>`).join('')}</ul>
    </div>
  </div>` : ''}
</section>`)
  }

  /* ── MARKET ── */
  if (selected.market && areaMetrics) {
    parts.push(`
<section class="card">
  <h2>Market Intelligence</h2>
  <table>
    <tr><td>Median Price</td><td><b>${fmtK(areaMetrics.medianPrice)}</b></td></tr>
    <tr><td>Average Price</td><td><b>${fmtK(areaMetrics.avgPrice)}</b></td></tr>
    <tr><td>Median Days on Market</td><td><b>${areaMetrics.medianDOM != null ? areaMetrics.medianDOM + ' days' : '—'}</b></td></tr>
    <tr><td>Active Listings</td><td><b>${fmt(areaMetrics.count)}</b></td></tr>
    ${areaMetrics.medianPriceChange != null ? `<tr><td>YoY Price Change</td><td><b style="color:${areaMetrics.medianPriceChange >= 0 ? '#16a34a' : '#dc2626'}">${areaMetrics.medianPriceChange >= 0 ? '+' : ''}${areaMetrics.medianPriceChange.toFixed(1)}%</b></td></tr>` : ''}
  </table>
</section>`)
  }

  /* ── ESTIMATE ── */
  if (selected.estimate && propertyEstimate) {
    parts.push(`
<section class="card">
  <h2>Market Estimate</h2>
  <div class="chips">
    <div class="chip"><span class="chip-label">Estimated Median Value</span><span class="chip-value">${fmtK(propertyEstimate.estimatedValueUSD)}</span></div>
    <div class="chip"><span class="chip-label">Price per sqft</span><span class="chip-value">${fmtK(propertyEstimate.pricePerSqftUSD)}</span></div>
    ${propertyEstimate.estimatedRentUSD ? `<div class="chip"><span class="chip-label">Est. Monthly Rent</span><span class="chip-value">${fmtK(propertyEstimate.estimatedRentUSD)}</span></div>` : ''}
    ${propertyEstimate.capRate ? `<div class="chip"><span class="chip-label">Cap Rate</span><span class="chip-value">${safe(propertyEstimate.capRate)}</span></div>` : ''}
  </div>
  ${propertyEstimate.summary ? `<p class="body">${safe(propertyEstimate.summary)}</p>` : ''}
</section>`)
  }

  /* ── INVESTMENT ── */
  if (selected.investment && investment) {
    const outlook = investment.appreciationOutlook || 'neutral'
    const oColor  = outlook === 'bullish' ? '#16a34a' : outlook === 'bearish' ? '#dc2626' : '#6b7280'
    parts.push(`
<section class="card">
  <h2>Investment Analysis</h2>
  <div class="chips">
    <div class="chip">
      <span class="chip-label">Appreciation Outlook</span>
      <span class="chip-value" style="color:${oColor}">${outlook.toUpperCase()}</span>
    </div>
    ${investment.roi1yr != null ? `<div class="chip"><span class="chip-label">1-Year ROI Est.</span><span class="chip-value">${investment.roi1yr >= 0 ? '+' : ''}${investment.roi1yr}%</span></div>` : ''}
    ${investment.roi5yr != null ? `<div class="chip"><span class="chip-label">5-Year ROI Est.</span><span class="chip-value">${investment.roi5yr >= 0 ? '+' : ''}${investment.roi5yr}%</span></div>` : ''}
    ${investment.rentalYield != null ? `<div class="chip"><span class="chip-label">Rental Yield</span><span class="chip-value">${investment.rentalYield}%</span></div>` : ''}
  </div>
  ${investment.investmentSummary ? `<p class="body">${safe(investment.investmentSummary)}</p>` : ''}
</section>`)
  }

  /* ── NEIGHBORHOOD ── */
  if (selected.neighborhood && neighborhoodScores) {
    const bars = [
      { label: 'Walkability', score: neighborhoodScores.walkScore ?? neighborhoodScores.walkability },
      { label: 'Transit',     score: neighborhoodScores.transitScore ?? neighborhoodScores.transit },
      { label: 'Schools',     score: neighborhoodScores.schoolScore ?? neighborhoodScores.schools },
      { label: 'Safety',      score: neighborhoodScores.safetyScore ?? neighborhoodScores.safety },
    ].filter(b => b.score != null)

    if (bars.length) {
      parts.push(`
<section class="card">
  <h2>Neighborhood Scores</h2>
  <div class="bars">
    ${bars.map(b => `
    <div class="bar-row">
      <div class="bar-label"><span>${safe(b.label)}</span><span style="font-weight:600;color:${sc(b.score)}">${b.score}/100</span></div>
      <div class="bar-track"><div class="bar-fill" style="width:${b.score}%;background:${sc(b.score)}"></div></div>
    </div>`).join('')}
  </div>
</section>`)
    }
  }

  /* ── PRICE HISTORY ── */
  if (selected.pricehistory && priceHistory?.length) {
    parts.push(`
<section class="card">
  <h2>Price History &amp; Projection</h2>
  <table>
    <thead><tr><th>Year</th><th>Median Price</th><th>Change</th></tr></thead>
    <tbody>
      ${priceHistory.map(p => `
      <tr>
        <td>${safe(p.year)}</td>
        <td><b>${fmtK(p.medianPriceUSD)}</b></td>
        <td style="color:${(p.changePercent || 0) >= 0 ? '#16a34a' : '#dc2626'}">
          ${p.changePercent != null ? ((p.changePercent >= 0 ? '+' : '') + p.changePercent.toFixed(1) + '%') : '—'}
        </td>
      </tr>`).join('')}
    </tbody>
  </table>
</section>`)
  }

  /* ── COST OF LIVING ── */
  if (selected.costliving && costOfLiving) {
    const idx = costOfLiving.indexVsUSAverage
    parts.push(`
<section class="card">
  <h2>Cost of Living</h2>
  <div class="chips">
    ${costOfLiving.monthlyBudgetUSD ? `<div class="chip"><span class="chip-label">Est. Monthly Budget</span><span class="chip-value">${fmtK(costOfLiving.monthlyBudgetUSD)}</span></div>` : ''}
    ${idx != null ? `<div class="chip"><span class="chip-label">vs US Average</span><span class="chip-value" style="color:${idx > 15 ? '#dc2626' : idx < -15 ? '#16a34a' : '#111'}">${idx > 0 ? '+' : ''}${Math.round(idx)}%</span></div>` : ''}
  </div>
  <table>
    ${costOfLiving.groceriesMonthlyUSD  ? `<tr><td>Groceries</td><td><b>${fmtK(costOfLiving.groceriesMonthlyUSD)}/mo</b></td></tr>` : ''}
    ${costOfLiving.transportMonthlyUSD  ? `<tr><td>Transport</td><td><b>${fmtK(costOfLiving.transportMonthlyUSD)}/mo</b></td></tr>` : ''}
    ${costOfLiving.utilitiesMonthlyUSD  ? `<tr><td>Utilities</td><td><b>${fmtK(costOfLiving.utilitiesMonthlyUSD)}/mo</b></td></tr>` : ''}
    ${costOfLiving.diningOutMonthlyUSD  ? `<tr><td>Dining Out</td><td><b>${fmtK(costOfLiving.diningOutMonthlyUSD)}/mo</b></td></tr>` : ''}
  </table>
  ${costOfLiving.summary ? `<p class="body">${safe(costOfLiving.summary)}</p>` : ''}
</section>`)
  }

  /* ── CLIMATE ── */
  if (selected.climate) {
    const cur    = weather?.current
    const tempC  = cur?.temperature_2m
    const tempF  = tempC != null ? Math.round(tempC * 9 / 5 + 32) : null
    const sumH   = climate?.summer_high_c
    const winL   = climate?.winter_low_c
    const rain   = climate?.annual_precipitation_mm

    if (tempC != null || sumH || rain) {
      parts.push(`
<section class="card">
  <h2>Climate &amp; Weather</h2>
  <table>
    ${tempC != null ? `<tr><td>Current Temperature</td><td><b>${tempC}°C / ${tempF}°F</b></td></tr>` : ''}
    ${sumH != null  ? `<tr><td>Summer High</td><td><b>${sumH}°C</b></td></tr>` : ''}
    ${winL != null  ? `<tr><td>Winter Low</td><td><b>${winL}°C</b></td></tr>` : ''}
    ${rain != null  ? `<tr><td>Annual Precipitation</td><td><b>${Math.round(rain)} mm</b></td></tr>` : ''}
  </table>
</section>`)
    }
  }

  /* ── RISK ── */
  if (selected.risk && riskData) {
    const skip = ['lat', 'lon', 'county', 'state', 'country']
    const rows = Object.entries(riskData).filter(([k]) => !skip.includes(k))
    if (rows.length) {
      parts.push(`
<section class="card">
  <h2>Environmental Risk</h2>
  <table>
    ${rows.map(([k, v]) => {
      const val = typeof v === 'object' ? (v.level || v.score || v.label || JSON.stringify(v)) : v
      return `<tr><td style="text-transform:capitalize">${safe(k.replace(/_/g, ' '))}</td><td><b>${safe(val)}</b></td></tr>`
    }).join('')}
  </table>
</section>`)
    }
  }

  /* ── NEWS ── */
  if (selected.news && newsData?.articles?.length) {
    parts.push(`
<section class="card">
  <h2>Local Market News</h2>
  ${newsData.articles.slice(0, 5).map(a => `
  <div class="news-item">
    <div class="news-title">${safe(a.title)}</div>
    ${a.description ? `<div class="news-desc">${safe(a.description)}</div>` : ''}
    <div class="news-meta">${safe(a.source?.name || '')}${a.publishedAt ? ' · ' + new Date(a.publishedAt).toLocaleDateString() : ''}</div>
  </div>`).join('')}
</section>`)
  }

  /* ── LOCAL INSIGHTS ── */
  if (selected.insights && localInsights) {
    const summary = typeof localInsights === 'string' ? localInsights : localInsights.summary
    parts.push(`
<section class="card">
  <h2>Local Insights</h2>
  ${summary ? `<p class="body">${safe(summary)}</p>` : ''}
  ${localInsights.keyAttractions?.length ? `<h4>Key Attractions</h4><ul>${localInsights.keyAttractions.map(a => `<li>${safe(a)}</li>`).join('')}</ul>` : ''}
  ${localInsights.localTips?.length      ? `<h4>Local Tips</h4><ul>${localInsights.localTips.map(t => `<li>${safe(t)}</li>`).join('')}</ul>` : ''}
</section>`)
  }

  /* ── NOTES ── */
  if (notes?.trim()) {
    parts.push(`
<section class="card">
  <h2>Notes</h2>
  <div class="notes-box">${safe(notes).replace(/\n/g, '<br>')}</div>
</section>`)
  }

  /* ── ASSEMBLE ── */
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Dwelling Report — ${safe(areaName)}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,400;0,600;1,400;1,600&family=Inter:wght@300;400;500;600&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Inter',-apple-system,sans-serif;color:#1a1a1a;background:#f5f4f1;font-size:14px;line-height:1.65}
.page{max-width:820px;margin:32px auto 60px;background:#fff;border-radius:4px;box-shadow:0 4px 40px rgba(0,0,0,0.09);overflow:hidden}
/* Header */
.rpt-header{background:#0d0d0d;color:#fff;padding:40px 52px 36px}
.header-row{display:flex;align-items:center;justify-content:space-between;margin-bottom:32px;padding-bottom:24px;border-bottom:1px solid rgba(255,255,255,0.1)}
.brand{display:flex;align-items:center;gap:10px}
.brand img{height:30px;border-radius:6px;object-fit:contain}
.brand-name{font-family:'Crimson Pro',Georgia,serif;font-style:italic;font-size:20px;color:#fff}
.rpt-meta{text-align:right;font-size:11px;color:rgba(255,255,255,0.38);line-height:1.8}
.rpt-area{font-family:'Crimson Pro',Georgia,serif;font-style:italic;font-size:40px;color:#fff;line-height:1.08;letter-spacing:-0.025em;margin-bottom:8px}
.rpt-addr{font-size:12px;color:rgba(255,255,255,0.38);font-weight:300}
.rpt-client{margin-top:20px;padding-top:18px;border-top:1px solid rgba(255,255,255,0.08);font-size:12px;color:rgba(255,255,255,0.4)}
.rpt-client b{color:rgba(255,255,255,0.8)}
/* Content */
.content{padding:8px 52px 52px}
.card{padding:32px 0;border-bottom:1px solid #f0ede6}
.card:last-child{border-bottom:none}
h2{font-family:'Crimson Pro',Georgia,serif;font-size:23px;font-weight:600;color:#0d0d0d;margin-bottom:18px;letter-spacing:-0.015em}
h4{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#9ca3af;margin:18px 0 8px}
.body{color:#374151;font-size:13.5px;line-height:1.78;font-weight:300;margin-top:12px}
.meta{color:#6b7280;font-size:13px;margin-bottom:8px}
/* Badge */
.badge{display:inline-block;padding:7px 22px;border-radius:40px;font-family:'Crimson Pro',Georgia,serif;font-style:italic;font-size:22px;margin-bottom:14px}
/* Chips (key metrics row) */
.chips{display:flex;gap:20px;flex-wrap:wrap;margin-bottom:14px}
.chip{display:flex;flex-direction:column;gap:3px;min-width:110px}
.chip-label{font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:#9ca3af;font-weight:500}
.chip-value{font-family:'Crimson Pro',Georgia,serif;font-style:italic;font-size:28px;color:#0d0d0d;line-height:1}
.chip-unit{font-size:14px;color:#9ca3af}
.chip-sub{font-size:11px;color:#9ca3af}
/* Table */
table{width:100%;border-collapse:collapse;font-size:13px;margin-bottom:6px}
thead th{text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:#9ca3af;padding:8px 10px;border-bottom:2px solid #f3f4f6;font-weight:600}
thead th:not(:first-child){text-align:right}
td{padding:10px 10px;border-bottom:1px solid #f9f8f6;color:#374151}
td:first-child{color:#6b7280;font-weight:300}
td:not(:first-child){text-align:right}
tr:nth-child(even) td{background:#fafaf8}
/* Two col */
.two-col{display:grid;grid-template-columns:1fr 1fr;gap:24px}
ul{padding-left:16px}
li{font-size:13px;line-height:1.85;font-weight:300;color:#374151}
/* Score bars */
.bars{display:flex;flex-direction:column;gap:14px}
.bar-row{}
.bar-label{display:flex;justify-content:space-between;font-size:13px;color:#374151;margin-bottom:6px}
.bar-track{height:6px;background:#f3f4f6;border-radius:4px;overflow:hidden}
.bar-fill{height:100%;border-radius:4px}
/* News */
.news-item{padding:14px 0;border-bottom:1px solid #f5f4f1}
.news-item:last-child{border-bottom:none}
.news-title{font-size:14px;font-weight:500;color:#111;margin-bottom:5px;line-height:1.4}
.news-desc{font-size:12.5px;color:#6b7280;font-weight:300;line-height:1.5;margin-bottom:4px}
.news-meta{font-size:11px;color:#9ca3af}
/* Notes */
.notes-box{background:#fafaf8;border-left:3px solid #e5e7eb;padding:16px 20px;border-radius:0 6px 6px 0;font-size:13.5px;color:#374151;font-weight:300;line-height:1.75}
/* Footer */
.rpt-footer{background:#fafaf8;border-top:1px solid #f0ede6;padding:20px 52px;display:flex;align-items:center;justify-content:space-between;gap:20px}
.footer-brand{font-family:'Crimson Pro',Georgia,serif;font-style:italic;font-size:16px;color:#bbb}
.footer-disc{font-size:10px;color:#d1d5db;max-width:400px;text-align:right;line-height:1.6}
/* Print */
@media print{
  body{background:#fff}
  .page{box-shadow:none;margin:0;border-radius:0}
  @page{margin:0;size:A4}
  .card{break-inside:avoid}
}
</style>
</head>
<body>
<div class="page">

  <div class="rpt-header">
    <div class="header-row">
      <div class="brand">
        ${brandLogo ? `<img src="${brandLogo}" alt="logo">` : ''}
        <span class="brand-name">${brandName}</span>
      </div>
      <div class="rpt-meta">
        <div>Property Intelligence Report</div>
        <div>${today}</div>
      </div>
    </div>
    <div class="rpt-area">${safe(areaName)}</div>
    <div class="rpt-addr">${safe(fullAddr)}</div>
    ${(clientName || clientEmail) ? `<div class="rpt-client">Prepared for: <b>${safe(clientName)}${clientName && clientEmail ? ' &middot; ' : ''}${safe(clientEmail)}</b></div>` : ''}
  </div>

  <div class="content">
    ${parts.join('\n')}
  </div>

  <div class="rpt-footer">
    <div class="footer-brand">${brandName}</div>
    <div class="footer-disc">AI-generated for informational purposes only. Not financial or investment advice. Verify all data independently before making any decisions.</div>
  </div>

</div>
<script>
  // Auto-open print dialog after fonts load
  document.fonts.ready.then(() => setTimeout(() => window.print(), 400))
</script>
</body>
</html>`
}

/* ── Modal component ── */
export default function PDFExportModal({ result, onClose }) {
  const [selected, setSelected] = useState(() =>
    Object.fromEntries(SECTIONS.map(s => [s.id, s.defaultOn]))
  )
  const [clientName,  setClientName]  = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [notes,       setNotes]       = useState('')
  const [generating,  setGenerating]  = useState(false)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const toggle    = id  => setSelected(p => ({ ...p, [id]: !p[id] }))
  const allOn     = SECTIONS.every(s => selected[s.id])
  const toggleAll = () => setSelected(Object.fromEntries(SECTIONS.map(s => [s.id, !allOn])))
  const count     = SECTIONS.filter(s => selected[s.id]).length

  const handleGenerate = () => {
    if (count === 0) return
    setGenerating(true)
    try {
      const html = buildHTML(result, selected, clientName, clientEmail, notes)
      const blob = new Blob([html], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const filename = (result?.geo?.displayName || 'dwelling-report').replace(/[^a-z0-9\s-]/gi, '').trim() + '.html'
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } finally {
      setGenerating(false)
      onClose()
    }
  }

  const area = result?.geo?.displayName?.split(',')[0] || 'Report'

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(14px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '24px 16px', overflowY: 'auto' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        className="liquid-glass-strong"
        style={{ borderRadius: 24, width: '100%', maxWidth: 500, padding: '28px 24px', border: '1px solid rgba(255,255,255,0.1)', animation: 'fadeUp 0.25s ease', marginTop: 'auto', marginBottom: 'auto' }}
      >
        {/* Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <span style={{ fontSize: 20 }}>📄</span>
          <span style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 22, color: '#fff' }}>Export Report</span>
        </div>
        <p style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 22, lineHeight: 1.6 }}>
          {area} — select sections, add client info, then generate a clean PDF.
        </p>

        {/* Brand preview */}
        {(getBrandLogo() || getBrandName()) && (
          <div style={{ marginBottom: 18, padding: '10px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', gap: 10 }}>
            {getBrandLogo() && <img src={getBrandLogo()} alt="logo" style={{ height: 22, objectFit: 'contain', borderRadius: 3 }} />}
            <span style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 600, fontSize: 13, color: '#fff' }}>{getBrandName() || 'Your Brand'}</span>
            <span style={{ marginLeft: 'auto', fontFamily: "'Barlow',sans-serif", fontSize: 10, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>report header</span>
          </div>
        )}

        {/* Client fields */}
        <div style={{ marginBottom: 18 }}>
          <div style={lbl}>Prepared For <span style={{ opacity: 0.5 }}>(optional)</span></div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input type="text"  value={clientName}  onChange={e => setClientName(e.target.value)}  placeholder="Client name"  style={inp} onFocus={focus} onBlur={blur} />
            <input type="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)} placeholder="Email"       style={inp} onFocus={focus} onBlur={blur} />
          </div>
        </div>

        {/* Sections */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={lbl}>Report Sections</div>
            <button onClick={toggleAll} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'Barlow',sans-serif", fontSize: 11, color: 'rgba(255,255,255,0.35)' }}
              onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.35)'}>
              {allOn ? 'Deselect all' : 'Select all'}
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {SECTIONS.map(s => (
              <button key={s.id} onClick={() => toggle(s.id)} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 10,
                border: 'none', cursor: 'pointer', textAlign: 'left',
                background: selected[s.id] ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.02)',
                outline: selected[s.id] ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(255,255,255,0.04)',
                transition: 'all 0.12s',
              }}>
                <span style={{ fontSize: 13, flexShrink: 0 }}>{s.icon}</span>
                <span style={{ fontFamily: "'Barlow',sans-serif", fontSize: 12, fontWeight: 300, color: selected[s.id] ? '#fff' : 'rgba(255,255,255,0.35)', flex: 1 }}>{s.label}</span>
                <span style={{ width: 15, height: 15, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: selected[s.id] ? '#fff' : 'rgba(255,255,255,0.08)' }}>
                  {selected[s.id] && <span style={{ fontSize: 8, color: '#000', fontWeight: 700 }}>✓</span>}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div style={{ marginBottom: 20 }}>
          <div style={lbl}>Notes <span style={{ opacity: 0.5 }}>(optional — appended to report)</span></div>
          <textarea
            value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="Add context, disclaimers, or notes for your client..."
            rows={3}
            style={{ ...inp, resize: 'vertical', lineHeight: 1.55 }}
            onFocus={focus} onBlur={blur}
          />
        </div>

        <div style={{ textAlign: 'center', fontFamily: "'Barlow',sans-serif", fontSize: 11, color: 'rgba(255,255,255,0.2)', marginBottom: 16 }}>
          {count} of {SECTIONS.length} sections selected · Opens in new tab · Print or save as PDF
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onClose} style={btnSec}>Cancel</button>
          <button onClick={handleGenerate} disabled={generating || count === 0}
            style={{ ...btnPri, flex: 1, opacity: count === 0 ? 0.4 : 1, cursor: count === 0 ? 'default' : 'pointer' }}>
            {generating ? 'Generating...' : '📄 Download Report'}
          </button>
        </div>
      </div>
    </div>
  )
}

const lbl    = { display: 'block', fontFamily: "'Barlow',sans-serif", fontWeight: 400, fontSize: 10, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }
const inp    = { width: '100%', padding: '10px 14px', borderRadius: 10, boxSizing: 'border-box', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontFamily: "'Barlow',sans-serif", fontSize: 13, outline: 'none', transition: 'border-color 0.2s' }
const btnPri = { padding: '12px', borderRadius: 40, border: 'none', fontFamily: "'Barlow',sans-serif", fontWeight: 600, fontSize: 13, background: 'linear-gradient(90deg,#38bdf8,#818cf8)', color: '#000' }
const btnSec = { padding: '12px 18px', borderRadius: 40, border: 'none', cursor: 'pointer', fontFamily: "'Barlow',sans-serif", fontWeight: 400, fontSize: 13, background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.45)' }
const focus  = e => e.target.style.borderColor = 'rgba(255,255,255,0.3)'
const blur   = e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'
