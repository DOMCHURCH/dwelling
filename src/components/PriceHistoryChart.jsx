import { useEffect, useRef } from 'react'

export default function PriceHistoryChart({ priceHistory }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    if (!priceHistory?.data || !canvasRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)
    const W = rect.width
    const H = rect.height
    const pad = { top: 20, right: 20, bottom: 36, left: 72 }
    const chartW = W - pad.left - pad.right
    const chartH = H - pad.top - pad.bottom

    const data = priceHistory.data
    const values = data.map(d => d.value)
    const minVal = Math.min(...values) * 0.92
    const maxVal = Math.max(...values) * 1.05
    const years = data.map(d => d.year)

    const xPos = (i) => pad.left + (i / (data.length - 1)) * chartW
    const yPos = (v) => pad.top + chartH - ((v - minVal) / (maxVal - minVal)) * chartH

    ctx.clearRect(0, 0, W, H)

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.05)'
    ctx.lineWidth = 1
    for (let i = 0; i <= 4; i++) {
      const y = pad.top + (i / 4) * chartH
      ctx.beginPath()
      ctx.moveTo(pad.left, y)
      ctx.lineTo(W - pad.right, y)
      ctx.stroke()
    }

    // Projected shaded area
    const projStart = data.findIndex(d => d.type === 'projected')
    if (projStart > -1) {
      ctx.fillStyle = 'rgba(124,92,252,0.06)'
      ctx.beginPath()
      ctx.rect(xPos(projStart), pad.top, xPos(data.length - 1) - xPos(projStart), chartH)
      ctx.fill()
      ctx.strokeStyle = 'rgba(124,92,252,0.2)'
      ctx.lineWidth = 1
      ctx.setLineDash([4, 4])
      ctx.beginPath()
      ctx.moveTo(xPos(projStart), pad.top)
      ctx.lineTo(xPos(projStart), pad.top + chartH)
      ctx.stroke()
      ctx.setLineDash([])
    }

    // Area fill under historical line
    const histData = data.filter(d => d.type === 'historical')
    const histEnd = projStart > -1 ? projStart : data.length - 1
    const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + chartH)
    grad.addColorStop(0, 'rgba(124,92,252,0.25)')
    grad.addColorStop(1, 'rgba(124,92,252,0)')
    ctx.beginPath()
    ctx.moveTo(xPos(0), yPos(data[0].value))
    for (let i = 1; i <= histEnd; i++) {
      ctx.lineTo(xPos(i), yPos(data[i].value))
    }
    ctx.lineTo(xPos(histEnd), pad.top + chartH)
    ctx.lineTo(xPos(0), pad.top + chartH)
    ctx.closePath()
    ctx.fillStyle = grad
    ctx.fill()

    // Historical line
    ctx.beginPath()
    ctx.strokeStyle = '#7c5cfc'
    ctx.lineWidth = 2.5
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'
    for (let i = 0; i <= histEnd; i++) {
      i === 0 ? ctx.moveTo(xPos(i), yPos(data[i].value)) : ctx.lineTo(xPos(i), yPos(data[i].value))
    }
    ctx.stroke()

    // Projected line
    if (projStart > -1) {
      ctx.beginPath()
      ctx.strokeStyle = '#b98aff'
      ctx.lineWidth = 2
      ctx.setLineDash([6, 4])
      ctx.moveTo(xPos(projStart), yPos(data[projStart].value))
      for (let i = projStart + 1; i < data.length; i++) {
        ctx.lineTo(xPos(i), yPos(data[i].value))
      }
      ctx.stroke()
      ctx.setLineDash([])
    }

    // Dots
    data.forEach((d, i) => {
      const isProj = d.type === 'projected'
      ctx.beginPath()
      ctx.arc(xPos(i), yPos(d.value), i === histEnd ? 5 : 3.5, 0, Math.PI * 2)
      ctx.fillStyle = isProj ? '#b98aff' : '#7c5cfc'
      ctx.fill()
      if (i === histEnd) {
        ctx.strokeStyle = 'rgba(124,92,252,0.4)'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(xPos(i), yPos(d.value), 8, 0, Math.PI * 2)
        ctx.stroke()
      }
    })

    // X labels
    ctx.fillStyle = 'rgba(255,255,255,0.3)'
    ctx.font = '10px DM Sans, sans-serif'
    ctx.textAlign = 'center'
    data.forEach((d, i) => {
      if (i % 2 === 0 || i === data.length - 1) {
        ctx.fillText(d.year, xPos(i), H - 8)
      }
    })

    // Y labels
    ctx.textAlign = 'right'
    for (let i = 0; i <= 4; i++) {
      const val = minVal + (i / 4) * (maxVal - minVal)
      const y = pad.top + chartH - (i / 4) * chartH
      const sym2 = priceHistory?.currencySymbol ?? '$'
      const label = val >= 1000000
        ? `${sym2}${(val / 1000000).toFixed(1)}M`
        : `${sym2}${(val / 1000).toFixed(0)}k`
      ctx.fillText(label, pad.left - 8, y + 4)
    }

    // Legend
    ctx.textAlign = 'left'
    ctx.fillStyle = '#7c5cfc'
    ctx.fillRect(pad.left, pad.top - 2, 16, 3)
    ctx.fillStyle = 'rgba(255,255,255,0.4)'
    ctx.font = '10px DM Sans, sans-serif'
    ctx.fillText('Historical', pad.left + 22, pad.top + 3)
    ctx.fillStyle = '#b98aff'
    ctx.setLineDash([5, 3])
    ctx.strokeStyle = '#b98aff'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(pad.left + 120, pad.top)
    ctx.lineTo(pad.left + 136, pad.top)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.fillStyle = 'rgba(255,255,255,0.4)'
    ctx.fillText('Projected', pad.left + 142, pad.top + 3)

  }, [priceHistory])

  const sym = priceHistory?.currencySymbol ?? '$'
  const fmtUSD = (v) => v >= 1000000 ? `${sym}${(v/1000000).toFixed(2)}M` : `${sym}${(v/1000).toFixed(0)}k`
  const current = priceHistory?.data?.find(d => d.year === new Date().getFullYear()) ?? priceHistory?.data?.[priceHistory.data.length - 1]
  const first = priceHistory?.data?.[0]
  const last = priceHistory?.data?.[priceHistory.data.length - 1]
  const change = first && last ? (((last.value - first.value) / first.value) * 100).toFixed(1) : null

  return (
    <div>
      <div style={{ display: 'flex', gap: 20, marginBottom: 16, flexWrap: 'wrap' }}>
        {current && (
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3 }}>Area Average</div>
            <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', letterSpacing: '-0.03em', color: 'var(--text)' }}>{fmtUSD(current.value)}</div>
          </div>
        )}
        {change && (
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3 }}>Since {first.year}</div>
            <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', letterSpacing: '-0.03em', color: change > 0 ? 'var(--green)' : 'var(--red)' }}>
              {change > 0 ? '+' : ''}{change}%
            </div>
          </div>
        )}
      </div>
      <div style={{ width: '100%', height: 200, position: 'relative' }}>
        <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
      </div>
      {priceHistory?.marketNote && (
        <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 12, lineHeight: 1.6 }}>{priceHistory.marketNote}</p>
      )}
    </div>
  )
}
