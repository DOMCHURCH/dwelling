import { useEffect, useState } from 'react'

export default function GlobalBackground() {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: -1, pointerEvents: 'none', overflow: 'hidden',
        background: '#000',
      }}
    >
      <style>{`
        @keyframes dw-drift1 { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(40px,-60px) scale(1.05)} 66%{transform:translate(-30px,30px) scale(0.97)} }
        @keyframes dw-drift2 { 0%,100%{transform:translate(0,0) scale(1.02)} 33%{transform:translate(-50px,40px) scale(0.96)} 66%{transform:translate(60px,-20px) scale(1.04)} }
        @keyframes dw-drift3 { 0%,100%{transform:translate(0,0) scale(0.98)} 50%{transform:translate(30px,50px) scale(1.03)} }
        @keyframes dw-pulse  { 0%,100%{opacity:0.4} 50%{opacity:0.7} }
        .dw-orb { position:absolute; border-radius:50%; filter:blur(80px); will-change: transform; }
      `}</style>
      <div className="dw-orb" style={{ width:600,height:600,top:'-15%',left:'-10%',background:'radial-gradient(circle,rgba(60,60,100,0.8) 0%,transparent 70%)',animation:'dw-drift1 18s ease-in-out infinite,dw-pulse 8s ease-in-out infinite' }} />
      <div className="dw-orb" style={{ width:500,height:500,top:'10%',right:'-5%',background:'radial-gradient(circle,rgba(50,60,90,0.75) 0%,transparent 70%)',animation:'dw-drift2 22s ease-in-out infinite,dw-pulse 10s ease-in-out infinite 2s' }} />
      <div className="dw-orb" style={{ width:400,height:400,top:'40%',left:'30%',background:'radial-gradient(circle,rgba(40,50,80,0.7) 0%,transparent 70%)',animation:'dw-drift3 15s ease-in-out infinite,dw-pulse 12s ease-in-out infinite 4s' }} />
      <div className="dw-orb" style={{ width:350,height:350,bottom:'5%',left:'10%',background:'radial-gradient(circle,rgba(55,50,85,0.65) 0%,transparent 70%)',animation:'dw-drift1 20s ease-in-out infinite reverse,dw-pulse 9s ease-in-out infinite 1s' }} />
      <div style={{ position:'absolute',inset:0,backgroundImage:'linear-gradient(rgba(255,255,255,0.015) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.015) 1px,transparent 1px)',backgroundSize:'80px 80px',opacity:0.4 }} />
      <div style={{ position:'absolute', inset:0, background: 'linear-gradient(to bottom, transparent 40%, #000 90%)' }} />
    </div>
  )
}
