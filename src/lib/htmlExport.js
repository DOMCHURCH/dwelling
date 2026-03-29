/**
 * Generate a standalone HTML report from analysis data
 * This creates a self-contained HTML file that can be opened in any browser
 */

export function generateHTMLReport(data, userCity, userCountry) {
  if (!data) return null

  const {
    propertyEstimate = {},
    investmentScore = {},
    walkScore = {},
    transitScore = {},
    schoolRating = {},
    safetyScore = {},
    weatherData = {},
    aiVerdict = {},
    priceHistory = [],
    geo = {},
  } = data

  const city = userCity || geo?.userCity || 'Unknown City'
  const country = userCountry || geo?.userCountry || 'Unknown Country'
  const timestamp = new Date().toLocaleString()

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dwelling Report — ${city}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Barlow', sans-serif;
      background: #0a0a0a;
      color: #ffffff;
      line-height: 1.6;
      padding: 40px 20px;
    }
    
    .container {
      max-width: 900px;
      margin: 0 auto;
      background: #1a1a1a;
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 16px;
      padding: 40px;
    }
    
    header {
      border-bottom: 1px solid rgba(255,255,255,0.08);
      padding-bottom: 24px;
      margin-bottom: 32px;
    }
    
    h1 {
      font-size: 2.5em;
      font-weight: 600;
      margin-bottom: 8px;
      letter-spacing: -0.02em;
    }
    
    .subtitle {
      color: rgba(255,255,255,0.5);
      font-size: 1.1em;
      margin-bottom: 12px;
    }
    
    .timestamp {
      color: rgba(255,255,255,0.3);
      font-size: 0.9em;
    }
    
    section {
      margin-bottom: 40px;
    }
    
    h2 {
      font-size: 1.6em;
      margin-bottom: 20px;
      color: #ffffff;
      border-bottom: 2px solid rgba(251,191,36,0.3);
      padding-bottom: 12px;
    }
    
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin-bottom: 24px;
    }
    
    .card {
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 12px;
      padding: 20px;
      transition: all 0.3s ease;
    }
    
    .card:hover {
      background: rgba(255,255,255,0.05);
      border-color: rgba(255,255,255,0.12);
    }
    
    .card-label {
      color: rgba(255,255,255,0.5);
      font-size: 0.9em;
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    
    .card-value {
      font-size: 1.8em;
      font-weight: 600;
      color: #ffffff;
      margin-bottom: 4px;
    }
    
    .card-sub {
      color: rgba(255,255,255,0.4);
      font-size: 0.85em;
    }
    
    .score-ring {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100px;
      height: 100px;
      border-radius: 50%;
      background: rgba(255,255,255,0.03);
      border: 3px solid rgba(255,255,255,0.1);
      font-size: 2em;
      font-weight: 600;
      margin: 0 auto 12px;
    }
    
    .score-ring.green { border-color: #4ade80; color: #4ade80; }
    .score-ring.yellow { border-color: #fbbf24; color: #fbbf24; }
    .score-ring.red { border-color: #f87171; color: #f87171; }
    
    .verdict-box {
      background: rgba(251,191,36,0.08);
      border-left: 4px solid #fbbf24;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 20px;
    }
    
    .verdict-title {
      color: #fbbf24;
      font-weight: 600;
      margin-bottom: 8px;
      text-transform: uppercase;
      font-size: 0.9em;
      letter-spacing: 0.05em;
    }
    
    .verdict-text {
      color: rgba(255,255,255,0.8);
      line-height: 1.8;
    }
    
    .stat-row {
      display: flex;
      justify-content: space-between;
      padding: 12px 0;
      border-bottom: 1px solid rgba(255,255,255,0.05);
    }
    
    .stat-row:last-child {
      border-bottom: none;
    }
    
    .stat-label {
      color: rgba(255,255,255,0.5);
    }
    
    .stat-value {
      color: #ffffff;
      font-weight: 500;
    }
    
    .tag {
      display: inline-block;
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 0.85em;
      margin-right: 8px;
      margin-bottom: 8px;
      background: rgba(255,255,255,0.08);
      color: rgba(255,255,255,0.7);
    }
    
    .tag.green {
      background: rgba(74,222,128,0.12);
      color: #4ade80;
    }
    
    .tag.red {
      background: rgba(248,113,113,0.12);
      color: #f87171;
    }
    
    footer {
      border-top: 1px solid rgba(255,255,255,0.08);
      padding-top: 20px;
      margin-top: 40px;
      color: rgba(255,255,255,0.3);
      font-size: 0.9em;
      text-align: center;
    }
    
    @media print {
      body {
        background: white;
        color: #000;
      }
      .container {
        background: white;
        border: none;
        box-shadow: none;
      }
      .card {
        background: #f5f5f5;
        border: 1px solid #ddd;
      }
      h1, h2 {
        color: #000;
      }
      .verdict-box {
        background: #fff8e1;
        border-left-color: #fbbf24;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>🏠 Dwelling Report</h1>
      <p class="subtitle">${city}, ${country}</p>
      <p class="timestamp">Generated on ${timestamp}</p>
    </header>

    <!-- Investment Score Section -->
    <section>
      <h2>📊 Investment Analysis</h2>
      <div class="grid">
        <div class="card">
          <div class="score-ring ${investmentScore?.score >= 70 ? 'green' : investmentScore?.score >= 45 ? 'yellow' : 'red'}">
            ${investmentScore?.score ?? '—'}
          </div>
          <div class="card-label">Investment Score</div>
          <div class="card-value">${investmentScore?.label || 'N/A'}</div>
          <div class="card-sub">${investmentScore?.description || ''}</div>
        </div>
        
        <div class="card">
          <div class="card-label">Estimated Value</div>
          <div class="card-value">${propertyEstimate?.estimatedValueUSD ? '$' + propertyEstimate.estimatedValueUSD.toLocaleString() : '—'}</div>
          <div class="card-sub">Confidence: ${propertyEstimate?.confidenceLevel || 'Unknown'}</div>
        </div>
        
        <div class="card">
          <div class="card-label">Annual Appreciation</div>
          <div class="card-value">${propertyEstimate?.annualAppreciationRate ? Math.round(propertyEstimate.annualAppreciationRate * 100) + '%' : '—'}</div>
          <div class="card-sub">Expected yearly growth</div>
        </div>
      </div>
      
      ${aiVerdict?.verdict ? `
      <div class="verdict-box">
        <div class="verdict-title">💡 AI Verdict</div>
        <div class="verdict-text">${aiVerdict.verdict}</div>
      </div>
      ` : ''}
    </section>

    <!-- Neighborhood Scores -->
    <section>
      <h2>🌆 Neighborhood Scores</h2>
      <div class="grid">
        <div class="card">
          <div class="score-ring ${walkScore?.score >= 70 ? 'green' : walkScore?.score >= 45 ? 'yellow' : 'red'}">
            ${walkScore?.score ?? '—'}
          </div>
          <div class="card-label">Walk Score</div>
          <div class="card-sub">${walkScore?.label || 'N/A'}</div>
        </div>
        
        <div class="card">
          <div class="score-ring ${transitScore?.score >= 70 ? 'green' : transitScore?.score >= 45 ? 'yellow' : 'red'}">
            ${transitScore?.score ?? '—'}
          </div>
          <div class="card-label">Transit Score</div>
          <div class="card-sub">${transitScore?.label || 'N/A'}</div>
        </div>
        
        <div class="card">
          <div class="score-ring ${schoolRating?.score >= 70 ? 'green' : schoolRating?.score >= 45 ? 'yellow' : 'red'}">
            ${schoolRating?.score ?? '—'}
          </div>
          <div class="card-label">School Rating</div>
          <div class="card-sub">${schoolRating?.label || 'N/A'}</div>
        </div>
        
        <div class="card">
          <div class="score-ring ${safetyScore?.score >= 70 ? 'green' : safetyScore?.score >= 45 ? 'yellow' : 'red'}">
            ${safetyScore?.score ?? '—'}
          </div>
          <div class="card-label">Safety Score</div>
          <div class="card-sub">${safetyScore?.label || 'N/A'}</div>
        </div>
      </div>
    </section>

    <!-- Weather & Climate -->
    ${weatherData?.temperature ? `
    <section>
      <h2>🌤️ Climate</h2>
      <div class="grid">
        <div class="card">
          <div class="card-label">Current Temperature</div>
          <div class="card-value">${Math.round(weatherData.temperature)}°C</div>
          <div class="card-sub">${weatherData.description || 'Clear'}</div>
        </div>
        
        <div class="card">
          <div class="card-label">Annual Avg High</div>
          <div class="card-value">${Math.round(weatherData.avgHigh || 0)}°C</div>
        </div>
        
        <div class="card">
          <div class="card-label">Annual Avg Low</div>
          <div class="card-value">${Math.round(weatherData.avgLow || 0)}°C</div>
        </div>
      </div>
    </section>
    ` : ''}

    <!-- Property Details -->
    ${propertyEstimate ? `
    <section>
      <h2>🏘️ Property Details</h2>
      <div class="stat-row">
        <span class="stat-label">Estimated Value</span>
        <span class="stat-value">${propertyEstimate.estimatedValueUSD ? '$' + propertyEstimate.estimatedValueUSD.toLocaleString() : '—'}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Price Range</span>
        <span class="stat-value">${propertyEstimate.priceRange || '—'}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Confidence Level</span>
        <span class="stat-value">${propertyEstimate.confidenceLevel || '—'}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Methodology</span>
        <span class="stat-value">${propertyEstimate.avmMethodology || 'AI Analysis'}</span>
      </div>
    </section>
    ` : ''}

    <footer>
      <p>This report was generated by Dwelling — AI-powered neighborhood intelligence.</p>
      <p>For more information, visit <strong>dwelling-three.vercel.app</strong></p>
      <p style="margin-top: 12px; color: rgba(255,255,255,0.2);">Disclaimer: This report is for informational purposes only and should not be considered financial or investment advice.</p>
    </footer>
  </div>
</body>
</html>`

  return html
}

/**
 * Download HTML report as a file
 */
export function downloadHTMLReport(htmlContent, city = 'dwelling-report') {
  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  
  link.setAttribute('href', url)
  link.setAttribute('download', `${city.replace(/\s+/g, '-').toLowerCase()}-report.html`)
  link.style.visibility = 'hidden'
  
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
