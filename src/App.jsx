import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import * as Tone from 'tone'
import Piano from './components/Piano.jsx'
import MelodyCard from './components/MelodyCard.jsx'
import LoopInventory from './components/LoopInventory.jsx'
import Recorder from './components/Recorder.jsx'
import Visualizer from './components/Visualizer.jsx'
import SplashCanvas from './components/SplashCanvas.jsx'
import BrowseTab from './components/BrowseTab.jsx'
import ChordDisplay from './components/ChordDisplay.jsx'
import ChordProgressionPanel from './components/ChordProgressionPanel.jsx'
import SessionTab from './components/SessionTab.jsx'
import BassPedals from './components/BassPedals.jsx'
import { startAudio, setInstrument, playNote, onSamplerLoading, setTempo, INSTRUMENTS, getDbgLog } from './audio/engine.js'
import { initMidi, getMidiOutputs, selectOutput, setMidiChannel, getMidiChannel, isMidiActive, getSelectedOutputId, onOutputsChange } from './audio/midiOut.js'
import { ROOTS, SCALE_NAMES, getScaleNotes } from './audio/scales.js'
import { generateVariations } from './audio/melodyGen.js'

const TABS = ['Generate', 'Chords', 'Session', 'Browse', 'Inventory', 'Record']

export default function App() {
  const [started, setStarted] = useState(false)
  const [activeTab, setActiveTab] = useState('Generate')
  const [root, setRoot] = useState(() => localStorage.getItem('ss_root') || 'C')
  const [scale, setScale] = useState(() => localStorage.getItem('ss_scale') || 'pentatonic')
  const [instrument, setInstrumentState] = useState(() => localStorage.getItem('ss_instrument') || 'keys')
  const [genBars, setGenBars] = useState(2)
  const [genCount, setGenCount] = useState(8)
  const [bpm, setBpm] = useState(() => parseInt(localStorage.getItem('ss_bpm')) || 120)
  const [octave, setOctave] = useState(() => parseInt(localStorage.getItem('ss_octave')) || 4)
  const [melodies, setMelodies] = useState([])
  const [loops, setLoops] = useState([])
  const [generating, setGenerating] = useState(false)
  const [keyboardMode, setKeyboardMode] = useState(true)
  const [variation, setVariation] = useState(() => parseInt(localStorage.getItem('ss_variation')) || 0)
  const [samplerLoading, setSamplerLoading] = useState(false)
  const [chordHighlights, setChordHighlights] = useState([])
  const [midiOutputs, setMidiOutputs] = useState([])
  const [midiOutputId, setMidiOutputId] = useState('')
  const [midiCh, setMidiCh] = useState(1)
  const [midiReady, setMidiReady] = useState(false)
  const [activeNotes, setActiveNotes] = useState(new Set())
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768)
  const [dbgVisible, setDbgVisible] = useState(false)
  const [dbgLines, setDbgLines] = useState([])
  const dbgInterval = useRef(null)

  const handlePianoNoteOn = useCallback((note) => {
    recorderRef.current?.noteOn(note)
    setActiveNotes(prev => new Set([...prev, note]))
  }, [])

  const handlePianoNoteOff = useCallback((note) => {
    recorderRef.current?.noteOff(note)
    setActiveNotes(prev => { const s = new Set(prev); s.delete(note); return s })
  }, [])
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [playAllIdx, setPlayAllIdx] = useState(-1)
  const [octaveMsg, setOctaveMsg] = useState('')
  const octaveMsgTimer = useRef(null)
  const playAllRef = useRef(false)
  const playAllPartRef = useRef(null)
  const recorderRef = useRef(null)

  function toggleDbg() {
    setDbgVisible(v => {
      if (!v) {
        setDbgLines(getDbgLog())
        dbgInterval.current = setInterval(() => setDbgLines(getDbgLog()), 500)
      } else {
        clearInterval(dbgInterval.current)
      }
      return !v
    })
  }

  const handleOctaveUp = useCallback(() => {
    setOctave(o => {
      if (o >= 7) { clearTimeout(octaveMsgTimer.current); setOctaveMsg('Highest octave'); octaveMsgTimer.current = setTimeout(() => setOctaveMsg(''), 1800); return o }
      return o + 1
    })
  }, [])

  const handleOctaveDown = useCallback(() => {
    setOctave(o => {
      if (o <= 2) { clearTimeout(octaveMsgTimer.current); setOctaveMsg('Lowest octave'); octaveMsgTimer.current = setTimeout(() => setOctaveMsg(''), 1800); return o }
      return o - 1
    })
  }, [])

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Persist session settings
  useEffect(() => { localStorage.setItem('ss_root',       root) },       [root])
  useEffect(() => { localStorage.setItem('ss_scale',      scale) },      [scale])
  useEffect(() => { localStorage.setItem('ss_bpm',        bpm) },        [bpm])
  useEffect(() => { localStorage.setItem('ss_octave',     octave) },     [octave])
  useEffect(() => { localStorage.setItem('ss_instrument', instrument) }, [instrument])
  useEffect(() => { localStorage.setItem('ss_variation',  variation) },  [variation])

  // Scale notes for piano key highlighting
  const scaleHighlights = useMemo(
    () => getScaleNotes(root, scale, octave - 1, 3),
    [root, scale, octave]
  )

  useEffect(() => {
    initMidi().then(({ ok }) => {
      if (ok) {
        setMidiReady(true)
        setMidiOutputs(getMidiOutputs())
        onOutputsChange(ports => setMidiOutputs(ports))
      }
    })
  }, [])

  function handleMidiOutputChange(id) {
    setMidiOutputId(id)
    selectOutput(id)
  }

  function handleMidiChannelChange(ch) {
    setMidiCh(ch)
    setMidiChannel(ch)
  }

  function handleStart() {
    // startAudio() initializes the graph synchronously before its first await,
    // so limiter/synth are ready by the time setInstrument runs below.
    // We don't await it so a slow/stuck AudioContext resume can't block the UI.
    startAudio()
    setTempo(bpm)
    setInstrument(instrument, variation)
    onSamplerLoading(setSamplerLoading)
    setStarted(true)
    generateMelodies()
  }

  function generateMelodies() {
    setGenerating(true)
    setTimeout(() => {
      const variations = generateVariations(root, scale, genCount, octave, genBars)
      setMelodies(variations)
      setGenerating(false)
    }, 50)
  }

  function handleInstrumentChange(id) {
    setInstrumentState(id)
    setVariation(0)
    setInstrument(id, 0)
  }

  function handleVariationChange(idx) {
    setVariation(idx)
    setInstrument(instrument, idx)
  }

  function stopAll() {
    playAllRef.current = false
    setPlayAllIdx(-1)
    if (playAllPartRef.current) { playAllPartRef.current.dispose(); playAllPartRef.current = null }
    Tone.getTransport().stop()
    Tone.getTransport().position = 0
  }

  async function playAll() {
    if (playAllRef.current) return stopAll()
    if (!melodies.length) return
    await Tone.start()
    playAllRef.current = true

    function playIdx(i) {
      if (!playAllRef.current || i >= melodies.length) { stopAll(); return }
      const melody = melodies[i]
      setPlayAllIdx(i)

      if (playAllPartRef.current) { playAllPartRef.current.dispose(); playAllPartRef.current = null }
      Tone.getTransport().stop()
      Tone.getTransport().position = 0
      Tone.getTransport().bpm.value = bpm

      const totalTime = melody.events.reduce((s, e) => Math.max(s, e.beat + e.duration), 0) * (60 / bpm)
      const part = new Tone.Part((time, event) => {
        playNote(event.note, event.dur + 'n')
      }, melody.events.map(e => ({
        time: e.beat * (60 / bpm),
        note: e.note,
        dur: Math.round(1 / e.duration),
      })))

      part.start(0)
      playAllPartRef.current = part
      Tone.getTransport().start()

      setTimeout(() => playIdx(i + 1), (totalTime + 0.4) * 1000)
    }

    playIdx(0)
  }

  function handleSaveMelody(melody) {
    const loop = {
      id: Date.now() + Math.random(),
      melody,
      root,
      scale,
      bpm,
      createdAt: new Date().toISOString(),
    }
    setLoops(prev => [loop, ...prev])
  }

  function handleDeleteLoop(id) {
    setLoops(prev => prev.filter(l => l.id !== id))
  }

  if (!started) {
    const NOTES = ['♩','♪','♫','♬','♭','♮','♯']
    const NOTE_SPAWNS = [
      { left:'8%',  bottom:'12%', delay:'0s',    dur:'7s',  color:'#a855f7' },
      { left:'18%', bottom:'8%',  delay:'1.4s',  dur:'9s',  color:'#06b6d4' },
      { left:'30%', bottom:'15%', delay:'0.6s',  dur:'8s',  color:'#ec4899' },
      { left:'45%', bottom:'5%',  delay:'2.1s',  dur:'10s', color:'#818cf8' },
      { left:'60%', bottom:'10%', delay:'0.3s',  dur:'7.5s',color:'#22d3ee' },
      { left:'72%', bottom:'18%', delay:'1.8s',  dur:'8.5s',color:'#f472b6' },
      { left:'84%', bottom:'8%',  delay:'0.9s',  dur:'9.5s',color:'#a855f7' },
      { left:'92%', bottom:'14%', delay:'2.5s',  dur:'7s',  color:'#06b6d4' },
    ]
    const FEATURES = [
      { icon:'🎹', label:'5 Instruments' },
      { icon:'🎼', label:'10 Scales' },
      { icon:'⚡', label:'Instant Generation' },
      { icon:'💾', label:'Loop Inventory' },
      { icon:'⌨️', label:'Keyboard Play' },
    ]

    return (
      <div className="relative flex items-center justify-center overflow-hidden"
        style={{ minHeight: '100vh', background: '#06060c' }}>

        {/* ── Canvas: live sine waves + particles ── */}
        <SplashCanvas />

        {/* ── Grid overlay ── */}
        <div className="absolute inset-0 pointer-events-none grid-bg" style={{ opacity: 0.45 }} />

        {/* ── Scan line ── */}
        <div className="scan-line" />

        {/* ── Edge glow strips ── */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: `
            linear-gradient(to bottom, rgba(109,40,217,0.25) 0%, transparent 12%),
            linear-gradient(to top,    rgba(6,182,212,0.18)  0%, transparent 12%),
            linear-gradient(to right,  rgba(109,40,217,0.2)  0%, transparent 8%),
            linear-gradient(to left,   rgba(236,72,153,0.15) 0%, transparent 8%)
          `,
        }} />

        {/* ── Corner brackets ── */}
        <div className="corner corner-tl" />
        <div className="corner corner-tr" />
        <div className="corner corner-bl" />
        <div className="corner corner-br" />

        {/* ── Floating music notes ── */}
        {NOTE_SPAWNS.map((n, i) => (
          <div key={i} className="music-note"
            style={{
              left: n.left, bottom: n.bottom,
              color: n.color,
              animationDuration: n.dur,
              animationDelay: n.delay,
              textShadow: `0 0 12px ${n.color}, 0 0 24px ${n.color}88`,
              filter: `drop-shadow(0 0 6px ${n.color})`,
            }}>
            {NOTES[i % NOTES.length]}
          </div>
        ))}

        {/* ── Content ── */}
        <div className="relative flex flex-col items-center text-center"
          style={{ gap: 36, zIndex: 10, padding: '0 24px' }}>

          {/* Logo mark */}
          <div className="reveal-up" style={{ animationDelay: '0.05s' }}>
            <div className="relative flex items-center justify-center" style={{ width: 96, height: 96 }}>
              {/* Pulsing halo */}
              <div className="absolute inset-0 rounded-full"
                style={{
                  background: 'radial-gradient(circle, rgba(124,58,237,0.45) 0%, transparent 70%)',
                  filter: 'blur(16px)',
                  animation: 'halo-pulse 2.5s ease-in-out infinite',
                }} />
              {/* Outer orbit ring */}
              <div className="absolute inset-0 rounded-full"
                style={{
                  border: '1px solid rgba(124,58,237,0.35)',
                  animation: 'orbit-spin 12s linear infinite',
                  backgroundImage: 'conic-gradient(from 0deg, transparent 80%, rgba(168,85,247,0.8) 90%, transparent 100%)',
                }} />
              {/* Inner orbit ring */}
              <div className="absolute rounded-full"
                style={{
                  inset: 12,
                  border: '1px solid rgba(6,182,212,0.3)',
                  animation: 'orbit-spin-r 8s linear infinite',
                  backgroundImage: 'conic-gradient(from 180deg, transparent 75%, rgba(6,182,212,0.7) 88%, transparent 100%)',
                }} />
              {/* Core SVG */}
              <svg width="52" height="52" viewBox="0 0 48 48" fill="none" className="relative">
                <path d="M10 34 Q16 10 24 22 Q32 34 38 12"
                  stroke="url(#sw)" strokeWidth="2.8"
                  fill="none" strokeLinecap="round"
                  strokeDasharray="200"
                  style={{ animation: 'path-draw 1.6s cubic-bezier(0.16,1,0.3,1) forwards' }}
                />
                <circle cx="10" cy="34" r="4" fill="#7c3aed"
                  style={{ filter: 'drop-shadow(0 0 6px #7c3aed)' }}/>
                <circle cx="38" cy="12" r="4" fill="#06b6d4"
                  style={{ filter: 'drop-shadow(0 0 6px #06b6d4)' }}/>
                <defs>
                  <linearGradient id="sw" x1="0" y1="0" x2="48" y2="0">
                    <stop offset="0%"   stopColor="#a855f7"/>
                    <stop offset="50%"  stopColor="#818cf8"/>
                    <stop offset="100%" stopColor="#06b6d4"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>

          {/* Title */}
          <div className="reveal-up flex flex-col items-center gap-3"
            style={{ animationDelay: '0.18s' }}>
            <h1 className="title-gradient"
              style={{
                fontSize: 'clamp(3.5rem, 8vw, 6.5rem)',
                fontWeight: 900,
                letterSpacing: '-0.04em',
                lineHeight: 1.1,
                paddingBottom: '0.05em',
              }}>
              Song Starter
            </h1>
            {/* Tagline with individual letter glow */}
            <div className="flex items-center gap-3"
              style={{ fontSize: '0.72rem', letterSpacing: '0.28em', fontWeight: 600 }}>
              {['MELODY','·','INSPIRATION','·','CREATION'].map((word, i) => (
                <span key={i} style={{
                  color: i % 2 === 1
                    ? 'rgba(71,85,105,0.5)'
                    : ['#a855f7','#06b6d4','#ec4899'][Math.floor(i/2)],
                  textShadow: i % 2 !== 1
                    ? `0 0 16px ${['rgba(168,85,247,0.6)','rgba(6,182,212,0.6)','rgba(236,72,153,0.6)'][Math.floor(i/2)]}`
                    : 'none',
                  animation: `char-in 0.5s ease forwards`,
                  animationDelay: `${0.4 + i * 0.08}s`,
                  opacity: 0,
                }}>
                  {word}
                </span>
              ))}
            </div>
          </div>

          {/* Feature pills */}
          <div className="reveal-up flex flex-wrap justify-center gap-2"
            style={{ animationDelay: '0.32s', maxWidth: 520 }}>
            {FEATURES.map(f => (
              <div key={f.label}
                className="flex items-center gap-2 rounded-full"
                style={{
                  padding: '8px 18px',
                  background: 'rgba(20,14,36,0.85)',
                  border: '1px solid rgba(124,58,237,0.35)',
                  boxShadow: '0 0 12px rgba(124,58,237,0.12), inset 0 1px 0 rgba(255,255,255,0.06)',
                  backdropFilter: 'blur(8px)',
                }}>
                <span style={{ fontSize: 14 }}>{f.icon}</span>
                <span style={{ fontSize: '0.72rem', color: 'rgba(196,181,253,0.8)', fontWeight: 500, letterSpacing: '0.03em' }}>
                  {f.label}
                </span>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="reveal-up relative flex items-center justify-center"
            style={{ animationDelay: '0.44s', borderRadius: 16 }}>
            <div className="btn-ring" />
            <div className="btn-ring btn-ring-2" />
            <div className="btn-ring btn-ring-3" />
            <button
              onClick={handleStart}
              className="btn-breathe relative"
              style={{
                padding: '16px 64px',
                borderRadius: 16,
                fontSize: '1.1rem',
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 50%, #5b21b6 100%)',
                color: '#f5eeff',
                border: '1px solid rgba(196,132,252,0.4)',
                cursor: 'pointer',
                transition: 'transform 0.12s ease, filter 0.12s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.04)'; e.currentTarget.style.filter = 'brightness(1.15)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)';    e.currentTarget.style.filter = 'brightness(1)' }}
            >
              Start Creating
            </button>
          </div>

          {/* Footer */}
          <div className="reveal-up flex items-center gap-4"
            style={{ animationDelay: '0.56s' }}>
            {['No account needed', 'Works offline', '100% in-browser'].map((t, i) => (
              <span key={t} className="flex items-center gap-4">
                {i > 0 && <span style={{ color: 'rgba(71,85,105,0.35)', fontSize: 10 }}>·</span>}
                <span style={{ color: 'rgba(100,116,139,0.55)', fontSize: '0.7rem', letterSpacing: '0.05em' }}>
                  {t}
                </span>
              </span>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ── Shared style tokens ──────────────────────────────────────────────────
  const S = {
    sectionLabel: {
      fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.2em',
      textTransform: 'uppercase', color: 'rgba(192,132,252,0.85)',
      borderLeft: '3px solid rgba(168,85,247,0.8)', paddingLeft: 10,
      marginBottom: 14, display: 'block',
      textShadow: '0 0 14px rgba(168,85,247,0.5)',
    },
    divider: {
      height: 1,
      background: 'linear-gradient(90deg, rgba(168,85,247,0.4), rgba(6,182,212,0.15), transparent)',
      margin: '4px 0',
    },
  }

  return (
    <div className="grid-bg flex flex-col" style={{ height: '100vh', background: '#06060c', overflow: 'hidden' }}>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="flex items-center flex-shrink-0"
        style={{
          height: 60,
          background: 'rgba(8,4,18,0.97)',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 1px 0 rgba(124,58,237,0.3), 0 0 50px rgba(0,0,0,0.6), 0 4px 24px rgba(124,58,237,0.06)',
        }}>

        {/* Hamburger — mobile only */}
        {isMobile && (
          <button onClick={() => setSidebarOpen(o => !o)}
            className="flex items-center justify-center flex-shrink-0"
            style={{ width: 44, height: 44, marginLeft: 12, color: '#c084fc' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
        )}

        {/* Logo — sits directly over the sidebar column */}
        <div className="flex items-center gap-3 flex-shrink-0"
          style={{
            width: isMobile ? 'auto' : 280,
            paddingLeft: isMobile ? 8 : 28,
            paddingRight: 20,
            borderRight: isMobile ? 'none' : '1px solid rgba(124,58,237,0.12)',
            height: '100%',
          }}>
          <div className="relative flex items-center justify-center" style={{ width: 34, height: 34 }}>
            <div className="absolute inset-0 rounded-full"
              style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.4) 0%, transparent 70%)', filter: 'blur(7px)' }} />
            <div className="absolute inset-0 rounded-full"
              style={{ border: '1px solid rgba(124,58,237,0.32)', animation: 'orbit-spin 12s linear infinite',
                backgroundImage: 'conic-gradient(from 0deg, transparent 80%, rgba(168,85,247,0.75) 92%, transparent 100%)' }} />
            <svg width="19" height="19" viewBox="0 0 48 48" fill="none" className="relative">
              <path d="M10 34 Q16 10 24 22 Q32 34 38 12" stroke="url(#hw)" strokeWidth="3"
                fill="none" strokeLinecap="round"/>
              <circle cx="10" cy="34" r="4" fill="#7c3aed"/>
              <circle cx="38" cy="12" r="4" fill="#06b6d4"/>
              <defs>
                <linearGradient id="hw" x1="0" y1="0" x2="48" y2="0">
                  <stop offset="0%" stopColor="#a855f7"/>
                  <stop offset="100%" stopColor="#06b6d4"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
          <span className="title-gradient" style={{ fontSize: '1.05rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
            Song Starter
          </span>
        </div>

        {/* Visualizer — hidden on mobile */}
        {!isMobile && (
          <div className="flex-1 flex items-center justify-center">
            <div style={{ width: '100%', maxWidth: 480 }}>
              <Visualizer />
            </div>
          </div>
        )}
        {isMobile && <div className="flex-1" />}

        {/* BPM */}
        <div className="flex items-center gap-2.5 rounded-xl flex-shrink-0"
          style={{
            padding: '8px 16px',
            marginRight: 28,
            background: 'rgba(14,8,28,0.95)',
            border: '1px solid rgba(124,58,237,0.4)',
            boxShadow: '0 0 22px rgba(124,58,237,0.2), inset 0 1px 0 rgba(255,255,255,0.05)',
          }}>
          <span style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.15em', color: 'rgba(168,85,247,0.55)', textTransform: 'uppercase' }}>BPM</span>
          <input
            type="number" min={60} max={200} value={bpm}
            onChange={e => { const v = parseInt(e.target.value) || 120; setBpm(v); setTempo(v) }}
            className="w-12 text-center font-mono font-bold bg-transparent outline-none"
            style={{ fontSize: '0.95rem', color: '#c084fc' }}
          />
        </div>
      </header>

      {/* ── Body ────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Mobile sidebar backdrop ──────────────────────────────────── */}
        {isMobile && sidebarOpen && (
          <div onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }} />
        )}

      {/* ── Sidebar ─────────────────────────────────────────────────── */}
        <aside className="flex flex-col gap-5 flex-shrink-0 overflow-y-auto"
          style={{
            padding: '24px 28px',
            width: 280,
            background: 'linear-gradient(180deg, rgba(14,8,32,0.98) 0%, rgba(8,5,18,0.97) 60%, rgba(6,4,14,0.96) 100%)',
            borderRight: '1px solid rgba(124,58,237,0.18)',
            boxShadow: 'inset -1px 0 0 rgba(124,58,237,0.12), 4px 0 32px rgba(0,0,0,0.5)',
            ...(isMobile ? {
              position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 50,
              transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
              transition: 'transform 0.25s cubic-bezier(0.4,0,0.2,1)',
            } : {}),
          }}>

          {/* Instruments */}
          <section>
            <label style={S.sectionLabel}>Instrument</label>
            <div className="flex flex-col gap-2">
              {INSTRUMENTS.map(ins => {
                const on = instrument === ins.id
                return (
                  <button key={ins.id} onClick={() => handleInstrumentChange(ins.id)}
                    className="flex items-center gap-3 rounded-xl text-sm font-semibold transition-all text-left"
                    style={{
                      padding: '14px 18px',
                      background: on
                        ? 'linear-gradient(90deg, rgba(124,58,237,0.42) 0%, rgba(124,58,237,0.1) 100%)'
                        : 'rgba(255,255,255,0.025)',
                      border: on ? '1px solid rgba(168,85,247,0.55)' : '1px solid rgba(255,255,255,0.06)',
                      borderLeft: on ? '3px solid rgba(192,132,252,0.9)' : '3px solid transparent',
                      color: on ? '#e9d5ff' : 'rgba(148,163,184,0.65)',
                      boxShadow: on ? '0 0 28px rgba(124,58,237,0.38), inset 0 1px 0 rgba(255,255,255,0.08)' : 'none',
                      textShadow: on ? '0 0 14px rgba(168,85,247,0.6)' : 'none',
                    }}>
                    <span style={{ fontSize: 16 }}>{ins.icon}</span>
                    {ins.label}
                    {on && <div className="ml-auto rounded-full"
                      style={{ width: 7, height: 7, background: '#a855f7', boxShadow: '0 0 8px #a855f7, 0 0 16px rgba(168,85,247,0.6)' }} />}
                  </button>
                )
              })}
            </div>
          </section>

          <div style={S.divider} />

          {/* Key */}
          <section>
            <label style={S.sectionLabel}>Key</label>
            <div className="grid grid-cols-4 gap-1.5">
              {ROOTS.map(r => {
                const on = root === r
                return (
                  <button key={r} onClick={() => setRoot(r)}
                    className="rounded-lg text-xs font-mono font-bold transition-all"
                    style={{
                      padding: '11px 4px',
                      background: on ? 'linear-gradient(135deg, rgba(124,58,237,0.55), rgba(109,40,217,0.35))' : 'rgba(255,255,255,0.03)',
                      border: on ? '1px solid rgba(168,85,247,0.65)' : '1px solid rgba(255,255,255,0.06)',
                      color: on ? '#f0d9ff' : 'rgba(148,163,184,0.55)',
                      boxShadow: on ? '0 0 16px rgba(124,58,237,0.5), inset 0 1px 0 rgba(255,255,255,0.1)' : 'none',
                      textShadow: on ? '0 0 10px rgba(192,132,252,0.9)' : 'none',
                    }}>
                    {r}
                  </button>
                )
              })}
            </div>
          </section>

          {/* Scale */}
          <section>
            <label style={S.sectionLabel}>Scale</label>
            <div className="flex flex-col gap-1.5">
              {SCALE_NAMES.map(s => {
                const on = scale === s
                return (
                  <button key={s} onClick={() => setScale(s)}
                    className="rounded-lg text-xs text-left transition-all capitalize font-semibold"
                    style={{
                      padding: '11px 16px',
                      background: on
                        ? 'linear-gradient(90deg, rgba(6,182,212,0.25) 0%, rgba(6,182,212,0.08) 100%)'
                        : 'rgba(255,255,255,0.025)',
                      border: on ? '1px solid rgba(6,182,212,0.55)' : '1px solid rgba(255,255,255,0.05)',
                      borderLeft: on ? '3px solid rgba(6,182,212,0.85)' : '3px solid transparent',
                      color: on ? '#67e8f9' : 'rgba(148,163,184,0.55)',
                      boxShadow: on ? '0 0 18px rgba(6,182,212,0.28), inset 0 1px 0 rgba(255,255,255,0.05)' : 'none',
                      textShadow: on ? '0 0 10px rgba(6,182,212,0.7)' : 'none',
                    }}>
                    {s}
                  </button>
                )
              })}
            </div>
          </section>

          <div style={S.divider} />

          {/* Octave */}
          <section>
            <label style={S.sectionLabel}>Octave</label>
            <div className="flex items-center gap-2">
              {[['−', handleOctaveDown], ['+', handleOctaveUp]].map(([label, fn], i) => (
                <button key={label} onClick={fn}
                  className="rounded-xl font-bold transition-all flex items-center justify-center"
                  style={{
                    width: 46, height: 46,
                    background: 'rgba(124,58,237,0.18)',
                    border: '1px solid rgba(124,58,237,0.45)',
                    color: '#c084fc', fontSize: '1.3rem',
                    boxShadow: '0 0 16px rgba(124,58,237,0.22)',
                    order: i === 0 ? 0 : 2,
                  }}>
                  {label}
                </button>
              ))}
              <span className="flex-1 text-center font-bold font-mono"
                style={{ fontSize: '1.6rem', color: '#c084fc', textShadow: '0 0 18px rgba(168,85,247,0.7)', order: 1 }}>
                {octave}
              </span>
            </div>
            {octaveMsg && (
              <p style={{ fontSize: '0.62rem', color: '#22d3ee', textAlign: 'center', marginTop: 6, letterSpacing: '0.06em', opacity: 0.85 }}>
                {octaveMsg}
              </p>
            )}
          </section>

          <div style={S.divider} />

          {/* MIDI Out */}
          <section>
            <label style={S.sectionLabel}>
              MIDI Out
              {midiOutputId && (
                <span style={{ marginLeft: 8, display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#22d3ee', boxShadow: '0 0 6px #22d3ee', verticalAlign: 'middle' }} />
              )}
            </label>

            {!midiReady ? (
              <p style={{ fontSize: '0.65rem', color: 'rgba(148,163,184,0.4)', lineHeight: 1.5 }}>
                Web MIDI not available — use Chrome or Edge
              </p>
            ) : midiOutputs.length === 0 ? (
              <p style={{ fontSize: '0.65rem', color: 'rgba(148,163,184,0.4)', lineHeight: 1.5 }}>
                No MIDI devices found.<br/>
                Enable <span style={{ color: '#c084fc' }}>IAC Driver</span> in<br/>
                Audio MIDI Setup → Studio.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                <select
                  value={midiOutputId}
                  onChange={e => handleMidiOutputChange(e.target.value)}
                  className="rounded-lg text-xs font-semibold w-full"
                  style={{
                    padding: '9px 12px',
                    background: 'rgba(255,255,255,0.04)',
                    border: midiOutputId ? '1px solid rgba(34,211,238,0.45)' : '1px solid rgba(255,255,255,0.08)',
                    color: midiOutputId ? '#67e8f9' : 'rgba(148,163,184,0.5)',
                    outline: 'none',
                    cursor: 'pointer',
                  }}>
                  <option value="">— off —</option>
                  {midiOutputs.map(o => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>

                {midiOutputId && (
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize: '0.62rem', color: 'rgba(148,163,184,0.45)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Ch</span>
                    <div className="flex gap-1">
                      {[1,2,3,4].map(ch => (
                        <button key={ch} onClick={() => handleMidiChannelChange(ch)}
                          className="rounded-md font-mono font-bold transition-all"
                          style={{
                            flex: 1, padding: '5px 0', fontSize: '0.65rem',
                            background: midiCh === ch ? 'rgba(34,211,238,0.25)' : 'rgba(255,255,255,0.04)',
                            border: midiCh === ch ? '1px solid rgba(34,211,238,0.5)' : '1px solid rgba(255,255,255,0.06)',
                            color: midiCh === ch ? '#22d3ee' : 'rgba(148,163,184,0.4)',
                          }}>
                          {ch}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        </aside>

        {/* ── Main ────────────────────────────────────────────────────── */}
        <main className="flex-1 flex flex-col overflow-hidden">

          {/* Piano zone */}
          <div className="flex-shrink-0"
            style={{
              padding: isMobile ? '10px 16px' : '10px 28px 10px 32px',
              overflow: 'hidden',
              background: 'linear-gradient(180deg, rgba(16,8,36,0.88) 0%, rgba(8,5,18,0.72) 60%, rgba(6,4,14,0.5) 100%)',
              borderBottom: '1px solid rgba(124,58,237,0.22)',
              boxShadow: '0 8px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(124,58,237,0.14), 0 0 50px rgba(124,58,237,0.05)',
            }}>

            {isMobile ? (
              /* ── Mobile piano zone ── */
              <div className="flex flex-col gap-2 w-full">
                {/* Row 1: compact chord badge + variation pills */}
                <div className="flex items-center gap-2 w-full">
                  <ChordDisplay compact activeNotes={activeNotes} />
                  <div className="flex gap-1.5 overflow-x-auto flex-1" style={{ paddingBottom: 2 }}>
                    {(() => {
                      const inst = INSTRUMENTS.find(i => i.id === instrument)
                      return inst?.variations.map((v, idx) => {
                        const on = variation === idx
                        return (
                          <button key={idx} onClick={() => handleVariationChange(idx)}
                            className="rounded-lg font-semibold flex-shrink-0 transition-all"
                            style={{
                              padding: '5px 10px', fontSize: '0.68rem',
                              background: on ? 'linear-gradient(135deg, rgba(124,58,237,0.45), rgba(109,40,217,0.28))' : 'rgba(255,255,255,0.04)',
                              border: on ? '1px solid rgba(168,85,247,0.55)' : '1px solid rgba(255,255,255,0.07)',
                              color: on ? '#f0e0ff' : 'rgba(148,163,184,0.5)',
                              boxShadow: on ? '0 0 10px rgba(124,58,237,0.3)' : 'none',
                            }}>
                            {v}
                          </button>
                        )
                      })
                    })()}
                  </div>
                </div>
                {/* Row 2: 2-octave compact piano, scrollable */}
                <div style={{ overflowX: 'auto', width: '100%' }}>
                  <Piano
                    compact octaveStart={octave} numOctaves={2} keyboardMode={false}
                    highlightNotes={scaleHighlights}
                    chordNotes={chordHighlights}
                    onNoteOn={handlePianoNoteOn}
                    onNoteOff={handlePianoNoteOff}
                  />
                </div>
              </div>
            ) : (
              /* ── Desktop piano zone — 2-row layout ── */
              <div className="flex flex-col gap-1">
                {/* Row 1: chord display + keyboard toggle + sampler loading */}
                <div className="flex items-center gap-3">
                  <ChordDisplay activeNotes={activeNotes} />
                  <div className="flex-1" />
                  {samplerLoading && (
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#22d3ee', animation: 'pulse 1s ease-in-out infinite' }} />
                      <span style={{ fontSize: '0.62rem', color: '#22d3ee', letterSpacing: '0.08em' }}>loading…</span>
                    </div>
                  )}
                  <button
                    onClick={() => setKeyboardMode(m => !m)}
                    className="flex items-center justify-center gap-1.5 rounded-xl font-semibold transition-all"
                    style={{
                      padding: '8px 14px', fontSize: '0.72rem',
                      background: keyboardMode ? 'linear-gradient(135deg, rgba(124,58,237,0.38) 0%, rgba(109,40,217,0.22) 100%)' : 'rgba(255,255,255,0.03)',
                      border: keyboardMode ? '1px solid rgba(168,85,247,0.6)' : '1px solid rgba(255,255,255,0.07)',
                      color: keyboardMode ? '#e9d5ff' : 'rgba(148,163,184,0.4)',
                      boxShadow: keyboardMode ? '0 0 16px rgba(124,58,237,0.4)' : 'none',
                      letterSpacing: '0.04em',
                      textShadow: keyboardMode ? '0 0 10px rgba(168,85,247,0.9)' : 'none',
                    }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="7" width="20" height="14" rx="2"/>
                      <path d="M6 7V4"/><path d="M18 7V4"/>
                    </svg>
                    Keys {keyboardMode ? 'ON' : 'OFF'}
                  </button>
                </div>

                {/* Row 2: piano + bass pedals (scrollable) + variation stops */}
                <div className="flex items-start gap-3">
                  <div className="flex flex-col gap-2" style={{ overflowX: 'auto', flex: 1, minWidth: 0 }}>
                    <Piano
                      octaveStart={octave} numOctaves={2} keyboardMode={keyboardMode}
                      clipEnd={null}
                      highlightNotes={scaleHighlights}
                      chordNotes={chordHighlights}
                      onNoteOn={handlePianoNoteOn}
                      onNoteOff={handlePianoNoteOff}
                      onOctaveUp={handleOctaveUp}
                      onOctaveDown={handleOctaveDown}
                    />
                    <BassPedals
                      octave={octave - 1}
                      keyboardMode={keyboardMode}
                      highlightNotes={scaleHighlights}
                      chordNotes={chordHighlights}
                      onNoteOn={handlePianoNoteOn}
                      onNoteOff={handlePianoNoteOff}
                    />
                  </div>
                  <div className="flex flex-col items-stretch gap-1.5 flex-shrink-0" style={{ width: 108 }}>
                    {(() => {
                      const inst = INSTRUMENTS.find(i => i.id === instrument)
                      return inst?.variations.map((v, idx) => {
                        const on = variation === idx
                        return (
                          <button key={idx} onClick={() => handleVariationChange(idx)}
                            className="rounded-lg font-semibold transition-all"
                            style={{
                              padding: '7px 10px', fontSize: '0.72rem', letterSpacing: '0.03em', textAlign: 'left',
                              background: on ? 'linear-gradient(135deg, rgba(124,58,237,0.45), rgba(109,40,217,0.28))' : 'rgba(255,255,255,0.03)',
                              border: on ? '1px solid rgba(168,85,247,0.55)' : '1px solid rgba(255,255,255,0.06)',
                              color: on ? '#f0e0ff' : 'rgba(148,163,184,0.5)',
                              boxShadow: on ? '0 0 12px rgba(124,58,237,0.35), inset 0 1px 0 rgba(255,255,255,0.06)' : 'none',
                              textShadow: on ? '0 0 8px rgba(168,85,247,0.7)' : 'none',
                            }}>
                            <span style={{ opacity: 0.5, marginRight: 5, fontSize: '0.65rem' }}>{idx + 1}</span>
                            {v}
                          </button>
                        )
                      })
                    })()}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Tab area */}
          <div className="flex-1 flex flex-col overflow-hidden gap-3" style={{ padding: '12px 32px' }}>

            {/* Tab bar + contextual actions */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <div style={{ overflowX: 'auto', flexShrink: 0 }}>
                <div className="flex items-center gap-1"
                  style={{
                    background: 'rgba(10,5,22,0.85)',
                    border: '1px solid rgba(124,58,237,0.2)',
                    borderRadius: 14,
                    padding: '4px',
                    width: 'fit-content',
                    backdropFilter: 'blur(12px)',
                    boxShadow: '0 0 20px rgba(124,58,237,0.08)',
                  }}>
                  {TABS.map(tab => {
                    const on = activeTab === tab
                    return (
                      <button key={tab} onClick={() => setActiveTab(tab)}
                        className="rounded-xl font-semibold transition-all"
                        style={{
                          padding: '6px 18px',
                          fontSize: '0.78rem',
                          background: on
                            ? 'linear-gradient(135deg, rgba(124,58,237,0.58), rgba(109,40,217,0.38))'
                            : 'transparent',
                          color: on ? '#f0e0ff' : 'rgba(148,163,184,0.45)',
                          border: on ? '1px solid rgba(168,85,247,0.55)' : '1px solid transparent',
                          boxShadow: on ? '0 0 22px rgba(124,58,237,0.4), inset 0 1px 0 rgba(255,255,255,0.1)' : 'none',
                          letterSpacing: '0.04em',
                          textShadow: on ? '0 0 12px rgba(168,85,247,0.8)' : 'none',
                        }}>
                        {tab}
                      </button>
                    )
                  })}
                </div>
              </div>

              {activeTab === 'Generate' && (
                <>
                  <div className="flex-1" />
                  <span style={{ fontSize: '0.68rem', color: 'rgba(148,163,184,0.4)', letterSpacing: '0.04em', flexShrink: 0 }}>
                    <span style={{ color: '#c084fc' }}>{root}</span>{' '}
                    <span style={{ color: '#22d3ee' }}>{scale}</span>
                  </span>
                  <button
                    onClick={generateMelodies} disabled={generating}
                    className={`flex items-center gap-1.5 rounded-xl font-semibold transition-all flex-shrink-0${!generating ? ' btn-breathe' : ''}`}
                    style={{
                      padding: '6px 16px',
                      fontSize: '0.78rem',
                      background: generating
                        ? 'rgba(124,58,237,0.1)'
                        : 'linear-gradient(135deg, rgba(124,58,237,0.58), rgba(109,40,217,0.38))',
                      border: generating ? '1px solid rgba(168,85,247,0.2)' : '1px solid rgba(168,85,247,0.55)',
                      color: generating ? 'rgba(168,85,247,0.4)' : '#f0e0ff',
                      boxShadow: generating ? 'none' : '0 0 14px rgba(124,58,237,0.35), inset 0 1px 0 rgba(255,255,255,0.1)',
                      letterSpacing: '0.04em',
                      textShadow: generating ? 'none' : '0 0 10px rgba(168,85,247,0.8)',
                    }}>
                    {generating ? (
                      <div className="w-3 h-3 rounded-full border-2 border-purple-500 border-t-transparent"
                        style={{ animation: 'spin 0.8s linear infinite' }} />
                    ) : (
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="23,4 23,10 17,10"/>
                        <path d="M20.5 15a9 9 0 11-2.6-7.4L23 10"/>
                      </svg>
                    )}
                    {generating ? 'Generating…' : 'Regenerate'}
                  </button>
                  {melodies.length > 0 && (
                    <button
                      onClick={playAll}
                      className="flex items-center gap-1.5 rounded-xl font-semibold transition-all flex-shrink-0"
                      style={{
                        padding: '6px 16px',
                        fontSize: '0.78rem',
                        background: playAllIdx >= 0 ? 'rgba(34,211,238,0.18)' : 'rgba(34,211,238,0.06)',
                        border: playAllIdx >= 0 ? '1px solid rgba(34,211,238,0.5)' : '1px solid rgba(34,211,238,0.2)',
                        color: playAllIdx >= 0 ? '#22d3ee' : 'rgba(34,211,238,0.5)',
                        boxShadow: playAllIdx >= 0 ? '0 0 14px rgba(34,211,238,0.25)' : 'none',
                        letterSpacing: '0.04em',
                        textShadow: playAllIdx >= 0 ? '0 0 10px rgba(34,211,238,0.7)' : 'none',
                      }}>
                      {playAllIdx >= 0 ? (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                          <rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>
                        </svg>
                      ) : (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                          <polygon points="5,3 19,12 5,21"/>
                        </svg>
                      )}
                      {playAllIdx >= 0 ? `${playAllIdx + 1} / ${melodies.length}` : 'Play All'}
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-hidden">

              {/* Generate */}
              {activeTab === 'Generate' && (
                <div className="flex flex-col h-full gap-3">
                  {/* Settings strip — Bars + Count */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="flex items-center gap-1">
                      <span style={{ fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.14em', color: 'rgba(168,85,247,0.5)', textTransform: 'uppercase' }}>Bars</span>
                      {[1, 2, 4].map(b => (
                        <button key={b} onClick={() => setGenBars(b)}
                          className="rounded font-bold font-mono transition-all"
                          style={{
                            padding: '3px 8px', fontSize: '0.68rem',
                            background: genBars === b ? 'rgba(124,58,237,0.45)' : 'rgba(255,255,255,0.04)',
                            border: genBars === b ? '1px solid rgba(168,85,247,0.6)' : '1px solid rgba(255,255,255,0.07)',
                            color: genBars === b ? '#e0aaff' : 'rgba(148,163,184,0.45)',
                            boxShadow: genBars === b ? '0 0 8px rgba(124,58,237,0.3)' : 'none',
                          }}>
                          {b}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-1">
                      <span style={{ fontSize: '0.58rem', fontWeight: 700, letterSpacing: '0.14em', color: 'rgba(168,85,247,0.5)', textTransform: 'uppercase' }}>Count</span>
                      {[4, 8, 12].map(c => (
                        <button key={c} onClick={() => setGenCount(c)}
                          className="rounded font-bold font-mono transition-all"
                          style={{
                            padding: '3px 8px', fontSize: '0.68rem',
                            background: genCount === c ? 'rgba(124,58,237,0.45)' : 'rgba(255,255,255,0.04)',
                            border: genCount === c ? '1px solid rgba(168,85,247,0.6)' : '1px solid rgba(255,255,255,0.07)',
                            color: genCount === c ? '#e0aaff' : 'rgba(148,163,184,0.45)',
                            boxShadow: genCount === c ? '0 0 8px rgba(124,58,237,0.3)' : 'none',
                          }}>
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto min-h-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4" style={{ gridAutoRows: 'min-content' }}>
                      {melodies.map((melody, i) => (
                        <MelodyCard key={i} melody={melody} index={i} bpm={bpm} onSave={handleSaveMelody}
                          isPlaying={playAllIdx === i} />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Chords */}
              {activeTab === 'Chords' && (
                <ChordProgressionPanel root={root} scale={scale} bpm={bpm} onChordChange={setChordHighlights} />
              )}

              {/* Session */}
              {activeTab === 'Session' && (
                <SessionTab root={root} scale={scale} bpm={bpm} />
              )}

              {/* Browse */}
              {activeTab === 'Browse' && (
                <BrowseTab bpm={bpm} onSave={handleSaveMelody} />
              )}

              {/* Inventory */}
              {activeTab === 'Inventory' && (
                <div className="flex flex-col h-full gap-3">
                  <div className="flex items-center justify-between flex-shrink-0">
                    <div>
                      <h2 className="font-bold" style={{ color: '#e2e8f0', fontSize: '0.9rem', letterSpacing: '-0.01em' }}>
                        Loop Inventory
                      </h2>
                      <p className="text-xs mt-0.5" style={{ color: 'rgba(148,163,184,0.45)' }}>
                        <span style={{ color: '#c084fc' }}>{loops.length}</span> saved loop{loops.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto min-h-0">
                    <LoopInventory loops={loops} onDelete={handleDeleteLoop} bpm={bpm} />
                  </div>
                </div>
              )}

              {/* Record */}
              {activeTab === 'Record' && (
                <div className="flex flex-col h-full gap-4">
                  <h2 className="font-bold flex-shrink-0" style={{ color: '#e2e8f0', fontSize: '0.9rem', letterSpacing: '-0.01em' }}>
                    Record a Snippet
                  </h2>
                  <div className="rounded-2xl p-5 flex-shrink-0"
                    style={{
                      background: 'rgba(6,20,28,0.8)',
                      border: '1px solid rgba(6,182,212,0.25)',
                      boxShadow: '0 0 24px rgba(6,182,212,0.08), inset 0 1px 0 rgba(6,182,212,0.08)',
                    }}>
                    <Recorder
                      ref={recorderRef}
                      onSaveRecording={(mel) => { handleSaveMelody(mel); setActiveTab('Inventory') }}
                    />
                  </div>
                  <div className="rounded-2xl p-4 flex-shrink-0"
                    style={{
                      background: 'rgba(10,5,22,0.6)',
                      border: '1px solid rgba(124,58,237,0.14)',
                    }}>
                    <p className="text-xs font-bold mb-2" style={{ color: 'rgba(168,85,247,0.55)', letterSpacing: '0.1em', textTransform: 'uppercase', fontSize: '0.6rem' }}>
                      How to record
                    </p>
                    <ul className="flex flex-col gap-1.5 text-xs" style={{ color: 'rgba(148,163,184,0.5)' }}>
                      <li>1. Make sure <strong style={{ color: '#c084fc' }}>Keyboard</strong> is ON above</li>
                      <li>2. Hit <strong style={{ color: '#22d3ee' }}>Start Recording</strong> then play notes</li>
                      <li>3. Hit <strong style={{ color: '#22d3ee' }}>Stop Recording</strong> when done</li>
                      <li>4. Save the snippet to your Loop Inventory</li>
                    </ul>
                  </div>
                </div>
              )}

            </div>
          </div>
        </main>
      </div>

      <button
        onClick={toggleDbg}
        style={{
          position: 'fixed', bottom: 12, right: 12, zIndex: 9999,
          padding: '6px 10px', borderRadius: 8, fontSize: '0.65rem', fontWeight: 700,
          background: dbgVisible ? 'rgba(239,68,68,0.9)' : 'rgba(30,20,50,0.85)',
          border: '1px solid rgba(168,85,247,0.4)', color: dbgVisible ? '#fff' : '#c084fc',
          backdropFilter: 'blur(8px)', cursor: 'pointer',
        }}>
        {dbgVisible ? 'HIDE' : 'DBG'}
      </button>

      {dbgVisible && (
        <div style={{
          position: 'fixed', bottom: 48, left: 8, right: 8, zIndex: 9998,
          maxHeight: '45vh', overflowY: 'auto',
          background: 'rgba(4,2,10,0.96)', border: '1px solid rgba(168,85,247,0.35)',
          borderRadius: 10, padding: '10px 12px', backdropFilter: 'blur(12px)',
          fontFamily: 'monospace', fontSize: '0.6rem', color: '#a3e635', lineHeight: 1.6,
        }}>
          {dbgLines.length === 0
            ? <span style={{ color: 'rgba(148,163,184,0.5)' }}>no logs yet</span>
            : dbgLines.map((l, i) => <div key={i}>{l}</div>)
          }
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
