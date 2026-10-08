import { useRef } from 'react'
import { KEYS } from './theory.js'

// ☀️ / 🌙 — big snap switch. Major ↔ parallel minor, same home note.
export function ModeFlip({ mode, onChange, glow }) {
  const minor = mode === 'minor'
  return (
    <button className={`mode-flip ${minor ? 'minor' : ''} ${glow ? 'glow' : ''}`}
      aria-label={minor ? 'sad' : 'happy'}
      onClick={() => onChange(minor ? 'major' : 'minor')}>
      <span className="mf-icon sun">☀️</span>
      <span className="mf-icon moon">🌙</span>
      <span className="mf-thumb" />
    </button>
  )
}

// Letter-colored bell bars, tallest = C, like a real xylophone.
export function KeyBells({ value, onChange }) {
  return (
    <div className="key-bells">
      {KEYS.map((k, i) => (
        <button key={k.letter} className={`bell ${value === k.letter ? 'on' : ''}`}
          style={{ '--key': k.color, height: `${92 - i * 6}%` }}
          onClick={() => onChange(k.letter)}>
          <span>{k.letter}</span>
        </button>
      ))}
    </div>
  )
}

// 🐢 —— 🐇 lever with 5 detents. Scales the leader's vibe tempo.
export const TEMPO_STEPS = [0.7, 0.85, 1, 1.15, 1.3]
export function TempoLever({ value, onChange }) {
  const trackRef = useRef(null)
  const idx = TEMPO_STEPS.indexOf(value)

  function setFrom(e) {
    const r = trackRef.current.getBoundingClientRect()
    const f = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width))
    const i = Math.round(f * (TEMPO_STEPS.length - 1))
    if (TEMPO_STEPS[i] !== value) onChange(TEMPO_STEPS[i])
  }
  return (
    <div className="tempo-lever">
      <span className="tl-end">🐢</span>
      <div ref={trackRef} className="tl-track"
        onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); setFrom(e) }}
        onPointerMove={e => { if (e.buttons || e.pointerType === 'touch') setFrom(e) }}>
        {TEMPO_STEPS.map((_, i) => <span key={i} className="tl-tick" style={{ left: `${(i / 4) * 100}%` }} />)}
        <span className="tl-thumb" style={{ left: `${(idx / 4) * 100}%` }} />
      </div>
      <span className="tl-end">🐇</span>
    </div>
  )
}

// Small rocker in the corner: 💃 3 (waltz) / 🚶 4 (march)
export function MeterRocker({ meter, onChange }) {
  return (
    <button className={`meter-rocker m${meter}`} onClick={() => onChange(meter === 4 ? 3 : 4)}
      aria-label={meter === 4 ? 'march' : 'waltz'}>
      <span className={`mr-side ${meter === 3 ? 'on' : ''}`}>💃<i>•••</i></span>
      <span className={`mr-side ${meter === 4 ? 'on' : ''}`}>🚶<i>••••</i></span>
    </button>
  )
}
