/**
 * Generate a standalone HTML report from analysis data
 * This creates a self-contained HTML file that can be opened in any browser
 */

export function generateHTMLReport(data, userCity, userCountry) {
  if (!data) return null

  // Helper to find data in nested objects
  const get = (path, fallback = null) => {
    const parts = path.split('.')
    let curr = data
    for (const p of parts) {
      if (curr == null) return fallback
      curr = curr[p]
    }
    return curr ?? fallback
  }

  // Robust data mapping
  const city = userCity || get('geo.userCity') || get('geo.city') || 'Unknown City'
  const country = userCountry || get('geo.userCountry') || get('geo.country') || 'Unknown Country'
  const timestamp = new Date().toLocaleString()
  
  const estValue = get('propertyEstimate.estimatedValueUSD') || get('propertyEstimate.estimatedValue') || 0
  const confidence = get('propertyEstimate.confidenceLevel') || get('propertyEstimate.confidence') || 'Unknown'
  const appreciation = get('propertyEstimate.annualAppreciationRate') || get('propertyEstimate.appreciation') || 0
  const verdict = get('aiVerdict.verdict') || get('aiVerdict.summary') || get('verdict') || ''
  
  const invScore = get('investmentScore.score') || get('investmentScore') || 0
  const invLabel = get('investmentScore.label') || 'N/A'
  
  const walk = get('walkScore.score') || get('walkScore') || 0
  const transit = get('transitScore.score') || get('transitScore') || 0
  const school = get('schoolRating.score') || get('schoolRating') || 0
  const safety = get('safetyScore.score') || get('safetyScore') || 0

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dwelling Report — ${city}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0a0a0a; color: #ffffff; line-height: 1.6; padding: 40px 20px; }
    .container { max-width: 800px; margin: 0 auto; background: #141414; border: 1px solid rgba(255,255,255,0.08); border-radius: 24px; padding: 48px; box-shadow: 0 32px 64px rgba(0,0,0,0.5); }
    header { border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 32px; margin-bottom: 40px; }
    h1 { font-size: 2.8em; font-weight: 700; margin-bottom: 8px; letter-spacing: -0.03em; }
    .subtitle { color: rgba(255,255,255,0.5); font-size: 1.2em; margin-bottom: 8px; }
    .timestamp { color: rgba(255,255,255,0.25); font-size: 0.85em; text-transform: uppercase; letter-spacing: 0.1em; }
    section { margin-bottom: 48px; }
    h2 { font-size: 1.4em; margin-bottom: 24px; color: #ffffff; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 700; display: flex; align-items: center; gap: 12px; }
    h2::after { content: ""; flex: 1; height: 1px; background: rgba(255,255,255,0.08); }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 24px; margin-bottom: 32px; }
    .card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 16px; padding: 24px; }
    .card-label { color: rgba(255,255,255,0.4); font-size: 0.8em; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 600; }
    .card-value { font-size: 2em; font-weight: 700; color: #ffffff; margin-bottom: 4px; letter-spacing: -0.02em; }
    .card-sub { color: rgba(255,255,255,0.3); font-size: 0.9em; font-weight: 300; }
    .score-box { display: flex; align-items: baseline; gap: 8px; }
    .score-val { font-size: 2.4em; font-weight: 800; }
    .score-max { color: rgba(255,255,255,0.2); font-size: 1em; }
    .verdict-box { background: linear-gradient(135deg, rgba(124,92,252,0.15) 0%, rgba(124,92,252,0.05) 100%); border: 1px solid rgba(124,92,252,0.3); padding: 32px; border-radius: 20px; margin-top: 12px; }
    .verdict-title { color: #b98aff; font-weight: 700; margin-bottom: 12px; text-transform: uppercase; font-size: 0.85em; letter-spacing: 0.1em; display: flex; align-items: center; gap: 8px; }
    .verdict-text { color: rgba(255,255,255,0.9); line-height: 1.8; font-size: 1.05em; }
    .stat-row { display: flex; justify-content: space-between; padding: 16px 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
    .stat-label { color: rgba(255,255,255,0.4); font-weight: 300; }
    .stat-value { color: #ffffff; font-weight: 500; }
    footer { border-top: 1px solid rgba(255,255,255,0.08); padding-top: 32px; margin-top: 64px; color: rgba(255,255,255,0.2); font-size: 0.85em; text-align: center; line-height: 1.8; }
    .green { color: #4ade80; }
    .yellow { color: #fbbf24; }
    .red { color: #f87171; }
    @media print {
      body { background: white; color: #000; padding: 0; }
      .container { max-width: 100%; border: none; box-shadow: none; padding: 20px; }
      .card, .verdict-box { background: #f8f8f8 !important; border: 1px solid #eee !important; color: #000 !important; }
      .card-value, .stat-value, .verdict-text, h1, h2 { color: #000 !important; }
      .card-label, .card-sub, .stat-label, .subtitle, .timestamp, footer { color: #666 !important; }
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="subtitle">DWELLING AREA INTELLIGENCE</div>
      <h1>${city} Report</h1>
      <div class="timestamp">Issued ${timestamp} • ${country}</div>
    </header>

    <section>
      <h2>📊 Investment Analysis</h2>
      <div class="grid">
        <div class="card">
          <div class="card-label">Investment Score</div>
          <div class="score-box">
            <span class="score-val ${invScore >= 70 ? 'green' : invScore >= 45 ? 'yellow' : 'red'}">${invScore || '—'}</span>
            <span class="score-max">/100</span>
          </div>
          <div class="card-sub">${invLabel}</div>
        </div>
        <div class="card">
          <div class="card-label">Market Value</div>
          <div class="card-value">${estValue ? '$' + estValue.toLocaleString() : '—'}</div>
          <div class="card-sub">Confidence: ${confidence}</div>
        </div>
        <div class="card">
          <div class="card-label">Appreciation</div>
          <div class="card-value">${appreciation ? (appreciation * 100).toFixed(1) + '%' : '—'}</div>
          <div class="card-sub">Expected Annual Growth</div>
        </div>
      </div>
      ${verdict ? `
      <div class="verdict-box">
        <div class="verdict-title">✨ AI Analysis Verdict</div>
        <div class="verdict-text">${verdict}</div>
      </div>` : ''}
    </section>

    <section>
      <h2>🏙️ Neighborhood Quality</h2>
      <div class="grid">
        <div class="card">
          <div class="card-label">Walkability</div>
          <div class="score-box"><span class="score-val">${walk || '—'}</span><span class="score-max">/100</span></div>
        </div>
        <div class="card">
          <div class="card-label">Transit</div>
          <div class="score-box"><span class="score-val">${transit || '—'}</span><span class="score-max">/100</span></div>
        </div>
        <div class="card">
          <div class="card-label">Schools</div>
          <div class="score-box"><span class="score-val">${school || '—'}</span><span class="score-max">/100</span></div>
        </div>
        <div class="card">
          <div class="card-label">Safety</div>
          <div class="score-box"><span class="score-val">${safety || '—'}</span><span class="score-max">/100</span></div>
        </div>
      </div>
    </section>

    <footer>
      <p>Generated by Dwelling — Global Real Estate Intelligence</p>
      <p>dwelling-three.vercel.app</p>
      <p style="margin-top: 16px; font-size: 0.8em; opacity: 0.5;">This report is generated using AI and multiple third-party data sources. It is for informational purposes only and does not constitute financial or real estate advice.</p>
    </footer>
  </div>
</body>
</html>`
  return html
}

export function downloadHTMLReport(htmlContent, city = 'dwelling-report') {
  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', `${city.replace(/\\s+/g, '-').toLowerCase()}-report.html`)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
