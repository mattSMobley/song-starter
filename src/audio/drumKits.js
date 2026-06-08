// Kit definitions. Each hit type has velocity layers (soft/mid/hard) and
// round-robin variants within each layer. Files are relative to /public/.

export const DRUM_KITS = {
  'dead-disco': {
    kick: {
      soft: ['drums/dead-disco/kick-soft.wav'],
      mid:  ['drums/dead-disco/kick-mid.wav'],
      hard: ['drums/dead-disco/kick-hard.wav', 'drums/dead-disco/kick-tape.wav'],
      alt:  ['drums/dead-disco/kick-alt.wav'],
    },
    snare: {
      soft: ['drums/dead-disco/snare-soft.wav'],
      mid:  ['drums/dead-disco/snare-mid.wav'],
      hard: ['drums/dead-disco/snare-hard.wav', 'drums/dead-disco/snare-alt.wav'],
    },
    hihat: {
      rr: ['drums/dead-disco/hat-1.wav', 'drums/dead-disco/hat-2.wav', 'drums/dead-disco/hat-3.wav'],
    },
    hihat_open: {
      rr: ['drums/dead-disco/hat-open-1.wav', 'drums/dead-disco/hat-open-2.wav', 'drums/dead-disco/hat-open-3.wav'],
    },
    crash: {
      rr: ['drums/dead-disco/crash-1.wav', 'drums/dead-disco/crash-2.wav', 'drums/dead-disco/crash-3.wav'],
    },
    'tom-hi': { rr: ['drums/dead-disco/tom-hi.wav', 'drums/dead-disco/tom-mid.wav'] },
    'tom-lo': { rr: ['drums/dead-disco/tom-lo.wav'] },
  },

  'super-dead': {
    kick: {
      soft: ['drums/super-dead/kick-soft-a.wav', 'drums/super-dead/kick-soft-b.wav'],
      mid:  ['drums/super-dead/kick-mid-a.wav',  'drums/super-dead/kick-mid-b.wav'],
      hard: ['drums/super-dead/kick-hard-a.wav', 'drums/super-dead/kick-hard-b.wav'],
    },
    snare: {
      soft: ['drums/super-dead/snare-soft-a.wav', 'drums/super-dead/snare-soft-b.wav'],
      mid:  ['drums/super-dead/snare-mid-a.wav',  'drums/super-dead/snare-mid-b.wav'],
      hard: ['drums/super-dead/snare-hard-a.wav', 'drums/super-dead/snare-hard-b.wav'],
    },
    hihat: {
      rr: [
        'drums/super-dead/hat-soft-a.wav', 'drums/super-dead/hat-soft-b.wav',
        'drums/super-dead/hat-mid-a.wav',  'drums/super-dead/hat-mid-b.wav',
        'drums/super-dead/hat-hard-a.wav', 'drums/super-dead/hat-hard-b.wav',
      ],
    },
    hihat_open: {
      rr: ['drums/super-dead/hat-open-a.wav', 'drums/super-dead/hat-open-b.wav'],
    },
    crash: {
      rr: ['drums/super-dead/crash-1.wav', 'drums/super-dead/crash-2.wav', 'drums/super-dead/crash-3.wav'],
    },
    'tom-hi': {
      mid:  ['drums/super-dead/tom-hi-mid-a.wav', 'drums/super-dead/tom-hi-mid-b.wav'],
      hard: ['drums/super-dead/tom-hi-hard-a.wav', 'drums/super-dead/tom-hi-hard-b.wav'],
    },
    'tom-lo': {
      mid:  ['drums/super-dead/tom-lo-mid-a.wav', 'drums/super-dead/tom-lo-mid-b.wav'],
      hard: ['drums/super-dead/tom-lo-hard-a.wav', 'drums/super-dead/tom-lo-hard-b.wav'],
    },
  },

  'circles-1987': {
    kick: {
      soft: ['drums/circles-1987/kick-soft.wav'],
      mid:  ['drums/circles-1987/kick-hard.wav'],
      hard: ['drums/circles-1987/kick-hard.wav', 'drums/circles-1987/kick-alt.wav'],
    },
    snare: {
      soft: ['drums/circles-1987/snare-soft.wav'],
      mid:  ['drums/circles-1987/snare-hard.wav'],
      hard: ['drums/circles-1987/snare-hard.wav', 'drums/circles-1987/snare-alt.wav'],
      rim:  ['drums/circles-1987/snare-rim.wav'],
    },
    hihat: {
      rr: ['drums/circles-1987/hat-1.wav', 'drums/circles-1987/hat-2.wav', 'drums/circles-1987/hat-3.wav'],
    },
    hihat_open: {
      rr: ['drums/circles-1987/hat-open-1.wav', 'drums/circles-1987/hat-open-2.wav'],
    },
    crash: {
      rr: ['drums/circles-1987/crash-1.wav', 'drums/circles-1987/crash-2.wav'],
    },
    'tom-hi': { rr: ['drums/circles-1987/tom-hi.wav'] },
    'tom-lo': { rr: ['drums/circles-1987/tom-lo.wav'] },
  },
}

// Which kit each beat pattern uses
export const LOOP_KITS = {
  'drum-rock':       'circles-1987',
  'drum-hiphop':     'super-dead',
  'drum-funk':       'dead-disco',
  'drum-trap':       'super-dead',
  'drum-jazz':       'super-dead',
  'drum-bossa':      'dead-disco',
  'drum-electronic': 'dead-disco',
  'drum-breakbeat':  'super-dead',
  'drum-rnb':        'dead-disco',
  'drum-samba':      'dead-disco',
  'drum-dnb':        'super-dead',
}

// Build a flat { key: url } map for Tone.Players from a kit definition
export function buildUrlMap(kitId) {
  const kit = DRUM_KITS[kitId]
  const map = {}
  for (const [type, layers] of Object.entries(kit)) {
    for (const [layer, files] of Object.entries(layers)) {
      files.forEach((f, i) => { map[`${type}__${layer}__${i}`] = '/' + f })
    }
  }
  return map
}
