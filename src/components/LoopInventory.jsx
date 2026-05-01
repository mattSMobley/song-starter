import { useState } from 'react'
import * as Tone from 'tone'
import { playNote } from '../audio/engine.js'
import { exportMidi } from '../audio/midiExport.js'

const NOTE_COLORS = [
  '#7c3aed','#a855f7','#06b6d4','#22d3ee','#ec4899',
  '#f472b6','#f59e0b','#34d399','#60a5fa',
]

function loadStarred() {
  try { return new Set(JSON.parse(localStorage.getItem('starredLoops') || '[]')) }
  catch { return new Set() }
}

function saveStarred(set) {
  try { localStorage.setItem('starredLoops', JSON.stringify([...set])) } catch {}
}

export default function LoopInventory({ loops, onDelete, bpm }) {
  const [playingId, setPlayingId] = useState(null)
  const [partRef, setPartRef] = useState(null)
  const [starred, setStarred] = useState(loadStarred)

  function toggleStar(id) {
    setStarred(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      saveStarred(next)
      return next
    })
  }

  async function togglePlay(loop) {
    await Tone.start()
    if (playingId === loop.id) { stopLoop(); return }
    if (partRef) { partRef.dispose(); Tone.getTransport().stop() }

    setPlayingId(loop.id)
    Tone.getTransport().bpm.value = bpm

    const part = new Tone.Part((time, event) => {
      playNote(event.note, event.dur + 'n')
    }, loop.melody.events.map(e => ({
      time: e.beat * (60 / bpm),
      note: e.note,
      dur: Math.round(1 / e.duration),
    })))

    const totalTime = loop.melody.events.reduce((s, e) => Math.max(s, e.beat + e.duration), 0) * (60 / bpm)
    part.start(0)
    setPartRef(part)
    Tone.getTransport().start()
    setTimeout(() => stopLoop(), (totalTime + 0.3) * 1000)
  }

  function stopLoop() {
    setPlayingId(null)
    if (partRef) { partRef.dispose(); setPartRef(null) }
    Tone.getTransport().stop()
    Tone.getTransport().position = 0
  }

  if (loops.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 py-12"
        style={{ color: 'rgba(71,85,105,0.7)' }}>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" opacity={0.3}>
          <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
        </svg>
        <p className="text-sm">No saved loops yet</p>
        <p className="text-xs opacity-60">Hit the save icon on any melody to add it here</p>
      </div>
    )
  }

  // Starred loops float to top
  const sorted = [...loops].sort((a, b) => {
    const aS = starred.has(a.id) ? 0 : 1
    const bS = starred.has(b.id) ? 0 : 1
    return aS - bS
  })

  return (
    <div className="flex flex-col gap-2 overflow-y-auto" style={{ maxHeight: 400 }}>
      {sorted.map((loop) => {
        const isPlaying = playingId === loop.id
        const isStarred = starred.has(loop.id)
        const totalBeats = loop.melody.events.reduce((s, e) => Math.max(s, e.beat + e.duration), 0)
        return (
          <div
            key={loop.id}
            className="rounded-lg p-3 flex items-center gap-3 group transition-all"
            style={{
              background: isPlaying
                ? 'linear-gradient(90deg, rgba(124,58,237,0.15), rgba(6,182,212,0.08))'
                : isStarred
                ? 'rgba(245,158,11,0.06)'
                : 'rgba(20,20,31,0.8)',
              border: isPlaying
                ? '1px solid rgba(124,58,237,0.5)'
                : isStarred
                ? '1px solid rgba(245,158,11,0.25)'
                : '1px solid rgba(46,46,74,0.6)',
              boxShadow: isPlaying ? '0 0 12px rgba(124,58,237,0.2)' : 'none',
            }}
          >
            {/* Star */}
            <button
              onClick={() => toggleStar(loop.id)}
              className="flex-shrink-0 transition-all"
              style={{ color: isStarred ? '#f59e0b' : 'rgba(148,163,184,0.2)', padding: '2px' }}
              title={isStarred ? 'Unstar' : 'Star'}
            >
              <svg width="13" height="13" viewBox="0 0 24 24"
                fill={isStarred ? 'currentColor' : 'none'}
                stroke="currentColor" strokeWidth="2">
                <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
              </svg>
            </button>

            {/* Play button */}
            <button
              onClick={() => togglePlay(loop)}
              className="flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0 transition-all"
              style={{
                background: isPlaying ? 'rgba(124,58,237,0.4)' : 'rgba(124,58,237,0.15)',
                border: '1px solid rgba(124,58,237,0.4)',
                color: '#a855f7',
                boxShadow: isPlaying ? '0 0 10px rgba(124,58,237,0.4)' : 'none',
              }}
            >
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

            {/* Mini piano roll */}
            <div className="flex-1 relative rounded overflow-hidden"
              style={{ height: 32, background: 'rgba(6,6,12,0.6)', border: '1px solid rgba(46,46,74,0.4)' }}>
              {loop.melody.events.map((event, i) => {
                const noteIdx = loop.melody.scale?.indexOf(event.note) ?? i
                const noteRatio = loop.melody.scale?.length > 1 ? noteIdx / (loop.melody.scale.length - 1) : 0.5
                const y = (1 - noteRatio) * 24 + 2
                return (
                  <div key={i} className="absolute rounded-sm"
                    style={{
                      left: `${(event.beat / totalBeats) * 100}%`,
                      width: `${(event.duration / totalBeats) * 100 - 0.5}%`,
                      top: y, height: 6,
                      background: NOTE_COLORS[noteIdx % NOTE_COLORS.length],
                      opacity: 0.75,
                    }}
                  />
                )
              })}
            </div>

            {/* Info */}
            <div className="flex flex-col min-w-0" style={{ width: 80 }}>
              <span className="text-xs font-mono truncate" style={{ color: '#a855f7' }}>
                {loop.root} {loop.scale}
              </span>
              <span className="text-xs" style={{ color: 'rgba(71,85,105,0.8)', fontSize: 10 }}>
                {loop.melody.events.length} notes · {loop.melody.bars}bar
              </span>
            </div>

            {/* MIDI export */}
            <button
              onClick={() => exportMidi(loop.melody, bpm, `loop-${loop.root}-${loop.scale}.mid`)}
              className="p-1.5 rounded transition-all opacity-0 group-hover:opacity-100"
              style={{ color: 'rgba(168,85,247,0.6)', background: 'rgba(168,85,247,0.1)' }}
              title="Export MIDI"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                <polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
            </button>

            {/* Delete */}
            <button
              onClick={() => onDelete(loop.id)}
              className="p-1.5 rounded transition-all opacity-0 group-hover:opacity-100"
              style={{ color: 'rgba(236,72,153,0.6)', background: 'rgba(236,72,153,0.1)' }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3,6 5,6 21,6"/>
                <path d="M19,6l-1,14a2,2,0,01-2,2H8a2,2,0,01-2-2L5,6"/>
                <path d="M10,11v6M14,11v6"/>
              </svg>
            </button>
          </div>
        )
      })}
    </div>
  )
}
