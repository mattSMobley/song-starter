import { useState, useEffect, useRef, useCallback } from 'react'
import './kids.css'
import * as engine from './kidsEngine.js'
import { INSTRUMENTS, instById } from './instruments.js'
import { TIERS, tierForAge, VIBES, KEYS } from './theory.js'
import VibeDial from './VibeDial.jsx'
import { ModeFlip, KeyBells, TempoLever, MeterRocker } from './SongControls.jsx'

const MAX_SLOTS = 6
const AGES = [3, 4, 5, 6, 7, 8, 9]
const DEFAULT_SONG = { key: 'C', mode: 'major', meter: 4, tempoScale: 1 }

function load(key, fallback) {
  try { const v = localStorage.getItem(key); return v == null ? fallback : JSON.parse(v) } catch { return fallback }
}
function save(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch {}
}

let uidSeq = Date.now()
const newUid = () => ++uidSeq

export default function KidsApp() {
  const [age, setAge]           = useState(() => load('kids_age', null))
  const [screen, setScreen]     = useState('gate')       // gate | play
  const [audioOn, setAudioOn]   = useState(false)
  const [slots, setSlots]       = useState(() => load('kids_slots', Array(MAX_SLOTS).fill(null)))
  const [song, setSong]         = useState(() => ({ ...DEFAULT_SONG, ...load('kids_song', {}) }))
  const [selected, setSelected] = useState(null)
  const [touched, setTouched]   = useState(() => new Set(load('kids_touched', [])))
  const [playing, setPlaying]   = useState(false)
  const [loaded, setLoaded]     = useState([])
  const [voiceOn, setVoiceOn]   = useState(() => load('kids_voice', true))
  const [idle, setIdle]         = useState(false)
  const [wiggle, setWiggle]     = useState(false)
  const [pickingAge, setPickingAge] = useState(false)

  const tier = TIERS[tierForAge(age ?? 5)]
  const n = tier.slots
  const active = slots.slice(0, n)
  const leaderIdx = active.findIndex(Boolean)
  const leader = active[leaderIdx]

  const iconRefs = useRef([])
  const beatRefs = useRef([])
  const spoken   = useRef(new Set())

  // ── Persist + sync engine ──────────────────────────────────────────────────
  useEffect(() => { save('kids_slots', slots); engine.setSlots(slots.map((s, i) => (i < n ? s : null))) }, [slots, n])
  useEffect(() => { save('kids_song', song); engine.setSong(song) }, [song])
  useEffect(() => { save('kids_touched', [...touched]) }, [touched])
  useEffect(() => engine.onLoadChange(setLoaded), [])

  // Note lights + beat dots: DOM class pulses, no React re-render per note
  useEffect(() => engine.onNote(i => pulse(iconRefs.current[i])), [])
  useEffect(() => engine.onBeat(b => pulse(beatRefs.current[b])), [])

  // ── Spoken prompts (each one once per session) ─────────────────────────────
  const say = useCallback((id, text) => {
    if (!voiceOn || spoken.current.has(id) || !window.speechSynthesis) return
    spoken.current.add(id)
    const u = new SpeechSynthesisUtterance(text)
    u.rate = 0.95
    u.pitch = 1.25
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(u)
  }, [voiceOn])

  // ── Idle wink: after 15 s of no touches, nudge the mood switch ─────────────
  const idleTimer = useRef(null)
  const poke = useCallback(() => {
    setIdle(false)
    clearTimeout(idleTimer.current)
    idleTimer.current = setTimeout(() => setIdle(true), 15000)
  }, [])
  useEffect(() => () => clearTimeout(idleTimer.current), [])
  useEffect(() => { if (idle && playing) say('mood', 'Happy… or sad?') }, [idle, playing, say])

  // ── Start / age ────────────────────────────────────────────────────────────
  async function begin(pickedAge) {
    const init = engine.initKidsAudio()   // must start inside the tap (iOS)
    const resume = active.some(Boolean)
    if (!resume) say('pick', 'Pick an instrument!')   // iOS only allows speech inside the tap too
    if (pickedAge) {
      setAge(pickedAge)
      save('kids_age', pickedAge)
    }
    await init
    setAudioOn(true)
    if (pickedAge) for (let k = 0; k < pickedAge; k++) setTimeout(() => engine.blip(k), 140 * k)
    setScreen('play')
    poke()
    if (resume) { engine.play(); setPlaying(true) }
  }

  function pickAge(a) {
    setPickingAge(false)
    if (!audioOn) return begin(a)
    setAge(a)
    save('kids_age', a)
    for (let k = 0; k < a; k++) setTimeout(() => engine.blip(k), 140 * k)
    setScreen('play')
  }

  // ── Instruments ────────────────────────────────────────────────────────────
  function addInstrument(instId) {
    poke()
    const sel = selected != null && selected < n ? selected : null
    const target = sel ?? active.findIndex(s => !s)
    if (target < 0) {
      engine.boop()
      setWiggle(true)
      setTimeout(() => setWiggle(false), 500)
      return
    }
    const existing = slots[target]
    const slot = existing
      ? { ...existing, inst: instId }
      : { uid: newUid(), inst: instId, vibe: leader ? leader.vibe : 2, vol: 1, oct: 0, muted: false }
    setSlots(prev => prev.map((s, i) => (i === target ? slot : s)))
    if (!existing) setSelected(null)
    if (!engine.isPlaying()) { engine.play(); setPlaying(true) }
    say('dial', 'Turn the dial!')
  }

  function updateSlot(i, patch) {
    setSlots(prev => prev.map((s, j) => (j === i ? { ...s, ...patch } : s)))
  }

  function changeVibe(i, v) {
    poke()
    engine.blip(v)
    updateSlot(i, { vibe: v })
    const uid = slots[i].uid
    if (!touched.has(uid)) {
      setTouched(prev => new Set(prev).add(uid))
      if (active.some(s => !s)) setTimeout(() => say('more', 'Pick another one!'), 1500)
    }
  }

  function removeSlot(i) {
    setSlots(prev => prev.map((s, j) => (j === i ? null : s)))
    setSelected(null)
    if (active.filter(Boolean).length <= 1) setPlaying(false)
  }

  function togglePlay() {
    poke()
    if (playing) { engine.stop(); setPlaying(false) }
    else if (active.some(Boolean)) { engine.play(); setPlaying(true) }
  }

  function surprise() {
    poke()
    const key = KEYS[Math.floor(Math.random() * KEYS.length)].letter
    setSlots(prev => prev.map((s, i) => (s && i < n ? { ...s, vibe: Math.floor(Math.random() * 6) } : s)))
    setSong(s => ({ ...s, key }))
    ;[0, 2, 4, 5].forEach((k, j) => setTimeout(() => engine.blip(k), j * 90))
  }

  // ── Glow guidance (suggests, never blocks) ─────────────────────────────────
  const filled = active.map((s, i) => (s ? i : -1)).filter(i => i >= 0)
  const untouched = filled.filter(i => !touched.has(active[i].uid))
  const firstEmpty = active.findIndex(s => !s)
  const guide = !filled.length
    ? { bank: 'strong', slot: 0 }
    : untouched.length
      ? { dial: untouched[untouched.length - 1] }
      : firstEmpty >= 0 ? { bank: 'soft', slot: firstEmpty } : {}

  // ── Screens ────────────────────────────────────────────────────────────────
  if (screen === 'gate') {
    return (
      <div className={`kids-root ${song.mode}`}>
        <div className="gate">
          {age && !pickingAge ? (
            <>
              <button className="big-start" onClick={() => begin(null)}>▶</button>
              <button className="gate-age" onClick={() => setPickingAge(true)}>🎂 {age}</button>
            </>
          ) : (
            <>
              <div className="gate-cake">🎂</div>
              <div className="balloons">
                {AGES.map((a, i) => (
                  <button key={a} className="balloon" style={{ '--b': VIBES[i % 6].hue, animationDelay: `${i * 0.15}s` }}
                    onClick={() => pickAge(a)}>
                    {a === 9 ? '9+' : a}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    )
  }

  const sel = selected != null ? active[selected] : null

  return (
    <div className={`kids-root ${song.mode}`} onPointerDownCapture={poke}>
      {/* ── Song bar ── */}
      <header className="song-bar">
        <ModeFlip mode={song.mode} glow={idle && playing}
          onChange={mode => setSong(s => ({ ...s, mode }))} />
        {tier.keys && <KeyBells value={song.key} onChange={key => setSong(s => ({ ...s, key }))} />}
        {tier.tempo && <TempoLever value={song.tempoScale} onChange={tempoScale => setSong(s => ({ ...s, tempoScale }))} />}
        {tier.surprise && <button className="surprise" onClick={surprise}>🎲</button>}
      </header>

      {/* ── Stage: slots + play ── */}
      <main className="stage">
        <div className={`slots n${n} ${wiggle ? 'wiggle' : ''}`}>
          {active.map((s, i) => {
            const inst = s && instById(s.inst)
            const vibe = s ? VIBES[s.vibe] : null
            return (
              <div key={i}
                className={`slot ${s ? 'filled' : 'empty'} ${selected === i ? 'selected' : ''} ${guide.slot === i ? 'glow' : ''} ${s?.muted ? 'muted' : ''}`}
                style={vibe ? { '--vibe': vibe.hue, '--vibe-glow': vibe.glow } : undefined}>
                {i === leaderIdx && <span className="crown">👑</span>}
                <button ref={el => (iconRefs.current[i] = el)}
                  className={`slot-icon ${s && loaded[i] === false ? 'loading' : ''}`}
                  onClick={() => setSelected(selected === i ? null : i)}>
                  {s ? (s.muted ? '😴' : inst.icon) : '+'}
                </button>
                {s && (
                  <VibeDial vibe={s.vibe} glow={guide.dial === i}
                    leaderVibe={i === leaderIdx ? null : leader.vibe}
                    showBadges={tier.badges}
                    onChange={v => changeVibe(i, v)} />
                )}
              </div>
            )
          })}
        </div>

        <div className="play-col">
          <button className={`play-btn ${playing ? 'on' : ''}`} onClick={togglePlay}
            disabled={!filled.length}>{playing ? '⏸' : '▶'}</button>
          <div className="beat-dots">
            {Array.from({ length: song.meter }, (_, b) => (
              <span key={b} ref={el => (beatRefs.current[b] = el)} className={b === 0 ? 'one' : ''} />
            ))}
          </div>
        </div>
      </main>

      {/* ── Options tray for the selected slot ── */}
      <div className={`tray ${sel ? 'open' : ''}`}>
        {sel && (
          <>
            <button className={`tray-btn ${sel.muted ? 'on' : ''}`}
              onClick={() => updateSlot(selected, { muted: !sel.muted })}>😴</button>
            {tier.volume && (
              <div className="tray-group">
                {[0, 1, 2].map(v => (
                  <button key={v} className={`vol-bar v${v} ${sel.vol === v ? 'on' : ''}`}
                    onClick={() => updateSlot(selected, { vol: v })}><i /></button>
                ))}
              </div>
            )}
            {tier.octave && (
              <div className="tray-group">
                {[[-1, '✕'], [0, '■'], [1, '●']].map(([o, shape]) => (
                  <button key={o} className={`tray-btn shape ${sel.oct === o ? 'on' : ''}`}
                    onClick={() => updateSlot(selected, { oct: o })}>{shape}</button>
                ))}
              </div>
            )}
            <button className="tray-btn trash" onClick={() => removeSlot(selected)}>🗑️</button>
          </>
        )}
      </div>

      <div className="bottom-row">
      {/* ── Instrument bank ── */}
      <footer className={`bank ${guide.bank ? `glow-${guide.bank}` : ''}`}>
        {INSTRUMENTS.slice(0, tier.bankSize).map(inst => (
          <button key={inst.id} className="bank-btn" onClick={() => addInstrument(inst.id)}>
            {inst.icon}
          </button>
        ))}
      </footer>

      {/* ── Grown-up corner ── */}
      <div className="corner-tools">
        {tier.meter && <MeterRocker meter={song.meter} onChange={meter => setSong(s => ({ ...s, meter }))} />}
        <button className="tool" onClick={() => { save('kids_voice', !voiceOn); setVoiceOn(!voiceOn) }}>
          {voiceOn ? '🗣️' : '🤫'}
        </button>
        <button className="tool" onClick={() => { setPickingAge(true); setScreen('gate') }}>🎂</button>
        <HoldButton onHold={() => { engine.stop(); window.location.href = window.location.pathname }}>🏠</HoldButton>
      </div>
      </div>
    </div>
  )
}

function pulse(el) {
  if (!el) return
  el.classList.remove('hit')
  void el.offsetWidth   // restart the CSS animation
  el.classList.add('hit')
}

// Grown-up exit: hold 1.5 s (kids tap, grown-ups hold)
function HoldButton({ onHold, children }) {
  const t = useRef(null)
  const [holding, setHolding] = useState(false)
  const start = () => { setHolding(true); t.current = setTimeout(onHold, 1500) }
  const cancel = () => { setHolding(false); clearTimeout(t.current) }
  return (
    <button className={`tool hold ${holding ? 'holding' : ''}`}
      onPointerDown={start} onPointerUp={cancel} onPointerLeave={cancel} onPointerCancel={cancel}>
      {children}
    </button>
  )
}
