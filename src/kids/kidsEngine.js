// Kids audio engine: one sampler + channel per slot, shared bus, and the same
// raw-AudioContext lookahead scheduler pattern used by SessionTab (no Transport).
import * as Tone from 'tone'
import { startAudio } from '../audio/engine.js'
import { DRUM_KITS } from '../audio/drumKits.js'
import { instById, sampleUrls } from './instruments.js'
import { PATTERNS, VIBE_KITS } from './patterns.js'
import { VIBES, vibeDistance, degreeToSemis, keyOffset } from './theory.js'

const LOOKAHEAD = 0.15
const TICK_MS   = 20
const MAX_SLOTS = 6
const VOLUMES   = [0.35, 0.7, 1]
const ROLE_RELEASE = { bass: 0.4, comp: 0.8, melody: 0.5, sparkle: 1.2, pad: 1.6 }
// Roles whose sustained notes count as "busy" when a complement looks for gaps
const HOLD_IS_BUSY = new Set(['bass', 'comp', 'melody', 'sparkle'])

const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1)

// ── State ────────────────────────────────────────────────────────────────────
const song = { key: 'C', mode: 'major', meter: 4, tempoScale: 1 }
let pendingMeter = null
let slots = []                  // [{ inst, vibe, vol, oct, muted } | null]
const voices = []               // per slot: { instId, sampler, loaded }
const channels = []             // per slot: Tone.Gain
let bus, limiter, ready = false

let playing = false, schedTimer = null
let nextTime = 0, barStep = 0, barIndex = 0

const noteListeners = new Set()
const beatListeners = new Set()
const loadListeners = new Set()
export const onNote = cb => (noteListeners.add(cb), () => noteListeners.delete(cb))
export const onBeat = cb => (beatListeners.add(cb), () => beatListeners.delete(cb))
export const onLoadChange = cb => (loadListeners.add(cb), () => loadListeners.delete(cb))

// ── Audio graph ──────────────────────────────────────────────────────────────
export async function initKidsAudio() {
  if (ready) return
  // iOS 17+: play through the silent switch, like a music app. Must be set
  // before the AudioContext starts.
  try { if (navigator.audioSession) navigator.audioSession.type = 'playback' } catch (e) {}
  await startAudio()   // shared iOS unlock + keepalive lives in engine.js

  limiter = new Tone.Limiter(-3)
  if (isIOS) limiter.connect(Tone.getContext().rawContext.destination)
  else limiter.toDestination()

  bus = new Tone.Gain(0.7).connect(limiter)

  // Convolver with a generated impulse — Tone.Reverb's OfflineAudioContext
  // re-suspends iOS audio (see engine.js), a plain ConvolverNode doesn't.
  const reverb = new Tone.Convolver().connect(limiter)
  reverb.buffer = new Tone.ToneAudioBuffer(makeImpulse(2.2))
  const reverbSend = new Tone.Gain(0.22).connect(reverb)

  for (let i = 0; i < MAX_SLOTS; i++) {
    const ch = new Tone.Gain(VOLUMES[1])
    ch.connect(bus)
    ch.connect(reverbSend)
    channels.push(ch)
    voices.push(null)
  }
  ready = true
  setSlots(slots)
}

function makeImpulse(seconds) {
  const ctx = Tone.getContext().rawContext
  const len = Math.floor(ctx.sampleRate * seconds)
  const buf = ctx.createBuffer(2, len, ctx.sampleRate)
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c)
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3)
  }
  return buf
}

// ── Sample loading (cached per instrument, sampler per slot) ─────────────────
// Each file loads on its own with retries, so one flaky download can't leave
// an instrument silent — the sampler just stretches its nearest neighbor.
function loadBuffer(url, tries = 3) {
  return new Tone.ToneAudioBuffer().load(url).catch(() =>
    tries > 1 ? new Promise(r => setTimeout(r, 700)).then(() => loadBuffer(url, tries - 1)) : null)
}
async function loadAll(urlMap) {
  const entries = await Promise.all(Object.entries(urlMap).map(async ([k, u]) => [k, await loadBuffer(u)]))
  const ok = entries.filter(([, b]) => b)
  if (!ok.length) throw new Error('no samples loaded')
  return ok
}

const bufferCache = new Map()   // instId → Promise<[midi, ToneAudioBuffer][]>
function loadInstBuffers(inst) {
  if (!bufferCache.has(inst.id)) {
    const p = loadAll(sampleUrls(inst))
    p.catch(() => bufferCache.delete(inst.id))   // allow a fresh try next time
    bufferCache.set(inst.id, p)
  }
  return bufferCache.get(inst.id)
}

const kitCache = new Map()      // kitId → Promise<Map<key, AudioBuffer>>
function loadKit(kitId) {
  if (!kitCache.has(kitId)) {
    const map = {}
    for (const [type, layers] of Object.entries(DRUM_KITS[kitId]))
      for (const [layer, files] of Object.entries(layers))
        files.forEach((f, i) => { map[`${type}|${layer}|${i}`] = '/' + f })
    const p = loadAll(map).then(ok => new Map(ok.map(([k, b]) => [k, b.get()])))
    p.catch(() => kitCache.delete(kitId))
    kitCache.set(kitId, p)
  }
  return kitCache.get(kitId)
}
const loadedKits = new Map()    // kitId → Map (sync access for the scheduler)

function syncVoice(i) {
  const s = slots[i]
  const v = voices[i]
  if (!s) {
    if (v?.sampler) v.sampler.dispose()
    voices[i] = null
    return
  }
  channels[i].gain.rampTo(s.muted ? 0 : VOLUMES[s.vol ?? 1], 0.05)
  const inst = instById(s.inst)

  if (inst.role === 'beat') {
    const kitId = VIBE_KITS[s.vibe]
    if (!v || v.instId !== s.inst) { v?.sampler?.dispose(); voices[i] = { instId: s.inst, loaded: loadedKits.size > 0 } }
    if (!loadedKits.has(kitId)) {
      loadKit(kitId).then(m => { loadedKits.set(kitId, m); markLoaded(i, s.inst) }).catch(() => {})
    } else markLoaded(i, s.inst)
    return
  }

  if (v?.instId === s.inst && (v.loaded || v.pending)) return
  v?.sampler?.dispose()
  voices[i] = { instId: s.inst, sampler: null, loaded: false, pending: true }
  emitLoad()
  loadInstBuffers(inst).then(bufs => {
    if (voices[i]?.instId !== s.inst) return   // slot changed while loading
    const urls = {}
    for (const [m, b] of bufs) urls[Tone.Frequency(+m, 'midi').toNote()] = b
    const sampler = new Tone.Sampler({
      urls, attack: 0.005, release: ROLE_RELEASE[inst.role],
      volume: inst.db ?? 0,
    }).connect(channels[i])
    voices[i].sampler = sampler
    voices[i].pending = false
    markLoaded(i, s.inst)
  }).catch(() => { if (voices[i]?.instId === s.inst) voices[i].pending = false })   // retried on next change
}
function markLoaded(i, instId) {
  if (voices[i]?.instId === instId) voices[i].loaded = true
  emitLoad()
}
function emitLoad() {
  const state = voices.map(v => (v ? v.loaded : null))
  loadListeners.forEach(cb => cb(state))
}
export const instLoaded = i => !!voices[i]?.loaded

// Warm the sample cache in the background so the first tap plays fast
export function prefetch(instIds) {
  instIds.forEach(id => {
    const inst = instById(id)
    if (!inst) return
    if (inst.role === 'beat') loadKit(VIBE_KITS[2]).then(m => loadedKits.set(VIBE_KITS[2], m)).catch(() => {})
    else loadInstBuffers(inst).catch(() => {})
  })
}

// ── Public controls ──────────────────────────────────────────────────────────
export function setSlots(next) {
  slots = next
  if (!ready) return            // synced once the audio graph exists
  for (let i = 0; i < MAX_SLOTS; i++) syncVoice(i)
  if (!slots.some(Boolean)) stop()
}

export function setSong(patch) {
  if (patch.meter && patch.meter !== song.meter && playing) {
    pendingMeter = patch.meter          // meter changes wait for the bar line
    patch = { ...patch }
    delete patch.meter
  }
  Object.assign(song, patch)
}

export const isPlaying = () => playing

export function play() {
  if (!ready || playing) return
  const ctx = Tone.getContext().rawContext
  playing = true
  barStep = 0
  barIndex = 0
  nextTime = ctx.currentTime + 0.08
  tick()
}

export function stop() {
  playing = false
  clearTimeout(schedTimer)
  schedTimer = null
  voices.forEach(v => v?.sampler?.releaseAll?.())
}

// ── Scheduler ────────────────────────────────────────────────────────────────
function leaderIndex() { return slots.findIndex(Boolean) }

function stepSeconds() {
  const li = leaderIndex()
  const bpm = (li >= 0 ? VIBES[slots[li].vibe].bpm : 110) * song.tempoScale
  return 60 / bpm / 4
}

function tick() {
  if (!playing) return
  const ctx = Tone.getContext().rawContext
  const ahead = ctx.currentTime + LOOKAHEAD
  // Timers stall while the tab is in the background — skip what we missed
  // instead of firing it all at once when we come back.
  if (nextTime < ctx.currentTime - 0.05) nextTime = ctx.currentTime + 0.05
  while (nextTime < ahead) {
    scheduleStep(nextTime, ctx.currentTime)
    nextTime += stepSeconds()
    barStep++
    if (barStep >= stepsPerBar()) {
      barStep = 0
      barIndex++
      if (pendingMeter) { song.meter = pendingMeter; pendingMeter = null }
    }
  }
  schedTimer = setTimeout(tick, TICK_MS)
}

const stepsPerBar = () => (song.meter === 3 ? 12 : 16)

function at(fn, t, now) {
  setTimeout(fn, Math.max(0, (t - now) * 1000))
}

function scheduleStep(t, now) {
  const spb = stepsPerBar()
  if (barStep % 4 === 0) {
    const beat = barStep / 4
    at(() => beatListeners.forEach(cb => cb(beat, spb / 4)), t, now)
  }
  const li = leaderIndex()
  if (li < 0) return
  const leader = slots[li]
  const prog = VIBES[leader.vibe].prog
  const chordDeg = prog[barIndex % prog.length]
  const absStep = barIndex * spb + barStep

  slots.forEach((s, i) => {
    if (!s || s.muted || !voices[i]?.loaded) return
    const inst = instById(s.inst)
    const role = inst.role
    let hit = false

    if (role === 'beat') {
      hit = playDrums(i, PATTERNS[s.vibe][song.meter].beat, absStep, t)
    } else {
      const own = PATTERNS[s.vibe][song.meter][role]
      // Pads stay sustained — chopping them into gaps sounds broken
      const complement = i !== li && role !== 'pad' && vibeDistance(s.vibe, leader.vibe) === 3
      const ev = complement
        ? complementEvent(own, leader, absStep, role)
        : patternEvent(own, absStep)
      if (ev) {
        playPitched(i, inst, ev, chordDeg, sameRoleRank(i, role), t)
        hit = true
      }
    }
    if (hit) at(() => noteListeners.forEach(cb => cb(i)), t, now)
  })
}

// Earlier slots with the same role push this one up an octave (avoids mud)
function sameRoleRank(i, role) {
  for (let j = 0; j < i; j++) if (slots[j] && instById(slots[j].inst).role === role) return 1
  return 0
}

// Read a pitched pattern string at a step → { ch, durSteps } or null
function patternEvent(str, absStep) {
  const p = absStep % str.length
  const ch = str[p]
  if (ch === '.' || ch === '-') return null
  let dur = 1
  while (str[p + dur] === '-') dur++
  return { ch, durSteps: dur }
}

// Complement: play on 8th-note steps where the leader is silent.
function complementEvent(own, leader, absStep, role) {
  if (absStep % 2) return null
  if (leaderBusy(leader, absStep)) return null
  // Reuse the most recent pitch from our own pattern so it still sounds like us
  let ch = role === 'comp' ? 'x' : '0'
  for (let k = 0; k < own.length; k++) {
    const c = own[(absStep - k + own.length * 8) % own.length]
    if (c !== '.' && c !== '-') { ch = c; break }
  }
  return { ch, durSteps: role === 'sparkle' ? 1 : 2 }
}

function leaderBusy(leader, absStep) {
  const role = instById(leader.inst).role
  const pat = PATTERNS[leader.vibe][song.meter][role]
  if (role === 'beat') {
    const c = (s) => s?.[absStep % s.length]
    return c(pat.k) === 'x' || c(pat.s) === 'x'
  }
  const c = pat[absStep % pat.length]
  if (c === '.') return false
  if (c === '-') return HOLD_IS_BUSY.has(role)
  return true
}

function playPitched(i, inst, ev, chordDeg, rank, t) {
  const sampler = voices[i].sampler
  if (!sampler) return
  const wrapRoot = inst.role === 'bass' || inst.role === 'comp' || inst.role === 'pad'
  const root = wrapRoot && chordDeg >= 4 ? chordDeg - 7 : chordDeg
  // Fold back into the instrument's sweet spot (and its sample range).
  // The window moves with the octave choice and same-role stacking.
  const shift = 12 * ((slots[i].oct ?? 0) + rank)
  const base = inst.base + keyOffset(song.key) + shift
  const lo = Math.max(inst.base - 24, inst.base - 12 + shift)
  const hi = Math.min(inst.base + 36, inst.base + 30 + shift)
  const midiOf = steps => {
    let m = base + degreeToSemis(root + steps, song.mode)
    while (m < lo) m += 12
    while (m > hi) m -= 12
    return m
  }

  const dur = ev.durSteps * stepSeconds() * (inst.legato || inst.role === 'pad' ? 1 : 0.9)
  const vel = 0.62 + Math.random() * 0.12
  let notes
  if (ev.ch === 'x') notes = (inst.voicing ?? [0, 2, 4]).map(midiOf)
  else if (ev.ch === 'L') notes = [midiOf(-7)]
  else notes = [midiOf(+ev.ch)]

  notes.forEach((m, n) => {
    const note = Tone.Frequency(m, 'midi').toNote()
    const when = t + n * (inst.strum ?? 0)
    try { sampler.triggerAttackRelease(note, dur, when, vel) } catch (e) {}
  })
}

// ── Drums ────────────────────────────────────────────────────────────────────
const DRUM_TYPES = { k: 'kick', s: 'snare', h: 'hihat', o: 'hihat_open', t: 'tom-hi', T: 'tom-lo' }
const rr = {}

function playDrums(i, pat, absStep, t) {
  let kitId = VIBE_KITS[slots[i].vibe]
  if (!loadedKits.has(kitId)) kitId = loadedKits.keys().next().value   // play any kit while the right one loads
  if (!kitId) return false
  const kit = loadedKits.get(kitId)
  const kitDef = DRUM_KITS[kitId]
  const ctx = Tone.getContext().rawContext
  const onBeat = absStep % 4 === 0
  const drumTrim = Math.pow(10, (instById(slots[i].inst).db ?? 0) / 20)
  let hit = false
  for (const [code, str] of Object.entries(pat)) {
    const c = str[absStep % str.length]
    if (c !== 'x' && c !== 'g') continue
    const type = DRUM_TYPES[code]
    const layers = kitDef[type]
    if (!layers) continue
    let layer = layers.rr ? 'rr' : c === 'g' ? 'soft' : onBeat ? 'hard' : 'mid'
    if (!layers[layer]) layer = Object.keys(layers)[0]
    const files = layers[layer]
    const rk = `${kitId}|${type}|${layer}`
    rr[rk] = ((rr[rk] ?? -1) + 1) % files.length
    const buf = kit.get(`${type}|${layer}|${rr[rk]}`)
    if (!buf) continue
    const src = ctx.createBufferSource()
    src.buffer = buf
    const g = ctx.createGain()
    g.gain.value = drumTrim * (c === 'g' ? 0.35 : type === 'hihat' ? (onBeat ? 0.6 : 0.42) : 0.9)
    src.connect(g)
    g.connect(channels[i].input)
    // tiny humanize on hats so it doesn't feel robotic
    src.start(type === 'hihat' ? t + Math.random() * 0.008 : t)
    hit = true
  }
  return hit
}

// ── UI sounds ────────────────────────────────────────────────────────────────
// Each dial gem has its own pitch, so turning the dial plays a little scale.
const GEM_PITCHES = [72, 74, 76, 79, 81, 84]
export function blip(idx) {
  if (!ready) return
  const ctx = Tone.getContext().rawContext
  const t = ctx.currentTime
  const o = ctx.createOscillator()
  const g = ctx.createGain()
  o.type = 'triangle'
  o.frequency.value = 440 * Math.pow(2, (GEM_PITCHES[idx % 6] - 69) / 12)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(0.18, t + 0.005)
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12)
  o.connect(g)
  g.connect(bus.input)
  o.start(t)
  o.stop(t + 0.14)
}

export function boop() {
  if (!ready) return
  const ctx = Tone.getContext().rawContext
  const t = ctx.currentTime
  const o = ctx.createOscillator()
  const g = ctx.createGain()
  o.type = 'sine'
  o.frequency.setValueAtTime(330, t)
  o.frequency.exponentialRampToValueAtTime(180, t + 0.2)
  g.gain.setValueAtTime(0.2, t)
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25)
  o.connect(g)
  g.connect(bus.input)
  o.start(t)
  o.stop(t + 0.26)
}
