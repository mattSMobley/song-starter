import * as Tone from 'tone'

function encodeWav(audioBuffer) {
  const numCh = audioBuffer.numberOfChannels
  const sr    = audioBuffer.sampleRate
  const len   = audioBuffer.length
  const data  = new DataView(new ArrayBuffer(44 + len * numCh * 2))
  const str   = (off, s) => [...s].forEach((c, i) => data.setUint8(off + i, c.charCodeAt(0)))
  str(0, 'RIFF'); data.setUint32(4, 36 + len * numCh * 2, true)
  str(8, 'WAVE'); str(12, 'fmt ')
  data.setUint32(16, 16, true); data.setUint16(20, 1, true); data.setUint16(22, numCh, true)
  data.setUint32(24, sr, true); data.setUint32(28, sr * numCh * 2, true)
  data.setUint16(32, numCh * 2, true); data.setUint16(34, 16, true)
  str(36, 'data'); data.setUint32(40, len * numCh * 2, true)
  let off = 44
  for (let i = 0; i < len; i++) {
    for (let ch = 0; ch < numCh; ch++) {
      const s = Math.max(-1, Math.min(1, audioBuffer.getChannelData(ch)[i]))
      data.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7FFF, true)
      off += 2
    }
  }
  return new Blob([data.buffer], { type: 'audio/wav' })
}

export async function exportMelodyWav(melody, bpm, filename = 'melody.wav') {
  const secPerBeat = 60 / bpm
  const totalSec   = melody.events.reduce(
    (m, e) => Math.max(m, e.beat + e.duration), 0
  ) * secPerBeat + 1.5

  const rendered = await Tone.Offline(({ transport }) => {
    const synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle8' },
      envelope:   { attack: 0.02, decay: 0.3, sustain: 0.4, release: 1.2 },
      volume: -6,
    }).toDestination()

    const events = melody.events.map(e => ({
      time: e.beat * secPerBeat,
      note: e.note,
      dur:  `${Math.round(1 / e.duration)}n`,
    }))

    const part = new Tone.Part((time, ev) => {
      synth.triggerAttackRelease(ev.note, ev.dur, time)
    }, events)

    part.start(0)
    transport.start()
  }, totalSec)

  const blob = encodeWav(rendered.get())
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}
