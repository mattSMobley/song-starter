import * as Tone from 'tone'
import { sendNoteOn, sendNoteOff } from './midiOut.js'

// ── Shared analyser (exported for Visualizer) ────────────────────────────────
export const analyser = new Tone.Analyser('waveform', 256)

// ── Effects chain ────────────────────────────────────────────────────────────
const reverb  = new Tone.Reverb({ decay: 2.5, wet: 0.25 }).toDestination()
const delay   = new Tone.FeedbackDelay({ delayTime: '8n', feedback: 0.25, wet: 0.15 }).connect(reverb)
const chorus  = new Tone.Chorus({ frequency: 2, delayTime: 3.5, depth: 0.4, wet: 0.3 }).connect(delay)
const limiter = new Tone.Limiter(-3)
limiter.fan(chorus, analyser)

// ── Instrument presets: 7 instruments × 5 variations ─────────────────────────
const INSTRUMENT_PRESETS = {
  keys: [
    // Piano
    () => new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle8' },
      envelope: { attack: 0.02, decay: 0.3, sustain: 0.4, release: 1.2 },
      volume: -6,
    }),
    // E. Piano — fat sine spread for Rhodes-like warmth
    () => new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'fatsine', spread: 40, count: 3 },
      envelope: { attack: 0.01, decay: 1.2, sustain: 0.3, release: 1.5 },
      volume: -8,
    }),
    // Organ — FM with fast attack, long sustain, hard release
    () => new Tone.PolySynth(Tone.FMSynth, {
      harmonicity: 2, modulationIndex: 0.5,
      oscillator: { type: 'sine' },
      envelope: { attack: 0.01, decay: 0.01, sustain: 1.0, release: 0.08 },
      modulation: { type: 'sine' },
      modulationEnvelope: { attack: 0.01, decay: 0.01, sustain: 1.0, release: 0.08 },
      volume: -10,
    }),
    // Clav — tight square pluck
    () => new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'square8' },
      envelope: { attack: 0.001, decay: 0.15, sustain: 0.1, release: 0.2 },
      volume: -10,
    }),
    // Vibes — pure sine with long metallic decay
    () => new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sine' },
      envelope: { attack: 0.02, decay: 1.8, sustain: 0.05, release: 2.0 },
      volume: -6,
    }),
  ],

  pad: [
    // Warm — sawtooth with slow attack
    () => new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sawtooth4' },
      envelope: { attack: 0.4, decay: 0.5, sustain: 0.7, release: 2.5 },
      volume: -10,
    }),
    // Crystal — FM bell-pad, metallic shimmer, clearly distinct from Warm
    () => new Tone.PolySynth(Tone.FMSynth, {
      harmonicity: 5.1, modulationIndex: 3.5,
      oscillator: { type: 'sine' },
      envelope: { attack: 0.01, decay: 0.8, sustain: 0.15, release: 3.5 },
      modulation: { type: 'triangle' },
      modulationEnvelope: { attack: 0.01, decay: 0.4, sustain: 0.0, release: 3.0 },
      volume: -8,
    }),
    // Aether — AM for ethereal modulation
    () => new Tone.PolySynth(Tone.AMSynth, {
      harmonicity: 1.5,
      oscillator: { type: 'sine' },
      envelope: { attack: 0.8, decay: 0.2, sustain: 0.9, release: 3.5 },
      modulation: { type: 'triangle' },
      modulationEnvelope: { attack: 0.6, decay: 0.1, sustain: 1.0, release: 1.5 },
      volume: -12,
    }),
    // Pulse — pwm oscillator, pulsing texture
    () => new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'fatcustom', partials: [1, 0, 0.5, 0, 0.25], spread: 30, count: 3 },
      envelope: { attack: 0.5, decay: 0.4, sustain: 0.6, release: 2.0 },
      volume: -10,
    }),
    // Glass — triangle with bright high harmonics
    () => new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle16' },
      envelope: { attack: 0.35, decay: 0.8, sustain: 0.4, release: 2.8 },
      volume: -8,
    }),
  ],

  strings: [
    // Violin — FM bowed character
    () => new Tone.PolySynth(Tone.FMSynth, {
      harmonicity: 3.5, modulationIndex: 1.5,
      oscillator: { type: 'triangle4' },
      envelope: { attack: 0.3, decay: 0.1, sustain: 1.0, release: 1.8 },
      modulation: { type: 'sawtooth' },
      modulationEnvelope: { attack: 0.01, decay: 0.5, sustain: 0.1, release: 1.5 },
      volume: -6,
    }),
    // Cello — deeper FM, slower bow
    () => new Tone.PolySynth(Tone.FMSynth, {
      harmonicity: 2.5, modulationIndex: 2.0,
      oscillator: { type: 'sawtooth4' },
      envelope: { attack: 0.5, decay: 0.1, sustain: 1.0, release: 2.2 },
      modulation: { type: 'triangle' },
      modulationEnvelope: { attack: 0.02, decay: 0.8, sustain: 0.2, release: 2.0 },
      volume: -7,
    }),
    // Chamber — ensemble, fat sawtooth
    () => new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'fatsawtooth', spread: 25, count: 3 },
      envelope: { attack: 0.4, decay: 0.1, sustain: 0.9, release: 2.5 },
      volume: -9,
    }),
    // Lush — ultra-wide ensemble detuning, slow cinematic swell
    () => new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'fatsawtooth', spread: 80, count: 6 },
      envelope: { attack: 1.2, decay: 0.2, sustain: 0.88, release: 4.5 },
      volume: -13,
    }),
    // Pizz — plucked strings
    () => new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle8' },
      envelope: { attack: 0.001, decay: 0.4, sustain: 0.05, release: 0.8 },
      volume: -6,
    }),
  ],

  choir: [
    // Ah — AM, breathy vowel
    () => new Tone.PolySynth(Tone.AMSynth, {
      harmonicity: 2,
      oscillator: { type: 'sine' },
      envelope: { attack: 0.55, decay: 0.2, sustain: 0.85, release: 2.0 },
      modulation: { type: 'sine' },
      modulationEnvelope: { attack: 0.5, decay: 0.1, sustain: 1.0, release: 0.8 },
      volume: -8,
    }),
    // Ooh — fatsine, round hollow vowel, clearly distinct from AM-based Ah
    () => new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'fatsine', spread: 20, count: 4 },
      envelope: { attack: 0.9, decay: 0.1, sustain: 0.95, release: 3.0 },
      volume: -10,
    }),
    // Hmm — humming, near-unison FM
    () => new Tone.PolySynth(Tone.FMSynth, {
      harmonicity: 1.0, modulationIndex: 0.3,
      oscillator: { type: 'sine' },
      envelope: { attack: 0.6, decay: 0.1, sustain: 0.95, release: 2.0 },
      modulation: { type: 'sine' },
      modulationEnvelope: { attack: 0.5, decay: 0.1, sustain: 1.0, release: 1.5 },
      volume: -9,
    }),
    // Oh — open vowel with slight edge
    () => new Tone.PolySynth(Tone.AMSynth, {
      harmonicity: 3,
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.45, decay: 0.3, sustain: 0.8, release: 2.2 },
      modulation: { type: 'sawtooth' },
      modulationEnvelope: { attack: 0.4, decay: 0.2, sustain: 0.9, release: 1.0 },
      volume: -8,
    }),
    // Angel — high harmonic shimmer
    () => new Tone.PolySynth(Tone.AMSynth, {
      harmonicity: 4,
      oscillator: { type: 'sine' },
      envelope: { attack: 0.9, decay: 0.1, sustain: 0.95, release: 3.0 },
      modulation: { type: 'sine' },
      modulationEnvelope: { attack: 1.0, decay: 0.1, sustain: 1.0, release: 2.0 },
      volume: -11,
    }),
  ],

  pluck: [
    // Guitar — classic PluckSynth
    () => new Tone.PluckSynth({ attackNoise: 1.2, dampening: 3800, resonance: 0.97, volume: -4 }),
    // Harp — triangle with long resonant decay, bell-like (distinct from PluckSynth guitar)
    () => new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.001, decay: 3.0, sustain: 0.0, release: 1.8 },
      volume: -5,
    }),
    // Koto — sharp attack, mid dampening
    () => new Tone.PluckSynth({ attackNoise: 2.5, dampening: 2800, resonance: 0.95, volume: -4 }),
    // Kalimba — very short, metallic tine
    () => new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sine' },
      envelope: { attack: 0.001, decay: 0.6, sustain: 0.0, release: 0.5 },
      volume: -5,
    }),
    // Sitar — FM pluck with buzz
    () => new Tone.PolySynth(Tone.FMSynth, {
      harmonicity: 5, modulationIndex: 8,
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.001, decay: 0.5, sustain: 0.1, release: 1.0 },
      modulation: { type: 'sawtooth' },
      modulationEnvelope: { attack: 0.001, decay: 0.3, sustain: 0.0, release: 0.5 },
      volume: -6,
    }),
  ],

  bass: [
    // Round — classic sub bass
    () => new Tone.MonoSynth({
      oscillator: { type: 'square4' },
      envelope: { attack: 0.04, decay: 0.2, sustain: 0.8, release: 0.5 },
      filterEnvelope: { attack: 0.04, decay: 0.2, sustain: 0.5, release: 0.4, baseFrequency: 200, octaves: 3 },
      volume: -4,
    }),
    // Sub — pure sine, deep
    () => new Tone.MonoSynth({
      oscillator: { type: 'sine' },
      envelope: { attack: 0.06, decay: 0.3, sustain: 0.9, release: 0.6 },
      filterEnvelope: { attack: 0.06, decay: 0.3, sustain: 0.8, release: 0.5, baseFrequency: 80, octaves: 2 },
      volume: -3,
    }),
    // Slap — snappy attack, tight decay
    () => new Tone.MonoSynth({
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.001, decay: 0.1, sustain: 0.4, release: 0.3 },
      filterEnvelope: { attack: 0.001, decay: 0.15, sustain: 0.2, release: 0.3, baseFrequency: 300, octaves: 4 },
      volume: -4,
    }),
    // Synth — fat lead bass with filter
    () => new Tone.MonoSynth({
      oscillator: { type: 'fatsawtooth', spread: 20, count: 2 },
      envelope: { attack: 0.02, decay: 0.3, sustain: 0.7, release: 0.5 },
      filterEnvelope: { attack: 0.02, decay: 0.3, sustain: 0.4, release: 0.4, baseFrequency: 150, octaves: 4 },
      volume: -6,
    }),
    // Growl — sawtooth with huge 8-octave filter sweep for aggressive growl
    () => new Tone.MonoSynth({
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.02, decay: 0.15, sustain: 0.5, release: 0.4 },
      filterEnvelope: { attack: 0.003, decay: 0.6, sustain: 0.05, release: 0.5, baseFrequency: 55, octaves: 8 },
      volume: -5,
    }),
  ],

  lead: [
    // Soft — smooth sawtooth
    () => new Tone.MonoSynth({
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.01, decay: 0.15, sustain: 0.6, release: 0.8 },
      filterEnvelope: { attack: 0.01, decay: 0.1, sustain: 0.5, release: 0.5, baseFrequency: 500, octaves: 4 },
      volume: -6,
    }),
    // Bright — square wave, wide-open filter for raw harmonic bite
    () => new Tone.MonoSynth({
      oscillator: { type: 'square8' },
      envelope: { attack: 0.005, decay: 0.1, sustain: 0.7, release: 0.6 },
      filterEnvelope: { attack: 0.005, decay: 0.3, sustain: 0.8, release: 0.5, baseFrequency: 3000, octaves: 2 },
      volume: -8,
    }),
    // Sync — FM sawtooth for hard-sync nasal character
    () => new Tone.MonoSynth({
      oscillator: { type: 'fmsawtooth', harmonicity: 3, modulationIndex: 25 },
      envelope: { attack: 0.008, decay: 0.2, sustain: 0.55, release: 0.7 },
      filterEnvelope: { attack: 0.008, decay: 0.35, sustain: 0.5, release: 0.6, baseFrequency: 300, octaves: 5 },
      volume: -8,
    }),
    // Flute — sine with breathy attack
    () => new Tone.MonoSynth({
      oscillator: { type: 'sine' },
      envelope: { attack: 0.08, decay: 0.1, sustain: 0.85, release: 1.0 },
      filterEnvelope: { attack: 0.08, decay: 0.1, sustain: 0.8, release: 0.8, baseFrequency: 1200, octaves: 2 },
      volume: -6,
    }),
    // Acid — resonant square, TB-303 vibe
    () => new Tone.MonoSynth({
      oscillator: { type: 'square' },
      envelope: { attack: 0.001, decay: 0.3, sustain: 0.2, release: 0.4 },
      filterEnvelope: { attack: 0.001, decay: 0.35, sustain: 0.15, release: 0.4, baseFrequency: 200, octaves: 6 },
      volume: -5,
    }),
  ],
}

// ── Drum kit (always alive, not swapped with instrument) ──────────────────────
const drumReverb = new Tone.Reverb({ decay: 1.2, wet: 0.12 }).toDestination()
const drumKick = new Tone.MembraneSynth({
  pitchDecay: 0.05, octaves: 7,
  envelope: { attack: 0.001, decay: 0.35, sustain: 0, release: 0.1 },
  volume: -2,
}).connect(drumReverb)
const drumSnare = new Tone.NoiseSynth({
  noise: { type: 'white' },
  envelope: { attack: 0.001, decay: 0.16, sustain: 0, release: 0.05 },
  volume: -6,
}).connect(drumReverb)
const drumHihatC = new Tone.MetalSynth({
  frequency: 400, harmonicity: 5.1, modulationIndex: 32, resonance: 4000, octaves: 1.5,
  envelope: { attack: 0.001, decay: 0.07, release: 0.01 },
  volume: -14,
}).connect(drumReverb)
const drumHihatO = new Tone.MetalSynth({
  frequency: 400, harmonicity: 5.1, modulationIndex: 32, resonance: 4000, octaves: 1.5,
  envelope: { attack: 0.001, decay: 0.28, release: 0.08 },
  volume: -16,
}).connect(drumReverb)
const drumCrash = new Tone.MetalSynth({
  frequency: 300, harmonicity: 5.1, modulationIndex: 64, resonance: 4000, octaves: 3,
  envelope: { attack: 0.001, decay: 1.2, release: 0.4 },
  volume: -16,
}).connect(drumReverb)

export function playDrumHit(type, time) {
  try {
    const t = time ?? Tone.now()
    if (type === 'kick')            drumKick.triggerAttackRelease('C1', '8n', t)
    else if (type === 'snare')      drumSnare.triggerAttackRelease('8n', t)
    else if (type === 'hihat')      drumHihatC.triggerAttackRelease('8n', t)
    else if (type === 'hihat_open') drumHihatO.triggerAttackRelease('8n', t)
    else if (type === 'crash')      drumCrash.triggerAttackRelease('8n', t)
  } catch (e) {}
}

// ── Sampler configs (real instrument samples) ─────────────────────────────────
// Salamander Grand Piano — hosted by Tone.js
const SALA_BASE = 'https://tonejs.github.io/audio/salamander/'
const SALA_URLS = {
  'A0':'A0.mp3',  'C1':'C1.mp3',  'D#1':'Ds1.mp3', 'F#1':'Fs1.mp3',
  'A1':'A1.mp3',  'C2':'C2.mp3',  'D#2':'Ds2.mp3', 'F#2':'Fs2.mp3',
  'A2':'A2.mp3',  'C3':'C3.mp3',  'D#3':'Ds3.mp3', 'F#3':'Fs3.mp3',
  'A3':'A3.mp3',  'C4':'C4.mp3',  'D#4':'Ds4.mp3', 'F#4':'Fs4.mp3',
  'A4':'A4.mp3',  'C5':'C5.mp3',  'D#5':'Ds5.mp3', 'F#5':'Fs5.mp3',
  'A5':'A5.mp3',  'C6':'C6.mp3',  'D#6':'Ds6.mp3', 'F#6':'Fs6.mp3',
  'A6':'A6.mp3',  'C7':'C7.mp3',  'D#7':'Ds7.mp3', 'F#7':'Fs7.mp3',
  'A7':'A7.mp3',  'C8':'C8.mp3',
}

// key = `${instrumentId}-${variationIdx}`
const SAMPLER_CONFIGS = {
  'keys-0': { baseUrl: SALA_BASE, urls: SALA_URLS, volume: -6 },
}

const samplerCache = {}
let samplerLoadCallback = null
export function onSamplerLoading(cb) { samplerLoadCallback = cb }

let activeSynth = null
let currentInstrument = 'keys'
let currentVariation = 0
let pendingLoad = null  // track in-flight load so stale loads don't swap in

function buildSynth(name, variation = 0) {
  if (activeSynth) activeSynth.dispose()
  const presets = INSTRUMENT_PRESETS[name]
  const idx = Math.min(variation, presets.length - 1)
  activeSynth = presets[idx]()
  activeSynth.connect(limiter)
  currentInstrument = name
  currentVariation = idx
  return activeSynth
}

function loadSamplerAsync(name, variation) {
  const key = `${name}-${variation}`
  const cfg = SAMPLER_CONFIGS[key]
  if (!cfg) return

  // Already cached — swap in immediately
  if (samplerCache[key]) {
    if (activeSynth && !(activeSynth instanceof Tone.Sampler)) {
      activeSynth.dispose()
      activeSynth = samplerCache[key]
    }
    return
  }

  const loadId = Symbol()
  pendingLoad = loadId
  if (samplerLoadCallback) samplerLoadCallback(true)

  const sampler = new Tone.Sampler({
    urls: cfg.urls,
    baseUrl: cfg.baseUrl,
    volume: cfg.volume ?? 0,
    onload: () => {
      samplerCache[key] = sampler
      // Only swap in if this is still the active instrument+variation
      if (pendingLoad === loadId && currentInstrument === name && currentVariation === variation) {
        if (activeSynth) activeSynth.dispose()
        activeSynth = sampler
      } else {
        // Loaded but no longer needed — keep in cache, don't swap
      }
      if (samplerLoadCallback) samplerLoadCallback(false)
    },
  }).connect(limiter)
}

export async function startAudio() {
  await Tone.start()
  if (!activeSynth) buildSynth('keys', 0)
}

export function setInstrument(name, variation = 0) {
  buildSynth(name, variation)
  loadSamplerAsync(name, variation)
}

export function playNoteAt(note, duration, time) {
  if (!activeSynth) buildSynth(currentInstrument, currentVariation)
  try { activeSynth.triggerAttackRelease(note, duration, time) } catch (e) {}
}

export function playNote(note, duration = '8n') {
  if (!activeSynth) buildSynth(currentInstrument, currentVariation)
  try { activeSynth.triggerAttackRelease(note, duration) } catch (e) {}
  sendNoteOn(note)
  try {
    const ms = Tone.Time(duration).toSeconds() * 1000 * 0.88
    setTimeout(() => sendNoteOff(note), ms)
  } catch (e) { setTimeout(() => sendNoteOff(note), 400) }
}

export function noteOn(note) {
  if (!activeSynth) buildSynth(currentInstrument, currentVariation)
  try { activeSynth.triggerAttack(note) } catch (e) {}
  sendNoteOn(note)
}

export function noteOff(note) {
  if (!activeSynth) return
  try {
    if (activeSynth instanceof Tone.PolySynth) {
      activeSynth.triggerRelease(note)
    } else {
      activeSynth.triggerRelease()
    }
  } catch (e) {}
  sendNoteOff(note)
}

export function setTempo(bpm) {
  Tone.getTransport().bpm.value = bpm
}

export function getTempo() {
  return Math.round(Tone.getTransport().bpm.value)
}

export const INSTRUMENTS = [
  { id: 'keys',    label: 'Keys',    icon: '🎹', variations: ['Piano ✦', 'E. Piano', 'Organ', 'Clav', 'Vibes'] },
  { id: 'pad',     label: 'Pad',     icon: '🌊', variations: ['Warm', 'Crystal', 'Aether', 'Pulse', 'Glass'] },
  { id: 'strings', label: 'Strings', icon: '🎻', variations: ['Violin', 'Cello', 'Chamber', 'Lush', 'Pizz'] },
  { id: 'choir',   label: 'Choir',   icon: '🎤', variations: ['Ah', 'Ooh', 'Hmm', 'Oh', 'Angel'] },
  { id: 'pluck',   label: 'Pluck',   icon: '🪕', variations: ['Guitar', 'Harp', 'Koto', 'Kalimba', 'Sitar'] },
  { id: 'bass',    label: 'Bass',    icon: '🎸', variations: ['Round', 'Sub', 'Slap', 'Synth', 'Growl'] },
  { id: 'lead',    label: 'Lead',    icon: '🎺', variations: ['Soft', 'Bright', 'Sync', 'Flute', 'Acid'] },
]
