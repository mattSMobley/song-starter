const SEMITONES = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }

function noteToMidi(name) {
  const m = name.match(/^([A-G])([#b]?)(-?\d+)$/)
  if (!m) return 60
  const semi = SEMITONES[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0)
  return (parseInt(m[3]) + 1) * 12 + semi
}

function varLen(v) {
  if (v < 0x80) return [v]
  const out = [v & 0x7F]
  v >>= 7
  while (v > 0) { out.unshift((v & 0x7F) | 0x80); v >>= 7 }
  return out
}

function u32(v) { return [(v >> 24) & 0xFF, (v >> 16) & 0xFF, (v >> 8) & 0xFF, v & 0xFF] }
function u16(v) { return [(v >> 8) & 0xFF, v & 0xFF] }

export function exportMidi(melody, bpm = 120, filename = 'melody.mid') {
  const PPQ = 480
  const tempo = Math.round(60_000_000 / bpm)

  const evts = []

  // Tempo meta event at tick 0
  evts.push({ tick: 0, bytes: [0xFF, 0x51, 0x03, (tempo >> 16) & 0xFF, (tempo >> 8) & 0xFF, tempo & 0xFF] })

  for (const e of melody.events) {
    const mn = noteToMidi(e.note)
    const on  = Math.round(e.beat * PPQ)
    const off = Math.round((e.beat + e.duration) * PPQ)
    evts.push({ tick: on,  bytes: [0x90, mn, 100] })
    evts.push({ tick: off, bytes: [0x80, mn, 0],  noteOff: true })
  }

  const lastTick = Math.max(...evts.map(e => e.tick))
  evts.push({ tick: lastTick + PPQ, bytes: [0xFF, 0x2F, 0x00] })

  // Sort: ascending tick; note-offs before note-ons at same tick
  evts.sort((a, b) => a.tick - b.tick || (a.noteOff ? -1 : b.noteOff ? 1 : 0))

  const track = []
  let cur = 0
  for (const ev of evts) {
    track.push(...varLen(ev.tick - cur), ...ev.bytes)
    cur = ev.tick
  }

  const header = [0x4D,0x54,0x68,0x64, ...u32(6), ...u16(0), ...u16(1), ...u16(PPQ)]
  const trkHdr = [0x4D,0x54,0x72,0x6B, ...u32(track.length)]

  const blob = new Blob([new Uint8Array([...header, ...trkHdr, ...track])], { type: 'audio/midi' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
