/**
 * Generates a self-contained HTML report from analysis result data.
 * Triggers a browser download of the file.
 */
export function downloadAnalysisHTML(result) {
  const html = buildHTML(result)
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const name = (result?.geo?.displayName || 'area').replace(/[^a-z0-9]/gi, '-').toLowerCase()
  a.href = url
  a.download = `dwelling-report-${name}.html`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function safe(val, fallback = '—') {
  if (val == null || val === '' || val === 0) return fallback
  return String(val)
}

function fmtNum(n) {
  if (n == null || n === 0) return '—'
  return Number(n).toLocaleString('en-US', { maximumFractionDigits: 0 })
}

function fmtMoney(n, sym = '$') {
  if (n == null || n === 0) return '—'
  if (n >= 1_000_000) return `${sym}${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${sym}${Math.round(n / 1_000)}K`
  return `${sym}${fmtNum(n)}`
}

function scoreColor(score) {
  if (score == null) return '#94a3b8'
  if (score >= 70) return '#4ade80'
  if (score >= 45) return '#fbbf24'
  return '#f87171'
}

function verdictColor(verdict) {
  if (!verdict) return '#94a3b8'
  if (verdict === 'Excellent' || verdict === 'Good') return '#4ade80'
  if (verdict === 'Caution') return '#fbbf24'
  if (verdict === 'Avoid') return '#f87171'
  return '#94a3b8'
}

function buildHTML(result) {
  const geo = result?.geo || {}
  const ai = result?.ai || {}
  const weather = result?.weather || {}
  const realData = result?.realData || {}

  const areaName = safe(geo.displayName, 'Area Report')
  const country = safe(geo.country || geo.userCountry, '')
  const generatedAt = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

  // AI sections
  const intel = ai.areaIntelligence || {}
  const verdict = safe(intel.verdict, 'N/A')
  const verdictReason = safe(intel.verdictReason, '')
  const aiSummary = safe(intel.summary || intel.aiSummary || ai.summary, '')

  const investment = ai.investment || {}
  const investScore = investment.investmentScore ?? null
  const investSummary = safe(investment.investmentSummary || investment.summary, '')
  const roi = safe(investment.estimatedROI || investment.roi, '')
  const capRate = safe(investment.capRate, '')
  const priceGrowth = safe(investment.projectedPriceGrowth || investment.priceGrowth, '')

  const col = ai.costOfLiving || {}
  const monthlyBudget = fmtMoney(col.monthlyBudgetUSD)
  const rent1br = fmtMoney(col.rent1BRUSD || col.rentOneBedroomUSD)
  const groceries = fmtMoney(col.groceriesMonthlyUSD)
  const transport = fmtMoney(col.transportMonthlyUSD)
  const utilities = fmtMoney(col.utilitiesMonthlyUSD)
  const colSummary = safe(col.summary, '')
  const colIndex = col.indexVsUSAverage != null ? `${col.indexVsUSAverage > 0 ? '+' : ''}${Math.round(col.indexVsUSAverage)}% vs US avg` : '—'

  const hood = ai.neighborhood || {}
  const hoodSummary = safe(hood.summary || hood.description, '')
  const safetyScore = hood.safetyScore ?? realData?.safetyScore ?? null
  const walkScore = realData?.walkScore ?? hood.walkScore ?? null
  const transitScore = realData?.transitScore ?? hood.transitScore ?? null
  const schoolScore = realData?.schoolScore ?? hood.schoolScore ?? null

  const risk = ai.riskData || {}
  const floodRisk = safe(risk.floodRisk || risk.flood, '')
  const fireRisk = safe(risk.fireRisk || risk.fire, '')
  const airQuality = safe(risk.airQuality || risk.aqi, '')
  const riskSummary = safe(risk.summary, '')

  const propEst = ai.propertyEstimate || {}
  const estPrice = fmtMoney(propEst.estimatedPriceUSD || propEst.medianPriceUSD)
  const priceRange = propEst.priceLowUSD && propEst.priceHighUSD
    ? `${fmtMoney(propEst.priceLowUSD)} – ${fmtMoney(propEst.priceHighUSD)}`
    : '—'
  const propSummary = safe(propEst.summary, '')

  const tempC = weather?.temperature_2m ?? weather?.temp ?? null
  const tempDisplay = tempC != null ? `${Math.round(tempC)}°C / ${Math.round(tempC * 9/5 + 32)}°F` : '—'
  const weatherDesc = safe(weather?.description || weather?.condition, '')
  const climateSummary = safe(result?.climate?.summary || ai.climateSummary, '')

  const insights = ai.localInsights || {}
  const pros = Array.isArray(insights.pros) ? insights.pros : []
  const cons = Array.isArray(insights.cons) ? insights.cons : []

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Dwelling Report — ${areaName}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Georgia', 'Times New Roman', serif;
      background: #f8f7f4;
      color: #1a1a1a;
      line-height: 1.6;
    }
    .page { max-width: 860px; margin: 0 auto; padding: 40px 32px; }

    /* Header */
    .report-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      padding-bottom: 28px;
      border-bottom: 2px solid #1a1a1a;
      margin-bottom: 36px;
    }
    .report-brand { font-size: 13px; letter-spacing: 0.12em; text-transform: uppercase; color: #666; }
    .report-area { font-size: clamp(1.8rem, 4vw, 2.8rem); font-weight: 700; line-height: 1.1; margin-top: 6px; }
    .report-meta { font-size: 12px; color: #888; margin-top: 6px; }
    .verdict-badge {
      display: inline-block;
      padding: 6px 18px;
      border-radius: 40px;
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      border: 2px solid currentColor;
      margin-top: 8px;
    }

    /* Sections */
    .section { margin-bottom: 36px; }
    .section-title {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: #999;
      margin-bottom: 14px;
      padding-bottom: 8px;
      border-bottom: 1px solid #e0ddd8;
    }
    .section-body { font-size: 14px; color: #333; line-height: 1.75; }

    /* Grid */
    .grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
    .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
    .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }

    /* Stat boxes */
    .stat-box {
      background: #fff;
      border: 1px solid #e0ddd8;
      border-radius: 10px;
      padding: 14px 16px;
    }
    .stat-label { font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; color: #999; margin-bottom: 4px; }
    .stat-value { font-size: 1.4rem; font-weight: 700; color: #1a1a1a; }
    .stat-sub { font-size: 11px; color: #888; margin-top: 2px; }

    /* Score bars */
    .score-row { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
    .score-name { font-size: 12px; color: #555; width: 90px; flex-shrink: 0; }
    .score-bar-wrap { flex: 1; height: 6px; background: #e8e5e0; border-radius: 3px; overflow: hidden; }
    .score-bar { height: 100%; border-radius: 3px; }
    .score-num { font-size: 12px; font-weight: 700; width: 32px; text-align: right; flex-shrink: 0; }

    /* Pros / Cons */
    .pro-con-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .pro-con-list { list-style: none; }
    .pro-con-list li { font-size: 13px; color: #333; padding: 5px 0; border-bottom: 1px solid #f0ede8; display: flex; gap: 8px; }
    .pro-con-list li::before { flex-shrink: 0; font-weight: 700; }
    .pros li::before { content: '+'; color: #16a34a; }
    .cons li::before { content: '−'; color: #dc2626; }
    .pro-con-label { font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 8px; }
    .pros-label { color: #16a34a; }
    .cons-label { color: #dc2626; }

    /* Footer */
    .report-footer {
      margin-top: 48px;
      padding-top: 20px;
      border-top: 1px solid #e0ddd8;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .footer-brand { font-size: 12px; color: #aaa; letter-spacing: 0.1em; text-transform: uppercase; }
    .footer-note { font-size: 11px; color: #bbb; }

    @media print {
      body { background: #fff; }
      .page { padding: 20px; }
    }
    @media (max-width: 600px) {
      .grid-3, .grid-4 { grid-template-columns: repeat(2, 1fr); }
      .grid-2, .pro-con-grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
<div class="page">

  <!-- Header -->
  <div class="report-header">
    <div>
      <div class="report-brand">Dwelling · Area Intelligence Report</div>
      <div class="report-area">${areaName}${country ? ', ' + country : ''}</div>
      <div class="report-meta">Generated ${generatedAt}</div>
      ${verdictReason ? `<div class="report-meta" style="margin-top:8px;font-size:13px;color:#555;max-width:480px;">${verdictReason}</div>` : ''}
    </div>
    <div style="text-align:right;flex-shrink:0;padding-left:24px;">
      <div class="verdict-badge" style="color:${verdictColor(verdict)}">${verdict}</div>
      ${investScore != null ? `<div style="font-size:12px;color:#888;margin-top:8px;">Investment Score</div><div style="font-size:2rem;font-weight:700;color:${scoreColor(investScore)}">${investScore}<span style="font-size:14px;color:#999">/100</span></div>` : ''}
    </div>
  </div>

  <!-- AI Summary -->
  ${aiSummary ? `
  <div class="section">
    <div class="section-title">Overview</div>
    <div class="section-body">${aiSummary}</div>
  </div>` : ''}

  <!-- Property & Cost of Living -->
  <div class="section">
    <div class="section-title">Market & Cost of Living</div>
    <div class="grid-4" style="margin-bottom:14px;">
      <div class="stat-box">
        <div class="stat-label">Est. Property Price</div>
        <div class="stat-value">${estPrice}</div>
        <div class="stat-sub">${priceRange !== '—' ? priceRange : ''}</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">Monthly Budget</div>
        <div class="stat-value">${monthlyBudget}</div>
        <div class="stat-sub">${colIndex}</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">1-BR Rent</div>
        <div class="stat-value">${rent1br}</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">Groceries / mo</div>
        <div class="stat-value">${groceries}</div>
      </div>
    </div>
    <div class="grid-3">
      <div class="stat-box">
        <div class="stat-label">Transport / mo</div>
        <div class="stat-value">${transport}</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">Utilities / mo</div>
        <div class="stat-value">${utilities}</div>
      </div>
    </div>
    ${colSummary ? `<p style="font-size:13px;color:#555;margin-top:14px;line-height:1.7;">${colSummary}</p>` : ''}
  </div>

  <!-- Investment -->
  ${(investScore != null || investSummary) ? `
  <div class="section">
    <div class="section-title">Investment Analysis</div>
    <div class="grid-3" style="margin-bottom:14px;">
      <div class="stat-box">
        <div class="stat-label">Investment Score</div>
        <div class="stat-value" style="color:${scoreColor(investScore)}">${investScore != null ? investScore + '/100' : '—'}</div>
      </div>
      ${roi ? `<div class="stat-box"><div class="stat-label">Est. ROI</div><div class="stat-value">${roi}</div></div>` : ''}
      ${priceGrowth ? `<div class="stat-box"><div class="stat-label">Price Growth</div><div class="stat-value">${priceGrowth}</div></div>` : ''}
    </div>
    ${investSummary ? `<p style="font-size:13px;color:#555;line-height:1.7;">${investSummary}</p>` : ''}
  </div>` : ''}

  <!-- Liveability Scores -->
  <div class="section">
    <div class="section-title">Liveability Scores</div>
    <div style="max-width:420px;">
      ${buildScoreRow('Walk Score', walkScore)}
      ${buildScoreRow('Transit Score', transitScore)}
      ${buildScoreRow('School Score', schoolScore)}
      ${buildScoreRow('Safety Score', safetyScore)}
    </div>
  </div>

  <!-- Neighbourhood -->
  ${hoodSummary ? `
  <div class="section">
    <div class="section-title">Neighbourhood</div>
    <div class="section-body">${hoodSummary}</div>
  </div>` : ''}

  <!-- Pros & Cons -->
  ${(pros.length > 0 || cons.length > 0) ? `
  <div class="section">
    <div class="section-title">Pros & Cons</div>
    <div class="pro-con-grid">
      <div>
        <div class="pro-con-label pros-label">Pros</div>
        <ul class="pro-con-list pros">
          ${pros.map(p => `<li>${safe(p)}</li>`).join('')}
        </ul>
      </div>
      <div>
        <div class="pro-con-label cons-label">Cons</div>
        <ul class="pro-con-list cons">
          ${cons.map(c => `<li>${safe(c)}</li>`).join('')}
        </ul>
      </div>
    </div>
  </div>` : ''}

  <!-- Risk -->
  ${(floodRisk || fireRisk || airQuality || riskSummary) ? `
  <div class="section">
    <div class="section-title">Environmental & Risk</div>
    <div class="grid-3" style="margin-bottom:${riskSummary ? '14px' : '0'};">
      ${floodRisk ? `<div class="stat-box"><div class="stat-label">Flood Risk</div><div class="stat-value" style="font-size:1rem;">${floodRisk}</div></div>` : ''}
      ${fireRisk ? `<div class="stat-box"><div class="stat-label">Fire Risk</div><div class="stat-value" style="font-size:1rem;">${fireRisk}</div></div>` : ''}
      ${airQuality ? `<div class="stat-box"><div class="stat-label">Air Quality</div><div class="stat-value" style="font-size:1rem;">${airQuality}</div></div>` : ''}
    </div>
    ${riskSummary ? `<p style="font-size:13px;color:#555;line-height:1.7;">${riskSummary}</p>` : ''}
  </div>` : ''}

  <!-- Climate -->
  ${(tempDisplay !== '—' || climateSummary) ? `
  <div class="section">
    <div class="section-title">Climate & Weather</div>
    ${tempDisplay !== '—' ? `<div style="display:flex;gap:12px;margin-bottom:12px;flex-wrap:wrap;">
      <div class="stat-box" style="min-width:140px;"><div class="stat-label">Current Temp</div><div class="stat-value">${tempDisplay}</div>${weatherDesc ? `<div class="stat-sub">${weatherDesc}</div>` : ''}</div>
    </div>` : ''}
    ${climateSummary ? `<p style="font-size:13px;color:#555;line-height:1.7;">${climateSummary}</p>` : ''}
  </div>` : ''}

  <!-- Footer -->
  <div class="report-footer">
    <div class="footer-brand">Dwelling</div>
    <div class="footer-note">AI-generated report · For informational purposes only · dwelling.one</div>
  </div>

</div>
</body>
</html>`
}

function buildScoreRow(label, score) {
  if (score == null) return ''
  const color = scoreColor(score)
  return `
    <div class="score-row">
      <div class="score-name">${label}</div>
      <div class="score-bar-wrap">
        <div class="score-bar" style="width:${score}%;background:${color};"></div>
      </div>
      <div class="score-num" style="color:${color}">${score}</div>
    </div>`
}
