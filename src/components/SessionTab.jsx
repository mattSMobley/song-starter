import { useState, useRef, useEffect } from 'react'
import * as Tone from 'tone'
import { DRUM_LOOPS } from '../audio/loopLibrary.js'
import { getProgressions } from '../audio/chordProgressions.js'
import { snapToScale } from '../audio/scales.js'
import { playDrumHit, playNoteAt } from '../audio/engine.js'

// ── Autocorrelation pitch detector ────────────────────────────────────────────
function detectPitch(buf, sampleRate) {
  let rms = 0
  for (let i = 0; i < buf.length; i++) rms += buf[i] * buf[i]
  if (Math.sqrt(rms / buf.length) < 0.012) return null
  const half = Math.floor(buf.length / 2)
  const c = new Float32Array(half)
  for (let i = 0; i < half; i++)
    for (let j = 0; j < half; j++) c[i] += buf[j] * buf[j + i]
  let d = 0
  while (d < half - 1 && c[d] > c[d + 1]) d++
  let best = d, bestVal = -Infinity
  for (let i = d; i < half; i++) if (c[i] > bestVal) { bestVal = c[i]; best = i }
  if (best <= 0 || best >= half - 1) return null
  const y1 = c[best - 1], y2 = c[best], y3 = c[best + 1]
  const x = best + (y3 - y1) / (2 * (2 * y2 - y1 - y3))
  const freq = sampleRate / x
  return freq > 60 && freq < 1300 ? freq : null
}

function noteNameToMidi(name) {
  const N = { C:0,'C#':1,D:2,'D#':3,E:4,F:5,'F#':6,G:7,'G#':8,A:9,'A#':10,B:11 }
  const m = name.match(/^([A-G]#?)(-?\d+)$/)
  return m ? (parseInt(m[2]) + 1) * 12 + (N[m[1]] ?? 0) : 60
}

function freqToNoteName(freq) {
  if (!freq || freq < 20) return '—'
  const NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']
  const midi = Math.round(69 + 12 * Math.log2(freq / 440))
  return NAMES[((midi % 12) + 12) % 12] + (Math.floor(midi / 12) - 1)
}

// ── Drum grid ─────────────────────────────────────────────────────────────────
const GRID_ROWS   = ['kick', 'snare', 'hihat']
const ROW_LABELS  = { kick: 'Kick', snare: 'Snare', hihat: 'Hat' }
const ROW_COLORS  = { kick: '#a855f7', snare: '#06b6d4', hihat: '#ec4899' }
const STEPS       = 16

function hitsToGrid(hits) {
  const g = {}
  GRID_ROWS.forEach(r => { g[r] = new Array(STEPS).fill(false) })
  hits.forEach(h => {
    const step = Math.round(h.beat * 2) % STEPS
    const row  = h.type === 'hihat_open' ? 'hihat' : h.type
    if (GRID_ROWS.includes(row)) g[row][step] = true
  })
  return g
}

export default function SessionTab({ root, scale, bpm, onChordChange }) {
  const [drumIdx, setDrumIdx]             = useState(0)
  const [drumGrid, setDrumGrid]           = useState(() => hitsToGrid(DRUM_LOOPS[0].hits))
  const [currentStep, setCurrentStep]     = useState(-1)
  const [progIdx, setProgIdx]             = useState(0)
  const [beatsPerChord, setBeatsPerChord] = useState(2)
  const [activeChord, setActiveChord]     = useState(-1)
  const [isPlaying, setIsPlaying]         = useState(false)
  const [micArmed, setMicArmed]           = useState(false)
  const [micAllowed, setMicAllowed]       = useState(true)
  const [autotuneStrength, setAutotuneStrength] = useState(80)
  const [bypass, setBypass]               = useState(false)
  const [inputNote, setInputNote]         = useState('—')
  const [targetNote, setTargetNote]       = useState('—')

  const drumSeqRef   = useRef(null)
  const chordPartRef = useRef(null)
  const umRef        = useRef(null)
  const psRef        = useRef(null)
  const paRef        = useRef(null)
  const rafRef       = useRef(null)
  const drumGridRef  = useRef(drumGrid)

  const rootRef      = useRef(root)
  const scaleRef     = useRef(scale)
  const strengthRef  = useRef(autotuneStrength)
  const bypassRef    = useRef(bypass)
  useEffect(() => { rootRef.current = root;   scaleRef.current = scale }, [root, scale])
  useEffect(() => { strengthRef.current = autotuneStrength }, [autotuneStrength])
  useEffect(() => { bypassRef.current   = bypass }, [bypass])
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

    const prog        = progressions[Math.min(progIdx, progressions.length - 1)]
    const spb         = 60 / bpm
    const chordSec    = beatsPerChord * spb
    const chordDur    = chordSec * 0.85
    const totalChordSec = prog.chords.length * chordSec

    Tone.getTransport().bpm.value = bpm

    // Drum sequencer (16-step)
    const seq = new Tone.Sequence((time, step) => {
      GRID_ROWS.forEach(row => {
        if (drumGridRef.current[row][step]) playDrumHit(row, time)
      })
      Tone.getDraw().schedule(() => setCurrentStep(step), time)
    }, Array.from({ length: STEPS }, (_, i) => i), '16n')
    seq.loop = true
    seq.start(0)
    drumSeqRef.current = seq

    // Chord part
    const chordPart = new Tone.Part(
      (time, ev) => {
        ev.chord.notes.forEach(n => playNoteAt(n, chordDur, time))
        Tone.getDraw().schedule(() => {
          setActiveChord(ev.chordIdx)
          onChordChange?.(ev.chord.notes)
        }, time)
      },
      prog.chords.map((chord, i) => ({ time: i * chordSec, chord, chordIdx: i }))
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

  // Don't stop session on unmount (allows session to persist across tab switches)
  useEffect(() => () => { teardownMic() }, [])

  // Restart chords when root/scale changes while playing
  useEffect(() => {
    if (isPlaying) startSession()
  }, [root, scale])

  // Swap drum pattern when selector changes (without restarting everything)
  function selectDrum(idx) {
    setDrumIdx(idx)
    setDrumGrid(hitsToGrid(DRUM_LOOPS[idx].hits))
  }

  // ── Mic / Autotune ─────────────────────────────────────────────────────────
  function teardownMic() {
    cancelAnimationFrame(rafRef.current)
    try {
      if (umRef.current) { umRef.current.close(); umRef.current.dispose(); umRef.current = null }
      if (psRef.current) { psRef.current.disconnect(); psRef.current.dispose(); psRef.current = null }
      if (paRef.current) { paRef.current.disconnect(); paRef.current.dispose(); paRef.current = null }
    } catch {}
  }

  async function armMic() {
    try {
      await Tone.start()
      const um = new Tone.UserMedia()
      await um.open()
      const ps = new Tone.PitchShift({ pitch: 0, windowSize: 0.1 }).toDestination()
      const pa = new Tone.Analyser('waveform', 2048)
      um.connect(ps)
      um.connect(pa)
      umRef.current = um; psRef.current = ps; paRef.current = pa
      setMicArmed(true)
      startPitchLoop()
    } catch { setMicAllowed(false) }
  }

  function disarmMic() {
    setMicArmed(false)
    setInputNote('—')
    setTargetNote('—')
    teardownMic()
  }

  function startPitchLoop() {
    let smoothShift = 0
    function tick() {
      rafRef.current = requestAnimationFrame(tick)
      if (!paRef.current || !psRef.current) return
      const freq = detectPitch(paRef.current.getValue(), Tone.context.sampleRate)
      if (freq) {
        const inputMidi   = 69 + 12 * Math.log2(freq / 440)
        const snapped     = snapToScale(Math.round(inputMidi), rootRef.current, scaleRef.current)
        const snappedMidi = noteNameToMidi(snapped)
        const rawShift    = snappedMidi - inputMidi
        const targetShift = bypassRef.current ? 0 : rawShift * (strengthRef.current / 100)
        smoothShift       = smoothShift * 0.7 + targetShift * 0.3
        psRef.current.pitch = smoothShift
        setInputNote(freqToNoteName(freq))
        setTargetNote(bypassRef.current ? '—' : snapped)
      } else {
        smoothShift = smoothShift * 0.85
        psRef.current.pitch = smoothShift
      }
    }
    tick()
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
    <div className="flex flex-col h-full gap-4">

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-shrink-0">
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

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto min-h-0" style={{ WebkitOverflowScrolling: 'touch' }}>
        <div className="flex flex-col gap-4" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}>

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

          {/* Editable 16-step drum grid */}
          <div style={{ background: 'rgba(6,6,12,0.55)', borderRadius: 10, padding: '10px 12px', border: '1px solid rgba(46,46,74,0.4)', marginTop: 10 }}>
            {/* Playhead */}
            <div className="flex gap-px mb-1.5" style={{ paddingLeft: 38 }}>
              {Array.from({ length: STEPS }).map((_, s) => (
                <div key={s} className="flex-1" style={{
                  height: 3, borderRadius: 2,
                  background: isPlaying && s === currentStep ? 'rgba(192,132,252,0.9)' : 'transparent',
                  boxShadow: isPlaying && s === currentStep ? '0 0 6px rgba(192,132,252,0.8)' : 'none',
                  transition: 'background 0.04s',
                }} />
              ))}
            </div>
            {GRID_ROWS.map(row => (
              <div key={row} className="flex items-center gap-1.5 mb-1">
                <span style={{ width: 32, fontSize: '0.55rem', fontWeight: 700, color: ROW_COLORS[row], letterSpacing: '0.08em', flexShrink: 0 }}>
                  {ROW_LABELS[row]}
                </span>
                <div className="flex gap-px flex-1">
                  {drumGrid[row].map((on, s) => (
                    <button
                      key={s}
                      onClick={() => setDrumGrid(g => ({ ...g, [row]: g[row].map((v, i) => i === s ? !v : v) }))}
                      className="flex-1 rounded-sm transition-all"
                      style={{
                        height: 16,
                        background: on
                          ? ROW_COLORS[row]
                          : isPlaying && s === currentStep ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)',
                        boxShadow: on ? `0 0 5px ${ROW_COLORS[row]}80` : 'none',
                        border: s % 4 === 0
                          ? `1px solid ${on ? ROW_COLORS[row] + '80' : 'rgba(124,58,237,0.2)'}`
                          : `1px solid ${on ? ROW_COLORS[row] + '60' : 'rgba(255,255,255,0.04)'}`,
                        opacity: on ? 1 : 0.45,
                        cursor: 'pointer', padding: 0,
                      }}
                    />
                  ))}
                </div>
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
              <div className="flex gap-1.5 flex-wrap">
                {prog.chords.map((c, i) => {
                  const isActive = isPlaying && activeChord === i
                  return (
                    <span key={i} style={{
                      padding: '5px 12px', borderRadius: 8,
                      background: isActive ? 'rgba(6,182,212,0.25)' : 'rgba(6,182,212,0.1)',
                      border: isActive ? '1px solid rgba(6,182,212,0.6)' : '1px solid rgba(6,182,212,0.25)',
                      fontSize: '0.8rem', fontWeight: 800, fontFamily: 'monospace', color: isActive ? '#22d3ee' : '#67e8f9',
                      transition: 'all 0.1s ease',
                      transform: isActive ? 'scale(1.06)' : 'scale(1)',
                      boxShadow: isActive ? '0 0 12px rgba(6,182,212,0.4)' : 'none',
                    }}>
                      {c.label}
                    </span>
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
          boxShadow: micArmed ? '0 0 24px rgba(236,72,153,0.12), inset 0 1px 0 rgba(255,255,255,0.04)' : 'none',
        }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span style={sectionLabel}>Vocal + Autotune</span>
              {micArmed && (
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ background: '#ec4899', boxShadow: '0 0 6px #ec4899', animation: 'pulse 1s ease-in-out infinite' }} />
              )}
            </div>
            <button
              onClick={micArmed ? disarmMic : armMic}
              disabled={!micAllowed}
              className="flex items-center gap-2 rounded-xl font-bold transition-all"
              style={{
                padding: '8px 18px', fontSize: '0.75rem',
                background: micArmed ? 'linear-gradient(135deg, rgba(236,72,153,0.45), rgba(219,39,119,0.25))' : 'rgba(255,255,255,0.04)',
                border: micArmed ? '1px solid rgba(236,72,153,0.55)' : '1px solid rgba(255,255,255,0.1)',
                color: micArmed ? '#fbcfe8' : 'rgba(148,163,184,0.6)',
                cursor: micAllowed ? 'pointer' : 'not-allowed',
                opacity: micAllowed ? 1 : 0.4,
              }}>
              🎤 {micArmed ? 'Disarm Mic' : 'Arm Mic'}
            </button>
          </div>

          {!micAllowed && (
            <div className="rounded-xl" style={{ padding: '10px 14px', background: 'rgba(236,72,153,0.08)', border: '1px solid rgba(236,72,153,0.25)' }}>
              <p style={{ fontSize: '0.72rem', color: 'rgba(236,72,153,0.8)' }}>
                Mic access was denied. Enable microphone permission in your browser settings and reload.
              </p>
            </div>
          )}

          {micAllowed && !micArmed && (
            <p style={{ fontSize: '0.72rem', color: 'rgba(148,163,184,0.3)' }}>
              Arm the mic to sing with real-time autotune over your session. Use headphones to prevent feedback.
            </p>
          )}

          {micArmed && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2 rounded-lg" style={{ padding: '7px 12px', background: 'rgba(255,200,0,0.07)', border: '1px solid rgba(255,200,0,0.2)' }}>
                <span style={{ fontSize: 14 }}>🎧</span>
                <span style={{ fontSize: '0.67rem', color: 'rgba(253,224,71,0.7)' }}>Use headphones — speakers will cause feedback</span>
              </div>

              <div className="flex items-center gap-6 rounded-xl" style={{ padding: '14px 18px', background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(236,72,153,0.2)' }}>
                <div className="flex flex-col items-center gap-1">
                  <span style={{ fontSize: '0.55rem', letterSpacing: '0.14em', color: 'rgba(148,163,184,0.4)', textTransform: 'uppercase' }}>Singing</span>
                  <span style={{ fontSize: '1.8rem', fontWeight: 800, fontFamily: 'monospace', color: '#f9a8d4', lineHeight: 1, letterSpacing: '-0.03em' }}>
                    {inputNote}
                  </span>
                </div>
                <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, rgba(249,168,212,0.4), rgba(192,132,252,0.4))' }} />
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(192,132,252,0.5)" strokeWidth="2">
                  <polyline points="9,18 15,12 9,6"/>
                </svg>
                <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, rgba(192,132,252,0.4), rgba(168,85,247,0.4))' }} />
                <div className="flex flex-col items-center gap-1">
                  <span style={{ fontSize: '0.55rem', letterSpacing: '0.14em', color: 'rgba(148,163,184,0.4)', textTransform: 'uppercase' }}>Tuned</span>
                  <span style={{ fontSize: '1.8rem', fontWeight: 800, fontFamily: 'monospace', color: '#c084fc', lineHeight: 1, letterSpacing: '-0.03em' }}>
                    {targetNote}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(192,132,252,0.65)', textTransform: 'uppercase', flexShrink: 0, width: 60 }}>
                  Strength
                </span>
                <input
                  type="range" min={0} max={100} value={autotuneStrength}
                  onChange={e => setAutotuneStrength(Number(e.target.value))}
                  className="flex-1"
                  style={{ accentColor: '#a855f7', cursor: 'pointer' }}
                />
                <div className="flex items-baseline gap-1 flex-shrink-0" style={{ width: 72, justifyContent: 'flex-end' }}>
                  <span style={{ fontSize: '1.1rem', fontWeight: 800, fontFamily: 'monospace', color: '#c084fc' }}>
                    {autotuneStrength}
                  </span>
                  <span style={{ fontSize: '0.65rem', color: 'rgba(192,132,252,0.5)' }}>%</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span style={{ fontSize: '0.62rem', color: 'rgba(148,163,184,0.35)' }}>
                  {autotuneStrength < 35 ? 'natural — barely noticeable'
                    : autotuneStrength < 65 ? 'moderate — pitch polish'
                    : autotuneStrength < 90 ? 'strong — obvious correction'
                    : 'hard snap — T-Pain mode'}
                </span>
                <button
                  onClick={() => setBypass(b => !b)}
                  style={{ ...pill(bypass, 'pink'), padding: '5px 14px', fontSize: '0.65rem' }}>
                  {bypass ? 'Bypass: ON' : 'Bypass: OFF'}
                </button>
              </div>
            </div>
          )}
        </div>
        </div>
      </div>
    </div>
  )
}
