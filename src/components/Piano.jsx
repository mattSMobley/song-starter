import { useEffect, useCallback, useState } from 'react'
import { noteOn, noteOff } from '../audio/engine.js'

const KEY_MAP = {
  'a': 'C4',  'w': 'C#4', 's': 'D4',  'e': 'D#4', 'd': 'E4',
  'f': 'F4',  't': 'F#4', 'g': 'G4',  'y': 'G#4', 'h': 'A4',
  'u': 'A#4', 'j': 'B4',
  'k': 'C5',  'o': 'C#5', 'l': 'D5',  'p': 'D#5', ';': 'E5',
  "'": 'F5',
}

const WHITE_NOTES = ['C','D','E','F','G','A','B']

function buildKeys(octaveStart, numOctaves) {
  const whites = []
  const blacks = []
  let whiteIdx = 0
  for (let oct = octaveStart; oct < octaveStart + numOctaves; oct++) {
    for (const name of WHITE_NOTES) {
      whites.push({ note: `${name}${oct}`, whiteIdx })
      if (['C','D','F','G','A'].includes(name)) {
        blacks.push({ note: `${name}#${oct}`, afterWhite: whiteIdx })
      }
      whiteIdx++
    }
  }
  return { whites, blacks }
}

export default function Piano({
  octaveStart = 4,
  numOctaves = 2,
  keyboardMode = true,
  highlightNotes = [],
  onNoteOn,
  onNoteOff,
}) {
  const [activeNotes, setActiveNotes] = useState(new Set())
  const heldKeys = new Set()

  const activate = useCallback((note) => {
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
    const down = (e) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return
      const note = KEY_MAP[e.key]
      if (note && !heldKeys.has(e.key)) {
        heldKeys.add(e.key)
        activate(note)
      }
    }
    const up = (e) => {
      const note = KEY_MAP[e.key]
      if (note) {
        heldKeys.delete(e.key)
        deactivate(note)
      }
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [keyboardMode, activate, deactivate])

  const { whites, blacks } = buildKeys(octaveStart, numOctaves)
  const WHITE_W = 42
  const WHITE_H = 150
  const BLACK_W = 26
  const BLACK_H = 94
  const totalW = whites.length * WHITE_W

  return (
    <div className="flex flex-col items-center gap-2">
      {keyboardMode && (
        <div className="flex items-center gap-2 text-xs"
          style={{ color: 'rgba(168,85,247,0.7)' }}>
          <span className="w-1.5 h-1.5 rounded-full inline-block"
            style={{ background: '#a855f7', boxShadow: '0 0 6px #a855f7' }} />
          Keyboard active — [A–;] play notes
        </div>
      )}
      <div
        className="relative rounded-xl overflow-hidden"
        style={{
          width: totalW,
          height: WHITE_H,
          background: 'linear-gradient(180deg, #0d0d1a 0%, #060610 100%)',
          border: '2px solid rgba(124,58,237,0.25)',
          boxShadow: '0 8px 40px rgba(0,0,0,0.6), 0 0 30px rgba(124,58,237,0.08)',
          padding: '10px 0 0',
        }}
      >
        {whites.map(({ note, whiteIdx }) => {
          const isActive = activeNotes.has(note)
          const isHighlighted = highlightNotes.includes(note)
          return (
            <div
              key={note}
              className={`key-white ${isActive ? 'active' : ''}`}
              style={{
                position: 'absolute',
                left: whiteIdx * WHITE_W + 1,
                top: 0,
                width: WHITE_W - 2,
                height: WHITE_H - 10,
                outline: isHighlighted && !isActive ? '2px solid rgba(6,182,212,0.6)' : undefined,
              }}
              onMouseDown={() => activate(note)}
              onMouseUp={() => deactivate(note)}
              onMouseLeave={() => { if (activeNotes.has(note)) deactivate(note) }}
              onTouchStart={(e) => { e.preventDefault(); activate(note) }}
              onTouchEnd={(e) => { e.preventDefault(); deactivate(note) }}
            >
              <span className="absolute bottom-2 left-0 right-0 text-center font-mono"
                style={{
                  color: isActive ? 'rgba(255,255,255,0.85)' : 'rgba(71,85,105,0.7)',
                  fontSize: 9,
                }}>
                {note.replace(/\d/, '')}
              </span>
            </div>
          )
        })}

        {blacks.map(({ note, afterWhite }) => {
          const isActive = activeNotes.has(note)
          return (
            <div
              key={note}
              className={`key-black ${isActive ? 'active' : ''}`}
              style={{
                position: 'absolute',
                left: afterWhite * WHITE_W + WHITE_W - BLACK_W / 2 + 1,
                top: 0,
                width: BLACK_W,
                height: BLACK_H,
              }}
              onMouseDown={(e) => { e.stopPropagation(); activate(note) }}
              onMouseUp={(e) => { e.stopPropagation(); deactivate(note) }}
              onMouseLeave={() => { if (activeNotes.has(note)) deactivate(note) }}
              onTouchStart={(e) => { e.preventDefault(); e.stopPropagation(); activate(note) }}
              onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); deactivate(note) }}
            />
          )
        })}
      </div>
    </div>
  )
}
