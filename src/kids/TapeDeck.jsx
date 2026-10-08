import { useState, useRef } from 'react'
import { keyByLetter } from './theory.js'

// Names are pictures: kids can't type, so a song is named with 3 stickers.
export const STICKERS = ['🦊', '🐸', '🦄', '🐙', '🦖', '🐶', '🐱', '🐝', '🚀', '🌈', '⭐', '🌙', '🍕', '🍦', '🍓', '🎈']

// A cassette colored by the song's key (letter colors), labeled with its stickers.
export function Tape({ stickers, keyLetter, mode, spinning, small }) {
  return (
    <div className={`tape ${small ? 'small' : ''} ${spinning ? 'spinning' : ''}`}
      style={{ '--tape': keyByLetter(keyLetter).color }}>
      <div className="tape-label">
        {[0, 1, 2].map(i => <span key={i} className="tape-sticker">{stickers[i] ?? ''}</span>)}
      </div>
      <div className="tape-window">
        <span className="reel" /><span className="reel" />
      </div>
      <span className="tape-key">{keyLetter}{mode === 'minor' ? '🌙' : '☀️'}</span>
    </div>
  )
}

export default function TapeDeck({ tapes, song, canSave, onSave, onLoad, onDelete, onClose }) {
  const [stickers, setStickers] = useState([])
  const [name, setName] = useState('')
  const [justSaved, setJustSaved] = useState(null)

  function addSticker(s) {
    setStickers(prev => (prev.length >= 3 ? [...prev.slice(1), s] : [...prev, s]))
  }

  function save() {
    if (!stickers.length) return
    const id = onSave({ stickers, name: name.trim() })
    setJustSaved(id)
    setStickers([])
    setName('')
    setTimeout(() => setJustSaved(null), 1200)
  }

  return (
    <div className="deck-scrim" onPointerDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="deck">
        <button className="deck-close" aria-label="close" onClick={onClose}>✖</button>

        {canSave && (
          <section className="deck-save">
            <Tape stickers={stickers} keyLetter={song.key} mode={song.mode} spinning />
            <div className="sticker-grid">
              {STICKERS.map(s => (
                <button key={s} className={`sticker ${stickers.includes(s) ? 'on' : ''}`}
                  onClick={() => addSticker(s)}>{s}</button>
              ))}
            </div>
            <div className="deck-save-row">
              <input className="deck-name" value={name} maxLength={24}
                placeholder="✏️" aria-label="name (for grown-ups)"
                onChange={e => setName(e.target.value)} />
              <button className={`deck-ok ${stickers.length ? 'ready' : ''}`} disabled={!stickers.length}
                aria-label="save" onClick={save}>✅</button>
            </div>
          </section>
        )}

        <section className="shelf">
          {tapes.length === 0 && <div className="shelf-empty">📼</div>}
          {tapes.map(t => (
            <div key={t.id} className={`shelf-item ${justSaved === t.id ? 'new' : ''}`}>
              <button className="shelf-tape" aria-label={t.name || t.stickers.join(' ')} onClick={() => onLoad(t)}>
                <Tape stickers={t.stickers} keyLetter={t.song.key} mode={t.song.mode} small />
                {t.name && <span className="shelf-name">{t.name}</span>}
              </button>
              <HoldToDelete onHold={() => onDelete(t.id)} />
            </div>
          ))}
        </section>
      </div>
    </div>
  )
}

// Deleting needs a 1-second hold, so a stray tap can't throw a song away.
function HoldToDelete({ onHold }) {
  const t = useRef(null)
  const [holding, setHolding] = useState(false)
  const start = () => { setHolding(true); t.current = setTimeout(() => { setHolding(false); onHold() }, 1000) }
  const cancel = () => { setHolding(false); clearTimeout(t.current) }
  return (
    <button className={`shelf-del ${holding ? 'holding' : ''}`} aria-label="hold to delete"
      onPointerDown={start} onPointerUp={cancel} onPointerLeave={cancel} onPointerCancel={cancel}>🗑️</button>
  )
}
