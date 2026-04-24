import { useState, memo } from 'react'

const FAQ_ITEMS = [
  { q: 'Which cities does Dwelling cover?', a: 'All major Canadian cities and hundreds of smaller markets — Toronto, Vancouver, Calgary, Ottawa, Montreal, Edmonton, Winnipeg, Halifax, Victoria, Kelowna, and more. We started with Canada to build a data-rich, reliable investment analysis product before expanding.' },
  { q: 'Where does the data come from?', a: 'Statistics Canada housing price indices (NHPI) and census demographics, Fraser Institute school performance rankings, Open-Meteo climate and weather data, OpenStreetMap for walkability and amenities, and our proprietary Dwelling AI engine for synthesis and scoring. All legitimate, licensed, or open-data sources.' },
  { q: 'What is the Investment Score?', a: "A 0–100 score computed from price trend data (NHPI appreciation), rental yield estimates, market temperature (buyer's vs seller's), demographic growth indicators, and risk-adjusted return potential. Higher = stronger investment case based on available data." },
  { q: 'Is Dwelling free to use?', a: 'Yes. Free users get 3 reports per month — area verdict, neighbourhood scores, cost of living, climate data, and an investment score preview. Pro ($49/month or $399/year) unlocks unlimited analyses, the full investment analysis, price history & projections, environmental risk, PDF export, and side-by-side city comparison.' },
  { q: 'Can I use the results to make a real estate decision?', a: 'No. All outputs are informational only and do not constitute financial, legal, or real estate advice. Always consult a qualified professional before making investment decisions.' },
  { q: 'Does Dwelling store my searches?', a: 'No. Searches are processed in real time and discarded immediately. We store only your usage count to enforce free-tier limits.' },
  { q: 'Why Canada only right now?', a: 'Depth over breadth. Starting with one country lets us build a genuinely reliable product — accurate data partnerships, verified sources, Canada-specific regulatory and market context — before expanding internationally.' },
]

const FAQ = memo(function FAQ() {
  const [open, setOpen] = useState(null)
  return (
    <section id="faq" style={{ padding: 'clamp(56px, 8vw, 96px) 20px', maxWidth: 780, margin: '0 auto' }}>
      <div>
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 40, display: 'inline-flex', padding: '5px 14px', fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: "'Barlow',sans-serif", letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>Support</div>
      </div>
      <h2 style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 'clamp(2rem,5vw,3.5rem)', color: '#fff', marginBottom: 40, lineHeight: 0.9, letterSpacing: '-0.02em' }}>
        Questions, answered.
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {FAQ_ITEMS.map((item, i) => (
          <div key={i} className="liquid-glass how-step" style={{ borderRadius: 18, overflow: 'hidden' }}>
            <button onClick={() => setOpen(open === i ? null : i)}
              style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', background: 'transparent', border: 'none', cursor: 'pointer' }}>
              <span style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 400, fontSize: 14, color: '#fff', flex: 1, paddingRight: 16 }}>{item.q}</span>
              <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 18, transition: 'transform 0.2s', transform: open === i ? 'rotate(180deg)' : 'none', flexShrink: 0 }}>⌄</span>
            </button>
            <div style={{
              display: 'grid',
              gridTemplateRows: open === i ? '1fr' : '0fr',
              transition: 'grid-template-rows 0.2s ease',
            }}>
              <div style={{ overflow: 'hidden' }}>
                <p style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.7, padding: '0 22px 18px' }}>{item.a}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
})

export default FAQ
