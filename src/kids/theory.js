// Kids-mode music + color rules. See docs/kids/PLAN.md §3.

// ── Letter colors (Boomwhackers school standard) ─────────────────────────────
// Used ONLY for keys / letters. Never for vibes.
export const KEYS = [
  { letter: 'C', pc: 0,  color: '#ef4444' },
  { letter: 'D', pc: 2,  color: '#f97316' },
  { letter: 'E', pc: 4,  color: '#facc15' },
  { letter: 'F', pc: 5,  color: '#4ade80' },
  { letter: 'G', pc: 7,  color: '#14b8a6' },
  { letter: 'A', pc: 9,  color: '#a855f7' },
  { letter: 'B', pc: 11, color: '#ec4899' },
]
export const keyByLetter = l => KEYS.find(k => k.letter === l) ?? KEYS[0]

// ── Vibe wheel ───────────────────────────────────────────────────────────────
// Order matters: neighbors on the wheel are musical cousins, opposites complement.
export const VIBES = [
  { id: 0, name: 'stompy',  hue: '#ff4d5e', glow: '#ff8a95', shape: '▲', bpm: 128, prog: [0, 3, 4, 3] },
  { id: 1, name: 'bouncy',  hue: '#ff9f1c', glow: '#ffc56b', shape: '◆', bpm: 108, prog: [0, 3, 0, 4] },
  { id: 2, name: 'sunny',   hue: '#ffd60a', glow: '#ffe866', shape: '★', bpm: 118, prog: [0, 4, 5, 3] },
  { id: 3, name: 'chill',   hue: '#2ec27e', glow: '#7ee2b0', shape: '●', bpm: 92,  prog: [0, 3, 0, 4] },
  { id: 4, name: 'dreamy',  hue: '#3a86ff', glow: '#8ab6ff', shape: '☾', bpm: 76,  prog: [0, 5, 3, 4] },
  { id: 5, name: 'spooky',  hue: '#9d4edd', glow: '#c99bf0', shape: '✦', bpm: 96,  prog: [0, 5, 1, 4] },
]

// 0 = twin, 1 = cousin, 2 = clash, 3 = complement
export function vibeDistance(a, b) {
  const d = Math.abs(a - b) % 6
  return Math.min(d, 6 - d)
}
export const RELATION = [
  { id: 'twin',       badge: '👯' },
  { id: 'cousin',     badge: '🤝' },
  { id: 'clash',      badge: '⚡' },
  { id: 'complement', badge: '🧩' },
]

// ── Scales ───────────────────────────────────────────────────────────────────
const MODES = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
}

// Semitones above the tonic for any (possibly negative / >7) scale degree.
export function degreeToSemis(deg, mode) {
  const iv = MODES[mode] ?? MODES.major
  const oct = Math.floor(deg / 7)
  return oct * 12 + iv[((deg % 7) + 7) % 7]
}

// Wrap key offset to −5…+6 so every key stays near the instrument's sweet spot.
export function keyOffset(letter) {
  const pc = keyByLetter(letter).pc
  return pc > 6 ? pc - 12 : pc
}

// ── Age tiers ────────────────────────────────────────────────────────────────
export const TIERS = {
  seedling: { slots: 3, bankSize: 8,  keys: false, tempo: false, meter: false, surprise: false, volume: false, octave: false, badges: false },
  sprout:   { slots: 4, bankSize: 12, keys: true,  tempo: true,  meter: false, surprise: false, volume: true,  octave: false, badges: true },
  bloom:    { slots: 6, bankSize: 99, keys: true,  tempo: true,  meter: true,  surprise: true,  volume: true,  octave: true,  badges: true },
}
export function tierForAge(age) {
  if (age <= 4) return 'seedling'
  if (age <= 6) return 'sprout'
  return 'bloom'
}
