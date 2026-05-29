import { useState, useRef, useImperativeHandle, forwardRef, useEffect } from 'react'
import * as Tone from 'tone'
import { exportMidi } from '../audio/midiExport.js'
import { exportMelodyWav } from '../audio/wavExport.js'
import { playDrumHit } from '../audio/engine.js'

const Recorder = forwardRef(function Recorder({ onSaveRecording, bpm = 120 }, ref) {
  const [phase, setPhase]         = useState('idle')  // idle | countdown | recording | done
  const [countdown, setCountdown] = useState(0)
  const [recorded, setRecorded]   = useState(null)
  const [audioBlob, setAudioBlob] = useState(null)

  const phaseRef          = useRef('idle')
  const startTimeRef      = useRef(null)
  const eventsRef         = useRef([])
  const activeNotesRef    = useRef({})
  const toneRecorderRef   = useRef(null)
  const countdownTimer    = useRef(null)

  useEffect(() => {
    phaseRef.current = phase
  }, [phase])

  useEffect(() => () => {
    clearTimeout(countdownTimer.current)
    if (toneRecorderRef.current) {
      toneRecorderRef.current.stop().catch(() => {})
      toneRecorderRef.current.dispose()
      toneRecorderRef.current = null
    }
  }, [])

  useImperativeHandle(ref, () => ({
    noteOn(note) {
      if (phaseRef.current !== 'recording') return
      const beat = Tone.now() - startTimeRef.current
      activeNotesRef.current[note] = beat
    },
    noteOff(note) {
      if (phaseRef.current !== 'recording' || !(note in activeNotesRef.current)) return
      const startBeat = activeNotesRef.current[note]
      const duration  = Math.max(0.125, Tone.now() - startTimeRef.current - startBeat)
      eventsRef.current.push({ note, beat: startBeat, duration })
      delete activeNotesRef.current[note]
    },
  }), [])

  async function handleStartStop() {
    if (phase === 'recording') {
      await stopRecording()
    } else if (phase === 'idle' || phase === 'done') {
      await beginCountdown()
    }
  }

  async function beginCountdown() {
    await Tone.start()
    setPhase('countdown')
    phaseRef.current = 'countdown'
    setRecorded(null)
    setAudioBlob(null)

    const secPerBeat = 60 / bpm
    let tick = 4

    const doTick = () => {
      setCountdown(tick)
      // Click on each count, accent on 1
      playDrumHit(tick === 4 ? 'snare' : 'hihat')
      tick--
      if (tick > 0) {
        countdownTimer.current = setTimeout(doTick, secPerBeat * 1000)
      } else {
        countdownTimer.current = setTimeout(startRecording, secPerBeat * 1000)
      }
    }
    doTick()
  }

  async function startRecording() {
    eventsRef.current      = []
    activeNotesRef.current = {}
    startTimeRef.current   = Tone.now()
    setPhase('recording')
    phaseRef.current = 'recording'
    setCountdown(0)

    const rec = new Tone.Recorder()
    Tone.getDestination().connect(rec)
    await rec.start()
    toneRecorderRef.current = rec
  }

  async function stopRecording() {
    setPhase('idle')
    phaseRef.current = 'idle'

    const now = Tone.now() - startTimeRef.current
    for (const [note, startBeat] of Object.entries(activeNotesRef.current)) {
      eventsRef.current.push({ note, beat: startBeat, duration: Math.max(0.125, now - startBeat) })
    }
    activeNotesRef.current = {}

    if (toneRecorderRef.current) {
      const blob = await toneRecorderRef.current.stop()
      toneRecorderRef.current.dispose()
      toneRecorderRef.current = null
      if (blob && blob.size > 0) setAudioBlob(blob)
    }

    const secPerBeat = 60 / bpm
    const events = [...eventsRef.current]
      .sort((a, b) => a.beat - b.beat)
      .map(e => ({ ...e, beat: e.beat / secPerBeat, duration: e.duration / secPerBeat }))
    if (events.length > 0) {
      const totalDur    = events.reduce((m, e) => Math.max(m, e.beat + e.duration), 0)
      const uniqueNotes = [...new Set(events.map(e => e.note))].sort()
      const mel = {
        events,
        scale:   uniqueNotes,
        contour: 'recorded',
        bars:    Math.max(1, Math.ceil(totalDur / 4)),
      }
      setRecorded(mel)
      setPhase('done')
      phaseRef.current = 'done'
    }
  }

  function saveRecording() {
    if (recorded && onSaveRecording) {
      onSaveRecording(recorded)
      setRecorded(null)
      setAudioBlob(null)
      setPhase('idle')
    }
  }

  const btnLabel = phase === 'recording'
    ? 'Stop Recording'
    : phase === 'countdown'
    ? `Starting in ${countdown}…`
    : 'Start Recording'

  const btnColor = phase === 'recording'
    ? { bg: 'linear-gradient(135deg,rgba(239,68,68,0.25),rgba(220,38,38,0.15))', border: 'rgba(239,68,68,0.5)', text: '#f87171' }
    : { bg: 'linear-gradient(135deg,rgba(124,58,237,0.25),rgba(109,40,217,0.15))', border: 'rgba(124,58,237,0.4)', text: '#a855f7' }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>Recording</span>
        {phase === 'recording' && (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ background: '#f87171', animation: 'pulse-ring 1s infinite' }} />
            <span className="text-xs font-mono" style={{ color: '#f87171' }}>● REC</span>
          </div>
        )}
        {phase === 'countdown' && (
          <div className="flex items-center gap-2">
            <span style={{ fontSize: '1.4rem', fontWeight: 900, fontFamily: 'monospace', color: '#c084fc', lineHeight: 1 }}>
              {countdown}
            </span>
          </div>
        )}
      </div>

      <button
        onClick={handleStartStop}
        disabled={phase === 'countdown'}
        className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all"
        style={{
          background: btnColor.bg,
          border: `1px solid ${btnColor.border}`,
          color: btnColor.text,
          boxShadow: phase === 'recording' ? '0 0 16px rgba(239,68,68,0.2)' : 'none',
          opacity: phase === 'countdown' ? 0.7 : 1,
          cursor: phase === 'countdown' ? 'not-allowed' : 'pointer',
        }}
      >
        {phase === 'recording' ? (
          <div className="w-3.5 h-3.5 rounded-sm" style={{ background: '#f87171' }} />
        ) : (
          <div className="w-3.5 h-3.5 rounded-full" style={{ background: '#a855f7' }} />
        )}
        {btnLabel}
      </button>

      {phase === 'countdown' && (
        <p className="text-xs text-center" style={{ color: 'rgba(192,132,252,0.7)' }}>
          Get ready — recording starts after the count
        </p>
      )}
      {phase === 'recording' && (
        <p className="text-xs text-center" style={{ color: 'rgba(148,163,184,0.6)' }}>
          Play notes — timing and audio are captured live
        </p>
      )}

      {phase === 'done' && recorded && (
        <div className="rounded-xl p-4 flex flex-col gap-3 animate-slide-in"
          style={{ background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.3)' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold" style={{ color: '#22d3ee' }}>
                {recorded.events.length} note{recorded.events.length !== 1 ? 's' : ''} captured
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(148,163,184,0.5)' }}>
                ~{recorded.bars} bar{recorded.bars !== 1 ? 's' : ''}
              </p>
            </div>
            <button
              onClick={() => { setRecorded(null); setAudioBlob(null); setPhase('idle') }}
              className="px-3 py-1.5 rounded-lg text-xs transition-all"
              style={{ background: 'rgba(30,30,46,0.8)', border: '1px solid rgba(46,46,74,0.5)', color: 'rgba(148,163,184,0.6)' }}
            >
              Discard
            </button>
          </div>

          <button
            onClick={saveRecording}
            className="w-full py-2 rounded-lg text-xs font-semibold transition-all"
            style={{ background: 'rgba(6,182,212,0.2)', border: '1px solid rgba(6,182,212,0.5)', color: '#22d3ee', boxShadow: '0 0 12px rgba(6,182,212,0.2)' }}
          >
            Save to Inventory
          </button>

          <div className="flex gap-2">
            <button
              onClick={() => exportMidi(recorded, bpm, 'recording.mid')}
              className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1"
              style={{ background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.4)', color: '#c084fc' }}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                <polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              MIDI
            </button>
            <button
              onClick={() => exportMelodyWav(recorded, bpm, 'recording.wav')}
              className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1"
              style={{ background: 'rgba(34,211,238,0.12)', border: '1px solid rgba(34,211,238,0.35)', color: '#22d3ee' }}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                <polyline points="7,10 12,15 17,10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              WAV
            </button>
            {audioBlob && (
              <button
                onClick={() => {
                  const url = URL.createObjectURL(audioBlob)
                  const a = document.createElement('a')
                  a.href = url; a.download = 'recording.webm'; a.click()
                  URL.revokeObjectURL(url)
                }}
                className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1"
                style={{ background: 'rgba(236,72,153,0.12)', border: '1px solid rgba(236,72,153,0.35)', color: '#f472b6' }}
              >
                Raw
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
})

export default Recorder
