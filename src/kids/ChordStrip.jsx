import { useEffect, useRef, useState } from 'react'
import { chordInfo, CHORD_PRESETS } from './theory.js'

// 9+ chord sequencer: four pads, one chord per bar, lit as the music reaches it.
// Tap a pad, then a number tile; the selection hops to the next pad, so
// tapping pad 1 then 1 · 5 · 6 · 4 writes a whole progression.
export default function ChordStrip({ chords, auto, keyLetter, mode, now, glow, onSet, onPreset, onAuto, onFirstUse }) {
  const [sel, setSel] = useState(null)          // pad index being edited
  const [presetsOpen, setPresetsOpen] = useState(false)
  const rootRef = useRef(null)

  // Tap anywhere else closes the picker / preset list
  useEffect(() => {
    if (sel == null && !presetsOpen) return
    const close = e => { if (!rootRef.current?.contains(e.target)) { setSel(null); setPresetsOpen(false) } }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [sel, presetsOpen])

  function tapPad(i) {
    onFirstUse()
    setPresetsOpen(false)
    setSel(sel === i ? null : i)
  }

  function pickTile(deg) {
    onSet(sel, deg)
    setSel(sel < chords.length - 1 ? sel + 1 : null)
  }

  const info = d => chordInfo(keyLetter, mode, d)

  return (
    <section ref={rootRef} className={`chord-strip ${glow ? 'glow' : ''}`} aria-label="chords">
      <div className="cs-pads">
        {chords.map((d, i) => {
          const c = info(d)
          return (
            <button key={i} className={`cs-pad ${now === i ? 'now' : ''} ${sel === i ? 'sel' : ''}`}
              style={{ '--chord': c.color }} aria-label={`chord ${i + 1}: ${c.num} ${c.name}`}
              onClick={() => tapPad(i)}>
              <span className="cs-num">{c.num}</span>
              <span className="cs-name">{c.name}</span>
            </button>
          )
        })}
      </div>

      <div className="cs-tools">
        <button className={`cs-tool ${presetsOpen ? 'on' : ''}`} aria-label="famous chords"
          onClick={() => { onFirstUse(); setSel(null); setPresetsOpen(!presetsOpen) }}>
          ⭐<span>Famous</span>
        </button>
        <button className={`cs-tool ${auto ? 'on' : ''}`} aria-label="chords follow the dial"
          onClick={() => { setSel(null); setPresetsOpen(false); onAuto() }}>
          🎨<span>Auto</span>
        </button>
      </div>

      {sel != null && (
        <div className="cs-pop cs-picker">
          {[0, 1, 2, 3, 4, 5].map(d => {
            const c = info(d)
            return (
              <button key={d} className={`cs-tile ${chords[sel] === d ? 'on' : ''}`} style={{ '--chord': c.color }}
                aria-label={`${c.num} ${c.name}`} onClick={() => pickTile(d)}>
                <span className="cs-num">{c.num}</span>
                <span className="cs-name">{c.name}</span>
              </button>
            )
          })}
        </div>
      )}

      {presetsOpen && (
        <div className="cs-pop cs-presets">
          {CHORD_PRESETS.map(p => (
            <button key={p.id} className={`cs-preset ${!auto && same(p.chords, chords) ? 'on' : ''}`}
              onClick={() => { onPreset(p.chords); setPresetsOpen(false) }}>
              <span className="cs-preset-label">{p.label}</span>
              <span className="cs-preset-chips">
                {p.chords.map((d, i) => (
                  <i key={i} style={{ '--chord': info(d).color }}>{d + 1}</i>
                ))}
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}

const same = (a, b) => a.length === b.length && a.every((d, i) => d === b[i])
