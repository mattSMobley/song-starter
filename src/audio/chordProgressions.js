import { midiToNoteName } from './scales.js'

const ROOTS_PC = {
  'C':0,'C#':1,'D':2,'D#':3,'E':4,'F':5,
  'F#':6,'G':7,'G#':8,'A':9,'A#':10,'B':11,
}
const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']

const CHORD_INTERVALS = {
  maj:  [0,4,7],
  min:  [0,3,7],
  dim:  [0,3,6],
  aug:  [0,4,8],
  dom7: [0,4,7,10],
  maj7: [0,4,7,11],
  min7: [0,3,7,10],
  dim7: [0,3,6,9],
  m7b5: [0,3,6,10],
  sus4: [0,5,7],
}

const SUFFIX = {
  maj:'', min:'m', dim:'dim', aug:'aug',
  dom7:'7', maj7:'maj7', min7:'m7',
  dim7:'dim7', m7b5:'m7b5', sus4:'sus4',
}

// semi = semitone offset from root key
const SCALE_PROGRESSIONS = {
  major: [
    { name:'Pop',          steps:[{s:0,t:'maj',n:'I'},{s:7,t:'maj',n:'V'},{s:9,t:'min',n:'vi'},{s:5,t:'maj',n:'IV'}] },
    { name:'Classic',      steps:[{s:0,t:'maj',n:'I'},{s:5,t:'maj',n:'IV'},{s:7,t:'maj',n:'V'},{s:0,t:'maj',n:'I'}] },
    { name:'50s',          steps:[{s:0,t:'maj',n:'I'},{s:9,t:'min',n:'vi'},{s:5,t:'maj',n:'IV'},{s:7,t:'maj',n:'V'}] },
    { name:'Emotional',    steps:[{s:9,t:'min',n:'vi'},{s:5,t:'maj',n:'IV'},{s:0,t:'maj',n:'I'},{s:7,t:'maj',n:'V'}] },
    { name:'Jazz ii–V–I',  steps:[{s:2,t:'min7',n:'IIm7'},{s:7,t:'dom7',n:'V7'},{s:0,t:'maj7',n:'Imaj7'}] },
    { name:'Andalusian',   steps:[{s:9,t:'min',n:'vi'},{s:7,t:'maj',n:'V'},{s:5,t:'maj',n:'IV'},{s:4,t:'maj',n:'III'}] },
  ],
  minor: [
    { name:'Epic',         steps:[{s:0,t:'min',n:'i'},{s:8,t:'maj',n:'VI'},{s:3,t:'maj',n:'III'},{s:10,t:'maj',n:'VII'}] },
    { name:'Dark',         steps:[{s:0,t:'min',n:'i'},{s:10,t:'maj',n:'VII'},{s:8,t:'maj',n:'VI'},{s:10,t:'maj',n:'VII'}] },
    { name:'Minor Pop',    steps:[{s:0,t:'min',n:'i'},{s:10,t:'maj',n:'VII'},{s:8,t:'maj',n:'VI'},{s:3,t:'maj',n:'III'}] },
    { name:'Melancholic',  steps:[{s:0,t:'min',n:'i'},{s:5,t:'min',n:'iv'},{s:10,t:'maj',n:'VII'},{s:3,t:'maj',n:'III'}] },
    { name:'Jazz Minor',   steps:[{s:2,t:'m7b5',n:'iiø'},{s:7,t:'dom7',n:'V7'},{s:0,t:'min7',n:'im7'}] },
    { name:'Cinematic',    steps:[{s:0,t:'min',n:'i'},{s:8,t:'maj',n:'VI'},{s:3,t:'maj',n:'III'},{s:7,t:'maj',n:'v'}] },
  ],
  dorian: [
    { name:'Dorian Groove', steps:[{s:0,t:'min',n:'i'},{s:5,t:'maj',n:'IV'},{s:0,t:'min',n:'i'},{s:5,t:'maj',n:'IV'}] },
    { name:'Modal',         steps:[{s:0,t:'min',n:'i'},{s:5,t:'maj',n:'IV'},{s:10,t:'maj',n:'VII'},{s:0,t:'min',n:'i'}] },
    { name:'Funky',         steps:[{s:0,t:'min',n:'i'},{s:2,t:'min',n:'ii'},{s:5,t:'maj',n:'IV'},{s:0,t:'min',n:'i'}] },
    { name:'Soul 7ths',     steps:[{s:0,t:'min7',n:'im7'},{s:5,t:'maj7',n:'IVmaj7'},{s:2,t:'min7',n:'iim7'},{s:5,t:'maj',n:'IV'}] },
    { name:'Space',         steps:[{s:0,t:'min',n:'i'},{s:10,t:'maj',n:'VII'},{s:3,t:'maj',n:'III'},{s:5,t:'maj',n:'IV'}] },
    { name:'Journey',       steps:[{s:0,t:'min',n:'i'},{s:5,t:'maj',n:'IV'},{s:2,t:'min',n:'ii'},{s:7,t:'dom7',n:'V7'}] },
  ],
  phrygian: [
    { name:'Flamenco',    steps:[{s:0,t:'min',n:'i'},{s:1,t:'maj',n:'II'},{s:0,t:'min',n:'i'},{s:1,t:'maj',n:'II'}] },
    { name:'Spanish',     steps:[{s:1,t:'maj',n:'II'},{s:3,t:'maj',n:'III'},{s:1,t:'maj',n:'II'},{s:0,t:'min',n:'i'}] },
    { name:'Metal',       steps:[{s:0,t:'min',n:'i'},{s:1,t:'maj',n:'bII'},{s:3,t:'maj',n:'III'},{s:1,t:'maj',n:'bII'}] },
    { name:'Eastern',     steps:[{s:1,t:'maj',n:'bII'},{s:0,t:'min',n:'i'},{s:10,t:'maj',n:'bVII'},{s:0,t:'min',n:'i'}] },
    { name:'Tension',     steps:[{s:0,t:'min',n:'i'},{s:5,t:'min',n:'iv'},{s:1,t:'maj',n:'bII'},{s:0,t:'min',n:'i'}] },
    { name:'Dark Fall',   steps:[{s:0,t:'min',n:'i'},{s:8,t:'maj',n:'bVI'},{s:10,t:'maj',n:'bVII'},{s:1,t:'maj',n:'bII'}] },
  ],
  lydian: [
    { name:'Dreamy',      steps:[{s:0,t:'maj',n:'I'},{s:2,t:'maj',n:'II'},{s:0,t:'maj',n:'I'},{s:2,t:'maj',n:'II'}] },
    { name:'Film Score',  steps:[{s:0,t:'maj',n:'I'},{s:2,t:'maj',n:'II'},{s:9,t:'min',n:'vi'},{s:7,t:'maj',n:'V'}] },
    { name:'Floating',    steps:[{s:0,t:'maj7',n:'Imaj7'},{s:2,t:'maj7',n:'IImaj7'},{s:11,t:'min7',n:'viim7'},{s:0,t:'maj7',n:'Imaj7'}] },
    { name:'Sunshine',    steps:[{s:0,t:'maj',n:'I'},{s:7,t:'maj',n:'V'},{s:9,t:'min',n:'vi'},{s:2,t:'maj',n:'II'}] },
    { name:'Wonder',      steps:[{s:0,t:'maj7',n:'Imaj7'},{s:9,t:'min7',n:'vim7'},{s:2,t:'maj7',n:'IImaj7'},{s:7,t:'maj',n:'V'}] },
    { name:'Cosmic',      steps:[{s:0,t:'maj',n:'I'},{s:2,t:'maj',n:'II'},{s:4,t:'min',n:'iii'},{s:2,t:'maj',n:'II'}] },
  ],
  mixolydian: [
    { name:'Rock',        steps:[{s:0,t:'maj',n:'I'},{s:10,t:'maj',n:'VII'},{s:5,t:'maj',n:'IV'},{s:0,t:'maj',n:'I'}] },
    { name:'Bluesy',      steps:[{s:0,t:'maj',n:'I'},{s:5,t:'maj',n:'IV'},{s:10,t:'maj',n:'VII'},{s:5,t:'maj',n:'IV'}] },
    { name:'Celtic',      steps:[{s:0,t:'maj',n:'I'},{s:10,t:'maj',n:'VII'},{s:5,t:'maj',n:'IV'},{s:10,t:'maj',n:'VII'}] },
    { name:'Swampy',      steps:[{s:0,t:'dom7',n:'I7'},{s:5,t:'dom7',n:'IV7'},{s:10,t:'maj',n:'VII'},{s:5,t:'dom7',n:'IV7'}] },
    { name:'Cinematic',   steps:[{s:0,t:'maj',n:'I'},{s:9,t:'min',n:'vi'},{s:5,t:'maj',n:'IV'},{s:10,t:'maj',n:'VII'}] },
    { name:'Hard Rock',   steps:[{s:0,t:'maj',n:'I'},{s:2,t:'min',n:'ii'},{s:10,t:'maj',n:'VII'},{s:5,t:'maj',n:'IV'}] },
  ],
  pentatonic: [
    { name:'Simple',      steps:[{s:0,t:'maj',n:'I'},{s:7,t:'maj',n:'V'},{s:5,t:'maj',n:'IV'},{s:0,t:'maj',n:'I'}] },
    { name:'Country',     steps:[{s:0,t:'maj',n:'I'},{s:5,t:'maj',n:'IV'},{s:0,t:'maj',n:'I'},{s:7,t:'maj',n:'V'}] },
    { name:'Uplifting',   steps:[{s:0,t:'maj',n:'I'},{s:9,t:'min',n:'vi'},{s:5,t:'maj',n:'IV'},{s:7,t:'maj',n:'V'}] },
    { name:'Gospel',      steps:[{s:0,t:'maj',n:'I'},{s:5,t:'maj',n:'IV'},{s:7,t:'maj',n:'V'},{s:5,t:'maj',n:'IV'}] },
    { name:'Festival',    steps:[{s:0,t:'maj',n:'I'},{s:7,t:'maj',n:'V'},{s:9,t:'min',n:'vi'},{s:7,t:'maj',n:'V'}] },
    { name:'Campfire',    steps:[{s:0,t:'maj',n:'I'},{s:9,t:'min',n:'vi'},{s:5,t:'maj',n:'IV'},{s:7,t:'maj',n:'V'}] },
  ],
  'penta-minor': [
    { name:'Minor Groove', steps:[{s:0,t:'min',n:'i'},{s:7,t:'min',n:'v'},{s:3,t:'maj',n:'III'},{s:0,t:'min',n:'i'}] },
    { name:'Hip Hop',      steps:[{s:0,t:'min',n:'i'},{s:3,t:'maj',n:'III'},{s:10,t:'maj',n:'VII'},{s:3,t:'maj',n:'III'}] },
    { name:'Blues Feel',   steps:[{s:0,t:'min',n:'i'},{s:5,t:'min',n:'iv'},{s:10,t:'maj',n:'VII'},{s:5,t:'min',n:'iv'}] },
    { name:'Stoner',       steps:[{s:0,t:'min',n:'i'},{s:10,t:'maj',n:'VII'},{s:5,t:'min',n:'iv'},{s:3,t:'maj',n:'III'}] },
    { name:'Drill',        steps:[{s:0,t:'min',n:'i'},{s:10,t:'maj',n:'VII'},{s:8,t:'maj',n:'VI'},{s:10,t:'maj',n:'VII'}] },
    { name:'Dark R&B',     steps:[{s:0,t:'min7',n:'im7'},{s:3,t:'maj',n:'III'},{s:8,t:'maj',n:'VI'},{s:10,t:'maj',n:'VII'}] },
  ],
  blues: [
    { name:'12-Bar',       steps:[{s:0,t:'dom7',n:'I7'},{s:5,t:'dom7',n:'IV7'},{s:0,t:'dom7',n:'I7'},{s:7,t:'dom7',n:'V7'}] },
    { name:'Quick Four',   steps:[{s:0,t:'dom7',n:'I7'},{s:5,t:'dom7',n:'IV7'},{s:0,t:'dom7',n:'I7'},{s:5,t:'dom7',n:'IV7'}] },
    { name:'Slow Blues',   steps:[{s:0,t:'dom7',n:'I7'},{s:0,t:'dom7',n:'I7'},{s:5,t:'dom7',n:'IV7'},{s:7,t:'dom7',n:'V7'}] },
    { name:'Jazz Blues',   steps:[{s:0,t:'dom7',n:'I7'},{s:5,t:'dom7',n:'IV7'},{s:2,t:'min7',n:'IIm7'},{s:7,t:'dom7',n:'V7'}] },
    { name:'Minor Blues',  steps:[{s:0,t:'min7',n:'im7'},{s:5,t:'min7',n:'ivm7'},{s:7,t:'dom7',n:'V7'},{s:0,t:'min7',n:'im7'}] },
    { name:'Shuffle',      steps:[{s:0,t:'dom7',n:'I7'},{s:5,t:'dom7',n:'IV7'},{s:7,t:'dom7',n:'V7'},{s:5,t:'dom7',n:'IV7'}] },
  ],
  chromatic: [
    { name:'Chromatic',    steps:[{s:0,t:'maj',n:'I'},{s:1,t:'maj',n:'bII'},{s:2,t:'maj',n:'II'},{s:3,t:'min',n:'bIII'}] },
    { name:'Descending',   steps:[{s:0,t:'maj',n:'I'},{s:10,t:'maj',n:'bVII'},{s:8,t:'maj',n:'bVI'},{s:7,t:'maj',n:'V'}] },
    { name:'Backdoor',     steps:[{s:0,t:'dom7',n:'I7'},{s:5,t:'dom7',n:'IV7'},{s:10,t:'dom7',n:'bVII7'},{s:0,t:'dom7',n:'I7'}] },
    { name:'Chromatic Walk',steps:[{s:0,t:'maj',n:'I'},{s:3,t:'maj',n:'bIII'},{s:5,t:'maj',n:'IV'},{s:8,t:'maj',n:'bVI'}] },
    { name:'Tritone Sub',  steps:[{s:0,t:'maj7',n:'Imaj7'},{s:1,t:'dom7',n:'bII7'},{s:2,t:'min7',n:'IIm7'},{s:1,t:'dom7',n:'bII7'}] },
    { name:'Coltrane',     steps:[{s:0,t:'maj7',n:'Imaj7'},{s:4,t:'dom7',n:'III7'},{s:8,t:'maj7',n:'bVImaj7'},{s:0,t:'maj7',n:'Imaj7'}] },
  ],
}

function buildChordNotes(rootPC, semi, chordType) {
  const chordPC = (rootPC + semi) % 12
  // Keep chord roots near middle C: C4–F4 in oct4, F#3–B3 in oct3
  const rootMidi = chordPC < 6 ? 60 + chordPC : 48 + chordPC
  const intervals = CHORD_INTERVALS[chordType] || CHORD_INTERVALS.maj
  return intervals.map(i => midiToNoteName(rootMidi + i))
}

function chordLabel(rootPC, semi, chordType) {
  const pc = (rootPC + semi) % 12
  return NOTE_NAMES[pc] + (SUFFIX[chordType] ?? chordType)
}

export function getProgressions(root, scaleName) {
  const rootPC = ROOTS_PC[root] ?? 0
  const template = SCALE_PROGRESSIONS[scaleName] ?? SCALE_PROGRESSIONS.major

  return template.map(prog => ({
    name: prog.name,
    tag:  prog.steps.map(s => s.n).join(' – '),
    chords: prog.steps.map(step => ({
      numeral: step.n,
      label:   chordLabel(rootPC, step.s, step.t),
      notes:   buildChordNotes(rootPC, step.s, step.t),
    })),
  }))
}
