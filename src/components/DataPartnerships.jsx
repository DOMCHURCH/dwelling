import { memo } from 'react'
import { useScrollReveal } from '../../hooks/useScrollReveal'
import DataSourcesGrid from './DataSourcesGrid'

const DataPartnerships = memo(function DataPartnerships() {
  const dpRef = useScrollReveal({ y: 28, opacity: 0, duration: 0.7, stagger: 0.1, selector: '.data-source-card' })
  const partners = [
    {
      icon: '🏛️',
      name: 'Statistics Canada NHPI',
      type: 'Housing Price Index',
      desc: 'New Housing Price Index (NHPI) — median price baselines and appreciation trends for 30+ Canadian cities, derived from official government census and survey data.',
      status: 'live',
    },

    {
      icon: '🗺️',
      name: 'OpenStreetMap / Overpass',
      type: 'Walkability & Amenities',
      desc: 'Transit stops, schools, parks, groceries, and hospitals within 2km radius of your target city.',
      status: 'live',
    },
    {
      icon: '🌤️',
      name: 'Open-Meteo',
      type: 'Climate & Weather',
      desc: 'Current weather + 12-month climate normals for every Canadian city. Refreshed continuously.',
      status: 'live',
    },
    {
      icon: '🤖',
      name: 'Dwelling AI Engine',
      type: 'Proprietary AI',
      desc: 'Our proprietary AI engine synthesizes all data sources into a single city verdict, investment score, and market analysis — designed specifically for Canadian real estate.',
      status: 'live',
    },
    {
      icon: '🏫',
      name: 'Fraser Institute',
      type: 'School Rankings',
      desc: "Annual school performance data from Canada's leading independent research institute. Ratings for 10,000+ Canadian schools across all provinces.",
      status: 'live',
    }
  ]

  return (
    <section style={{ padding: '80px 24px' }}>
      <div ref={dpRef} style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div>
          <div className="liquid-glass" style={{ borderRadius: 40, display: 'inline-flex', padding: '5px 14px', fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: "'Barlow',sans-serif", letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>Data Sources</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 40 }}>
          <h2 style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic', fontSize: 'clamp(2rem,5vw,3.5rem)', color: '#fff', lineHeight: 0.9, letterSpacing: '-0.02em' }}>
            <span style={{ fontFamily: "'Instrument Serif',serif", fontStyle: 'italic' }}>Data you can actually trust.</span>
          </h2>
          <p style={{ fontFamily: "'Barlow',sans-serif", fontWeight: 300, fontSize: 14, color: 'rgba(255,255,255,0.4)', maxWidth: 340, lineHeight: 1.7 }}>
            Every data point is sourced from official providers, open datasets, or government agencies — not scraped blogs or AI guesses.
          </p>
        </div>
        <DataSourcesGrid partners={partners} />
      </div>
    </section>
  )
})

export default DataPartnerships
