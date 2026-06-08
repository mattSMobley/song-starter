import { useState, useRef, useEffect } from 'react'
import * as Tone from 'tone'
import { snapToScale } from '../audio/scales.js'

// ── Pitch detection helpers ────────────────────────────────────────────────────
function detectPitch(buf, sampleRate) {
  let rms = 0
  for (let i = 0; i < buf.length; i++) rms += buf[i] * buf[i]
  if (Math.sqrt(rms / buf.length) < 0.012) return null
  const half = Math.floor(buf.length / 2)
  const c = new Float32Array(half)
  for (let i = 0; i < half; i++)
    for (let j = 0; j < half; j++) c[i] += buf[j] * buf[j + i]
  let d = 0
  while (d < half - 1 && c[d] > c[d + 1]) d++
  let best = d, bestVal = -Infinity
  for (let i = d; i < half; i++) if (c[i] > bestVal) { bestVal = c[i]; best = i }
  if (best <= 0 || best >= half - 1) return null
  const y1 = c[best - 1], y2 = c[best], y3 = c[best + 1]
  const x  = best + (y3 - y1) / (2 * (2 * y2 - y1 - y3))
  const freq = sampleRate / x
  return freq > 60 && freq < 1300 ? freq : null
}

const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']
function freqToNoteName(freq) {
  if (!freq || freq < 20) return '—'
  const midi = Math.round(69 + 12 * Math.log2(freq / 440))
  return NOTE_NAMES[((midi % 12) + 12) % 12] + (Math.floor(midi / 12) - 1)
}
function noteNameToMidi(name) {
  const N = { C:0,'C#':1,D:2,'D#':3,E:4,F:5,'F#':6,G:7,'G#':8,A:9,'A#':10,B:11 }
  const m = name.match(/^([A-G]#?)(-?\d+)$/)
  return m ? (parseInt(m[2]) + 1) * 12 + (N[m[1]] ?? 0) : 60
}

// ── VocalMonitor ──────────────────────────────────────────────────────────────
// Always renders as a compact column (left of keyboard on desktop, icon on mobile).
// onChange({ armed, inputNote, targetNote }) fires on every state change so
// parent can pass notes/status to other components (e.g. SessionTab).

export default function VocalMonitor({ root, scale, strength, bypass, onBypassToggle, onChange, isMobile = false }) {
  const [micArmed, setMicArmed]     = useState(false)
  const [micAllowed, setMicAllowed] = useState(true)
  const [inputNote, setInputNote]   = useState('—')
  const [targetNote, setTargetNote] = useState('—')

  const umRef       = useRef(null)
  const psRef       = useRef(null)
  const paRef       = useRef(null)
  const rafRef      = useRef(null)
  const rootRef     = useRef(root)
  const scaleRef    = useRef(scale)
  const strengthRef = useRef(strength)
  const bypassRef   = useRef(bypass)
  const onChangeRef = useRef(onChange)

  useEffect(() => { rootRef.current = root;     scaleRef.current = scale   }, [root, scale])
  useEffect(() => { strengthRef.current = strength },                          [strength])
  useEffect(() => { bypassRef.current   = bypass },                            [bypass])
  onChangeRef.current = onChange

  // Notify parent whenever armed state or notes change
  useEffect(() => {
    onChangeRef.current?.({ armed: micArmed, inputNote, targetNote })
  }, [micArmed, inputNote, targetNote])

  useEffect(() => () => teardownMic(), [])

  function teardownMic() {
    cancelAnimationFrame(rafRef.current)
    try {
      if (umRef.current) { umRef.current.close(); umRef.current.dispose(); umRef.current = null }
      if (psRef.current) { psRef.current.disconnect(); psRef.current.dispose(); psRef.current = null }
      if (paRef.current) { paRef.current.disconnect(); paRef.current.dispose(); paRef.current = null }
    } catch {}
  }

  async function armMic() {
    try {
      await Tone.start()
      const um = new Tone.UserMedia()
      await um.open()
      const ps = new Tone.PitchShift({ pitch: 0, windowSize: 0.1 }).toDestination()
      const pa = new Tone.Analyser('waveform', 2048)
      um.connect(ps); um.connect(pa)
      umRef.current = um; psRef.current = ps; paRef.current = pa
      setMicArmed(true)
      startPitchLoop()
    } catch { setMicAllowed(false) }
  }

  function disarmMic() {
    setMicArmed(false); setInputNote('—'); setTargetNote('—')
    teardownMic()
  }

  function startPitchLoop() {
    let smoothShift = 0
    function tick() {
      rafRef.current = requestAnimationFrame(tick)
      if (!paRef.current || !psRef.current) return
      const freq = detectPitch(paRef.current.getValue(), Tone.context.sampleRate)
      if (freq) {
        const inputMidi   = 69 + 12 * Math.log2(freq / 440)
        const snapped     = snapToScale(Math.round(inputMidi), rootRef.current, scaleRef.current)
        const snappedMidi = noteNameToMidi(snapped)
        const rawShift    = snappedMidi - inputMidi
        const targetShift = bypassRef.current ? 0 : rawShift * (strengthRef.current / 100)
        smoothShift       = smoothShift * 0.7 + targetShift * 0.3
        psRef.current.pitch = smoothShift
        setInputNote(freqToNoteName(freq))
        setTargetNote(bypassRef.current ? '—' : snapped)
      } else {
        smoothShift = smoothShift * 0.85
        psRef.current.pitch = smoothShift
      }
    }
    tick()
  }

  // Mobile: vertical capsule mic (clean, fits in 44px square)
  const mobileMicIcon = (size) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 4 Q8 1.5 12 1.5 Q16 1.5 16 4 L16 14 Q16 16.5 12 16.5 Q8 16.5 8 14 Z"/>
      <rect x="11" y="17" width="2" height="3"/>
      <rect x="8.5" y="20" width="7" height="2" rx="1"/>
    </svg>
  )

  // Desktop: vintage broadcast mic (wide grille body with horizontal lines, tilted ~32°)
  // fillRule=evenodd punches the grille lines through the body as transparent slots
  const desktopMicIcon = (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
      <g transform="rotate(-32 12 12)">
        <path fillRule="evenodd" d="
          M12 2.5 C9.2 2.5 7.5 4.2 7.5 6 L7.5 16.5 C7.5 18.3 9.2 19.5 12 19.5
          C14.8 19.5 16.5 18.3 16.5 16.5 L16.5 6 C16.5 4.2 14.8 2.5 12 2.5 Z
          M8 7.5 L16 7.5 L16 8.5 L8 8.5 Z
          M8 10.2 L16 10.2 L16 11.1 L8 11.1 Z
          M8 12.8 L16 12.8 L16 13.7 L8 13.7 Z
          M8 15.5 L16 15.5 L16 16.2 L8 16.2 Z
        "/>
        <rect x="11" y="19.5" width="2" height="2.5"/>
        <rect x="9" y="22" width="6" height="1.5" rx="0.75"/>
      </g>
    </svg>
  )

  const micBtnStyle = (w, h) => ({
    width: w, height: h,
    background: micArmed
      ? 'linear-gradient(135deg, rgba(236,72,153,0.45), rgba(219,39,119,0.25))'
      : 'rgba(255,255,255,0.04)',
    border: micArmed ? '1px solid rgba(236,72,153,0.6)' : '1px solid rgba(255,255,255,0.08)',
    color: micArmed ? '#fbcfe8' : 'rgba(148,163,184,0.45)',
    boxShadow: micArmed ? '0 0 16px rgba(236,72,153,0.35)' : 'none',
    cursor: micAllowed ? 'pointer' : 'not-allowed',
    opacity: micAllowed ? 1 : 0.4,
  })

  const atBtnStyle = (w, h) => ({
    width: w, height: h,
    background: bypass
      ? 'rgba(255,255,255,0.04)'
      : 'linear-gradient(135deg, rgba(168,85,247,0.35), rgba(139,92,246,0.2))',
    border: bypass ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(168,85,247,0.5)',
    color: bypass ? 'rgba(148,163,184,0.4)' : '#c4b5fd',
    fontWeight: 700,
    letterSpacing: '0.04em',
    cursor: 'pointer',
  })

  const D = 120 // desktop column width — matches the shared left column in App.jsx

  if (!isMobile) {
    // ── Desktop: landscape rectangle button + vintage angled mic icon ──────────
    return (
      <div className="flex flex-col items-center gap-1.5 flex-shrink-0" style={{ width: D }}>
        <button
          data-tour="mic-btn"
          onClick={micArmed ? disarmMic : armMic}
          disabled={!micAllowed}
          title={micArmed ? 'Disarm mic' : micAllowed ? 'Arm mic for autotune' : 'Mic access denied'}
          className="flex items-center justify-center rounded-xl transition-all"
          style={micBtnStyle(D, 46)}>
          {desktopMicIcon}
        </button>

        {micArmed && (
          <>
          <button
            onClick={onBypassToggle}
            title={bypass ? 'Bypassed — click to enable autotune' : 'Autotune on — click to bypass'}
            className="flex items-center justify-center rounded-lg transition-all"
            style={{ ...atBtnStyle(D, 28), fontSize: '0.65rem' }}>
            {bypass ? '○ Bypass' : '● Autotune'}
          </button>
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-center gap-0">
              <span style={{ fontSize: '0.52rem', fontWeight: 700, color: 'rgba(236,72,153,0.5)', letterSpacing: '0.06em' }}>in</span>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, fontFamily: 'monospace', color: '#f9a8d4', lineHeight: 1 }}>{inputNote}</span>
            </div>
            <span style={{ fontSize: '0.6rem', color: 'rgba(236,72,153,0.4)' }}>→</span>
            <div className="flex flex-col items-center gap-0">
              <span style={{ fontSize: '0.52rem', fontWeight: 700, color: 'rgba(168,85,247,0.5)', letterSpacing: '0.06em' }}>out</span>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, fontFamily: 'monospace', color: '#ec4899', lineHeight: 1 }}>{targetNote}</span>
            </div>
          </div>
          </>
        )}

        {!micAllowed && (
          <span style={{ fontSize: '0.5rem', color: 'rgba(248,113,113,0.6)', textAlign: 'center', lineHeight: 1.3 }}>
            mic denied
          </span>
        )}
      </div>
    )
  }

  // ── Mobile: compact 44px column ────────────────────────────────────────────
  return (
    <div className="flex flex-col items-center gap-1.5 flex-shrink-0" style={{ width: 44 }}>
      <button
        data-tour="mic-btn"
        onClick={micArmed ? disarmMic : armMic}
        disabled={!micAllowed}
        title={micArmed ? 'Disarm mic' : micAllowed ? 'Arm mic for autotune' : 'Mic access denied'}
        className="flex items-center justify-center rounded-xl transition-all"
        style={micBtnStyle(44, 44)}>
        {mobileMicIcon(20)}
      </button>

      {micArmed && (
        <>
        <button
          onClick={onBypassToggle}
          title={bypass ? 'Bypassed — click to enable' : 'Autotune on — click to bypass'}
          className="flex items-center justify-center rounded-lg transition-all"
          style={{ ...atBtnStyle(44, 22), fontSize: '0.5rem' }}>
          {bypass ? 'RAW' : 'AT'}
        </button>
        <div className="flex flex-col items-center gap-0.5">
          <span style={{ fontSize: '0.58rem', fontWeight: 700, color: 'rgba(236,72,153,0.5)', letterSpacing: '0.06em' }}>in</span>
          <span style={{ fontSize: '0.7rem', fontWeight: 700, fontFamily: 'monospace', color: '#f9a8d4', lineHeight: 1 }}>{inputNote}</span>
          <span style={{ fontSize: '0.58rem', color: 'rgba(236,72,153,0.4)' }}>↓</span>
          <span style={{ fontSize: '0.7rem', fontWeight: 700, fontFamily: 'monospace', color: '#ec4899', lineHeight: 1 }}>{targetNote}</span>
        </div>
        </>
      )}

      {!micAllowed && (
        <span style={{ fontSize: '0.48rem', color: 'rgba(248,113,113,0.6)', textAlign: 'center', lineHeight: 1.3 }}>
          mic<br/>denied
        </span>
      )}
    </div>
  )
}
