/**
 * Generate a standalone AI-powered HTML report from analysis data
 * This creates a self-contained HTML file that can be opened in any browser
 */

export function generateHTMLReport(data, userCity, userCountry) {
  if (!data) return null;

  // Helper to find data in the nested object
  const get = (path, fallback = null) => {
    const parts = path.split('.');
    let curr = data;
    for (const p of parts) {
      if (curr == null) return fallback;
      curr = curr[p];
    }
    return curr ?? fallback;
  };

  const city = userCity || get('geo.userCity') || get('geo.city') || 'Unknown City';
  const country = userCountry || get('geo.userCountry') || get('geo.country') || 'Unknown Country';
  const timestamp = new Date().toLocaleString();
  
  // Extract AI-generated narrative fields
  const reportNarrative = get('reportNarrative') || get('aiVerdict.verdict') || get('aiVerdict.summary') || '';
  const investmentText = get('investment.investmentSummary') || get('investmentSummary') || '';
  const neighborhoodText = get('neighborhood.character') || '';
  const costOfLivingText = get('costOfLiving.summary') || '';
  
  // Scores and Values
  const invScore = get('investment.investmentScore') || get('investmentScore.score') || 0;
  const estValue = get('propertyEstimate.estimatedValueUSD') || get('propertyEstimate.estimatedValue') || 0;
  const currency = get('priceHistory.currency') || 'USD';
  const currencySymbol = get('priceHistory.currencySymbol') || '$';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dwelling AI Report — ${city}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Barlow:wght@300;400;600;700&family=Instrument+Serif:ital@0;1&display=swap');
    
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Barlow', -apple-system, sans-serif; 
      background: #050505; 
      color: #ffffff; 
      line-height: 1.6; 
      padding: 60px 20px;
    }
    .container { 
      max-width: 850px; 
      margin: 0 auto; 
      background: #0f0f0f; 
      border: 1px solid rgba(255,255,255,0.08); 
      border-radius: 32px; 
      padding: 60px; 
      box-shadow: 0 40px 100px rgba(0,0,0,0.8);
    }
    header { 
      border-bottom: 1px solid rgba(255,255,255,0.08); 
      padding-bottom: 40px; 
      margin-bottom: 50px; 
    }
    .brand {
      font-family: 'Instrument Serif', serif;
      font-style: italic;
      font-size: 24px;
      color: rgba(255,255,255,0.4);
      margin-bottom: 20px;
    }
    h1 { 
      font-family: 'Instrument Serif', serif;
      font-size: 4em; 
      font-weight: 400; 
      margin-bottom: 12px; 
      letter-spacing: -0.02em;
      line-height: 1;
    }
    .subtitle { 
      color: rgba(255,255,255,0.5); 
      font-size: 1.4em; 
      margin-bottom: 12px; 
      font-weight: 300;
    }
    .timestamp { 
      color: rgba(255,255,255,0.2); 
      font-size: 0.8em; 
      text-transform: uppercase; 
      letter-spacing: 0.2em; 
    }
    section { margin-bottom: 60px; }
    h2 { 
      font-size: 0.9em; 
      margin-bottom: 30px; 
      color: rgba(255,255,255,0.3); 
      text-transform: uppercase; 
      letter-spacing: 0.15em; 
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 15px;
    }
    h2::after { content: ""; flex: 1; height: 1px; background: rgba(255,255,255,0.06); }
    
    .main-verdict {
      background: linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%);
      border: 1px solid rgba(255,255,255,0.1);
      padding: 40px;
      border-radius: 24px;
      margin-bottom: 50px;
    }
    .verdict-label {
      font-family: 'Instrument Serif', serif;
      font-style: italic;
      color: #fbbf24;
      font-size: 24px;
      margin-bottom: 15px;
    }
    .verdict-text {
      font-size: 1.2em;
      color: rgba(255,255,255,0.9);
      line-height: 1.7;
      font-weight: 300;
    }

    .stats-grid { 
      display: grid; 
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
      gap: 30px; 
      margin-bottom: 40px; 
    }
    .stat-card {
      padding: 20px 0;
      border-top: 1px solid rgba(255,255,255,0.06);
    }
    .stat-label { color: rgba(255,255,255,0.3); font-size: 0.75em; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 10px; }
    .stat-value { font-size: 2.2em; font-family: 'Instrument Serif', serif; color: #ffffff; }
    
    .narrative-section {
      display: grid;
      grid-template-columns: 1fr;
      gap: 40px;
    }
    .narrative-block h3 {
      font-size: 1.1em;
      margin-bottom: 15px;
      color: rgba(255,255,255,0.8);
    }
    .narrative-block p {
      color: rgba(255,255,255,0.5);
      font-size: 1.05em;
      line-height: 1.8;
      font-weight: 300;
    }

    footer { 
      border-top: 1px solid rgba(255,255,255,0.08); 
      padding-top: 40px; 
      margin-top: 80px; 
      color: rgba(255,255,255,0.2); 
      font-size: 0.85em; 
      text-align: center; 
    }
    
    @media print {
      body { background: white; color: #000; padding: 0; }
      .container { max-width: 100%; border: none; box-shadow: none; padding: 40px; background: white; }
      .main-verdict { background: #f9f9f9 !important; border: 1px solid #eee !important; color: #000 !important; }
      .verdict-text, .stat-value, h1, .narrative-block h3 { color: #000 !important; }
      .stat-label, .subtitle, .timestamp, footer, .narrative-block p, .brand, h2 { color: #666 !important; }
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="brand">Dwelling Intelligence</div>
      <h1>${city}</h1>
      <div class="subtitle">${country} Area Report</div>
      <div class="timestamp">Generated ${timestamp}</div>
    </header>

    <section>
      <div class="main-verdict">
        <div class="verdict-label">AI Executive Summary</div>
        <div class="verdict-text">${reportNarrative || 'Analysis pending for this location.'}</div>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">Investment Score</div>
          <div class="stat-value">${invScore || '—'}<span style="font-size: 0.4em; opacity: 0.3; margin-left: 5px;">/100</span></div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Market Value</div>
          <div class="stat-value">${estValue ? currencySymbol + estValue.toLocaleString() : '—'}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Local Currency</div>
          <div class="stat-value">${currency}</div>
        </div>
      </div>
    </section>

    <section class="narrative-section">
      <h2>🔍 Deep Intelligence</h2>
      
      ${neighborhoodText ? `
      <div class="narrative-block">
        <h3>Neighborhood & Demographics</h3>
        <p>${neighborhoodText}</p>
      </div>` : ''}

      ${investmentText ? `
      <div class="narrative-block">
        <h3>Investment Outlook</h3>
        <p>${investmentText}</p>
      </div>` : ''}

      ${costOfLivingText ? `
      <div class="narrative-block">
        <h3>Cost of Living Analysis</h3>
        <p>${costOfLivingText}</p>
      </div>` : ''}
    </section>

    <footer>
      <p>This report was generated by the Dwelling AI Engine using real-time market data and local intelligence.</p>
      <p>dwelling-three.vercel.app</p>
      <p style="margin-top: 20px; font-size: 0.8em; opacity: 0.5;">Disclaimer: Informational purposes only. Not financial advice.</p>
    </footer>
  </div>
</body>
</html>`;
  return html;
}

export function downloadHTMLReport(htmlContent, city = 'dwelling-report') {
  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${city.replace(/\\s+/g, '-').toLowerCase()}-report.html`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
