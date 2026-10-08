// Kid instrument roster. Order = unlock order (tiers show the first N).
// role decides which pattern family the instrument plays (see patterns.js).
// base = MIDI note of the tonic in the key of C for this instrument's register.
// db = loudness trim, measured so every instrument sits at its role's level
//      (solo RMS targets: beat −24, bass −26, comp/melody −28, sparkle/pad −30 dBFS).
//      The soundfont samples are mastered very quietly, hence the big boosts.

const GLEITZ = 'https://gleitz.github.io/midi-js-soundfonts/MusyngKite/'
const SALAMANDER = 'https://tonejs.github.io/audio/salamander/'

export const INSTRUMENTS = [
  { id: 'drums',     icon: '🥁', role: 'beat', db: -1 },
  { id: 'piano',     icon: '🎹', role: 'comp',    base: 60, src: 'salamander', db: 0 },
  { id: 'guitar',    icon: '🎸', role: 'comp',    base: 48, src: 'acoustic_guitar_steel', voicing: [0, 2, 4, 7], strum: 0.018, db: 7.5 },
  { id: 'xylophone', icon: '🌈', role: 'melody',  base: 72, src: 'xylophone', db: 15.5 },
  { id: 'bass',      icon: '🐋', role: 'bass',    base: 36, src: 'electric_bass_finger', db: 7.5 },
  { id: 'violin',    icon: '🎻', role: 'melody',  base: 60, src: 'violin', legato: true, db: 20 },
  { id: 'trumpet',   icon: '🎺', role: 'melody',  base: 60, src: 'trumpet', legato: true, db: 15.5 },
  { id: 'flute',     icon: '🪈', role: 'melody',  base: 72, src: 'flute', legato: true, db: 14 },
  { id: 'marimba',   icon: '🪵', role: 'sparkle', base: 60, src: 'marimba', db: 7.5 },
  { id: 'musicbox',  icon: '🎁', role: 'sparkle', base: 72, src: 'music_box', db: 17 },
  { id: 'steeldrum', icon: '🏝️', role: 'melody',  base: 60, src: 'steel_drums', db: 18 },
  { id: 'choir',     icon: '😮', role: 'pad',     base: 60, src: 'voice_oohs', db: 5 },
  { id: 'banjo',     icon: '🪕', role: 'comp',    base: 60, src: 'banjo', strum: 0.012, db: 13 },
  { id: 'glock',     icon: '✨', role: 'sparkle', base: 84, src: 'glockenspiel', db: 22 },
  { id: 'kalimba',   icon: '👐', role: 'sparkle', base: 72, src: 'kalimba', db: 16.5 },
  { id: 'strings',   icon: '🌊', role: 'pad',     base: 48, src: 'string_ensemble_1', db: 1 },
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
