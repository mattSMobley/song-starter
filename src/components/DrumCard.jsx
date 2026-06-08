import { useState, useRef, useEffect } from 'react'
import * as Tone from 'tone'
import { playDrumHit } from '../audio/engine.js'

const ROWS = ['kick', 'snare', 'hihat', 'tom-hi', 'tom-lo']
const ROW_LABELS = { kick: 'Kick', snare: 'Snare', hihat: 'Hat', 'tom-hi': 'T.Hi', 'tom-lo': 'T.Lo' }
const ROW_COLORS = { kick: '#a855f7', snare: '#06b6d4', hihat: '#ec4899', 'tom-hi': '#f59e0b', 'tom-lo': '#10b981' }
const STEPS = 32

function hitsToGrid(hits) {
  const g = {}
  ROWS.forEach(r => { g[r] = new Array(STEPS).fill(false) })
  hits.forEach(h => {
    const step = Math.round(h.beat * 4) % STEPS
    const row = h.type === 'hihat_open' ? 'hihat' : h.type
    if (ROWS.includes(row)) g[row][step] = true
  })
  return g
}

export default function DrumCard({ loop, index, bpm }) {
  const [playing, setPlaying] = useState(false)
  const [grid, setGrid] = useState(() => hitsToGrid(loop.hits))
  const [currentStep, setCurrentStep] = useState(-1)
  const seqRef = useRef(null)
  const gridRef = useRef(grid)

  useEffect(() => { gridRef.current = grid }, [grid])

  useEffect(() => () => {
    if (seqRef.current) seqRef.current.dispose()
  }, [])

  function toggleStep(row, step) {
    setGrid(g => ({ ...g, [row]: g[row].map((v, i) => i === step ? !v : v) }))
  }

  async function togglePlay() {
    if (playing) return stop()
    await Tone.start()
    if (seqRef.current) seqRef.current.dispose()

    const useBpm = bpm || loop.bpm || 120
    Tone.getTransport().bpm.value = useBpm
    Tone.getTransport().stop()
    Tone.getTransport().position = 0

    const seq = new Tone.Sequence((time, step) => {
      ROWS.forEach(row => {
        if (gridRef.current[row][step]) playDrumHit(row, time)
      })
      Tone.getDraw().schedule(() => setCurrentStep(step), time)
    }, Array.from({ length: STEPS }, (_, i) => i), '16n')

    seq.loop = true
    seq.start(0)
    seqRef.current = seq
    Tone.getTransport().start()
    setPlaying(true)
  }

  function stop() {
    setPlaying(false)
    setCurrentStep(-1)
    if (seqRef.current) { seqRef.current.dispose(); seqRef.current = null }
    Tone.getTransport().stop()
    Tone.getTransport().position = 0
  }

  return (
    <div
      className="rounded-2xl animate-slide-in"
      style={{
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        background: playing
          ? 'linear-gradient(135deg, rgba(168,85,247,0.18) 0%, rgba(6,182,212,0.1) 100%)'
          : 'linear-gradient(135deg, rgba(18,12,34,0.95) 0%, rgba(10,8,22,0.95) 100%)',
        border: playing ? '1px solid rgba(168,85,247,0.55)' : '1px solid rgba(46,46,74,0.65)',
        boxShadow: playing
          ? '0 0 28px rgba(168,85,247,0.35), 0 4px 24px rgba(0,0,0,0.5)'
          : '0 4px 24px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)',
        transition: 'all 0.2s ease',
        animationDelay: `${index * 60}ms`,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-mono rounded-lg"
            style={{ padding: '5px 10px', fontSize: '0.72rem', fontWeight: 700, background: 'rgba(168,85,247,0.22)', color: '#c084fc', border: '1px solid rgba(168,85,247,0.4)' }}>
            🥁
          </span>
          <div>
            <div className="font-semibold" style={{ fontSize: '0.85rem', color: '#e2e8f0' }}>{loop.name}</div>
            <div style={{ fontSize: '0.65rem', color: 'rgba(148,163,184,0.55)' }}>{loop.bpm} bpm · {loop.bars} bar</div>
          </div>
        </div>
        <button
          onClick={togglePlay}
          className="flex items-center justify-center rounded-full transition-all"
          style={{
            width: 40, height: 40,
            background: playing ? 'rgba(168,85,247,0.55)' : 'rgba(168,85,247,0.2)',
            border: '1px solid rgba(168,85,247,0.55)',
            color: '#e0aaff',
            boxShadow: playing ? '0 0 18px rgba(168,85,247,0.6)' : '0 0 8px rgba(168,85,247,0.15)',
          }}
        >
          {playing ? (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>
            </svg>
          ) : (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5,3 19,12 5,21"/>
            </svg>
          )}
        </button>
      </div>

      {/* Grid */}
      <div style={{ background: 'rgba(6,6,12,0.6)', borderRadius: 10, padding: '12px', border: '1px solid rgba(46,46,74,0.5)' }}>
        <div className="flex flex-col gap-1">
          {ROWS.map(row => (
            <div key={row}>
              {[0, 16].map(barOffset => (
                <div key={barOffset} className="flex items-center gap-1 mb-px">
                  <span style={{ width: 30, fontSize: '0.5rem', fontWeight: 700, color: barOffset === 0 ? ROW_COLORS[row] : 'transparent', letterSpacing: '0.06em', flexShrink: 0 }}>
                    {ROW_LABELS[row]}
                  </span>
                  <div className="flex gap-px flex-1">
                    {Array.from({ length: 16 }).map((_, i) => {
                      const s = barOffset + i
                      const on = grid[row][s]
                      const active = playing && s === currentStep
                      return (
                        <button
                          key={s}
                          onClick={() => toggleStep(row, s)}
                          className="flex-1 rounded-sm transition-all"
                          style={{
                            height: 13,
                            background: on ? ROW_COLORS[row] : active ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)',
                            boxShadow: on ? `0 0 4px ${ROW_COLORS[row]}80` : 'none',
                            border: i % 4 === 0
                              ? `1px solid ${on ? ROW_COLORS[row] + '80' : 'rgba(124,58,237,0.22)'}`
                              : `1px solid ${on ? ROW_COLORS[row] + '60' : 'rgba(255,255,255,0.04)'}`,
                            opacity: on ? 1 : 0.45,
                            cursor: 'pointer', padding: 0,
                          }}
                        />
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
