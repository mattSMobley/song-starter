import { useState, useMemo } from 'react'
import MelodyCard from './MelodyCard.jsx'
import DrumCard from './DrumCard.jsx'
import { PRESET_LOOPS, DRUM_LOOPS, CATEGORIES } from '../audio/loopLibrary.js'

const ALL_LOOPS = [
  ...PRESET_LOOPS.map(l => ({ ...l, isDrum: false })),
  ...DRUM_LOOPS.map(l => ({ ...l, isDrum: true })),
]

function countForCat(c) {
  if (c === 'All')   return ALL_LOOPS.length
  if (c === 'Drums') return DRUM_LOOPS.length
  return PRESET_LOOPS.filter(l => l.category === c).length
}

// Only show categories that actually have loops
const ACTIVE_CATEGORIES = CATEGORIES.filter(c => countForCat(c) > 0)

export default function BrowseTab({ bpm, onSave }) {
  const [cat, setCat] = useState('All')
  const [query, setQuery] = useState('')

  const visible = useMemo(() => {
    let base = cat === 'All'
      ? ALL_LOOPS
      : ALL_LOOPS.filter(l => cat === 'Drums' ? l.isDrum : !l.isDrum && l.category === cat)

    if (query.trim()) {
      const q = query.trim().toLowerCase()
      base = base.filter(l => l.name.toLowerCase().includes(q))
    }
    return base
  }, [cat, query])

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0 gap-3">
        <div>
          <h2 className="font-bold" style={{ color: '#e2e8f0', fontSize: '0.9rem', letterSpacing: '-0.01em' }}>
            Loop Library
          </h2>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(148,163,184,0.45)' }}>
            <span style={{ color: '#c084fc' }}>{visible.length}</span> loop{visible.length !== 1 ? 's' : ''} · click to preview
          </p>
        </div>

        {/* Search */}
        <div className="relative flex-shrink-0" style={{ width: 180 }}>
          <svg className="absolute" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
            style={{ left: 10, top: '50%', transform: 'translateY(-50%)', color: 'rgba(148,163,184,0.4)', pointerEvents: 'none' }}>
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="text"
            placeholder="Search loops…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full rounded-xl bg-transparent outline-none font-medium"
            style={{
              padding: '7px 12px 7px 28px',
              fontSize: '0.75rem',
              background: 'rgba(14,8,28,0.8)',
              border: '1px solid rgba(124,58,237,0.25)',
              color: '#e2e8f0',
              caretColor: '#a855f7',
            }}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute"
              style={{ right: 8, top: '50%', transform: 'translateY(-50%)', color: 'rgba(148,163,184,0.5)', lineHeight: 1, fontSize: '0.75rem' }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 flex-shrink-0 overflow-x-auto pb-1" style={{ flexWrap: 'nowrap' }}>
        {ACTIVE_CATEGORIES.map(c => {
          const on = cat === c
          return (
            <button key={c} onClick={() => setCat(c)}
              className="rounded-full font-semibold transition-all flex-shrink-0"
              style={{
                padding: '6px 14px',
                fontSize: '0.72rem',
                letterSpacing: '0.04em',
                background: on
                  ? 'linear-gradient(135deg, rgba(124,58,237,0.55), rgba(109,40,217,0.38))'
                  : 'rgba(255,255,255,0.03)',
                border: on ? '1px solid rgba(168,85,247,0.55)' : '1px solid rgba(255,255,255,0.08)',
                color: on ? '#f0e0ff' : 'rgba(148,163,184,0.55)',
                boxShadow: on ? '0 0 14px rgba(124,58,237,0.35)' : 'none',
                textShadow: on ? '0 0 10px rgba(168,85,247,0.7)' : 'none',
              }}>
              {c}
              <span style={{ marginLeft: 5, fontSize: '0.6rem', opacity: 0.6, fontWeight: 500 }}>
                {countForCat(c)}
              </span>
            </button>
          )
        })}
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto">
        {visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3"
            style={{ color: 'rgba(148,163,184,0.35)' }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <p className="text-sm font-medium">No loops match "{query}"</p>
            <button onClick={() => setQuery('')}
              className="text-xs rounded-lg px-3 py-1.5 transition-all"
              style={{ background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)', color: '#a855f7' }}>
              Clear search
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4" style={{ gridAutoRows: 'min-content' }}>
            {visible.map((loop, i) =>
              loop.isDrum
                ? <DrumCard key={loop.id} loop={loop} index={i} bpm={bpm} />
                : <MelodyCard key={loop.id} melody={loop} index={i} bpm={bpm} onSave={onSave} />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
