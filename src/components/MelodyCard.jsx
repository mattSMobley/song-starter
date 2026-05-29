import { useState, useRef } from 'react'
import * as Tone from 'tone'
import { playNote } from '../audio/engine.js'
import { exportMidi } from '../audio/midiExport.js'
import { exportMelodyWav } from '../audio/wavExport.js'

const isTouchDevice = () => window.matchMedia('(hover: none)').matches

const NOTE_COLORS = [
  '#7c3aed','#a855f7','#06b6d4','#22d3ee','#ec4899',
  '#f472b6','#f59e0b','#34d399','#60a5fa','#f87171',
]

export default function MelodyCard({ melody, index, bpm, onSave, onPlay, isPlaying }) {
  const [activeStep, setActiveStep] = useState(-1)
  const [playing, setPlaying] = useState(false)
  const [loopMode, setLoopMode] = useState(false)
  const sequenceRef = useRef(null)
  const loopRef = useRef(false)
  const timeoutRef = useRef(null)

  const totalBeats = melody.events.reduce((s, e) => Math.max(s, e.beat + e.duration), 0)
  const totalTime = totalBeats * (60 / bpm)

  async function togglePlay() {
    if (playing) return stopMelody()
    await Tone.start()
    startMelody()
  }

  function startMelody() {
    if (sequenceRef.current) sequenceRef.current.dispose()
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setPlaying(true)
    Tone.getTransport().bpm.value = bpm

    const part = new Tone.Part((time, event) => {
      playNote(event.note, event.dur + 'n')
      Tone.getDraw().schedule(() => setActiveStep(event.idx), time)
    }, melody.events.map((e, idx) => ({
      time: e.beat * (60 / bpm),
      note: e.note,
      dur: Math.round(1 / e.duration),
      idx,
    })))

    part.start(0)
    sequenceRef.current = part
    Tone.getTransport().start()

    timeoutRef.current = setTimeout(() => {
      if (loopRef.current) {
        // restart for loop
        if (sequenceRef.current) { sequenceRef.current.dispose(); sequenceRef.current = null }
        Tone.getTransport().stop()
        Tone.getTransport().position = 0
        startMelody()
      } else {
        stopMelody()
      }
    }, (totalTime + 0.15) * 1000)

    if (onPlay) onPlay(melody)
  }

  function stopMelody() {
    setPlaying(false)
    setActiveStep(-1)
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null }
    if (sequenceRef.current) { sequenceRef.current.dispose(); sequenceRef.current = null }
    Tone.getTransport().stop()
    Tone.getTransport().position = 0
  }

  function toggleLoop() {
    const next = !loopMode
    setLoopMode(next)
    loopRef.current = next
  }

  function handleMidi() {
    exportMidi(melody, bpm, `melody-${index + 1}.mid`)
  }

  function handleWav() {
    exportMelodyWav(melody, bpm, `melody-${index + 1}.wav`)
  }

  const touch = isTouchDevice()

  return (
    <div
      className="rounded-2xl animate-slide-in cursor-pointer group"
      style={{
        padding: '20px',
        gap: 16,
        display: 'flex',
        flexDirection: 'column',
        background: playing
          ? 'linear-gradient(135deg, rgba(124,58,237,0.22) 0%, rgba(6,182,212,0.12) 100%)'
          : 'linear-gradient(135deg, rgba(18,12,34,0.95) 0%, rgba(10,8,22,0.95) 100%)',
        border: playing
          ? '1px solid rgba(124,58,237,0.65)'
          : '1px solid rgba(46,46,74,0.7)',
        boxShadow: playing
          ? '0 0 28px rgba(124,58,237,0.4), inset 0 0 28px rgba(124,58,237,0.06), 0 4px 24px rgba(0,0,0,0.5)'
          : '0 4px 24px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)',
        transition: 'all 0.2s ease',
        animationDelay: `${index * 60}ms`,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-mono rounded-lg"
            style={{ padding: '5px 10px', fontSize: '0.72rem', fontWeight: 700, background: 'rgba(124,58,237,0.22)', color: '#c084fc', border: '1px solid rgba(124,58,237,0.4)', boxShadow: '0 0 10px rgba(124,58,237,0.2)' }}>
            #{index + 1}
          </span>
          <span className="text-xs" style={{ color: 'rgba(148,163,184,0.7)' }}>
            {melody.events.length} notes · {melody.bars}bar
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {/* Save — always visible on touch, hover on desktop */}
          <button
            onClick={() => onSave && onSave(melody)}
            className={`rounded-lg text-xs transition-all ${touch ? '' : 'opacity-0 group-hover:opacity-100'}`}
            style={{ padding: '7px 9px', background: 'rgba(6,182,212,0.18)', color: '#22d3ee', border: '1px solid rgba(6,182,212,0.35)', boxShadow: '0 0 10px rgba(6,182,212,0.12)' }}
            title="Save to inventory"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
              <polyline points="17,21 17,13 7,13 7,21"/><polyline points="7,3 7,8 15,8"/>
            </svg>
          </button>

          {/* MIDI export — always visible, hero action */}
          <button
            onClick={handleMidi}
            className="rounded-lg text-xs transition-all flex items-center gap-1"
            style={{ padding: '7px 9px', background: 'rgba(168,85,247,0.2)', color: '#c084fc', border: '1px solid rgba(168,85,247,0.4)', boxShadow: '0 0 10px rgba(168,85,247,0.15)' }}
            title="Export MIDI"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
              <polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            <span style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.06em' }}>MIDI</span>
          </button>

          {/* WAV export */}
          <button
            onClick={handleWav}
            className={`rounded-lg text-xs transition-all ${touch ? '' : 'opacity-0 group-hover:opacity-100'}`}
            style={{ padding: '7px 9px', background: 'rgba(34,211,238,0.12)', color: '#22d3ee', border: '1px solid rgba(34,211,238,0.3)' }}
            title="Export WAV"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
              <polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
          </button>

          {/* Loop toggle */}
          <button
            onClick={toggleLoop}
            className="rounded-lg text-xs transition-all"
            style={{
              padding: '7px 9px',
              background: loopMode ? 'rgba(34,211,238,0.2)' : 'rgba(255,255,255,0.03)',
              color: loopMode ? '#22d3ee' : 'rgba(148,163,184,0.3)',
              border: loopMode ? '1px solid rgba(34,211,238,0.45)' : '1px solid rgba(255,255,255,0.06)',
              boxShadow: loopMode ? '0 0 10px rgba(34,211,238,0.2)' : 'none',
            }}
            title="Loop"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="17,1 21,5 17,9"/>
              <path d="M3 11V9a4 4 0 014-4h14"/>
              <polyline points="7,23 3,19 7,15"/>
              <path d="M21 13v2a4 4 0 01-4 4H3"/>
            </svg>
          </button>

          {/* Play */}
          <button
            onClick={togglePlay}
            className="flex items-center justify-center rounded-full transition-all"
            style={{
              width: 40, height: 40,
              background: playing ? 'rgba(124,58,237,0.55)' : 'rgba(124,58,237,0.2)',
              border: '1px solid rgba(168,85,247,0.55)',
              color: '#e0aaff',
              boxShadow: playing ? '0 0 18px rgba(124,58,237,0.6)' : '0 0 8px rgba(124,58,237,0.15)',
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
      </div>

      {/* Piano roll mini */}
      <div className="relative rounded-lg overflow-hidden"
        style={{ height: 70, background: 'rgba(6,6,12,0.8)', border: '1px solid rgba(46,46,74,0.5)' }}>
        {melody.events.map((event, i) => {
          const noteIdx = melody.scale.indexOf(event.note)
          const noteRatio = melody.scale.length > 1 ? noteIdx / (melody.scale.length - 1) : 0.5
          const y = (1 - noteRatio) * 54 + 5
          const color = NOTE_COLORS[noteIdx % NOTE_COLORS.length]
          const isActive = i === activeStep
          return (
            <div key={i} className="absolute rounded-sm transition-all"
              style={{
                left: `${(event.beat / totalBeats) * 100}%`,
                width: `${(event.duration / totalBeats) * 100}%`,
                top: y, height: 11,
                background: color,
                opacity: isActive ? 1 : 0.65,
                boxShadow: isActive ? `0 0 8px ${color}` : 'none',
                transform: isActive ? 'scaleY(1.3)' : 'scaleY(1)',
              }}
            />
          )
        })}
        {/* Playhead */}
        {playing && (
          <div className="absolute top-0 bottom-0 w-0.5 rounded"
            style={{
              background: 'rgba(255,255,255,0.8)',
              boxShadow: '0 0 6px rgba(255,255,255,0.5)',
              left: activeStep >= 0
                ? `${(melody.events[activeStep]?.beat / totalBeats) * 100}%`
                : '0%',
              transition: 'left 0.05s linear',
            }}
          />
        )}
        {/* Loop indicator */}
        {loopMode && (
          <div className="absolute top-1 right-1"
            style={{ width: 6, height: 6, borderRadius: '50%', background: '#22d3ee', boxShadow: '0 0 6px #22d3ee', opacity: playing ? 1 : 0.5 }}
          />
        )}
      </div>

      {/* Note pills */}
      <div className="flex flex-wrap gap-1.5">
        {melody.events.slice(0, 12).map((e, i) => (
          <span key={i} className="font-mono transition-all"
            style={{
              padding: '6px 12px', borderRadius: 8, fontSize: 12,
              background: i === activeStep ? `${NOTE_COLORS[i % NOTE_COLORS.length]}38` : 'rgba(20,14,36,0.9)',
              color: i === activeStep ? NOTE_COLORS[i % NOTE_COLORS.length] : 'rgba(148,163,184,0.6)',
              border: `1px solid ${i === activeStep ? NOTE_COLORS[i % NOTE_COLORS.length] + '70' : 'rgba(46,46,74,0.55)'}`,
              boxShadow: i === activeStep ? `0 0 10px ${NOTE_COLORS[i % NOTE_COLORS.length]}60, inset 0 1px 0 rgba(255,255,255,0.08)` : 'none',
              textShadow: i === activeStep ? `0 0 8px ${NOTE_COLORS[i % NOTE_COLORS.length]}` : 'none',
            }}>
            {e.note}
          </span>
        ))}
        {melody.events.length > 12 && (
          <span className="font-mono"
            style={{ padding: '6px 10px', borderRadius: 8, fontSize: 11, color: 'rgba(71,85,105,0.7)', border: '1px solid rgba(46,46,74,0.4)' }}>
            +{melody.events.length - 12}
          </span>
        )}
      </div>
    </div>
  )
}
