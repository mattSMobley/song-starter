// Intervals in semitones from root
export const SCALE_INTERVALS = {
  major:        [0, 2, 4, 5, 7, 9, 11],
  minor:        [0, 2, 3, 5, 7, 8, 10],
  pentatonic:   [0, 2, 4, 7, 9],
  'penta-minor':[0, 3, 5, 7, 10],
  dorian:       [0, 2, 3, 5, 7, 9, 10],
  phrygian:     [0, 1, 3, 5, 7, 8, 10],
  lydian:       [0, 2, 4, 6, 7, 9, 11],
  mixolydian:   [0, 2, 4, 5, 7, 9, 10],
  blues:        [0, 3, 5, 6, 7, 10],
  chromatic:    [0,1,2,3,4,5,6,7,8,9,10,11],
}

export const SCALE_NAMES = Object.keys(SCALE_INTERVALS)

export const ROOTS = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']

const NOTE_TO_MIDI = {
  C:0,'C#':1,D:2,'D#':3,E:4,F:5,'F#':6,G:7,'G#':8,A:9,'A#':10,B:11,
}

export function getScaleNotes(root, scaleName, octaveStart = 4, numOctaves = 2) {
  const intervals = SCALE_INTERVALS[scaleName] || SCALE_INTERVALS.major
  const rootMidi  = NOTE_TO_MIDI[root] ?? 0
  const notes = []
  for (let oct = octaveStart; oct < octaveStart + numOctaves; oct++) {
    for (const interval of intervals) {
      const midi = (oct + 1) * 12 + rootMidi + interval
      notes.push(midiToNoteName(midi))
    }
  }
  return notes
}

export function midiToNoteName(midi) {
  const noteNames = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']
  const octave    = Math.floor(midi / 12) - 1
  const name      = noteNames[midi % 12]
  return `${name}${octave}`
}

export function transposeNote(noteName, semitones) {
  if (!semitones) return noteName
  const noteNames = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']
  const m = noteName.match(/^([A-G]#?)(-?\d+)$/)
  if (!m) return noteName
  const pc   = noteNames.indexOf(m[1])
  const midi = (parseInt(m[2]) + 1) * 12 + pc + semitones
  return midiToNoteName(midi)
}

export function transposeMelody(melody, semitones) {
  if (!semitones) return melody
  return {
    ...melody,
    events: melody.events.map(e => ({ ...e, note: transposeNote(e.note, semitones) })),
    scale:  (melody.scale ?? []).map(n => transposeNote(n, semitones)),
  }
}

export function rootSemitones(fromRoot, toRoot) {
  return (NOTE_TO_MIDI[toRoot] ?? 0) - (NOTE_TO_MIDI[fromRoot] ?? 0)
}

export function snapToScale(midiNote, root, scaleName) {
  const intervals = SCALE_INTERVALS[scaleName] || SCALE_INTERVALS.major
  const rootMidi  = NOTE_TO_MIDI[root] ?? 0
  const relative  = ((midiNote - rootMidi) % 12 + 12) % 12
  let closest = intervals[0], minDist = 12
  for (const iv of intervals) {
    const dist = Math.min(Math.abs(iv - relative), 12 - Math.abs(iv - relative))
    if (dist < minDist) { minDist = dist; closest = iv }
  }
  const diff = ((closest - relative + 12) % 12 <= 6)
    ? closest - relative
    : closest - relative - 12
  return midiToNoteName(midiNote + diff)
}
