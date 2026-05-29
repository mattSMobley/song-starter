import { getScaleNotes, SCALE_INTERVALS } from './scales.js'

// ── Rhythm patterns that actually groove ────────────────────────────────────
// All patterns sum to 4 beats (1 bar) so they tile cleanly
const E = 0.5, Q = 1.0, DQ = 1.5, H = 2.0

const RHYTHM_PATTERNS = [
  { name: 'straight',    beats: [E,E,E,E,E,E,E,E] },          // driving eighths
  { name: 'groove',      beats: [Q,E,E,Q,E,E,Q,E,E,Q] },      // push-pull feel (repeats over 4 bars but tiles)
  { name: 'long-short',  beats: [DQ,E,DQ,E,DQ,E,H] },         // dotted feel
  { name: 'half-eight',  beats: [H,E,E,Q,H,E,E,Q] },          // long notes + fills
  { name: 'offbeat',     beats: [E,Q,E,Q,E,Q,E] },             // off-beat emphasis
  { name: 'sparse',      beats: [Q,Q,H,Q,Q,H] },               // breathing room
  { name: 'call-resp',   beats: [E,E,E,Q,E,E,E,Q] },           // call-and-response rhythm
  { name: 'syncopated',  beats: [E,E,Q,E,E,E,Q,E] },           // push-ahead feel
]

const CONTOURS = ['arch', 'valley', 'ascending', 'descending', 'stepwise', 'stepwise']

function pickRandom(arr) { return arr[Math.floor(Math.random() * arr.length)] }

// How many notes per octave for this scale
function notesPerOctave(scaleName) {
  return (SCALE_INTERVALS[scaleName] || SCALE_INTERVALS.major).length
}

// "Chord tones" within a scale (root + 3rd + 5th scale degrees)
// Returns the indices into the working note array that are "strong" landing notes
function chordToneIndices(n) {
  const third = Math.round(n * 2 / 6)
  const fifth  = Math.round(n * 3 / 6)
  return new Set([0, third, fifth, n])  // root, 3rd, 5th, octave
}

function weightedPick(weights) {
  const total = weights.reduce((a, b) => a + b, 0)
  let r = Math.random() * total
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i]
    if (r <= 0) return i
  }
  return weights.length - 1
}

function pickNote(notes, prevIdx, contour, beat, totalBeats, isStrongBeat, isEndPhrase, chordTones, chordPCs) {
  const n = notes.length
  const progress = beat / totalBeats  // 0 → 1

  return weightedPick(notes.map((note, i) => {
    const dist = Math.abs(i - prevIdx)
    let w = 1

    // ── Step motion: strongly prefer moving by 1–2 scale steps ──────────────
    if (dist === 0) w = 0.15
    else if (dist === 1) w = 5.0
    else if (dist === 2) w = 3.5
    else if (dist === 3) w = 1.2
    else if (dist === 4) w = 0.5
    else w = 0.15 / (dist - 3)

    // ── Contour bias ─────────────────────────────────────────────────────────
    if (contour === 'ascending')  w *= 1 + (i / n) * 1.5
    if (contour === 'descending') w *= 1 + ((n - 1 - i) / n) * 1.5
    if (contour === 'arch')       w *= 1 + Math.sin(progress * Math.PI) * (i / n) * 1.5
    if (contour === 'valley')     w *= 1 + Math.sin(progress * Math.PI) * ((n - i) / n) * 1.5
    if (contour === 'stepwise')   w *= dist <= 2 ? 2 : 1

    // ── Strong beats: land on scale chord tones ───────────────────────────────
    if (isStrongBeat && chordTones.has(i)) w *= 3.5
    if (isStrongBeat && !chordTones.has(i)) w *= 0.4

    // ── Harmonic context: boost notes belonging to the active chord ──────────
    if (chordPCs && chordPCs.size > 0) {
      const pc = note.replace(/\d+$/, '')
      if (chordPCs.has(pc)) w *= isStrongBeat ? 2.5 : 1.6
    }

    // ── Phrase end: resolve toward root ──────────────────────────────────────
    if (isEndPhrase) {
      if (i === 0 || i === n) w *= 8
      else if (i === 1) w *= 2
      else w *= 0.2
    }

    // ── Range bias: prefer the middle register, punish extremes ─────────────
    const rangeCenter = n * 0.4
    const rangeDist = Math.abs(i - rangeCenter) / n
    w *= Math.max(0.2, 1 - rangeDist * 0.8)

    return Math.max(0.001, w)
  }))
}

// chordsContext: { chords: [{notes: string[], ...}], beatsPerChord: number } | null
export function generateMelody(root, scaleName, octaveStart = 4, bars = 2, chordsContext = null) {
  const scale = getScaleNotes(root, scaleName, octaveStart, 2)
  // Work in roughly one octave + a few extra notes for breathing room
  const octLen = notesPerOctave(scaleName)
  const workNotes = scale.slice(0, Math.min(octLen + 3, scale.length))

  const rhythmDef  = pickRandom(RHYTHM_PATTERNS)
  const rhythm     = rhythmDef.beats
  const contour    = pickRandom(CONTOURS)
  const totalBeats = bars * 4
  const chordTones = chordToneIndices(workNotes.length - 1)

  // Build chord pitch-class lookup from optional context
  let getChordPCs = null
  if (chordsContext && chordsContext.chords.length > 0) {
    const { chords, beatsPerChord = 2 } = chordsContext
    const progLen = chords.length * beatsPerChord
    getChordPCs = (beat) => {
      const pos   = beat % progLen
      const idx   = Math.min(Math.floor(pos / beatsPerChord), chords.length - 1)
      return new Set(chords[idx].notes.map(n => n.replace(/\d+$/, '')))
    }
  }

  const events = []
  let beat     = 0
  let prevIdx  = 0   // start on root
  let pos      = 0

  // ── Phase 1: generate a seed motif (first 2 beats) ──────────────────────
  const motif = []
  let motifBeats = 0
  while (motifBeats < 2 && pos < 20) {
    const dur = rhythm[pos % rhythm.length]
    if (motifBeats + dur > 2) break
    const isStrong = motifBeats === 0
    const idx = pickNote(workNotes, prevIdx, contour, motifBeats, 2, isStrong, false, chordTones, getChordPCs?.(motifBeats))
    motif.push({ relIdx: idx, dur })
    prevIdx = idx
    motifBeats += dur
    pos++
  }

  // ── Phase 2: fill the melody bar by bar ──────────────────────────────────
  prevIdx = 0
  pos = 0
  beat = 0

  while (beat < totalBeats) {
    const dur = rhythm[pos % rhythm.length]
    if (beat + dur > totalBeats + 0.001) break

    const beatsLeft   = totalBeats - beat
    const isStrongBeat = (Math.round(beat * 2) % 2 === 0)          // beats 0, 1, 2, 3…
    const isBeat1or3   = (Math.round(beat) % 2 === 0)              // beats 0, 2, 4, 6…
    const isEndPhrase  = beatsLeft <= 1.5
    const barPos       = beat % (bars === 1 ? 4 : 4)

    // Every 2 bars, loosely echo the opening motif to create repetition
    const motifPos = pos % (motif.length * 2)
    let idx

    const chordPCs = getChordPCs?.(beat)
    if (isEndPhrase) {
      idx = pickNote(workNotes, prevIdx, contour, beat, totalBeats, true, true, chordTones, chordPCs)
    } else if (motifPos < motif.length && beat >= 4 && Math.random() < 0.55) {
      const target = motif[motifPos].relIdx
      const nudge = Math.floor(Math.random() * 3) - 1
      idx = Math.max(0, Math.min(workNotes.length - 1, target + nudge))
    } else {
      idx = pickNote(workNotes, prevIdx, contour, beat, totalBeats, isBeat1or3, false, chordTones, chordPCs)
    }

    events.push({ note: workNotes[idx], duration: dur, beat })
    prevIdx = idx
    beat += dur
    pos++
  }

  return { events, scale: workNotes, contour: rhythmDef.name, bars }
}

export function eventsToTonePart(events, bpm = 120) {
  const secPerBeat = 60 / bpm
  return events.map(e => ({
    time: e.beat * secPerBeat,
    note: e.note,
    duration: e.duration * secPerBeat * 0.88,
  }))
}

export function generateVariations(root, scaleName, count = 6, octaveStart = 4, bars = 2, chordsContext = null) {
  return Array.from({ length: count }, () =>
    generateMelody(root, scaleName, octaveStart, bars, chordsContext)
  )
}
