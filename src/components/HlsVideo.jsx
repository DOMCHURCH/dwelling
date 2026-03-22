import { useEffect, useRef } from 'react'

export default function HlsVideo({ src, className = '', style = {}, poster }) {
  const videoRef = useRef(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    if (src.endsWith('.m3u8')) {
      import('hls.js').then(({ default: Hls }) => {
        if (Hls.isSupported()) {
          const hls = new Hls({ enableWorker: true, lowLatencyMode: false })
          hls.loadSource(src)
          hls.attachMedia(video)
          hls.on(Hls.Events.MANIFEST_PARSED, () => { video.play().catch(() => {}) })
          return () => hls.destroy()
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          video.src = src
          video.addEventListener('loadedmetadata', () => { video.play().catch(() => {}) })
        }
      })
    } else {
      video.src = src
      video.play().catch(() => {})
    }
  }, [src])

  return (
    <video
      ref={videoRef}
      className={className}
      style={style}
      autoPlay
      loop
      muted
      playsInline
      poster={poster}
    />
  )
}
