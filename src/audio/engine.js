import * as Tone from 'tone'
import { sendNoteOn, sendNoteOff } from './midiOut.js'

// Module-level ref keeps the iOS unlock Audio element from being GC'd
// before play() resolves — GC causes "The operation was aborted" error.
let _iosUnlockEl = null

// ── Debug log ─────────────────────────────────────────────────────────────────
const _log = []
export function dbgLog(msg) {
  const ts = new Date().toISOString().slice(11, 23)
  _log.push(`${ts} ${msg}`)
  if (_log.length > 40) _log.shift()
  console.log('[AudioDbg]', msg)
}
export function getDbgLog() { return [..._log] }

// ── Shared analyser (exported for Visualizer) ────────────────────────────────
export let analyser = null

// iOS detection — Tone.Reverb uses OfflineAudioContext to build its impulse
// response; creating one right after AudioContext.resume() can silently
// re-suspend the main context on iOS Safari, killing all audio output.
// Skip reverb entirely on iOS and rely on the direct delay path.
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1)

// ── Effects chain (lazy — created after user gesture to unblock iOS) ─────────
let reverb, delay, limiter, masterOut
let audioInitialized = false

function initAudioGraph() {
  if (audioInitialized) return
  audioInitialized = true
  analyser  = new Tone.Analyser('waveform', 256)
  masterOut = new Tone.Gain(1).toDestination()

  limiter = new Tone.Limiter(-3)

  if (isIOS) {
    // Tone.FeedbackDelay silences audio on iOS — skip it.
    // Also bypass Tone.getDestination() and wire masterOut directly to the
    // raw AudioContext destination (Tone's internal routing is suspect on iOS).
    const rawDest = Tone.getContext().rawContext.destination
    masterOut = new Tone.Gain(1)
    masterOut.connect(rawDest)
    limiter.connect(masterOut)
    limiter.connect(analyser)
    dbgLog(`iOS: masterOut->rawCtx.dest direct, no delay`)
  } else {
    delay = new Tone.FeedbackDelay({ delayTime: '8n', feedback: 0.25, wet: 0.15 })
    delay.connect(masterOut)
    reverb = new Tone.Reverb({ decay: 2.5, wet: 1.0 })
    reverb.connect(masterOut)
    const reverbSend = new Tone.Gain(0.28)
    reverbSend.connect(reverb)
    delay.connect(reverbSend)
    limiter.fan(delay, analyser)
  }

  initDrums()
  dbgLog(`initAudioGraph done dest.vol=${Tone.getDestination().volume.value.toFixed(1)} mute=${Tone.getDestination().mute}`)
}

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
    // Ensemble — 6-voice wide-spread detuned sawtooth, slow bow attack
    () => new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'fatsawtooth', spread: 58, count: 6 },
      envelope: { attack: 0.55, decay: 0.05, sustain: 0.95, release: 3.5 },
      volume: -14,
    }),
    // Cello — warm deep FM, slow bow drag
    () => new Tone.PolySynth(Tone.FMSynth, {
      harmonicity: 2.0, modulationIndex: 2.5,
      oscillator: { type: 'sawtooth4' },
      envelope: { attack: 0.45, decay: 0.0, sustain: 1.0, release: 2.8 },
      modulation: { type: 'triangle' },
      modulationEnvelope: { attack: 0.1, decay: 0.6, sustain: 0.25, release: 2.5 },
      volume: -6,
    }),
    // Violin — bright FM with bow expression
    () => new Tone.PolySynth(Tone.FMSynth, {
      harmonicity: 3.8, modulationIndex: 1.3,
      oscillator: { type: 'triangle4' },
      envelope: { attack: 0.28, decay: 0.02, sustain: 1.0, release: 2.2 },
      modulation: { type: 'sawtooth' },
      modulationEnvelope: { attack: 0.06, decay: 0.5, sustain: 0.15, release: 1.8 },
      volume: -5,
    }),
    // Lush — cinematic orchestra swell, 8-voice ultra-wide
    () => new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'fatsawtooth', spread: 88, count: 8 },
      envelope: { attack: 1.0, decay: 0.1, sustain: 0.92, release: 5.0 },
      volume: -18,
    }),
    // Pizz — plucked with more body
    () => new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle8' },
      envelope: { attack: 0.003, decay: 0.55, sustain: 0.02, release: 1.0 },
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
    // Acoustic ✦ — sampler swaps in when loaded; triangle fallback until then
    () => new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.001, decay: 1.2, sustain: 0.0, release: 1.5 },
      volume: -4,
    }),
    // Nylon — soft warm classical guitar character
    () => new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle8' },
      envelope: { attack: 0.001, decay: 0.9, sustain: 0.02, release: 1.2 },
      volume: -5,
    }),
    // Electric — bright steel-string pluck
    () => new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'fatsawtooth', spread: 12, count: 2 },
      envelope: { attack: 0.001, decay: 0.6, sustain: 0.03, release: 0.8 },
      volume: -6,
    }),
    // Harp — triangle with long resonant decay
    () => new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.001, decay: 3.0, sustain: 0.0, release: 1.8 },
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
    // Finger — warm fingerstyle, triangle + smooth low filter
    () => new Tone.PolySynth(Tone.MonoSynth, {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.03, decay: 0.1, sustain: 0.9, release: 0.4 },
      filterEnvelope: { attack: 0.03, decay: 0.2, sustain: 0.7, release: 0.3, baseFrequency: 180, octaves: 2.5 },
      volume: -4,
    }),
    // Pick — sawtooth, crisp bright attack
    () => new Tone.PolySynth(Tone.MonoSynth, {
      oscillator: { type: 'sawtooth4' },
      envelope: { attack: 0.005, decay: 0.12, sustain: 0.75, release: 0.35 },
      filterEnvelope: { attack: 0.005, decay: 0.25, sustain: 0.55, release: 0.3, baseFrequency: 350, octaves: 3 },
      volume: -6,
    }),
    // Slap — snappy pop, tight filter burst
    () => new Tone.PolySynth(Tone.MonoSynth, {
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.001, decay: 0.08, sustain: 0.35, release: 0.25 },
      filterEnvelope: { attack: 0.001, decay: 0.12, sustain: 0.15, release: 0.25, baseFrequency: 400, octaves: 4.5 },
      volume: -5,
    }),
    // Fretless — smooth triangle, sings between notes
    () => new Tone.PolySynth(Tone.MonoSynth, {
      oscillator: { type: 'triangle4' },
      envelope: { attack: 0.06, decay: 0.1, sustain: 0.95, release: 0.6 },
      filterEnvelope: { attack: 0.06, decay: 0.3, sustain: 0.8, release: 0.5, baseFrequency: 120, octaves: 2 },
      volume: -5,
    }),
    // Sub — pure sine, deep felt not heard
    () => new Tone.PolySynth(Tone.MonoSynth, {
      oscillator: { type: 'sine' },
      envelope: { attack: 0.06, decay: 0.3, sustain: 0.9, release: 0.6 },
      filterEnvelope: { attack: 0.06, decay: 0.3, sustain: 0.85, release: 0.5, baseFrequency: 70, octaves: 1.5 },
      volume: -3,
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

// ── Drum kit (lazy — initialized with the rest of the audio graph) ────────────
let drumKick, drumSnare, drumHihatC, drumHihatO, drumCrash

function initDrums() {
  // Same iOS reasoning as main reverb — skip OfflineAudioContext on iOS
  let drumReverbSend = null
  if (!isIOS) {
    const drumReverb = new Tone.Reverb({ decay: 1.2, wet: 1.0 })
    drumReverb.connect(masterOut)
    drumReverbSend = new Tone.Gain(0.12)
    drumReverbSend.connect(drumReverb)
  }

  const connectDrum = (synth) => {
    synth.connect(masterOut)
    if (drumReverbSend) synth.connect(drumReverbSend)
    return synth
  }

  drumKick = connectDrum(new Tone.MembraneSynth({
    pitchDecay: 0.05, octaves: 7,
    envelope: { attack: 0.001, decay: 0.35, sustain: 0, release: 0.1 },
    volume: -2,
  }))
  drumSnare = connectDrum(new Tone.NoiseSynth({
    noise: { type: 'white' },
    envelope: { attack: 0.001, decay: 0.16, sustain: 0, release: 0.05 },
    volume: -6,
  }))
  drumHihatC = connectDrum(new Tone.MetalSynth({
    frequency: 400, harmonicity: 5.1, modulationIndex: 32, resonance: 4000, octaves: 1.5,
    envelope: { attack: 0.001, decay: 0.07, release: 0.01 },
    volume: -14,
  }))
  drumHihatO = connectDrum(new Tone.MetalSynth({
    frequency: 400, harmonicity: 5.1, modulationIndex: 32, resonance: 4000, octaves: 1.5,
    envelope: { attack: 0.001, decay: 0.28, release: 0.08 },
    volume: -16,
  }))
  drumCrash = connectDrum(new Tone.MetalSynth({
    frequency: 300, harmonicity: 5.1, modulationIndex: 64, resonance: 4000, octaves: 3,
    envelope: { attack: 0.001, decay: 1.2, release: 0.4 },
    volume: -16,
  }))
}

export function playDrumHit(type, time) {
  if (!drumKick) return
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

const NB_BASE = 'https://nbrosowsky.github.io/tonejs-instruments/samples/'

// key = `${instrumentId}-${variationIdx}`
const SAMPLER_CONFIGS = {
  'keys-0': { baseUrl: SALA_BASE, urls: SALA_URLS, volume: -6 },

  // Guitar family — acoustic, nylon, electric, harp
  'pluck-0': {
    baseUrl: NB_BASE + 'guitar-acoustic/',
    urls: {
      'A1':'A1.mp3', 'C2':'C2.mp3', 'Eb2':'Eb2.mp3', 'Gb2':'Gb2.mp3',
      'A2':'A2.mp3', 'C3':'C3.mp3', 'Eb3':'Eb3.mp3', 'Gb3':'Gb3.mp3',
      'A3':'A3.mp3', 'C4':'C4.mp3', 'Eb4':'Eb4.mp3', 'Gb4':'Gb4.mp3',
      'A4':'A4.mp3', 'C5':'C5.mp3',
    }, volume: -4,
  },
  'pluck-1': {
    baseUrl: NB_BASE + 'guitar-nylon/',
    urls: {
      'B1':'B1.mp3', 'B2':'B2.mp3', 'B3':'B3.mp3', 'B4':'B4.mp3',
      'D2':'D2.mp3', 'D3':'D3.mp3',
      'E2':'E2.mp3', 'E3':'E3.mp3', 'E4':'E4.mp3', 'E5':'E5.mp3',
      'F#2':'Fs2.mp3', 'F#3':'Fs3.mp3', 'F#4':'Fs4.mp3', 'F#5':'Fs5.mp3',
      'G3':'G3.mp3', 'C#3':'Cs3.mp3', 'C#4':'Cs4.mp3', 'C#5':'Cs5.mp3',
    }, volume: -4,
  },
  'pluck-2': {
    baseUrl: NB_BASE + 'guitar-electric/',
    urls: {
      'A2':'A2.mp3', 'A3':'A3.mp3', 'A4':'A4.mp3', 'A5':'A5.mp3',
      'C2':'C2.mp3', 'C3':'C3.mp3', 'C4':'C4.mp3', 'C5':'C5.mp3', 'C6':'C6.mp3',
      'E2':'E2.mp3',
      'F#2':'Fs2.mp3', 'F#3':'Fs3.mp3', 'F#4':'Fs4.mp3', 'F#5':'Fs5.mp3',
      'D#3':'Ds3.mp3', 'D#4':'Ds4.mp3', 'D#5':'Ds5.mp3',
    }, volume: -4,
  },
  'pluck-3': {
    baseUrl: NB_BASE + 'harp/',
    urls: {
      'A2':'A2.mp3', 'A4':'A4.mp3', 'A6':'A6.mp3',
      'B1':'B1.mp3', 'B3':'B3.mp3', 'B5':'B5.mp3', 'B6':'B6.mp3',
      'C3':'C3.mp3', 'C5':'C5.mp3',
      'D2':'D2.mp3', 'D4':'D4.mp3', 'D6':'D6.mp3',
      'E1':'E1.mp3', 'E3':'E3.mp3', 'E5':'E5.mp3',
      'F2':'F2.mp3', 'F4':'F4.mp3', 'F6':'F6.mp3',
      'G1':'G1.mp3', 'G3':'G3.mp3', 'G5':'G5.mp3',
    }, volume: -5,
  },

  // Bass — electric fingerstyle
  'bass-0': {
    baseUrl: NB_BASE + 'bass-electric/',
    urls: {
      'A#1':'As1.mp3', 'A#2':'As2.mp3', 'A#3':'As3.mp3', 'A#4':'As4.mp3',
      'C#1':'Cs1.mp3', 'C#2':'Cs2.mp3', 'C#3':'Cs3.mp3', 'C#4':'Cs4.mp3',
      'E1':'E1.mp3',   'E2':'E2.mp3',   'E3':'E3.mp3',   'E4':'E4.mp3',
      'G1':'G1.mp3',   'G2':'G2.mp3',   'G3':'G3.mp3',   'G4':'G4.mp3',
    }, volume: -4,
  },

  // Strings — real bowed instruments
  'strings-1': {
    baseUrl: NB_BASE + 'cello/',
    urls: {
      'C2':'C2.mp3', 'C3':'C3.mp3', 'C4':'C4.mp3', 'C5':'C5.mp3',
      'D2':'D2.mp3', 'D3':'D3.mp3', 'D4':'D4.mp3',
      'E2':'E2.mp3', 'E3':'E3.mp3', 'E4':'E4.mp3',
      'G2':'G2.mp3', 'G3':'G3.mp3', 'G4':'G4.mp3',
      'F2':'F2.mp3', 'F3':'F3.mp3', 'F4':'F4.mp3',
    }, volume: -6,
  },
  'strings-2': {
    baseUrl: NB_BASE + 'violin/',
    urls: {
      'A3':'A3.mp3', 'A4':'A4.mp3', 'A5':'A5.mp3', 'A6':'A6.mp3',
      'C4':'C4.mp3', 'C5':'C5.mp3', 'C6':'C6.mp3', 'C7':'C7.mp3',
      'E4':'E4.mp3', 'E5':'E5.mp3', 'E6':'E6.mp3',
      'G3':'G3.mp3', 'G4':'G4.mp3', 'G5':'G5.mp3', 'G6':'G6.mp3',
    }, volume: -6,
  },

  // Lead — real wind instrument
  'lead-3': {
    baseUrl: NB_BASE + 'flute/',
    urls: {
      'A4':'A4.mp3', 'A5':'A5.mp3', 'A6':'A6.mp3',
      'C4':'C4.mp3', 'C5':'C5.mp3', 'C6':'C6.mp3', 'C7':'C7.mp3',
      'E4':'E4.mp3', 'E5':'E5.mp3', 'E6':'E6.mp3',
    }, volume: -6,
  },

  // Choir — gleitz MIDI soundfonts (CDN-hosted GM samples)
  'choir-0': {
    baseUrl: 'https://gleitz.github.io/midi-js-soundfonts/MusyngKite/choir_aahs-mp3/',
    urls: {
      'C3':'C3.mp3', 'E3':'E3.mp3', 'G3':'G3.mp3', 'Bb3':'Bb3.mp3',
      'C4':'C4.mp3', 'E4':'E4.mp3', 'G4':'G4.mp3', 'Bb4':'Bb4.mp3',
      'C5':'C5.mp3', 'E5':'E5.mp3', 'G5':'G5.mp3',
    }, volume: -8,
  },
  'choir-1': {
    baseUrl: 'https://gleitz.github.io/midi-js-soundfonts/MusyngKite/voice_oohs-mp3/',
    urls: {
      'C3':'C3.mp3', 'E3':'E3.mp3', 'G3':'G3.mp3', 'Bb3':'Bb3.mp3',
      'C4':'C4.mp3', 'E4':'E4.mp3', 'G4':'G4.mp3', 'Bb4':'Bb4.mp3',
      'C5':'C5.mp3', 'E5':'E5.mp3', 'G5':'G5.mp3',
    }, volume: -8,
  },
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
        dbgLog(`sampler swapped in: ${key}`)
      } else {
        dbgLog(`sampler loaded stale: ${key}`)
      }
      if (samplerLoadCallback) samplerLoadCallback(false)
    },
  }).connect(limiter)
}

export async function startAudio() {
  dbgLog(`startAudio ctxState=${Tone.getContext().rawContext.state}`)

  // iOS session switch fires synchronously (gesture token still live).
  // _iosUnlockEl holds a module-level ref so the element isn't GC'd before
  // play() resolves — GC causes "The operation was aborted" rejection.
  if (isIOS) {
    try {
      const wav = new Uint8Array([
        0x52,0x49,0x46,0x46, 0x26,0x00,0x00,0x00,
        0x57,0x41,0x56,0x45,
        0x66,0x6d,0x74,0x20, 0x10,0x00,0x00,0x00,
        0x01,0x00, 0x01,0x00,
        0x44,0xac,0x00,0x00, 0x88,0x58,0x01,0x00,
        0x02,0x00, 0x10,0x00,
        0x64,0x61,0x74,0x61, 0x02,0x00,0x00,0x00,
        0x01,0x00,
      ])
      const url = URL.createObjectURL(new Blob([wav], { type: 'audio/wav' }))
      _iosUnlockEl = new Audio(url)
      _iosUnlockEl.volume = 0.001
      _iosUnlockEl.play()
        .then(() => { URL.revokeObjectURL(url); _iosUnlockEl = null; dbgLog('iOS session play() resolved') })
        .catch(e => { _iosUnlockEl = null; dbgLog(`iOS session ERR: ${e.message}`) })
    } catch (e) { dbgLog(`iOS session sync ERR: ${e.message}`) }
  }

  // Resume context — 3s timeout so a stuck AudioContext can't block splash.
  try {
    await Promise.race([Tone.start(), new Promise(r => setTimeout(r, 3000))])
  } catch (e) { dbgLog(`Tone.start ERR: ${e.message}`) }
  dbgLog(`Tone.start done ctxState=${Tone.getContext().rawContext.state}`)

  // Build audio graph AFTER context is running so nodes are created on a
  // live context (iOS can produce silent nodes if created while suspended).
  initAudioGraph()
  if (!activeSynth) buildSynth('keys', 0)

  try {
    const raw = Tone.getContext().rawContext
    const buf = raw.createBuffer(1, 1, raw.sampleRate)
    const src = raw.createBufferSource()
    src.buffer = buf
    src.connect(raw.destination)
    src.start(0)
    dbgLog('silent buf played')
  } catch (e) { dbgLog(`silent buf ERR: ${e.message}`) }

  try {
    const ctx = Tone.getContext().rawContext
    if (ctx.state !== 'running') {
      await ctx.resume()
      dbgLog(`ctx.resume() done state=${ctx.state}`)
    }
    ctx.addEventListener('statechange', () => {
      dbgLog(`ctx statechange -> ${ctx.state}`)
      if (ctx.state !== 'running') ctx.resume().catch(() => {})
    })
  } catch (e) { dbgLog(`resume ERR: ${e.message}`) }
}

export function setInstrument(name, variation = 0) {
  buildSynth(name, variation)
  // Skip sampler on iOS to test if PolySynth alone produces sound.
  // If PolySynth works, Sampler is the culprit; if not, signal chain is broken.
  if (!isIOS) loadSamplerAsync(name, variation)
  dbgLog(`setInstrument ${name}[${variation}] sampler=${!isIOS}`)
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

let _analyserLogged = false
export function noteOn(note) {
  if (!activeSynth) buildSynth(currentInstrument, currentVariation)
  const ctxState = Tone.getContext().rawContext.state
  const synthType = activeSynth?.constructor?.name ?? 'none'
  dbgLog(`noteOn ${note} ctx=${ctxState} synth=${synthType}`)
  try { activeSynth.triggerAttack(note) } catch (e) { dbgLog(`noteOn ERR: ${e.message}`) }
  // Check analyser 80ms after trigger to see if signal flows past limiter
  if (!_analyserLogged && analyser) {
    _analyserLogged = true
    setTimeout(() => {
      try {
        const vals = analyser.getValue()
        const peak = Array.from(vals).reduce((m, v) => Math.max(m, Math.abs(v)), 0)
        dbgLog(`analyser peak=${peak.toFixed(5)} (0=silent in chain)`)
        _analyserLogged = false
      } catch (e) {}
    }, 80)
  }
  sendNoteOn(note)
}

export function noteOff(note) {
  if (!activeSynth) return
  try {
    if (activeSynth instanceof Tone.PolySynth || activeSynth instanceof Tone.Sampler) {
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
  { id: 'strings', label: 'Strings', icon: '🎻', variations: ['Ensemble', 'Cello', 'Violin', 'Lush', 'Pizz'] },
  { id: 'choir',   label: 'Choir',   icon: '🎤', variations: ['Ah', 'Ooh', 'Hmm', 'Oh', 'Angel'] },
  { id: 'pluck',   label: 'Guitar',  icon: '🪕', variations: ['Acoustic ✦', 'Nylon', 'Electric', 'Harp', 'Sitar'] },
  { id: 'bass',    label: 'Bass',    icon: '🎸', variations: ['Finger', 'Pick', 'Slap', 'Fretless', 'Sub'] },
  { id: 'lead',    label: 'Lead',    icon: '🎺', variations: ['Soft', 'Bright', 'Sync', 'Flute', 'Acid'] },
]
