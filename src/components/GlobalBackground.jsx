import { useRef, useId, useEffect } from 'react'
import { animate, useMotionValue } from 'framer-motion'

function mapRange(value, fromLow, fromHigh, toLow, toHigh) {
  if (fromLow === fromHigh) return toLow
  const percentage = (value - fromLow) / (fromHigh - fromLow)
  return toLow + percentage * (toHigh - toLow)
}

function EtherealShadow({ color = 'rgba(128,128,128,1)', animation, noise, sizing = 'fill', style = {}, className = '' }) {
  const rawId = useId().replace(/:/g, '')
  const id = `shadowoverlay-${rawId}`
  const animationEnabled = animation && animation.scale > 0
  const feColorMatrixRef = useRef(null)
  const hueRotateMotionValue = useMotionValue(180)
  const hueRotateAnimation = useRef(null)

  const displacementScale = animation ? mapRange(animation.scale, 1, 100, 20, 100) : 0
  const animationDuration = animation ? mapRange(animation.speed, 1, 100, 1000, 50) : 1

  useEffect(() => {
    if (feColorMatrixRef.current && animationEnabled) {
      if (hueRotateAnimation.current) hueRotateAnimation.current.stop()
      hueRotateMotionValue.set(0)
      hueRotateAnimation.current = animate(hueRotateMotionValue, 360, {
        duration: animationDuration / 25,
        repeat: Infinity,
        repeatType: 'loop',
        repeatDelay: 0,
        ease: 'linear',
        delay: 0,
        onUpdate: (value) => {
          if (feColorMatrixRef.current) {
            feColorMatrixRef.current.setAttribute('values', String(value))
          }
        },
      })
      return () => { if (hueRotateAnimation.current) hueRotateAnimation.current.stop() }
    }
  }, [animationEnabled, animationDuration, hueRotateMotionValue])

  return (
    <div className={className} style={{ overflow: 'hidden', position: 'relative', width: '100%', height: '100%', ...style }}>
      <div style={{ position: 'absolute', inset: -displacementScale, filter: animationEnabled ? `url(#${id}) blur(4px)` : 'none' }}>
        {animationEnabled && (
          <svg style={{ position: 'absolute' }}>
            <defs>
              <filter id={id}>
                <feTurbulence
                  result="undulation"
                  numOctaves="2"
                  baseFrequency={`${mapRange(animation.scale, 0, 100, 0.001, 0.0005)},${mapRange(animation.scale, 0, 100, 0.004, 0.002)}`}
                  seed="0"
                  type="turbulence"
                />
                <feColorMatrix ref={feColorMatrixRef} in="undulation" type="hueRotate" values="180" />
                <feColorMatrix in="dist" result="circulation" type="matrix" values="4 0 0 0 1  4 0 0 0 1  4 0 0 0 1  1 0 0 0 0" />
                <feDisplacementMap in="SourceGraphic" in2="circulation" scale={displacementScale} result="dist" />
                <feDisplacementMap in="dist" in2="undulation" scale={displacementScale} result="output" />
              </filter>
            </defs>
          </svg>
        )}
        <div style={{
          backgroundColor: color,
          maskImage: `url('https://framerusercontent.com/images/ceBGguIpUU8luwByxuQz79t7To.png')`,
          WebkitMaskImage: `url('https://framerusercontent.com/images/ceBGguIpUU8luwByxuQz79t7To.png')`,
          maskSize: sizing === 'stretch' ? '100% 100%' : 'cover',
          WebkitMaskSize: sizing === 'stretch' ? '100% 100%' : 'cover',
          maskRepeat: 'no-repeat',
          WebkitMaskRepeat: 'no-repeat',
          maskPosition: 'center',
          WebkitMaskPosition: 'center',
          width: '100%',
          height: '100%',
        }} />
      </div>
      {noise && noise.opacity > 0 && (
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `url("https://framerusercontent.com/images/g0QcWrxr87K0ufOxIUFBakwYA8.png")`,
          backgroundSize: noise.scale * 200,
          backgroundRepeat: 'repeat',
          opacity: noise.opacity / 2,
        }} />
      )}
    </div>
  )
}

export default function GlobalBackground() {
  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0,
      height: '100vh',
      zIndex: 0,
      pointerEvents: 'none',
      WebkitMaskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)',
      maskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)',
    }}>
      <EtherealShadow
        color="rgba(30, 20, 10, 1)"
        animation={{ scale: 100, speed: 90 }}
        noise={{ opacity: 1, scale: 1.2 }}
        sizing="fill"
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  )
}
