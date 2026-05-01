import { getScaleNotes } from './scales.js'

function makeEvents(scaleNotes, degrees, durations) {
  let beat = 0
  return degrees.map((deg, i) => {
    const note = scaleNotes[Math.max(0, Math.min(deg, scaleNotes.length - 1))]
    const event = { note, beat, duration: durations[i] }
    beat += durations[i]
    return event
  })
}

const H = 0.5, Q = 1.0, DQ = 1.5, HF = 2.0

// Each entry: { id, name, category, emoji, root, scaleName, octave, bars, degrees[], durations[] }
const RAW = [

  // ── Blues ──────────────────────────────────────────────────────────────────
  {
    id: 'blues-descend', name: 'Classic Lick', category: 'Blues', emoji: '🎸',
    root: 'A', scaleName: 'blues', octave: 3, bars: 1,
    degrees:   [5, 4, 3, 2, 1, 0, 2, 4],
    durations: [H, H, H, H, H, H, H, H],
  },
  {
    id: 'blues-climb', name: 'Blues Climb', category: 'Blues', emoji: '🎸',
    root: 'G', scaleName: 'blues', octave: 3, bars: 2,
    degrees:   [0,1,2,3,4,5,6,5, 4,3,5,4,3,2,1,0],
    durations: [H,H,H,H,H,H,H,H, H,H,H,H,H,H,H,H],
  },
  {
    id: 'blues-riff', name: 'Shuffle Riff', category: 'Blues', emoji: '🎸',
    root: 'E', scaleName: 'blues', octave: 3, bars: 2,
    degrees:   [0,2,0,2,4,2,0,5, 4,2,0,2,5,4,2,0],
    durations: [H,H,H,H,H,H,H,H, H,H,H,H,H,H,H,H],
  },
  {
    id: 'blues-slow', name: 'Slow Burn', category: 'Blues', emoji: '🎸',
    root: 'D', scaleName: 'blues', octave: 3, bars: 2,
    degrees:   [0, 2, 4, 3, 2, 0, 4, 2],
    durations: [Q, Q, Q, Q, Q, Q, HF, HF],
  },
  {
    id: 'blues-call', name: 'Call & Response', category: 'Blues', emoji: '🎸',
    root: 'C', scaleName: 'blues', octave: 3, bars: 2,
    degrees:   [5,3,2,0,2,3,5,3, 2,0,2,3,2,0,3,0],
    durations: [H,H,H,H,H,H,H,H, H,H,H,H,H,H,Q,Q],
  },
  {
    id: 'blues-turnaround', name: 'Turnaround', category: 'Blues', emoji: '🎸',
    root: 'B', scaleName: 'blues', octave: 3, bars: 2,
    degrees:   [0,0,2,3,2,0,3,5, 4,3,2,0,3,2,0,0],
    durations: [Q,H,H,H,H,H,H,H, H,H,H,H,H,H,Q,Q],
  },

  // ── Jazz ───────────────────────────────────────────────────────────────────
  {
    id: 'jazz-dorian', name: 'Smooth Changes', category: 'Jazz', emoji: '🎷',
    root: 'D', scaleName: 'dorian', octave: 3, bars: 2,
    degrees:   [0,2,4,6,9,8,6,4, 2,4,6,9,8,6,4,2],
    durations: [H,H,H,H,H,H,H,H, H,H,H,H,H,H,H,H],
  },
  {
    id: 'jazz-swing', name: 'Swing Phrase', category: 'Jazz', emoji: '🎷',
    root: 'G', scaleName: 'mixolydian', octave: 3, bars: 2,
    degrees:   [0,4,7,4,0,4,7,9, 7,4,0,7,9,7,4,0],
    durations: [H,H,H,H,H,H,H,H, H,H,H,H,H,H,H,H],
  },
  {
    id: 'jazz-bebop', name: 'Bebop Cascade', category: 'Jazz', emoji: '🎷',
    root: 'F', scaleName: 'dorian', octave: 4, bars: 2,
    degrees:   [7,6,5,4,3,2,1,0, 1,2,3,4,5,6,7,6],
    durations: [H,H,H,H,H,H,H,H, H,H,H,H,H,H,H,H],
  },
  {
    id: 'jazz-modal', name: 'Modal Miles', category: 'Jazz', emoji: '🎷',
    root: 'D', scaleName: 'dorian', octave: 4, bars: 2,
    degrees:   [0,4,6,9,8,6,4,2, 0,2,4,6,8,6,4,0],
    durations: [H,H,H,H,H,H,H,H, H,H,H,H,H,H,H,H],
  },
  {
    id: 'jazz-bossawalk', name: 'Bossa Walk', category: 'Jazz', emoji: '🎷',
    root: 'C', scaleName: 'major', octave: 4, bars: 2,
    degrees:   [0,2,4,7,9,7,4,7, 9,7,4,2,4,2,0,2],
    durations: [H,H,H,H,H,H,H,H, H,H,H,H,H,H,H,H],
  },
  {
    id: 'jazz-waltz', name: 'Jazz Waltz', category: 'Jazz', emoji: '🎷',
    root: 'A', scaleName: 'dorian', octave: 3, bars: 2,
    degrees:   [0,2,4,2,0,4,6,4, 2,0,6,9,8,6,4,2],
    durations: [Q,H,Q,Q,H,Q,Q,H, Q,H,H,H,H,Q,H,Q],
  },

  // ── Chill ──────────────────────────────────────────────────────────────────
  {
    id: 'chill-lofi', name: 'Lo-Fi Dream', category: 'Chill', emoji: '🌙',
    root: 'D', scaleName: 'penta-minor', octave: 4, bars: 2,
    degrees:   [0, 2, 4, 2, 0, 2, 4, 2],
    durations: [Q, Q, Q, Q, Q, Q, HF, HF],
  },
  {
    id: 'chill-rain', name: 'Rainy Window', category: 'Chill', emoji: '🌙',
    root: 'A', scaleName: 'minor', octave: 4, bars: 2,
    degrees:   [4,2,1,0,2,4,6,4, 2,1,0,2,4,6,4,2],
    durations: [H,H,H,H,H,H,H,H, H,H,H,H,H,H,H,H],
  },
  {
    id: 'chill-lydian', name: 'Lydian Float', category: 'Chill', emoji: '🌙',
    root: 'F', scaleName: 'lydian', octave: 4, bars: 2,
    degrees:   [0, 3, 4, 6, 4, 3, 0, 4],
    durations: [Q, Q, Q, Q, Q, Q, HF, HF],
  },
  {
    id: 'chill-ambient', name: 'Deep Space', category: 'Chill', emoji: '🌙',
    root: 'C', scaleName: 'penta-minor', octave: 4, bars: 2,
    degrees:   [0, 4, 2, 0, 4, 7, 4, 0],
    durations: [Q, Q, Q, Q, Q, Q, HF, HF],
  },
  {
    id: 'chill-tape', name: 'Tape Warmth', category: 'Chill', emoji: '🌙',
    root: 'F', scaleName: 'penta-minor', octave: 3, bars: 2,
    degrees:   [4,2,0,2,4,7,4,2, 0,4,7,9,7,4,2,0],
    durations: [Q,Q,Q,Q,Q,Q,Q,Q, H,H,H,H,H,H,H,H],
  },
  {
    id: 'chill-midnight', name: 'Midnight Ride', category: 'Chill', emoji: '🌙',
    root: 'E', scaleName: 'dorian', octave: 3, bars: 2,
    degrees:   [0,4,2,0,4,6,4,0, 2,4,6,9,6,4,2,0],
    durations: [Q,H,H,Q,H,H,Q,Q, H,H,H,H,H,H,H,H],
  },

  // ── Pop ────────────────────────────────────────────────────────────────────
  {
    id: 'pop-hook', name: 'Summer Hook', category: 'Pop', emoji: '☀️',
    root: 'C', scaleName: 'major', octave: 4, bars: 2,
    degrees:   [0,2,4,7,9,7,4,2, 0,4,7,4,2,0,2,0],
    durations: [H,H,H,H,H,H,H,H, H,H,H,H,H,H,H,H],
  },
  {
    id: 'pop-penta', name: 'Feel Good', category: 'Pop', emoji: '☀️',
    root: 'G', scaleName: 'pentatonic', octave: 4, bars: 2,
    degrees:   [0,2,4,7,4,2,4,7, 9,7,4,2,4,2,0,2],
    durations: [H,H,H,H,H,H,H,H, H,H,H,H,H,H,H,H],
  },
  {
    id: 'pop-chorus', name: 'Big Chorus', category: 'Pop', emoji: '☀️',
    root: 'C', scaleName: 'pentatonic', octave: 4, bars: 2,
    degrees:   [4,4,2,0,2,4,7,9, 7,4,4,2,0,2,0,4],
    durations: [H,H,H,H,H,H,H,H, H,H,H,H,H,H,H,H],
  },
  {
    id: 'pop-earworm', name: 'Earworm', category: 'Pop', emoji: '☀️',
    root: 'A', scaleName: 'pentatonic', octave: 4, bars: 2,
    degrees:   [2,4,7,4,2,0,2,4, 7,9,7,4,2,4,2,0],
    durations: [H,H,H,H,H,H,H,H, H,H,H,H,H,H,H,H],
  },
  {
    id: 'pop-anthemic', name: 'Anthemic', category: 'Pop', emoji: '☀️',
    root: 'D', scaleName: 'major', octave: 4, bars: 2,
    degrees:   [0,4,7,4,2,4,0,2, 4,7,9,7,4,2,4,0],
    durations: [Q,H,H,Q,Q,H,Q,Q, Q,H,H,Q,Q,H,Q,Q],
  },

  // ── Dark ───────────────────────────────────────────────────────────────────
  {
    id: 'dark-phrygian', name: 'Shadow Walk', category: 'Dark', emoji: '🌑',
    root: 'E', scaleName: 'phrygian', octave: 3, bars: 2,
    degrees:   [0,1,0,2,1,0,3,2, 1,0,1,2,3,4,2,0],
    durations: [H,H,H,H,H,H,H,H, H,H,H,H,H,H,H,H],
  },
  {
    id: 'dark-minor', name: 'Midnight', category: 'Dark', emoji: '🌑',
    root: 'D', scaleName: 'minor', octave: 3, bars: 2,
    degrees:   [0,2,4,6,5,4,2,0, 4,6,5,4,2,0,2,0],
    durations: [H,H,H,H,H,H,H,H, H,H,H,H,H,H,H,H],
  },
  {
    id: 'dark-heavy', name: 'Iron Riff', category: 'Dark', emoji: '🌑',
    root: 'A', scaleName: 'phrygian', octave: 3, bars: 2,
    degrees:   [0,0,1,0,0,3,2,0, 0,0,1,0,3,5,3,0],
    durations: [H,H,H,H,H,H,H,H, H,H,H,H,H,H,H,H],
  },
  {
    id: 'dark-blood', name: 'Blood Moon', category: 'Dark', emoji: '🌑',
    root: 'C', scaleName: 'phrygian', octave: 3, bars: 2,
    degrees:   [0,1,0,3,4,3,1,0, 0,2,1,0,3,2,1,0],
    durations: [Q,H,Q,H,H,Q,H,Q, Q,H,H,H,H,Q,H,Q],
  },
  {
    id: 'dark-void', name: 'The Void', category: 'Dark', emoji: '🌑',
    root: 'B', scaleName: 'phrygian', octave: 3, bars: 2,
    degrees:   [0,2,1,0,2,3,4,3, 2,0,3,2,1,0,2,0],
    durations: [H,H,H,H,H,H,H,H, H,H,H,H,H,H,H,H],
  },

  // ── Dance ──────────────────────────────────────────────────────────────────
  {
    id: 'dance-arp', name: 'Rave Arp', category: 'Dance', emoji: '⚡',
    root: 'F', scaleName: 'penta-minor', octave: 4, bars: 2,
    degrees:   [0,2,4,7,9,7,4,2, 0,4,7,9,4,2,0,4],
    durations: [H,H,H,H,H,H,H,H, H,H,H,H,H,H,H,H],
  },
  {
    id: 'dance-bounce', name: 'Bounce', category: 'Dance', emoji: '⚡',
    root: 'A', scaleName: 'pentatonic', octave: 4, bars: 2,
    degrees:   [0,2,4,2,0,4,7,4, 0,2,4,7,4,2,0,2],
    durations: [H,H,H,H,H,H,H,H, H,H,H,H,H,H,H,H],
  },
  {
    id: 'dance-pulse', name: 'Pulse', category: 'Dance', emoji: '⚡',
    root: 'C', scaleName: 'minor', octave: 4, bars: 2,
    degrees:   [0,4,7,4,0,4,7,4, 0,7,4,0,7,9,7,0],
    durations: [H,H,H,H,H,H,H,H, H,H,H,H,H,H,H,H],
  },
  {
    id: 'dance-trance', name: 'Trance Lock', category: 'Dance', emoji: '⚡',
    root: 'A', scaleName: 'minor', octave: 4, bars: 2,
    degrees:   [0,4,7,4,0,7,4,0, 7,9,7,4,0,4,7,4],
    durations: [Q,H,H,Q,Q,H,Q,Q, Q,H,H,Q,Q,H,Q,Q],
  },
  {
    id: 'dance-orbital', name: 'Orbital', category: 'Dance', emoji: '⚡',
    root: 'E', scaleName: 'penta-minor', octave: 4, bars: 2,
    degrees:   [0,0,4,0,7,0,4,0, 0,4,0,9,7,0,4,0],
    durations: [H,H,H,H,H,H,H,H, H,H,H,H,H,H,H,H],
  },

  // ── Funk ───────────────────────────────────────────────────────────────────
  {
    id: 'funk-scratch', name: 'Chicken Scratch', category: 'Funk', emoji: '🕺',
    root: 'C', scaleName: 'penta-minor', octave: 4, bars: 2,
    degrees:   [0,4,2,0,4,2,4,7, 4,2,0,4,7,4,2,0],
    durations: [H,H,H,H,H,H,H,H, H,H,H,H,H,H,H,H],
  },
  {
    id: 'funk-parliament', name: 'Parliament', category: 'Funk', emoji: '🕺',
    root: 'A', scaleName: 'dorian', octave: 3, bars: 2,
    degrees:   [0,0,4,2,0,4,0,4, 7,4,0,2,4,2,0,0],
    durations: [Q,H,H,H,H,H,Q,H, H,H,Q,H,H,H,Q,Q],
  },
  {
    id: 'funk-worm', name: 'Funky Worm', category: 'Funk', emoji: '🕺',
    root: 'E', scaleName: 'blues', octave: 3, bars: 1,
    degrees:   [0,2,3,2,0,3,2,0],
    durations: [H,H,Q,H,H,Q,H,H],
  },
  {
    id: 'funk-groove', name: 'Groove Street', category: 'Funk', emoji: '🕺',
    root: 'F', scaleName: 'penta-minor', octave: 4, bars: 2,
    degrees:   [0,4,7,4,2,0,2,4, 0,0,4,7,4,2,0,2],
    durations: [Q,H,H,H,H,Q,H,H, H,Q,H,H,H,H,Q,H],
  },
  {
    id: 'funk-slap', name: 'Slap Bass', category: 'Funk', emoji: '🕺',
    root: 'G', scaleName: 'blues', octave: 3, bars: 2,
    degrees:   [0,0,3,0,5,3,0,3, 5,0,3,5,3,0,5,0],
    durations: [H,Q,H,H,H,H,Q,H, H,H,H,H,H,H,Q,Q],
  },

  // ── R&B ────────────────────────────────────────────────────────────────────
  {
    id: 'rnb-silk', name: 'Silk Roads', category: 'R&B', emoji: '💜',
    root: 'E', scaleName: 'dorian', octave: 4, bars: 2,
    degrees:   [4,6,4,2,4,2,0,2, 4,6,9,8,6,4,2,0],
    durations: [H,H,H,H,H,H,H,H, H,H,H,H,H,H,H,H],
  },
  {
    id: 'rnb-oldschool', name: 'Old School', category: 'R&B', emoji: '💜',
    root: 'G', scaleName: 'penta-minor', octave: 4, bars: 2,
    degrees:   [0,2,4,2,0,4,7,4, 2,0,2,4,7,9,7,4],
    durations: [Q,H,H,Q,H,H,Q,Q, Q,H,H,Q,H,H,Q,Q],
  },
  {
    id: 'rnb-neosoul', name: 'Neo Soul', category: 'R&B', emoji: '💜',
    root: 'D', scaleName: 'dorian', octave: 4, bars: 2,
    degrees:   [0,4,6,9,8,6,4,2, 0,2,4,6,8,9,8,6],
    durations: [H,H,H,H,H,H,H,H, Q,H,H,H,H,H,H,Q],
  },
  {
    id: 'rnb-heart', name: 'Heartstrings', category: 'R&B', emoji: '💜',
    root: 'A', scaleName: 'minor', octave: 4, bars: 2,
    degrees:   [0,2,4,6,5,4,2,0, 2,4,6,5,4,5,4,2],
    durations: [Q,Q,Q,Q,Q,Q,Q,Q, H,H,H,H,Q,H,H,Q],
  },
  {
    id: 'rnb-velvet', name: 'Velvet', category: 'R&B', emoji: '💜',
    root: 'C', scaleName: 'minor', octave: 4, bars: 2,
    degrees:   [4,2,4,6,5,4,2,4, 0,2,4,5,4,2,0,2],
    durations: [Q,H,H,H,H,Q,H,H, Q,H,H,H,H,Q,H,Q],
  },

  // ── Latin ──────────────────────────────────────────────────────────────────
  {
    id: 'latin-salsa', name: 'Salsa', category: 'Latin', emoji: '🌺',
    root: 'G', scaleName: 'mixolydian', octave: 4, bars: 2,
    degrees:   [0,2,4,7,4,2,4,7, 9,7,4,2,4,7,4,0],
    durations: [H,H,H,H,H,H,H,H, H,H,H,H,H,H,H,H],
  },
  {
    id: 'latin-bossa', name: 'Bossa Groove', category: 'Latin', emoji: '🌺',
    root: 'A', scaleName: 'dorian', octave: 4, bars: 2,
    degrees:   [0,4,6,4,0,6,4,0, 4,6,9,6,4,0,4,6],
    durations: [Q,H,H,Q,Q,H,Q,Q, Q,H,H,Q,Q,H,Q,Q],
  },
  {
    id: 'latin-montuno', name: 'Montuno', category: 'Latin', emoji: '🌺',
    root: 'C', scaleName: 'major', octave: 4, bars: 1,
    degrees:   [4,7,9,7,4,2,4,7],
    durations: [H,H,H,H,H,H,H,H],
  },
  {
    id: 'latin-flamenco', name: 'Flamenco', category: 'Latin', emoji: '🌺',
    root: 'A', scaleName: 'phrygian', octave: 4, bars: 2,
    degrees:   [0,1,2,1,0,1,3,2, 1,0,2,1,0,2,3,0],
    durations: [H,H,H,H,H,H,H,H, H,H,H,H,H,H,H,H],
  },
  {
    id: 'latin-cumbia', name: 'Cumbia', category: 'Latin', emoji: '🌺',
    root: 'D', scaleName: 'penta-minor', octave: 4, bars: 2,
    degrees:   [0,2,4,2,0,4,7,4, 2,0,4,7,4,2,0,0],
    durations: [H,Q,H,H,Q,H,Q,H, H,Q,H,Q,H,H,Q,Q],
  },

  // ── Cinematic ──────────────────────────────────────────────────────────────
  {
    id: 'cine-rise', name: 'Epic Rise', category: 'Cinematic', emoji: '🎬',
    root: 'C', scaleName: 'minor', octave: 3, bars: 2,
    degrees:   [0,2,4,6,5,4,6,7, 9,8,7,6,5,4,2,0],
    durations: [H,H,H,H,H,H,H,H, H,H,H,H,H,H,H,H],
  },
  {
    id: 'cine-hero', name: 'The Hero', category: 'Cinematic', emoji: '🎬',
    root: 'F', scaleName: 'lydian', octave: 4, bars: 2,
    degrees:   [0,4,6,4,0,4,7,9, 7,4,0,4,6,7,6,4],
    durations: [Q,H,H,Q,Q,H,H,Q, Q,H,H,Q,Q,H,H,Q],
  },
  {
    id: 'cine-tension', name: 'Tension', category: 'Cinematic', emoji: '🎬',
    root: 'E', scaleName: 'phrygian', octave: 4, bars: 2,
    degrees:   [0,3,2,1,0,2,4,3, 2,1,0,1,2,3,2,0],
    durations: [Q,H,H,H,H,Q,H,H, Q,H,H,H,H,Q,H,H],
  },
  {
    id: 'cine-resolve', name: 'Resolve', category: 'Cinematic', emoji: '🎬',
    root: 'G', scaleName: 'major', octave: 4, bars: 2,
    degrees:   [4,6,7,6,4,2,0,2, 4,7,9,7,4,2,0,4],
    durations: [Q,H,H,Q,Q,H,Q,Q, Q,H,H,Q,Q,H,Q,Q],
  },
  {
    id: 'cine-lament', name: 'Lament', category: 'Cinematic', emoji: '🎬',
    root: 'D', scaleName: 'minor', octave: 4, bars: 2,
    degrees:   [6,5,4,2,0,2,4,5, 4,2,0,2,4,2,0,0],
    durations: [Q,Q,Q,Q,Q,Q,Q,Q, H,H,Q,H,H,Q,HF,HF],
  },
  {
    id: 'cine-conquest', name: 'Conquest', category: 'Cinematic', emoji: '🎬',
    root: 'A', scaleName: 'minor', octave: 3, bars: 2,
    degrees:   [0,0,4,0,7,0,4,7, 9,7,4,0,7,4,0,0],
    durations: [Q,H,H,Q,Q,H,H,Q, Q,H,H,Q,Q,H,Q,Q],
  },

  // ── Ambient ────────────────────────────────────────────────────────────────
  {
    id: 'ambient-drift', name: 'Drift', category: 'Ambient', emoji: '✨',
    root: 'D', scaleName: 'lydian', octave: 4, bars: 2,
    degrees:   [0, 4, 6, 4],
    durations: [HF, HF, HF, HF],
  },
  {
    id: 'ambient-breathe', name: 'Breathe', category: 'Ambient', emoji: '✨',
    root: 'A', scaleName: 'penta-minor', octave: 4, bars: 2,
    degrees:   [0, 4, 2, 0, 7, 4, 2, 4],
    durations: [Q, Q, Q, Q, Q, Q, Q, Q],
  },
  {
    id: 'ambient-glass', name: 'Glass Halls', category: 'Ambient', emoji: '✨',
    root: 'E', scaleName: 'pentatonic', octave: 5, bars: 2,
    degrees:   [4, 2, 0, 4, 7, 4, 2, 0],
    durations: [Q, Q, Q, Q, Q, Q, Q, Q],
  },
  {
    id: 'ambient-ghost', name: 'Ghost Signal', category: 'Ambient', emoji: '✨',
    root: 'C', scaleName: 'penta-minor', octave: 3, bars: 2,
    degrees:   [0, 2, 0, 7, 4, 0, 4, 2],
    durations: [DQ, H, H, DQ, H, H, DQ, Q],
  },
  {
    id: 'ambient-swell', name: 'Slow Swell', category: 'Ambient', emoji: '✨',
    root: 'G', scaleName: 'lydian', octave: 4, bars: 2,
    degrees:   [0, 2, 4, 6, 4, 2],
    durations: [DQ, DQ, DQ, DQ, DQ, DQ],
  },
  {
    id: 'ambient-shimmer', name: 'Shimmer', category: 'Ambient', emoji: '✨',
    root: 'B', scaleName: 'pentatonic', octave: 4, bars: 2,
    degrees:   [0, 4, 7, 4, 2, 4, 0, 2, 4, 7, 9, 7, 4, 2, 0, 4],
    durations: [H,H,H,H,H,H,H,H, H,H,H,H,H,H,H,H],
  },

  // ── Classical ──────────────────────────────────────────────────────────────
  {
    id: 'classical-baroque', name: 'Baroque Run', category: 'Classical', emoji: '🎻',
    root: 'C', scaleName: 'major', octave: 4, bars: 2,
    degrees:   [0,1,2,3,4,3,2,1, 0,2,4,6,7,6,4,2],
    durations: [H,H,H,H,H,H,H,H, H,H,H,H,H,H,H,H],
  },
  {
    id: 'classical-minuet', name: 'Minuet', category: 'Classical', emoji: '🎻',
    root: 'G', scaleName: 'major', octave: 4, bars: 2,
    degrees:   [4,7,9,7,4,2,0,2, 4,6,4,2,0,4,6,7],
    durations: [Q,H,H,H,H,Q,Q,Q, Q,H,H,H,H,Q,Q,Q],
  },
  {
    id: 'classical-invention', name: 'Invention', category: 'Classical', emoji: '🎻',
    root: 'D', scaleName: 'minor', octave: 4, bars: 2,
    degrees:   [0,2,4,6,5,4,2,1, 0,2,4,5,6,5,4,2],
    durations: [H,H,H,H,H,H,H,H, H,H,H,H,H,H,H,H],
  },
  {
    id: 'classical-chorale', name: 'Chorale', category: 'Classical', emoji: '🎻',
    root: 'F', scaleName: 'major', octave: 4, bars: 2,
    degrees:   [0, 2, 4, 6, 7, 6, 4, 2],
    durations: [Q, Q, Q, Q, Q, Q, HF, HF],
  },
  {
    id: 'classical-prelude', name: 'Prelude', category: 'Classical', emoji: '🎻',
    root: 'A', scaleName: 'minor', octave: 4, bars: 2,
    degrees:   [0,4,6,4,0,4,6,4, 2,5,7,5,2,5,7,5],
    durations: [H,H,H,H,H,H,H,H, H,H,H,H,H,H,H,H],
  },
  {
    id: 'classical-romance', name: 'Romance', category: 'Classical', emoji: '🎻',
    root: 'E', scaleName: 'major', octave: 4, bars: 2,
    degrees:   [4,2,4,6,7,6,4,2, 0,2,4,6,7,9,7,4],
    durations: [Q,H,H,H,H,Q,Q,Q, Q,H,H,H,H,Q,Q,Q],
  },
]

export const PRESET_LOOPS = RAW.map(({ id, name, category, emoji, root, scaleName, octave, bars, degrees, durations }) => {
  const scale = getScaleNotes(root, scaleName, octave, 2)
  const events = makeEvents(scale, degrees, durations)
  return { id, name, category, emoji, root, scaleName, bars, events, scale, contour: 'preset' }
})

// ── Drum presets ──────────────────────────────────────────────────────────────

export const DRUM_LOOPS = [
  {
    id: 'drum-rock', name: 'Rock Steady', category: 'Drums', emoji: '🥁', bars: 2, bpm: 120,
    hits: [
      { type: 'kick',  beat: 0 },   { type: 'hihat', beat: 0 },
      { type: 'hihat', beat: 0.5 }, { type: 'snare', beat: 1 },
      { type: 'hihat', beat: 1.5 }, { type: 'kick',  beat: 2 },
      { type: 'hihat', beat: 2 },   { type: 'hihat', beat: 2.5 },
      { type: 'snare', beat: 3 },   { type: 'hihat', beat: 3.5 },
      { type: 'kick',  beat: 4 },   { type: 'hihat', beat: 4 },
      { type: 'hihat', beat: 4.5 }, { type: 'snare', beat: 5 },
      { type: 'hihat', beat: 5.5 }, { type: 'kick',  beat: 6 },
      { type: 'hihat', beat: 6 },   { type: 'hihat', beat: 6.5 },
      { type: 'snare', beat: 7 },   { type: 'hihat', beat: 7.5 },
    ],
  },
  {
    id: 'drum-hiphop', name: 'Hip Hop', category: 'Drums', emoji: '🥁', bars: 2, bpm: 88,
    hits: [
      { type: 'kick',  beat: 0 },   { type: 'hihat', beat: 0 },
      { type: 'hihat', beat: 0.5 }, { type: 'snare', beat: 1 },
      { type: 'hihat', beat: 1.5 }, { type: 'kick',  beat: 2.5 },
      { type: 'hihat', beat: 2 },   { type: 'snare', beat: 3 },
      { type: 'kick',  beat: 3.5 }, { type: 'hihat', beat: 3.5 },
      { type: 'kick',  beat: 4 },   { type: 'hihat', beat: 4 },
      { type: 'hihat', beat: 4.5 }, { type: 'snare', beat: 5 },
      { type: 'hihat', beat: 5.5 }, { type: 'kick',  beat: 6.25 },
      { type: 'snare', beat: 7 },   { type: 'kick',  beat: 7.5 },
    ],
  },
  {
    id: 'drum-funk', name: 'Funk Pocket', category: 'Drums', emoji: '🥁', bars: 2, bpm: 100,
    hits: [
      { type: 'kick',  beat: 0 },    { type: 'hihat', beat: 0 },
      { type: 'hihat', beat: 0.25 }, { type: 'hihat', beat: 0.5 },
      { type: 'hihat', beat: 0.75 }, { type: 'snare', beat: 1 },
      { type: 'kick',  beat: 1.5 },  { type: 'hihat', beat: 1.5 },
      { type: 'kick',  beat: 1.75 }, { type: 'hihat', beat: 2 },
      { type: 'snare', beat: 2.25 }, { type: 'kick',  beat: 2.5 },
      { type: 'snare', beat: 3 },    { type: 'hihat', beat: 3 },
      { type: 'hihat', beat: 3.5 },  { type: 'kick',  beat: 3.75 },
      { type: 'kick',  beat: 4 },    { type: 'hihat', beat: 4 },
      { type: 'hihat', beat: 4.25 }, { type: 'snare', beat: 5 },
      { type: 'kick',  beat: 5.5 },  { type: 'kick',  beat: 5.75 },
      { type: 'snare', beat: 6 },    { type: 'kick',  beat: 6.5 },
      { type: 'snare', beat: 7 },    { type: 'hihat', beat: 7.5 },
    ],
  },
  {
    id: 'drum-trap', name: 'Trap Flow', category: 'Drums', emoji: '🥁', bars: 2, bpm: 140,
    hits: [
      { type: 'kick',  beat: 0 },    { type: 'hihat', beat: 0 },
      { type: 'hihat', beat: 0.25 }, { type: 'hihat', beat: 0.5 },
      { type: 'hihat', beat: 0.75 }, { type: 'snare', beat: 1 },
      { type: 'hihat', beat: 1.25 }, { type: 'hihat', beat: 1.5 },
      { type: 'kick',  beat: 1.75 }, { type: 'hihat', beat: 2 },
      { type: 'hihat', beat: 2.25 }, { type: 'hihat', beat: 2.5 },
      { type: 'snare', beat: 3 },    { type: 'hihat', beat: 3.5 },
      { type: 'hihat', beat: 3.75 }, { type: 'kick',  beat: 4 },
      { type: 'hihat', beat: 4 },    { type: 'hihat', beat: 4.25 },
      { type: 'hihat', beat: 4.5 },  { type: 'hihat', beat: 4.75 },
      { type: 'snare', beat: 5 },    { type: 'hihat', beat: 5.5 },
      { type: 'kick',  beat: 5.75 }, { type: 'kick',  beat: 6 },
      { type: 'snare', beat: 7 },    { type: 'kick',  beat: 7.5 },
    ],
  },
  {
    id: 'drum-jazz', name: 'Jazz Brush', category: 'Drums', emoji: '🥁', bars: 2, bpm: 100,
    hits: [
      { type: 'hihat', beat: 0 },    { type: 'kick',  beat: 0 },
      { type: 'hihat', beat: 0.67 }, { type: 'hihat', beat: 1 },
      { type: 'snare', beat: 1 },    { type: 'hihat', beat: 1.33 },
      { type: 'hihat', beat: 2 },    { type: 'kick',  beat: 2 },
      { type: 'hihat', beat: 2.67 }, { type: 'snare', beat: 3 },
      { type: 'hihat', beat: 3 },    { type: 'hihat', beat: 3.33 },
      { type: 'hihat', beat: 4 },    { type: 'kick',  beat: 4 },
      { type: 'hihat', beat: 4.67 }, { type: 'snare', beat: 5 },
      { type: 'hihat', beat: 5 },    { type: 'hihat', beat: 5.33 },
      { type: 'hihat', beat: 6 },    { type: 'kick',  beat: 6 },
      { type: 'hihat', beat: 6.67 }, { type: 'snare', beat: 7 },
      { type: 'crash', beat: 7.5 },
    ],
  },
  {
    id: 'drum-bossa', name: 'Bossa Nova', category: 'Drums', emoji: '🥁', bars: 2, bpm: 110,
    hits: [
      { type: 'hihat', beat: 0 },    { type: 'kick',  beat: 0 },
      { type: 'hihat', beat: 0.5 },  { type: 'hihat', beat: 0.75 },
      { type: 'kick',  beat: 1 },    { type: 'hihat', beat: 1 },
      { type: 'hihat', beat: 1.5 },  { type: 'snare', beat: 1.75 },
      { type: 'kick',  beat: 2 },    { type: 'hihat', beat: 2 },
      { type: 'hihat', beat: 2.5 },  { type: 'hihat', beat: 2.75 },
      { type: 'kick',  beat: 3 },    { type: 'snare', beat: 3.25 },
      { type: 'hihat', beat: 3.5 },  { type: 'kick',  beat: 4 },
      { type: 'hihat', beat: 4 },    { type: 'hihat', beat: 4.5 },
      { type: 'kick',  beat: 5 },    { type: 'hihat', beat: 5 },
      { type: 'snare', beat: 5.75 }, { type: 'kick',  beat: 6 },
      { type: 'hihat', beat: 6 },    { type: 'kick',  beat: 7 },
      { type: 'snare', beat: 7.25 }, { type: 'hihat', beat: 7.5 },
    ],
  },
  {
    id: 'drum-electronic', name: 'Four on Floor', category: 'Drums', emoji: '🥁', bars: 2, bpm: 128,
    hits: [
      { type: 'kick',  beat: 0 },          { type: 'hihat', beat: 0 },
      { type: 'hihat', beat: 0.5 },        { type: 'snare', beat: 1 },
      { type: 'hihat', beat: 1.5 },        { type: 'kick',  beat: 2 },
      { type: 'hihat', beat: 2 },          { type: 'hihat', beat: 2.5 },
      { type: 'snare', beat: 3 },          { type: 'hihat', beat: 3.5 },
      { type: 'kick',  beat: 4 },          { type: 'hihat', beat: 4 },
      { type: 'hihat_open', beat: 4.5 },   { type: 'snare', beat: 5 },
      { type: 'hihat', beat: 5.5 },        { type: 'kick',  beat: 6 },
      { type: 'hihat', beat: 6 },          { type: 'hihat', beat: 6.5 },
      { type: 'snare', beat: 7 },          { type: 'kick',  beat: 7.5 },
    ],
  },
  {
    id: 'drum-breakbeat', name: 'Breakbeat', category: 'Drums', emoji: '🥁', bars: 2, bpm: 110,
    hits: [
      { type: 'kick',  beat: 0 },    { type: 'hihat', beat: 0 },
      { type: 'hihat', beat: 0.5 },  { type: 'snare', beat: 0.75 },
      { type: 'hihat', beat: 1 },    { type: 'kick',  beat: 1.5 },
      { type: 'snare', beat: 2 },    { type: 'hihat', beat: 2 },
      { type: 'kick',  beat: 2.5 },  { type: 'hihat', beat: 2.5 },
      { type: 'hihat', beat: 3 },    { type: 'snare', beat: 3 },
      { type: 'kick',  beat: 3.5 },  { type: 'hihat', beat: 3.5 },
      { type: 'kick',  beat: 4 },    { type: 'hihat', beat: 4 },
      { type: 'snare', beat: 4.5 },  { type: 'hihat', beat: 5 },
      { type: 'kick',  beat: 5 },    { type: 'snare', beat: 5.5 },
      { type: 'hihat', beat: 5.5 },  { type: 'kick',  beat: 6 },
      { type: 'snare', beat: 6.5 },  { type: 'kick',  beat: 6.75 },
      { type: 'hihat', beat: 7 },    { type: 'snare', beat: 7 },
      { type: 'crash', beat: 7.5 },
    ],
  },
  {
    id: 'drum-rnb', name: 'R&B Slow Jam', category: 'Drums', emoji: '🥁', bars: 2, bpm: 72,
    hits: [
      { type: 'kick',  beat: 0 },    { type: 'hihat', beat: 0 },
      { type: 'hihat', beat: 0.5 },  { type: 'snare', beat: 1 },
      { type: 'hihat', beat: 1.5 },  { type: 'kick',  beat: 2 },
      { type: 'kick',  beat: 2.5 },  { type: 'snare', beat: 3 },
      { type: 'hihat', beat: 3 },    { type: 'hihat', beat: 3.5 },
      { type: 'kick',  beat: 4 },    { type: 'hihat', beat: 4 },
      { type: 'snare', beat: 5 },    { type: 'kick',  beat: 5.5 },
      { type: 'hihat', beat: 5.5 },  { type: 'kick',  beat: 6.5 },
      { type: 'snare', beat: 7 },    { type: 'hihat', beat: 7.5 },
    ],
  },
  {
    id: 'drum-gospel', name: 'Gospel Groove', category: 'Drums', emoji: '🥁', bars: 2, bpm: 90,
    hits: [
      { type: 'kick',  beat: 0 },    { type: 'hihat', beat: 0 },
      { type: 'hihat', beat: 0.5 },  { type: 'snare', beat: 1 },
      { type: 'hihat', beat: 1.5 },  { type: 'kick',  beat: 1.75 },
      { type: 'kick',  beat: 2 },    { type: 'snare', beat: 2.5 },
      { type: 'snare', beat: 3 },    { type: 'hihat', beat: 3 },
      { type: 'hihat', beat: 3.5 },  { type: 'kick',  beat: 4 },
      { type: 'hihat', beat: 4 },    { type: 'snare', beat: 5 },
      { type: 'hihat', beat: 5.5 },  { type: 'kick',  beat: 5.75 },
      { type: 'kick',  beat: 6 },    { type: 'snare', beat: 6.5 },
      { type: 'snare', beat: 7 },    { type: 'hihat', beat: 7 },
      { type: 'crash', beat: 7.5 },
    ],
  },
  {
    id: 'drum-samba', name: 'Samba', category: 'Drums', emoji: '🥁', bars: 2, bpm: 120,
    hits: [
      { type: 'kick',  beat: 0 },    { type: 'hihat', beat: 0 },
      { type: 'hihat', beat: 0.25 }, { type: 'snare', beat: 0.5 },
      { type: 'hihat', beat: 0.75 }, { type: 'kick',  beat: 1 },
      { type: 'hihat', beat: 1 },    { type: 'snare', beat: 1.5 },
      { type: 'hihat', beat: 1.75 }, { type: 'kick',  beat: 2 },
      { type: 'hihat', beat: 2 },    { type: 'snare', beat: 2.5 },
      { type: 'hihat', beat: 2.75 }, { type: 'kick',  beat: 3 },
      { type: 'snare', beat: 3.5 },  { type: 'hihat', beat: 3.75 },
      { type: 'kick',  beat: 4 },    { type: 'hihat', beat: 4 },
      { type: 'snare', beat: 4.5 },  { type: 'hihat', beat: 4.75 },
      { type: 'kick',  beat: 5 },    { type: 'hihat', beat: 5 },
      { type: 'snare', beat: 5.5 },  { type: 'kick',  beat: 6 },
      { type: 'hihat', beat: 6 },    { type: 'snare', beat: 6.5 },
      { type: 'hihat', beat: 6.75 }, { type: 'snare', beat: 7.5 },
    ],
  },
  {
    id: 'drum-dnb', name: 'Drum & Bass', category: 'Drums', emoji: '🥁', bars: 2, bpm: 172,
    hits: [
      { type: 'kick',  beat: 0 },    { type: 'hihat', beat: 0 },
      { type: 'hihat', beat: 0.25 }, { type: 'hihat', beat: 0.5 },
      { type: 'snare', beat: 0.75 }, { type: 'hihat', beat: 1 },
      { type: 'hihat', beat: 1.25 }, { type: 'kick',  beat: 1.5 },
      { type: 'hihat', beat: 1.5 },  { type: 'hihat', beat: 1.75 },
      { type: 'kick',  beat: 2 },    { type: 'hihat', beat: 2 },
      { type: 'snare', beat: 2.5 },  { type: 'hihat', beat: 2.75 },
      { type: 'kick',  beat: 3 },    { type: 'hihat', beat: 3 },
      { type: 'snare', beat: 3.5 },  { type: 'kick',  beat: 3.75 },
      { type: 'kick',  beat: 4 },    { type: 'hihat', beat: 4 },
      { type: 'snare', beat: 4.75 }, { type: 'kick',  beat: 5 },
      { type: 'hihat', beat: 5 },    { type: 'snare', beat: 5.5 },
      { type: 'kick',  beat: 6 },    { type: 'snare', beat: 6.5 },
      { type: 'kick',  beat: 6.75 }, { type: 'snare', beat: 7 },
      { type: 'kick',  beat: 7.5 },  { type: 'hihat', beat: 7.5 },
    ],
  },
]

export const CATEGORIES = [
  'All', 'Blues', 'Jazz', 'Chill', 'Pop', 'Dark', 'Dance',
  'Funk', 'R&B', 'Latin', 'Cinematic', 'Ambient', 'Classical', 'Drums',
]
