const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']
const NOTE_SEM   = { C:0, D:2, E:4, F:5, G:7, A:9, B:11 }

function nameToPC(name) {
  const m = name.match(/^([A-G])([#b]?)(-?\d+)$/)
  if (!m) return -1
  const acc = m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0
  return ((NOTE_SEM[m[1]] ?? 0) + acc + 12) % 12
}

function nameToMidi(name) {
  const m = name.match(/^([A-G])([#b]?)(-?\d+)$/)
  if (!m) return -1
  const acc = m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0
  return (parseInt(m[3]) + 1) * 12 + (NOTE_SEM[m[1]] ?? 0) + acc
}

// Sorted by ascending specificity so longer matches win ties naturally
const TEMPLATES = [
  { suffix: '5',     ints: [0,7] },
  { suffix: '',      ints: [0,4,7] },
  { suffix: 'm',     ints: [0,3,7] },
  { suffix: 'dim',   ints: [0,3,6] },
  { suffix: 'aug',   ints: [0,4,8] },
  { suffix: 'sus2',  ints: [0,2,7] },
  { suffix: 'sus4',  ints: [0,5,7] },
  { suffix: '6',     ints: [0,4,7,9] },
  { suffix: 'm6',    ints: [0,3,7,9] },
  { suffix: 'add9',  ints: [0,2,4,7] },
  { suffix: 'madd9', ints: [0,2,3,7] },
  { suffix: 'maj7',  ints: [0,4,7,11] },
  { suffix: 'm7',    ints: [0,3,7,10] },
  { suffix: '7',     ints: [0,4,7,10] },
  { suffix: 'dim7',  ints: [0,3,6,9] },
  { suffix: 'm7b5',  ints: [0,3,6,10] },
  { suffix: 'mM7',   ints: [0,3,7,11] },
  { suffix: '9',     ints: [0,2,4,7,10] },
  { suffix: 'maj9',  ints: [0,2,4,7,11] },
  { suffix: 'm9',    ints: [0,2,3,7,10] },
]

const FULL_NAMES = {
  '':      'Major',
  'm':     'Minor',
  'dim':   'Diminished',
  'aug':   'Augmented',
  'sus2':  'Sus 2',
  'sus4':  'Sus 4',
  '6':     'Major 6th',
  'm6':    'Minor 6th',
  'add9':  'Add 9',
  'madd9': 'Minor Add 9',
  'maj7':  'Major 7th',
  'm7':    'Minor 7th',
  '7':     'Dominant 7th',
  'dim7':  'Diminished 7th',
  'm7b5':  'Half Diminished',
  'mM7':   'Minor Major 7th',
  '5':     'Power Chord',
  '9':     'Dominant 9th',
  'maj9':  'Major 9th',
  'm9':    'Minor 9th',
}

export function detectChord(noteNames) {
  if (!noteNames || noteNames.length < 2) return null

  const pcs = [...new Set(noteNames.map(nameToPC).filter(n => n >= 0))]
  if (pcs.length < 2) return null

  const bassNote = noteNames.reduce((low, n) => nameToMidi(n) < nameToMidi(low) ? n : low)
  const bassPC   = nameToPC(bassNote)

  let best = null, bestScore = -Infinity

  for (const root of pcs) {
    const ints = pcs.map(pc => (pc - root + 12) % 12).sort((a, b) => a - b)

    for (const tmpl of TEMPLATES) {
      if (!tmpl.ints.every(i => ints.includes(i))) continue

      const extra = ints.filter(i => !tmpl.ints.includes(i)).length
      const score = tmpl.ints.length * 10 - extra * 4 + (root === bassPC ? 2 : 0)

      if (score > bestScore) {
        bestScore = score
        const rootName = NOTE_NAMES[root]
        const bassName = NOTE_NAMES[bassPC]
        best = {
          root:      rootName,
          suffix:    tmpl.suffix,
          inversion: root !== bassPC ? bassName : null,
          full:      rootName + ' ' + (FULL_NAMES[tmpl.suffix] ?? tmpl.suffix),
        }
      }
    }
  }

  return best
}
