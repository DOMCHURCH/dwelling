// No animation — just renders text normally, no flicker
export default function BlurText({ text, className = '', style = {} }) {
  return (
    <span className={className} style={{ display: 'inline', ...style }}>
      {text}
    </span>
  )
}
