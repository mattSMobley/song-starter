import { useState } from 'react'
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

export default function BrowseTab({ bpm, onSave }) {
  const [cat, setCat] = useState('All')

  const visible = cat === 'All'
    ? ALL_LOOPS
    : cat === 'Drums'
    ? DRUM_LOOPS
    : PRESET_LOOPS.filter(l => l.category === cat)

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="font-bold" style={{ color: '#e2e8f0', fontSize: '0.9rem', letterSpacing: '-0.01em' }}>
            Loop Library
          </h2>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(148,163,184,0.45)' }}>
            <span style={{ color: '#c084fc' }}>{visible.length}</span> loops · click to preview
          </p>
        </div>
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2 flex-shrink-0">
        {CATEGORIES.map(c => {
          const on = cat === c
          return (
            <button key={c} onClick={() => setCat(c)}
              className="rounded-full font-semibold transition-all"
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
        <div className="grid grid-cols-2 gap-4 pb-4" style={{ gridAutoRows: 'min-content' }}>
          {visible.map((loop, i) =>
            loop.isDrum
              ? <DrumCard key={loop.id} loop={loop} index={i} bpm={bpm} />
              : <MelodyCard key={loop.id} melody={loop} index={i} bpm={bpm} onSave={onSave} />
          )}
        </div>
      </div>
    </div>
  )
}
