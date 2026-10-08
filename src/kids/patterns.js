// Abstract pattern library. Nothing here is a note name — pitches are resolved
// at schedule time against the current key, mode and chord (PLAN.md §7).
//
// Pitched strings, one char per 16th step:
//   .      rest
//   -      hold the previous note
//   0–9    scale steps above the current chord root (0 root, 2 third, 4 fifth, 7 octave)
//   L      root an octave down
//   x      full chord (instrument voicing, default root/3rd/5th)
// A string may be 1 bar or 2 bars long; it loops.
//
// Drum patterns: one string per hit type, x = hit, g = ghost (soft).
//   k kick · s snare · h hat · o open hat · t tom-hi · T tom-lo
//
// Every vibe has a 4/4 version (16 steps/bar) and a hand-written 3/4 version
// (12 steps/bar) — auto-converting 4/4 to 3/4 sounds wrong, so we don't.

export const PATTERNS = {
  // ── 0 Red · stompy / rock ──────────────────────────────────────────────────
  0: {
    4: {
      beat:    { k: 'x.......x.x.....', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.' },
      bass:    '0.0.0.0.0.0.0.0.',
      comp:    'x--.x--.x--.x-x.',
      melody:  '4-..4-..5-4-2-..0-..2-..4-----..',
      sparkle: '7.4.7.4.7.4.7.4.',
      pad:     'x---------------',
    },
    3: {
      beat:    { k: 'x.......x...', s: '....x.......', h: 'x.x.x.x.x.x.' },
      bass:    '0.0.0.0.0.0.',
      comp:    'x--.x--.x--.',
      melody:  '4-..4-..5-4-2-..0-------',
      sparkle: '7.4.7.4.7.4.',
      pad:     'x-----------',
    },
  },

  // ── 1 Orange · bouncy / funk ───────────────────────────────────────────────
  1: {
    4: {
      beat:    { k: 'x.....x...x.....', s: '....x..g.g..x..g', h: 'xxxxxxxxxxxxxxxx' },
      bass:    '0..7..0...7.0.4.',
      comp:    '.x...x..x.x...x.',
      melody:  '4.2.4..5.4.2..0.2.4..5.7...4.2..',
      sparkle: '..7...4...7...9.',
      pad:     'x-------x-------',
    },
    3: {
      beat:    { k: 'x.....x.....', s: '....x..g..x.', h: 'xxxxxxxxxxxx' },
      bass:    '0..7..0.L.4.',
      comp:    '.x...x..x.x.',
      melody:  '4.2.4..5.4..2.4..5.7.4..',
      sparkle: '..7...4...9.',
      pad:     'x-----x-----',
    },
  },

  // ── 2 Yellow · sunny / pop ─────────────────────────────────────────────────
  2: {
    4: {
      beat:    { k: 'x.....x.x.......', s: '....x.......x...', h: 'x.x.x.x.x.x.x...', o: '..............x.' },
      bass:    '0-..0-..0-..4-2-',
      comp:    'x.x.x.x.x.x.x.x.',
      melody:  '0-2-4---4-5-4-2-2-4-2-0---------',
      sparkle: '0.4.7.9.7.4.0.4.',
      pad:     'x---------------',
    },
    3: {
      beat:    { k: 'x...........', s: '....x...x...', h: 'x.x.x.x.x.x.' },
      bass:    '0-..4-..2-..',
      comp:    '....x...x...',
      melody:  '0-2-4---4-5-4-2-0-------',
      sparkle: '0.4.7.9.7.4.',
      pad:     'x-----------',
    },
  },

  // ── 3 Green · chill / reggae-folk ──────────────────────────────────────────
  3: {
    4: {
      beat:    { k: '........x.......', s: '........x.......', h: 'x.x.x.x.x.x.x.x.' },
      bass:    '0---..2.4-..2-0.',
      comp:    '..x...x...x...x.',
      melody:  '4---2---0-------2---4---5---4---',
      sparkle: '....4.......7...',
      pad:     'x---------------',
    },
    3: {
      beat:    { k: 'x...........', s: '........x...', h: '..x...x...x.' },
      bass:    '0-----4---2-',
      comp:    '....x...x...',
      melody:  '4---2---0---2---4---5---',
      sparkle: '....4.....7.',
      pad:     'x-----------',
    },
  },

  // ── 4 Blue · dreamy / lullaby ──────────────────────────────────────────────
  4: {
    4: {
      beat:    { k: 'x...........x...', s: '........g.......', h: '..x...x...x...x.' },
      bass:    '0-------4-------',
      comp:    'x-----------x---',
      melody:  '4---2-4-5-------4---2---0-------',
      sparkle: '0.2.4.7.9.7.4.2.',
      pad:     'x---------------',
    },
    3: {
      beat:    { k: 'x...........', s: '........g...', h: '....x...x...' },
      bass:    '0-----------',
      comp:    'x-----------',
      melody:  '4---2-4-5---4---2---0---',
      sparkle: '0.2.4.7.4.2.',
      pad:     'x-----------',
    },
  },

  // ── 5 Purple · spooky / space ──────────────────────────────────────────────
  5: {
    4: {
      beat:    { k: 'x.....x...x.....', s: '....x.......x...', h: 'x...x...x...x...', t: '.............x..', T: '..............x.' },
      bass:    '0.0..L..0.0..2.1',
      comp:    'x...x...x..x.x..',
      melody:  '4...5...4.2.1...0...L...0.......',
      sparkle: '7.....6.7.....4.',
      pad:     'x---------------',
    },
    3: {
      beat:    { k: 'x.....x.....', s: '....x.......', h: 'x...x...x...', t: '.........x..', T: '..........x.' },
      bass:    '0.0..L..0.1.',
      comp:    'x...x...x.x.',
      melody:  '4...5...4.2.1...0...L...',
      sparkle: '7.....6.7...',
      pad:     'x-----------',
    },
  },
}

// Drum kit per vibe (kits live in src/audio/drumKits.js)
export const VIBE_KITS = ['circles-1987', 'dead-disco', 'dead-disco', 'dead-disco', 'super-dead', 'super-dead']
