import { useState, useRef, useEffect } from 'react'
import * as Tone from 'tone'
import { DRUM_LOOPS } from '../audio/loopLibrary.js'
import { getProgressions } from '../audio/chordProgressions.js'
import { playDrumHit, playNoteAt, loadDrumKit } from '../audio/engine.js'
import { LOOP_KITS } from '../audio/drumKits.js'

// ── Drum grid ─────────────────────────────────────────────────────────────────
const GRID_ROWS   = ['kick', 'snare', 'hihat', 'tom-hi', 'tom-lo']
const ROW_LABELS  = { kick: 'Kick', snare: 'Snare', hihat: 'Hat', 'tom-hi': 'T.Hi', 'tom-lo': 'T.Lo' }
const ROW_COLORS  = { kick: '#a855f7', snare: '#06b6d4', hihat: '#ec4899', 'tom-hi': '#f59e0b', 'tom-lo': '#10b981' }
const STEPS       = 32  // 2 bars × 4 beats × 4 steps/beat at 16th-note resolution

function hitsToGrid(hits) {
  const g = {}
  GRID_ROWS.forEach(r => { g[r] = new Array(STEPS).fill(false) })
  hits.forEach(h => {
    const step = Math.round(h.beat * 4) % STEPS
    const row  = h.type === 'hihat_open' ? 'hihat' : h.type
    if (GRID_ROWS.includes(row)) g[row][step] = true
  })
  return g
}

export default function SessionTab({ root, scale, bpm, onChordChange,
  micArmed, micInputNote, micTargetNote,
  autotuneStrength, setAutotuneStrength, bypass, setBypass }) {
  const [drumIdx, setDrumIdx]             = useState(0)
  const [drumGrid, setDrumGrid]           = useState(() => hitsToGrid(DRUM_LOOPS[0].hits))
  useEffect(() => { loadDrumKit(LOOP_KITS[DRUM_LOOPS[0].id] ?? 'dead-disco') }, [])
  const [currentStep, setCurrentStep]     = useState(-1)
  const [progIdx, setProgIdx]             = useState(0)
  const [beatsPerChord, setBeatsPerChord] = useState(4)
  const [activeChord, setActiveChord]     = useState(-1)
  const [isPlaying, setIsPlaying]         = useState(false)

  const drumSeqRef   = useRef(null)
  const chordPartRef = useRef(null)
  const drumGridRef  = useRef(drumGrid)

  useEffect(() => { drumGridRef.current = drumGrid }, [drumGrid])

  const progressions = getProgressions(root, scale)

  // ── Transport ──────────────────────────────────────────────────────────────
  function stopSession() {
    setIsPlaying(false)
    setCurrentStep(-1)
    setActiveChord(-1)
    onChordChange?.([])
    if (drumSeqRef.current)  { drumSeqRef.current.dispose();  drumSeqRef.current  = null }
    if (chordPartRef.current) { chordPartRef.current.dispose(); chordPartRef.current = null }
    Tone.getTransport().stop()
    Tone.getTransport().position = 0
  }

  async function startSession() {
    await Tone.start()
    stopSession()

    const prog = progressions[Math.min(progIdx, progressions.length - 1)]
    const spb  = 60 / bpm
    // Per-chord beat durations: use the progression's built-in rhythm if defined,
    // otherwise every chord plays for `beatsPerChord` beats.
    const chordBeats = prog.beats
      ? prog.beats.map(b => b * beatsPerChord)
      : prog.chords.map(() => beatsPerChord)

    Tone.getTransport().bpm.value = bpm

    // Drum sequencer (32-step = 2 bars at 16th-note resolution)
    const seq = new Tone.Sequence((time, step) => {
      GRID_ROWS.forEach(row => {
        if (drumGridRef.current[row][step]) playDrumHit(row, time)
      })
      Tone.getDraw().schedule(() => setCurrentStep(step), time)
    }, Array.from({ length: STEPS }, (_, i) => i), '16n')
    seq.loop = true
    seq.start(0)
    drumSeqRef.current = seq

    // Build chord events with variable per-chord timing
    let tSec = 0
    const chordEvents = prog.chords.map((chord, i) => {
      const ev = { time: tSec, chord, chordIdx: i, dur: chordBeats[i] * spb * 0.85 }
      tSec += chordBeats[i] * spb
      return ev
    })
    const totalChordSec = tSec

    const chordPart = new Tone.Part(
      (time, ev) => {
        ev.chord.notes.forEach(n => playNoteAt(n, ev.dur, time))
        Tone.getDraw().schedule(() => {
          setActiveChord(ev.chordIdx)
          onChordChange?.(ev.chord.notes)
        }, time)
      },
      chordEvents
    )
    chordPart.loop    = true
    chordPart.loopEnd = totalChordSec
    chordPart.start(0)
    chordPartRef.current = chordPart

    Tone.getTransport().start()
    setIsPlaying(true)
  }

  function toggleSession() {
    if (isPlaying) stopSession()
    else startSession()
  }

  // Restart chords when root/scale changes while playing
  useEffect(() => {
    if (isPlaying) startSession()
  }, [root, scale, progIdx, beatsPerChord])

  // Swap drum pattern when selector changes (without restarting everything)
  function selectDrum(idx) {
    setDrumIdx(idx)
    setDrumGrid(hitsToGrid(DRUM_LOOPS[idx].hits))
    const kit = LOOP_KITS[DRUM_LOOPS[idx].id] ?? 'dead-disco'
    loadDrumKit(kit)
  }

  // ── Styles ─────────────────────────────────────────────────────────────────
  const card = {
    padding: '14px 18px', borderRadius: 14,
    background: 'linear-gradient(135deg, rgba(18,12,34,0.95) 0%, rgba(10,8,22,0.95) 100%)',
    border: '1px solid rgba(46,46,74,0.5)',
    boxShadow: '0 0 20px rgba(124,58,237,0.08), inset 0 1px 0 rgba(255,255,255,0.04)',
  }

  const pill = (active, color = 'purple') => {
    const colors = {
      purple: { bg: 'rgba(124,58,237,0.45)', border: 'rgba(168,85,247,0.6)', text: '#f0e0ff' },
      cyan:   { bg: 'rgba(6,182,212,0.35)',  border: 'rgba(6,182,212,0.55)', text: '#e0f9ff' },
      pink:   { bg: 'rgba(236,72,153,0.35)', border: 'rgba(236,72,153,0.55)', text: '#ffe4f0' },
    }[color]
    return {
      padding: '6px 14px', borderRadius: 10, fontSize: '0.72rem', fontWeight: 700,
      background: active ? `linear-gradient(135deg, ${colors.bg}, ${colors.bg.replace('0.45','0.25')})` : 'rgba(255,255,255,0.03)',
      border: active ? `1px solid ${colors.border}` : '1px solid rgba(255,255,255,0.07)',
      color: active ? colors.text : 'rgba(148,163,184,0.5)',
      cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap', transition: 'all 0.1s ease',
    }
  }

  const sectionLabel = {
    fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.2em',
    textTransform: 'uppercase', color: 'rgba(192,132,252,0.75)',
  }

  const prog = progressions[Math.min(progIdx, progressions.length - 1)]

  return (
    <div className="overflow-y-auto h-full" style={{ WebkitOverflowScrolling: 'touch' }}>
    <div className="flex flex-col gap-4" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}>

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold" style={{ color: '#e2e8f0', fontSize: '0.9rem', letterSpacing: '-0.01em' }}>
            Session
          </h2>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(148,163,184,0.45)' }}>
            Layer a beat + chord loop, then sing over it
          </p>
        </div>
        <button
          onClick={toggleSession}
          className="flex items-center gap-2 rounded-xl font-bold transition-all"
          style={{
            padding: '8px 16px', fontSize: '0.75rem', letterSpacing: '0.06em', textTransform: 'uppercase',
            background: isPlaying
              ? 'linear-gradient(135deg, rgba(6,182,212,0.4), rgba(6,182,212,0.2))'
              : 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
            border: isPlaying ? '1px solid rgba(6,182,212,0.55)' : '1px solid rgba(196,132,252,0.4)',
            color: isPlaying ? '#67e8f9' : '#f5eeff',
            boxShadow: isPlaying ? '0 0 22px rgba(6,182,212,0.3)' : '0 0 22px rgba(124,58,237,0.35)',
          }}>
          {isPlaying ? (
            <><svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>Stop</>
          ) : (
            <><svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>Play</>
          )}
        </button>
      </div>


        {/* ── Beat ── */}
        <div style={card}>
          <div className="flex items-center gap-2 mb-3">
            <span style={sectionLabel}>Beat</span>
            {isPlaying && (
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ background: '#a855f7', boxShadow: '0 0 6px #a855f7', animation: 'pulse 1s ease-in-out infinite' }} />
            )}
          </div>

          {/* Drum selector pills */}
          <div className="flex gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: 'thin', touchAction: 'pan-x' }}>
            {DRUM_LOOPS.map((d, i) => (
              <button key={d.id} onClick={() => selectDrum(i)} style={pill(drumIdx === i, 'purple')}>
                {d.name}
              </button>
            ))}
          </div>

          {/* 32-step drum grid — displayed as 2 rows of 16 (bar 1 / bar 2) */}
          <div style={{ background: 'rgba(6,6,12,0.55)', borderRadius: 10, padding: '10px 12px', border: '1px solid rgba(46,46,74,0.4)', marginTop: 10 }}>
            {GRID_ROWS.map(row => (
              <div key={row} className="mb-1.5">
                {[0, 16].map(barOffset => (
                  <div key={barOffset} className="flex items-center gap-1 mb-px">
                    <span style={{ width: 32, fontSize: '0.52rem', fontWeight: 700, color: barOffset === 0 ? ROW_COLORS[row] : 'transparent', letterSpacing: '0.08em', flexShrink: 0 }}>
                      {ROW_LABELS[row]}
                    </span>
                    {/* Bar label */}
                    <span style={{ width: 14, fontSize: '0.42rem', color: 'rgba(148,163,184,0.25)', flexShrink: 0, textAlign: 'center' }}>
                      {barOffset === 0 ? 'B1' : 'B2'}
                    </span>
                    <div className="flex gap-px flex-1">
                      {Array.from({ length: 16 }).map((_, i) => {
                        const s = barOffset + i
                        const on = drumGrid[row][s]
                        const active = isPlaying && s === currentStep
                        return (
                          <button
                            key={s}
                            onClick={() => setDrumGrid(g => ({ ...g, [row]: g[row].map((v, idx) => idx === s ? !v : v) }))}
                            className="flex-1 rounded-sm transition-all"
                            style={{
                              height: 14,
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

        {/* ── Chord Loop ── */}
        <div style={card}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span style={sectionLabel}>Chord Loop</span>
              {isPlaying && (
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ background: '#06b6d4', boxShadow: '0 0 6px #06b6d4', animation: 'pulse 1s ease-in-out infinite' }} />
              )}
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span style={{ fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(168,85,247,0.5)', textTransform: 'uppercase' }}>Beats</span>
              {[1, 2, 4].map(b => (
                <button key={b} onClick={() => setBeatsPerChord(b)}
                  style={{ ...pill(beatsPerChord === b, 'cyan'), padding: '4px 10px', fontSize: '0.68rem' }}>
                  {b}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: 'thin', touchAction: 'pan-x' }}>
            {progressions.map((p, i) => (
              <button key={i} onClick={() => setProgIdx(i)} style={pill(progIdx === i, 'cyan')}>
                {p.name}
              </button>
            ))}
          </div>

          {prog && (
            <div className="flex items-center gap-2 flex-wrap mt-3">
              <span style={{ fontSize: '0.6rem', color: 'rgba(148,163,184,0.35)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                {prog.tag}
              </span>
              <div className="flex gap-1.5 flex-wrap items-end">
                {prog.chords.map((c, i) => {
                  const isActive = isPlaying && activeChord === i
                  const beatCount = prog.beats ? prog.beats[i] * beatsPerChord : beatsPerChord
                  return (
                    <div key={i} className="flex flex-col items-center gap-0.5">
                      <span style={{
                        padding: '5px 12px', borderRadius: 8,
                        background: isActive ? 'rgba(6,182,212,0.25)' : 'rgba(6,182,212,0.1)',
                        border: isActive ? '1px solid rgba(6,182,212,0.6)' : '1px solid rgba(6,182,212,0.25)',
                        fontSize: '0.8rem', fontWeight: 800, fontFamily: 'monospace', color: isActive ? '#22d3ee' : '#67e8f9',
                        transition: 'all 0.1s ease',
                        transform: isActive ? 'scale(1.06)' : 'scale(1)',
                        boxShadow: isActive ? '0 0 12px rgba(6,182,212,0.4)' : 'none',
                        display: 'block',
                      }}>
                        {c.label}
                      </span>
                      {prog.beats && (
                        <span style={{ fontSize: '0.5rem', fontWeight: 700, color: isActive ? 'rgba(34,211,238,0.7)' : 'rgba(34,211,238,0.35)', letterSpacing: '0.06em' }}>
                          {beatCount}b
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── Vocal + Autotune ── */}
        <div style={{
          ...card,
          border: micArmed ? '1px solid rgba(236,72,153,0.45)' : '1px solid rgba(46,46,74,0.5)',
          boxShadow: micArmed ? '0 0 24px rgba(236,72,153,0.12)' : 'none',
        }}>
          <div className="flex items-center gap-2 mb-3">
            <span style={sectionLabel}>Vocal + Autotune</span>
            {micArmed && (
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ background: '#ec4899', boxShadow: '0 0 6px #ec4899', animation: 'pulse 1s ease-in-out infinite' }} />
            )}
          </div>

          {!micArmed ? (
            <p style={{ fontSize: '0.72rem', color: 'rgba(148,163,184,0.35)' }}>
              Tap the mic button in the keyboard area to arm autotune, then sing.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {/* Note display */}
              <div className="flex items-center gap-4 rounded-xl px-4 py-3"
                style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(236,72,153,0.2)' }}>
                <div className="flex flex-col items-center">
                  <span style={{ fontSize: '0.55rem', letterSpacing: '0.1em', color: 'rgba(148,163,184,0.4)', textTransform: 'uppercase' }}>Singing</span>
                  <span style={{ fontSize: '1.8rem', fontWeight: 800, fontFamily: 'monospace', color: '#f9a8d4', lineHeight: 1 }}>{micInputNote}</span>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(192,132,252,0.5)" strokeWidth="2"><polyline points="9,18 15,12 9,6"/></svg>
                <div className="flex flex-col items-center">
                  <span style={{ fontSize: '0.55rem', letterSpacing: '0.1em', color: 'rgba(148,163,184,0.4)', textTransform: 'uppercase' }}>Tuned</span>
                  <span style={{ fontSize: '1.8rem', fontWeight: 800, fontFamily: 'monospace', color: '#c084fc', lineHeight: 1 }}>{micTargetNote}</span>
                </div>
              </div>
              {/* Strength */}
              <div className="flex items-center gap-3">
                <span style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(192,132,252,0.65)', textTransform: 'uppercase', flexShrink: 0 }}>
                  Strength
                </span>
                <input type="range" min={0} max={100} value={autotuneStrength}
                  onChange={e => setAutotuneStrength(Number(e.target.value))}
                  className="flex-1" style={{ accentColor: '#a855f7', cursor: 'pointer' }} />
                <span style={{ fontSize: '0.88rem', fontWeight: 800, fontFamily: 'monospace', color: '#c084fc', flexShrink: 0, width: 36, textAlign: 'right' }}>{autotuneStrength}</span>
              </div>
              <span style={{ fontSize: '0.62rem', color: 'rgba(148,163,184,0.35)' }}>
                {autotuneStrength < 35 ? 'natural' : autotuneStrength < 65 ? 'moderate' : autotuneStrength < 90 ? 'strong' : 'T-Pain'}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
