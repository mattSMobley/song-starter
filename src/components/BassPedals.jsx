import { useEffect, useState, useCallback, useRef } from 'react'
import * as Tone from 'tone'
import { noteOn, noteOff } from '../audio/engine.js'

const BASS_MAP = [
  { key: 'z', natural: 'C' },
  { key: 'x', natural: 'D' },
  { key: 'c', natural: 'E' },
  { key: 'v', natural: 'F' },
  { key: 'b', natural: 'G' },
  { key: 'n', natural: 'A' },
  { key: 'm', natural: 'B' },
]

export default function BassPedals({
  octave,
  keyboardMode = true,
  highlightNotes = [],
  chordNotes = [],
  onNoteOn,
  onNoteOff,
}) {
  const [activeNotes, setActiveNotes] = useState(new Set())
  const heldKeys = useRef(new Set())

  const activate = useCallback((note) => {
    Tone.start()
    setActiveNotes(prev => new Set([...prev, note]))
    noteOn(note)
    onNoteOn?.(note)
  }, [onNoteOn])

  const deactivate = useCallback((note) => {
    setActiveNotes(prev => { const s = new Set(prev); s.delete(note); return s })
    noteOff(note)
    onNoteOff?.(note)
  }, [onNoteOff])

  useEffect(() => {
    if (!keyboardMode) return
    heldKeys.current.clear()
    setActiveNotes(new Set())

    const keyNoteMap = Object.fromEntries(
      BASS_MAP.map(({ key, natural }) => [key, `${natural}${octave}`])
    )

    const down = (e) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return
      const note = keyNoteMap[e.key]
      if (note && !heldKeys.current.has(e.key)) {
        heldKeys.current.add(e.key)
        activate(note)
      }
    }
    const up = (e) => {
      const note = keyNoteMap[e.key]
      if (note) {
        heldKeys.current.delete(e.key)
        deactivate(note)
      }
    }

    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [keyboardMode, octave, activate, deactivate])

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div style={{
        fontSize: '0.6rem',
        letterSpacing: '0.12em',
        color: 'rgba(168,85,247,0.35)',
        textTransform: 'uppercase',
        fontWeight: 700,
      }}>
        Bass Pedals [Z–M] · oct {octave}
      </div>
      <div className="flex gap-1.5">
        {BASS_MAP.map(({ key, natural }) => {
          const note = `${natural}${octave}`
          const isActive = activeNotes.has(note)
          const isChordNote = chordNotes.includes(note)
          const isHighlighted = highlightNotes.includes(note)
          return (
            <button
              key={key}
              data-note={note}
              onMouseDown={() => activate(note)}
              onMouseUp={() => deactivate(note)}
              onMouseLeave={() => { if (activeNotes.has(note)) deactivate(note) }}
              style={{
                width: 44,
                height: 32,
                borderRadius: 6,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
                background: isActive
                  ? 'linear-gradient(135deg, rgba(124,58,237,0.7), rgba(109,40,217,0.5))'
                  : isChordNote
                  ? 'rgba(6,182,212,0.1)'
                  : 'rgba(255,255,255,0.03)',
                border: isActive
                  ? '1px solid rgba(168,85,247,0.9)'
                  : isChordNote
                  ? '1px solid rgba(6,182,212,0.7)'
                  : isHighlighted
                  ? '1px solid rgba(6,182,212,0.3)'
                  : '1px solid rgba(255,255,255,0.07)',
                boxShadow: isActive
                  ? '0 0 14px rgba(124,58,237,0.6), inset 0 1px 0 rgba(255,255,255,0.15)'
                  : isChordNote
                  ? '0 0 8px rgba(6,182,212,0.3)'
                  : 'none',
                cursor: 'pointer',
                transition: 'all 0.06s ease',
              }}
            >
              <span style={{
                fontSize: 11,
                fontWeight: 800,
                fontFamily: 'monospace',
                color: isActive ? '#fff' : isChordNote ? '#22d3ee' : 'rgba(148,163,184,0.6)',
                lineHeight: 1,
              }}>
                {natural}
              </span>
              <span style={{
                fontSize: 8,
                color: isActive ? 'rgba(255,255,255,0.5)' : 'rgba(71,85,105,0.45)',
                fontFamily: 'monospace',
              }}>
                {key}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
