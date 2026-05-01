import { useState, useRef, useEffect } from 'react'
import * as Tone from 'tone'
import { playNote, playNoteAt } from '../audio/engine.js'
import { getProgressions } from '../audio/chordProgressions.js'

const BEATS_OPTIONS = [1, 2, 4]

export default function ChordProgressionPanel({ root, scale, bpm }) {
  const [beatsPerChord, setBeatsPerChord] = useState(2)
  const [playingIdx, setPlayingIdx] = useState(-1)
  const [activeChord, setActiveChord] = useState(-1)
  const partRef = useRef(null)
  const playingIdxRef = useRef(-1)

  // Recompute every render (root/scale/bpm may change)
  const progressions = getProgressions(root, scale)

  // Stop playback when root or scale changes
  useEffect(() => { stopAll() }, [root, scale])
  useEffect(() => () => stopAll(), [])

  function stopAll() {
    playingIdxRef.current = -1
    setPlayingIdx(-1)
    setActiveChord(-1)
    if (partRef.current) { partRef.current.dispose(); partRef.current = null }
    Tone.getTransport().stop()
    Tone.getTransport().position = 0
  }

  async function toggleProgression(idx) {
    if (playingIdxRef.current === idx) return stopAll()
    await Tone.start()
    stopAll()

    playingIdxRef.current = idx
    setPlayingIdx(idx)

    const prog = progressions[idx]
    const secPerBeat = 60 / bpm
    const chordSec = beatsPerChord * secPerBeat
    const chordDur = chordSec * 0.88  // slight gate between chords
    const totalSec = prog.chords.length * chordSec

    Tone.getTransport().bpm.value = bpm

    const events = prog.chords.map((chord, i) => ({
      time:     i * chordSec,
      chord,
      chordIdx: i,
    }))

    const part = new Tone.Part((time, ev) => {
      ev.chord.notes.forEach(note => playNoteAt(note, chordDur, time))
      Tone.getDraw().schedule(() => setActiveChord(ev.chordIdx), time)
    }, events)

    part.loop    = true
    part.loopEnd = totalSec
    part.start('+0.05')
    partRef.current = part
    Tone.getTransport().start()
  }

  function auditChord(chord) {
    Tone.start().then(() => {
      chord.notes.forEach(note => playNote(note, '1n'))
    })
  }

  const S = {
    pill: (on) => ({
      padding: '6px 14px',
      borderRadius: 10,
      fontSize: '0.72rem',
      fontWeight: 700,
      background: on
        ? 'linear-gradient(135deg, rgba(124,58,237,0.55), rgba(109,40,217,0.35))'
        : 'rgba(255,255,255,0.03)',
      border: on ? '1px solid rgba(168,85,247,0.6)' : '1px solid rgba(255,255,255,0.08)',
      color: on ? '#f0e0ff' : 'rgba(148,163,184,0.55)',
      cursor: 'pointer',
      boxShadow: on ? '0 0 12px rgba(124,58,237,0.4)' : 'none',
      textShadow: on ? '0 0 10px rgba(168,85,247,0.8)' : 'none',
      transition: 'all 0.12s ease',
    }),
  }

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="font-bold" style={{ color: '#e2e8f0', fontSize: '0.9rem', letterSpacing: '-0.01em' }}>
            Chord Progressions
          </h2>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(148,163,184,0.45)' }}>
            <span style={{ color: '#c084fc' }}>{root}</span>
            {' '}<span style={{ color: '#22d3ee' }}>{scale}</span>
            {' '}· click a chord to audition, ▶ to loop
          </p>
        </div>
        {/* Beats-per-chord control */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.15em', color: 'rgba(168,85,247,0.55)', textTransform: 'uppercase' }}>
            Beats / chord
          </span>
          <div className="flex gap-1">
            {BEATS_OPTIONS.map(b => (
              <button key={b} onClick={() => setBeatsPerChord(b)}
                className="rounded-lg font-bold font-mono transition-all"
                style={S.pill(beatsPerChord === b)}>
                {b}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Cards grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-2 gap-4 pb-4" style={{ gridAutoRows: 'min-content' }}>
          {progressions.map((prog, pi) => {
            const isPlaying = playingIdx === pi
            return (
              <div key={pi}
                className="rounded-2xl flex flex-col gap-3"
                style={{
                  padding: '18px 20px',
                  background: isPlaying
                    ? 'linear-gradient(135deg, rgba(124,58,237,0.2) 0%, rgba(6,182,212,0.1) 100%)'
                    : 'linear-gradient(135deg, rgba(18,12,34,0.95) 0%, rgba(10,8,22,0.95) 100%)',
                  border: isPlaying
                    ? '1px solid rgba(124,58,237,0.55)'
                    : '1px solid rgba(46,46,74,0.65)',
                  boxShadow: isPlaying
                    ? '0 0 28px rgba(124,58,237,0.3), inset 0 0 20px rgba(124,58,237,0.05)'
                    : '0 4px 20px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.04)',
                  transition: 'all 0.2s ease',
                }}>

                {/* Card header */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold" style={{ color: isPlaying ? '#e9d5ff' : '#cbd5e1', fontSize: '0.82rem', letterSpacing: '-0.01em' }}>
                      {prog.name}
                    </div>
                    <div style={{ fontSize: '0.62rem', color: 'rgba(148,163,184,0.4)', letterSpacing: '0.06em', marginTop: 2 }}>
                      {prog.tag}
                    </div>
                  </div>
                  {/* Play button */}
                  <button
                    onClick={() => toggleProgression(pi)}
                    className="flex items-center justify-center rounded-full transition-all flex-shrink-0"
                    style={{
                      width: 36, height: 36,
                      background: isPlaying ? 'rgba(124,58,237,0.55)' : 'rgba(124,58,237,0.18)',
                      border: '1px solid rgba(168,85,247,0.5)',
                      color: '#e0aaff',
                      boxShadow: isPlaying ? '0 0 18px rgba(124,58,237,0.6)' : '0 0 8px rgba(124,58,237,0.12)',
                    }}>
                    {isPlaying ? (
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor">
                        <rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>
                      </svg>
                    ) : (
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor">
                        <polygon points="5,3 19,12 5,21"/>
                      </svg>
                    )}
                  </button>
                </div>

                {/* Chord pills */}
                <div className="flex flex-wrap gap-2">
                  {prog.chords.map((chord, ci) => {
                    const isActive = isPlaying && activeChord === ci
                    return (
                      <button
                        key={ci}
                        onClick={() => auditChord(chord)}
                        className="flex flex-col items-center rounded-xl transition-all group/chord"
                        title={`Play ${chord.label}`}
                        style={{
                          padding: '10px 14px',
                          background: isActive
                            ? 'linear-gradient(135deg, rgba(124,58,237,0.55), rgba(6,182,212,0.25))'
                            : 'rgba(255,255,255,0.04)',
                          border: isActive
                            ? '1px solid rgba(168,85,247,0.7)'
                            : '1px solid rgba(255,255,255,0.08)',
                          boxShadow: isActive
                            ? '0 0 20px rgba(124,58,237,0.45), inset 0 1px 0 rgba(255,255,255,0.1)'
                            : 'none',
                          cursor: 'pointer',
                          transform: isActive ? 'scale(1.05)' : 'scale(1)',
                          transition: 'all 0.1s ease',
                          minWidth: 52,
                        }}>
                        <span style={{
                          fontSize: '0.88rem',
                          fontWeight: 800,
                          fontFamily: 'monospace',
                          letterSpacing: '-0.02em',
                          color: isActive ? '#f0e6ff' : '#94a3b8',
                          textShadow: isActive ? '0 0 16px rgba(168,85,247,0.8)' : 'none',
                          lineHeight: 1.2,
                        }}>
                          {chord.label}
                        </span>
                        <span style={{
                          fontSize: '0.58rem',
                          fontWeight: 600,
                          letterSpacing: '0.06em',
                          color: isActive ? 'rgba(167,139,250,0.85)' : 'rgba(71,85,105,0.7)',
                          marginTop: 3,
                        }}>
                          {chord.numeral}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
