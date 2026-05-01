// Web MIDI API output — routes notes to Logic Pro X (or any DAW) via IAC Driver
const NOTE_SEMITONES = { C:0, D:2, E:4, F:5, G:7, A:9, B:11 }

function noteToMidi(name) {
  const m = name.match(/^([A-G])([#b]?)(-?\d+)$/)
  if (!m) return -1
  const semi = NOTE_SEMITONES[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0)
  return (parseInt(m[3]) + 1) * 12 + semi
}

let midiAccess = null
let selectedOutput = null
let midiChannel = 0  // 0-indexed; UI shows 1–16

let onPortsChanged = null

export async function initMidi() {
  if (!navigator.requestMIDIAccess) return { ok: false, reason: 'Web MIDI not supported in this browser (use Chrome or Edge)' }
  try {
    midiAccess = await navigator.requestMIDIAccess()
    midiAccess.onstatechange = () => { if (onPortsChanged) onPortsChanged(getMidiOutputs()) }
    return { ok: true }
  } catch (e) {
    return { ok: false, reason: e.message }
  }
}

export function getMidiOutputs() {
  if (!midiAccess) return []
  return [...midiAccess.outputs.values()].map(o => ({ id: o.id, name: o.name }))
}

export function selectOutput(id) {
  selectedOutput = id && midiAccess ? (midiAccess.outputs.get(id) ?? null) : null
}

export function setMidiChannel(ch) { midiChannel = Math.max(0, Math.min(15, ch - 1)) }
export function getMidiChannel() { return midiChannel + 1 }
export function isMidiActive() { return selectedOutput !== null }
export function getSelectedOutputId() { return selectedOutput?.id ?? null }
export function onOutputsChange(cb) { onPortsChanged = cb }

export function sendNoteOn(noteName, velocity = 100) {
  if (!selectedOutput) return
  const n = noteToMidi(noteName)
  if (n < 0 || n > 127) return
  selectedOutput.send([0x90 | midiChannel, n, velocity])
}

export function sendNoteOff(noteName) {
  if (!selectedOutput) return
  const n = noteToMidi(noteName)
  if (n < 0 || n > 127) return
  selectedOutput.send([0x80 | midiChannel, n, 0])
}

export function sendAllNotesOff() {
  if (!selectedOutput) return
  // CC 123 = all notes off
  selectedOutput.send([0xB0 | midiChannel, 123, 0])
}
