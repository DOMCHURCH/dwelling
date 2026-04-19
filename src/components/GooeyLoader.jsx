import { forwardRef } from 'react'

const GooeyLoader = forwardRef(function GooeyLoader(
  { primaryColor = '#38bdf8', secondaryColor = '#818cf8', borderColor = 'rgba(255,255,255,0.12)', style, ...props },
  ref
) {
  return (
    <div
      ref={ref}
      role="status"
      aria-label="Loading"
      style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, ...style }}
      {...props}
    >
      <svg style={{ position: 'absolute', width: 0, height: 0 }}>
        <defs>
          <filter id="gooey-loader-filter">
            <feGaussianBlur in="SourceGraphic" stdDeviation={12} result="blur" />
            <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 48 -7" result="goo" />
            <feComposite in="SourceGraphic" in2="goo" operator="atop" />
          </filter>
        </defs>
      </svg>

      <style>{`
        .gooey-loader {
          width: 12em;
          height: 3em;
          position: relative;
          overflow: hidden;
          border-bottom: 8px solid ${borderColor};
          filter: url(#gooey-loader-filter);
        }
        .gooey-loader::before,
        .gooey-loader::after {
          content: '';
          position: absolute;
          border-radius: 50%;
        }
        .gooey-loader::before {
          width: 22em;
          height: 18em;
          background-color: ${primaryColor};
          left: -2em;
          bottom: -18em;
          animation: gooey-wee1 2s linear infinite;
        }
        .gooey-loader::after {
          width: 16em;
          height: 12em;
          background-color: ${secondaryColor};
          left: -4em;
          bottom: -12em;
          animation: gooey-wee2 2s linear infinite 0.75s;
        }
        @keyframes gooey-wee1 {
          0%   { transform: translateX(-10em) rotate(0deg); }
          100% { transform: translateX(7em) rotate(180deg); }
        }
        @keyframes gooey-wee2 {
          0%   { transform: translateX(-8em) rotate(0deg); }
          100% { transform: translateX(8em) rotate(180deg); }
        }
      `}</style>

      <div className="gooey-loader" />
    </div>
  )
})

export default GooeyLoader
