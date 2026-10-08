import { useRef } from 'react'
import { VIBES, RELATION, vibeDistance } from './theory.js'

const GEM_R = 74      // gem orbit radius
const KNOB_R = 44
const angleOf = i => -90 + i * 60

// A 3-year-old can't drag in a circle, so every input works:
// tap a gem → jump there · tap the knob → next gem · drag → rotate with detents.
export default function VibeDial({ vibe, leaderVibe, onChange, glow, showBadges, disabled }) {
  const svgRef = useRef(null)
  const drag = useRef(null)

  function pointToGem(e) {
    const r = svgRef.current.getBoundingClientRect()
    const x = e.clientX - (r.left + r.width / 2)
    const y = e.clientY - (r.top + r.height / 2)
    const dist = Math.hypot(x, y) / (r.width / 220)    // in viewBox units
    const deg = (Math.atan2(y, x) * 180) / Math.PI + 90
    const idx = ((Math.round(deg / 60) % 6) + 6) % 6
    return { dist, idx }
  }

  function down(e) {
    if (disabled) return
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { x: e.clientX, y: e.clientY, moved: false }
  }
  function move(e) {
    const d = drag.current
    if (!d) return
    if (!d.moved && Math.hypot(e.clientX - d.x, e.clientY - d.y) < 10) return
    d.moved = true
    const { idx } = pointToGem(e)
    if (idx !== vibe) onChange(idx)
  }
  function up(e) {
    const d = drag.current
    drag.current = null
    if (!d || d.moved) return
    const { dist, idx } = pointToGem(e)
    if (dist < KNOB_R + 8) onChange((vibe + 1) % 6)
    else onChange(idx)   // re-tapping the current gem still clicks, so it always feels alive
  }

  const cur = VIBES[vibe]
  return (
    <svg ref={svgRef} viewBox="-110 -110 220 220" className={`vibe-dial ${glow ? 'glow' : ''}`}
      style={{ '--vibe': cur.hue, '--vibe-glow': cur.glow }}
      onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={() => (drag.current = null)}>
      <circle r="100" className="dial-plate" />
      {VIBES.map((v, i) => {
        const a = (angleOf(i) * Math.PI) / 180
        const x = Math.cos(a) * GEM_R, y = Math.sin(a) * GEM_R
        const isLeader = leaderVibe != null && i === leaderVibe
        const rel = leaderVibe != null ? RELATION[vibeDistance(i, leaderVibe)] : null
        return (
          <g key={i} transform={`translate(${x} ${y})`} className={`gem ${i === vibe ? 'on' : ''}`}>
            {isLeader && <circle r="24" className="leader-ring" />}
            <circle r="18" fill={v.hue} />
            <text className="gem-shape" dy="1">{v.shape}</text>
            {showBadges && rel && !isLeader && (
              <text className="gem-badge" x={Math.cos(a) * 26} y={Math.sin(a) * 26 + 1}>{rel.badge}</text>
            )}
          </g>
        )
      })}
      <g className="knob" style={{ transform: `rotate(${angleOf(vibe) + 90}deg)` }}>
        <circle r={KNOB_R} fill={cur.hue} />
        <circle r={KNOB_R - 6} className="knob-face" />
        <rect x="-4" y={-KNOB_R + 2} width="8" height="16" rx="4" className="knob-notch" />
      </g>
      <text className="knob-shape" dy="2">{cur.shape}</text>
    </svg>
  )
}
