import { useState, useRef, useImperativeHandle, forwardRef, useEffect } from 'react'
import * as Tone from 'tone'
import { exportMidi } from '../audio/midiExport.js'
import { exportMelodyWav } from '../audio/wavExport.js'
import { playDrumHit } from '../audio/engine.js'

// Recorder renders nothing — all UI is in the parent via ref + onChange callback.
// onChange({ phase, countdown, hasAudio, hasNotes, isPlayingAudio })
// ref methods: start, stop, cancel, save, discard, toggleAudio, downloadAudio

const Recorder = forwardRef(function Recorder({ onSaveRecording, bpm = 120, onChange }, ref) {
  const [phase, setPhase]               = useState('idle')
  const [countdown, setCountdown]       = useState(0)
  const [recorded, setRecorded]         = useState(null)
  const [audioBlob, setAudioBlob]       = useState(null)
  const [isPlayingAudio, setIsPlayingAudio] = useState(false)

  const phaseRef        = useRef('idle')
  const startTimeRef    = useRef(null)
  const eventsRef       = useRef([])
  const activeNotesRef  = useRef({})
  const toneRecorderRef = useRef(null)
  const countdownTimer  = useRef(null)
  const audioElemRef    = useRef(null)

  // Keep onChange ref fresh so we never have stale closures
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  useEffect(() => { phaseRef.current = phase }, [phase])

  // Notify parent on every state change
  useEffect(() => {
    onChangeRef.current?.({ phase, countdown, hasAudio: !!audioBlob, hasNotes: !!recorded, isPlayingAudio })
  }, [phase, countdown, audioBlob, recorded, isPlayingAudio])

  useEffect(() => () => {
    clearTimeout(countdownTimer.current)
    audioElemRef.current?.pause()
    if (toneRecorderRef.current) {
      toneRecorderRef.current.stop().catch(() => {})
      toneRecorderRef.current.dispose()
      toneRecorderRef.current = null
    }
  }, [])

  useImperativeHandle(ref, () => ({
    noteOn(note) {
      if (phaseRef.current !== 'recording') return
      activeNotesRef.current[note] = Tone.now() - startTimeRef.current
    },
    noteOff(note) {
      if (phaseRef.current !== 'recording' || !(note in activeNotesRef.current)) return
      const startBeat = activeNotesRef.current[note]
      const duration  = Math.max(0.125, Tone.now() - startTimeRef.current - startBeat)
      eventsRef.current.push({ note, beat: startBeat, duration })
      delete activeNotesRef.current[note]
    },
    start()    { if (phaseRef.current === 'idle' || phaseRef.current === 'done') beginCountdown() },
    stop()     { if (phaseRef.current === 'recording') stopRecording() },
    cancel()   {
      if (phaseRef.current === 'countdown') {
        clearTimeout(countdownTimer.current)
        setPhase('idle'); phaseRef.current = 'idle'
      }
    },
    save:          () => saveRecording(),
    discard:       () => discard(),
    toggleAudio:   () => toggleAudio(),
    downloadAudio: () => downloadAudio(),
  }), [])  // eslint-disable-line react-hooks/exhaustive-deps

  async function beginCountdown() {
    await Tone.start()
    stopAudio()
    setPhase('countdown'); phaseRef.current = 'countdown'
    setRecorded(null); setAudioBlob(null)

    const secPerBeat = 60 / bpm
    let tick = 4
    const doTick = () => {
      setCountdown(tick)
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
    setPhase('recording'); phaseRef.current = 'recording'
    setCountdown(0)
    const rec = new Tone.Recorder()
    Tone.getDestination().connect(rec)
    await rec.start()
    toneRecorderRef.current = rec
  }

  async function stopRecording() {
    setPhase('idle'); phaseRef.current = 'idle'

    const now = Tone.now() - startTimeRef.current
    for (const [note, startBeat] of Object.entries(activeNotesRef.current)) {
      eventsRef.current.push({ note, beat: startBeat, duration: Math.max(0.125, now - startBeat) })
    }
    activeNotesRef.current = {}

    let blob = null
    if (toneRecorderRef.current) {
      blob = await toneRecorderRef.current.stop()
      toneRecorderRef.current.dispose()
      toneRecorderRef.current = null
      if (blob && blob.size > 0) setAudioBlob(blob)
    }

    const secPerBeat = 60 / bpm
    const events = [...eventsRef.current]
      .sort((a, b) => a.beat - b.beat)
      .map(e => ({ ...e, beat: e.beat / secPerBeat, duration: e.duration / secPerBeat }))

    let mel = null
    if (events.length > 0) {
      const totalDur = events.reduce((m, e) => Math.max(m, e.beat + e.duration), 0)
      mel = {
        events,
        scale:   [...new Set(events.map(e => e.note))].sort(),
        contour: 'recorded',
        bars:    Math.max(1, Math.ceil(totalDur / 4)),
      }
      setRecorded(mel)
    }

    if (mel || (blob && blob.size > 0)) {
      setPhase('done'); phaseRef.current = 'done'
    }
  }

  function saveRecording() {
    if (recorded && onSaveRecording) {
      onSaveRecording(recorded)
      discard()
    }
  }

  function discard() {
    stopAudio()
    setRecorded(null); setAudioBlob(null); setPhase('idle')
  }

  function toggleAudio() {
    if (isPlayingAudio) { stopAudio(); return }
    if (!audioBlob) return
    const url = URL.createObjectURL(audioBlob)
    const audio = new Audio(url)
    audioElemRef.current = audio
    audio.onended = () => { setIsPlayingAudio(false); URL.revokeObjectURL(url) }
    audio.play()
    setIsPlayingAudio(true)
  }

  function stopAudio() {
    audioElemRef.current?.pause()
    audioElemRef.current = null
    setIsPlayingAudio(false)
  }

  function downloadAudio() {
    if (!audioBlob) return
    const url = URL.createObjectURL(audioBlob)
    const a = document.createElement('a')
    a.href = url; a.download = 'recording.webm'; a.click()
    URL.revokeObjectURL(url)
  }

  return null
})

export default Recorder
