import { useState, useRef, useImperativeHandle, forwardRef } from 'react'
import * as Tone from 'tone'

const Recorder = forwardRef(function Recorder({ onSaveRecording }, ref) {
  const [isRecording, setIsRecording] = useState(false)
  const [recorded, setRecorded] = useState(null)

  const isRecordingRef   = useRef(false)
  const startTimeRef     = useRef(null)
  const eventsRef        = useRef([])
  const activeNotesRef   = useRef({})

  useImperativeHandle(ref, () => ({
    noteOn(note) {
      if (!isRecordingRef.current) return
      const beat = Tone.now() - startTimeRef.current
      activeNotesRef.current[note] = beat
    },
    noteOff(note) {
      if (!isRecordingRef.current || !(note in activeNotesRef.current)) return
      const startBeat = activeNotesRef.current[note]
      const duration  = Math.max(0.125, Tone.now() - startTimeRef.current - startBeat)
      eventsRef.current.push({ note, beat: startBeat, duration })
      delete activeNotesRef.current[note]
    },
  }), [])

  function startRecording() {
    eventsRef.current    = []
    activeNotesRef.current = {}
    startTimeRef.current = Tone.now()
    isRecordingRef.current = true
    setIsRecording(true)
    setRecorded(null)
  }

  function stopRecording() {
    isRecordingRef.current = false
    setIsRecording(false)

    // Close any notes still held
    const now = Tone.now() - startTimeRef.current
    for (const [note, startBeat] of Object.entries(activeNotesRef.current)) {
      eventsRef.current.push({ note, beat: startBeat, duration: Math.max(0.125, now - startBeat) })
    }
    activeNotesRef.current = {}

    const events = [...eventsRef.current].sort((a, b) => a.beat - b.beat)
    if (events.length > 0) {
      const totalDur    = events.reduce((m, e) => Math.max(m, e.beat + e.duration), 0)
      const uniqueNotes = [...new Set(events.map(e => e.note))].sort()
      setRecorded({
        events,
        scale: uniqueNotes,
        contour: 'recorded',
        bars: Math.max(1, Math.ceil(totalDur / 4)),
      })
    }
  }

  function saveRecording() {
    if (recorded && onSaveRecording) {
      onSaveRecording(recorded)
      setRecorded(null)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>Recording</span>
        {isRecording && (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full"
              style={{ background: '#f87171', animation: 'pulse-ring 1s infinite' }} />
            <span className="text-xs font-mono" style={{ color: '#f87171' }}>● REC</span>
          </div>
        )}
      </div>

      <button
        onClick={isRecording ? stopRecording : startRecording}
        className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all"
        style={{
          background: isRecording
            ? 'linear-gradient(135deg, rgba(239,68,68,0.25), rgba(220,38,38,0.15))'
            : 'linear-gradient(135deg, rgba(124,58,237,0.25), rgba(109,40,217,0.15))',
          border: isRecording ? '1px solid rgba(239,68,68,0.5)' : '1px solid rgba(124,58,237,0.4)',
          color: isRecording ? '#f87171' : '#a855f7',
          boxShadow: isRecording ? '0 0 16px rgba(239,68,68,0.2)' : 'none',
        }}
      >
        {isRecording ? (
          <>
            <div className="w-3.5 h-3.5 rounded-sm" style={{ background: '#f87171' }} />
            Stop Recording
          </>
        ) : (
          <>
            <div className="w-3.5 h-3.5 rounded-full" style={{ background: '#a855f7' }} />
            Start Recording
          </>
        )}
      </button>

      {isRecording && (
        <p className="text-xs text-center" style={{ color: 'rgba(148,163,184,0.6)' }}>
          Play notes on your keyboard — timing is captured live
        </p>
      )}

      {recorded && !isRecording && (
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
            <div className="flex gap-2">
              <button
                onClick={() => setRecorded(null)}
                className="px-3 py-1.5 rounded-lg text-xs transition-all"
                style={{
                  background: 'rgba(30,30,46,0.8)',
                  border: '1px solid rgba(46,46,74,0.5)',
                  color: 'rgba(148,163,184,0.6)',
                }}
              >
                Discard
              </button>
              <button
                onClick={saveRecording}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={{
                  background: 'rgba(6,182,212,0.2)',
                  border: '1px solid rgba(6,182,212,0.5)',
                  color: '#22d3ee',
                  boxShadow: '0 0 12px rgba(6,182,212,0.2)',
                }}
              >
                Save to Inventory
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
})

export default Recorder
