import { useState, useRef } from 'react'
import * as Tone from 'tone'
import { playDrumHit } from '../audio/engine.js'

const ROWS = ['kick', 'snare', 'hihat']
const ROW_LABELS = { kick: 'Kick', snare: 'Snare', hihat: 'Hat' }
const ROW_COLORS = { kick: '#a855f7', snare: '#06b6d4', hihat: '#ec4899' }

// 16 steps per 2 bars (16th-note grid)
const STEPS = 16
function beatToStep(beat) { return Math.round(beat * 2) } // beat * (STEPS / (bars*4)) where bars=2, steps=16

export default function DrumCard({ loop, index, bpm }) {
  const [playing, setPlaying] = useState(false)
  const partRef = useRef(null)

  const grid = {}
  ROWS.forEach(r => { grid[r] = new Array(STEPS).fill(false) })
  loop.hits.forEach(h => {
    const step = beatToStep(h.beat)
    const row = h.type === 'hihat_open' ? 'hihat' : h.type
    if (ROWS.includes(row) && step < STEPS) grid[row][step] = true
  })

  async function togglePlay() {
    if (playing) return stop()
    await Tone.start()

    if (partRef.current) partRef.current.dispose()
    setPlaying(true)

    const useBpm = bpm || loop.bpm || 120
    const secPerBeat = 60 / useBpm
    const totalSec = loop.bars * 4 * secPerBeat

    const events = loop.hits.map(h => ({ time: h.beat * secPerBeat, type: h.type }))
    const part = new Tone.Part((time, ev) => {
      playDrumHit(ev.type, time)
    }, events)

    part.start(0)
    partRef.current = part
    Tone.getTransport().bpm.value = useBpm
    Tone.getTransport().start()

    setTimeout(() => stop(), (totalSec + 0.2) * 1000)
  }

  function stop() {
    setPlaying(false)
    if (partRef.current) { partRef.current.dispose(); partRef.current = null }
    Tone.getTransport().stop()
    Tone.getTransport().position = 0
  }

  return (
    <div
      className="rounded-2xl animate-slide-in cursor-pointer"
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
      <div className="flex flex-col gap-1.5" style={{ background: 'rgba(6,6,12,0.6)', borderRadius: 10, padding: '12px', border: '1px solid rgba(46,46,74,0.5)' }}>
        {ROWS.map(row => (
          <div key={row} className="flex items-center gap-1.5">
            <span style={{ width: 32, fontSize: '0.6rem', fontWeight: 700, color: ROW_COLORS[row], letterSpacing: '0.1em', flexShrink: 0 }}>
              {ROW_LABELS[row]}
            </span>
            <div className="flex gap-0.5 flex-1">
              {grid[row].map((on, s) => (
                <div key={s}
                  className="flex-1 rounded-sm"
                  style={{
                    height: 14,
                    background: on ? ROW_COLORS[row] : 'rgba(255,255,255,0.04)',
                    boxShadow: on ? `0 0 6px ${ROW_COLORS[row]}80` : 'none',
                    border: s % 4 === 0 ? `1px solid ${on ? ROW_COLORS[row] + '80' : 'rgba(124,58,237,0.2)'}` : `1px solid ${on ? ROW_COLORS[row] + '60' : 'rgba(255,255,255,0.04)'}`,
                    opacity: on ? 1 : 0.4,
                  }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
