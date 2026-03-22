import { useEffect, useRef, useState } from 'react'

export default function HlsVideo({ src, className = '', style = {}, poster }) {
  const videoRef = useRef(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const onCanPlay = () => setLoaded(true)
    video.addEventListener('canplay', onCanPlay)

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
          video.play().catch(() => {})
        }
      })
    } else {
      // MP4 or WebM — play directly
      video.src = src
      video.load()
      video.play().catch(() => {})
    }

    return () => video.removeEventListener('canplay', onCanPlay)
  }, [src])

  return (
    <video
      ref={videoRef}
      className={className}
      style={{
        ...style,
        opacity: loaded ? (style.opacity ?? 1) : 0,
        transition: 'opacity 1s ease',
      }}
      autoPlay
      loop
      muted
      playsInline
      poster={poster}
    />
  )
}
