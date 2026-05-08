import { useEffect, useCallback, useState, useRef } from 'react'
import * as Tone from 'tone'
import { noteOn, noteOff } from '../audio/engine.js'

const KEY_LABEL = { "'": "'", ']': ']', 'Enter': '↵', ';': ';' }
function keyLabel(k) { return KEY_LABEL[k] ?? k }

function buildKeyMap(o) {
  return {
    'a': `C${o}`,   'w': `C#${o}`,  's': `D${o}`,   'e': `D#${o}`,  'd': `E${o}`,
    'f': `F${o}`,   't': `F#${o}`,  'g': `G${o}`,   'y': `G#${o}`,  'h': `A${o}`,
    'u': `A#${o}`,  'j': `B${o}`,
    'k': `C${o+1}`, 'o': `C#${o+1}`,'l': `D${o+1}`, 'p': `D#${o+1}`,';': `E${o+1}`,
    "'": `F${o+1}`, ']': `F#${o+1}`, 'Enter': `G${o+1}`,
  }
}

function buildNoteToKey(o) {
  const reverse = {}
  for (const [k, note] of Object.entries(buildKeyMap(o))) reverse[note] = k
  return reverse
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
  chordNotes = [],
  onNoteOn,
  onNoteOff,
  onOctaveUp,
  onOctaveDown,
  compact = false,
  clipEnd = null,
}) {
  const [activeNotes, setActiveNotes] = useState(new Set())
  const heldKeys = useRef(new Map()) // key → note
  const touchNoteRef = useRef(null)

  const activate = useCallback(async (note) => {
    setActiveNotes(prev => new Set([...prev, note]))
    // Await Tone.start() so the AudioContext is actually running before noteOn.
    // If context is already running this resolves in a microtask (~0 ms).
    // If interrupted (iOS), this properly waits for resume before playing.
    await Tone.start()
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

    const keyMap = buildKeyMap(octaveStart)

    const down = (e) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === 'Tab') { e.preventDefault(); onOctaveDown?.(); return }
      if (e.key === '\\') { onOctaveUp?.(); return }
      // Normalize to lowercase so Caps Lock being on doesn't break note keys
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key
      const note = keyMap[k]
      if (note && !heldKeys.current.has(k)) {
        heldKeys.current.set(k, note)
        activate(note)
      }
    }

    const up = (e) => {
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key
      const note = heldKeys.current.get(k)
      if (note) {
        heldKeys.current.delete(k)
        deactivate(note)
      }
    }

    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [keyboardMode, octaveStart, activate, deactivate, onOctaveUp, onOctaveDown])

  function noteFromPoint(x, y) {
    const el = document.elementFromPoint(x, y)
    return el?.closest('[data-note]')?.dataset.note ?? null
  }

  function handleTouchStart(e) {
    e.preventDefault()
    const note = noteFromPoint(e.touches[0].clientX, e.touches[0].clientY)
    if (note) { touchNoteRef.current = note; activate(note) }
  }

  function handleTouchMove(e) {
    e.preventDefault()
    const note = noteFromPoint(e.touches[0].clientX, e.touches[0].clientY)
    if (note && note !== touchNoteRef.current) {
      if (touchNoteRef.current) deactivate(touchNoteRef.current)
      touchNoteRef.current = note
      activate(note)
    }
  }

  function handleTouchEnd(e) {
    e.preventDefault()
    if (touchNoteRef.current) {
      deactivate(touchNoteRef.current)
      touchNoteRef.current = null
    }
  }

  const { whites, blacks } = buildKeys(octaveStart, numOctaves)
  const noteToKey = keyboardMode && !compact ? buildNoteToKey(octaveStart) : {}

  // Compact: 14 white keys × 25 px = 350 px — fits a 393 px iPhone (minus 16 px padding each side)
  const WHITE_W = compact ? 25 : 42
  const WHITE_H = compact ? 90 : 140
  const BLACK_W = compact ? 15 : 26
  const BLACK_H = compact ? 55 : 88
  const totalW = whites.length * WHITE_W

  return (
    <div className="flex flex-col items-center gap-2">
      {keyboardMode && !compact && (
        <div className="flex items-center gap-2 text-xs" style={{ color: 'rgba(168,85,247,0.7)' }}>
          <span className="w-1.5 h-1.5 rounded-full inline-block flex-shrink-0"
            style={{ background: '#a855f7', boxShadow: '0 0 6px #a855f7' }} />
          [A–↵] naturals · [W/E/T/Y/U/O/P/]] sharps · Tab ↓ oct · \ ↑ oct
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
          touchAction: 'none',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {whites.map(({ note, whiteIdx }) => {
          const isActive = activeNotes.has(note)
          const isChordNote = chordNotes.includes(note)
          const isHighlighted = highlightNotes.includes(note)
          const outlineStyle = isActive ? undefined
            : isChordNote ? '2px solid rgba(6,182,212,1)'
            : isHighlighted ? '2px solid rgba(6,182,212,0.4)'
            : undefined
          const bgOverlay = !isActive && isChordNote ? 'rgba(6,182,212,0.12)' : undefined
          return (
            <div
              key={note}
              data-note={note}
              className={`key-white ${isActive ? 'active' : ''}`}
              style={{
                position: 'absolute',
                left: whiteIdx * WHITE_W + 1,
                top: 0,
                width: WHITE_W - 2,
                height: WHITE_H - 10,
                outline: outlineStyle,
                background: bgOverlay,
              }}
              onMouseDown={() => activate(note)}
              onMouseUp={() => deactivate(note)}
              onMouseLeave={() => { if (activeNotes.has(note)) deactivate(note) }}
            >
              {!compact && noteToKey[note] && !isActive && (
                <span className="absolute left-0 right-0 text-center font-mono"
                  style={{ bottom: 22, fontSize: 9, color: 'rgba(148,163,184,0.75)', lineHeight: 1 }}>
                  {keyLabel(noteToKey[note])}
                </span>
              )}
              <span className="absolute bottom-2 left-0 right-0 text-center font-mono"
                style={{
                  fontSize: 9,
                  color: isActive ? 'rgba(255,255,255,0.85)' : 'rgba(71,85,105,0.7)',
                  lineHeight: 1,
                }}>
                {note.replace(/\d/, '')}
              </span>
            </div>
          )
        })}

        {blacks.map(({ note, afterWhite }) => {
          const isActive = activeNotes.has(note)
          const isChordNote = chordNotes.includes(note)
          const isHighlighted = highlightNotes.includes(note)
          const blackOutline = isActive ? undefined
            : isChordNote ? '2px solid rgba(6,182,212,1)'
            : isHighlighted ? '2px solid rgba(6,182,212,0.4)'
            : undefined
          return (
            <div
              key={note}
              data-note={note}
              className={`key-black ${isActive ? 'active' : ''}`}
              style={{
                position: 'absolute',
                left: afterWhite * WHITE_W + WHITE_W - BLACK_W / 2 + 1,
                top: 0,
                width: BLACK_W,
                height: BLACK_H,
                outline: blackOutline,
                boxShadow: isChordNote && !isActive ? '0 0 8px rgba(6,182,212,0.5)' : undefined,
              }}
              onMouseDown={(e) => { e.stopPropagation(); activate(note) }}
              onMouseUp={(e) => { e.stopPropagation(); deactivate(note) }}
              onMouseLeave={() => { if (activeNotes.has(note)) deactivate(note) }}
            >
              {!compact && noteToKey[note] && !isActive && (
                <span className="absolute bottom-3 left-0 right-0 text-center font-mono"
                  style={{ fontSize: 8, color: 'rgba(148,163,184,0.6)', lineHeight: 1 }}>
                  {keyLabel(noteToKey[note])}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
