// Kid instrument roster. Order = unlock order (tiers show the first N).
// role decides which pattern family the instrument plays (see patterns.js).
// base = MIDI note of the tonic in the key of C for this instrument's register.

const GLEITZ = 'https://gleitz.github.io/midi-js-soundfonts/MusyngKite/'
const SALAMANDER = 'https://tonejs.github.io/audio/salamander/'

export const INSTRUMENTS = [
  { id: 'drums',     icon: '🥁', role: 'beat' },
  { id: 'piano',     icon: '🎹', role: 'comp',    base: 60, src: 'salamander' },
  { id: 'guitar',    icon: '🎸', role: 'comp',    base: 48, src: 'acoustic_guitar_steel', voicing: [0, 2, 4, 7], strum: 0.018 },
  { id: 'xylophone', icon: '🌈', role: 'melody',  base: 72, src: 'xylophone' },
  { id: 'bass',      icon: '🐋', role: 'bass',    base: 36, src: 'electric_bass_finger' },
  { id: 'violin',    icon: '🎻', role: 'melody',  base: 60, src: 'violin', legato: true },
  { id: 'trumpet',   icon: '🎺', role: 'melody',  base: 60, src: 'trumpet', legato: true },
  { id: 'flute',     icon: '🪈', role: 'melody',  base: 72, src: 'flute', legato: true },
  { id: 'marimba',   icon: '🪵', role: 'sparkle', base: 60, src: 'marimba' },
  { id: 'musicbox',  icon: '🎁', role: 'sparkle', base: 72, src: 'music_box' },
  { id: 'steeldrum', icon: '🏝️', role: 'melody',  base: 60, src: 'steel_drums' },
  { id: 'choir',     icon: '😮', role: 'pad',     base: 60, src: 'voice_oohs' },
  { id: 'banjo',     icon: '🪕', role: 'comp',    base: 60, src: 'banjo', strum: 0.012 },
  { id: 'glock',     icon: '✨', role: 'sparkle', base: 84, src: 'glockenspiel' },
  { id: 'kalimba',   icon: '👐', role: 'sparkle', base: 72, src: 'kalimba' },
  { id: 'strings',   icon: '🌊', role: 'pad',     base: 48, src: 'string_ensemble_1' },
]
export const instById = id => INSTRUMENTS.find(i => i.id === id)

const FLAT_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']
const SALA_NAMES = { 0: 'C', 3: 'Ds', 6: 'Fs', 9: 'A' }

// Sample map covering the engine's playable range for an instrument
// (base −24…+36, see the register clamp in kidsEngine.playPitched).
export function sampleUrls(inst) {
  const lo = Math.max(21, inst.base - 24)
  const hi = Math.min(108, inst.base + 36)
  const urls = {}
  for (let m = lo - (lo % 3); m <= hi; m += 3) {
    const pc = m % 12
    const oct = Math.floor(m / 12) - 1
    if (inst.src === 'salamander') {
      if (!(pc in SALA_NAMES)) continue
      urls[m] = `${SALAMANDER}${SALA_NAMES[pc]}${oct}.mp3`
    } else {
      urls[m] = `${GLEITZ}${inst.src}-mp3/${FLAT_NAMES[pc]}${oct}.mp3`
    }
  }
  return urls
}
