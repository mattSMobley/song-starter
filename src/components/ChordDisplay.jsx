import { detectChord } from '../audio/chordDetect.js'

export default function ChordDisplay({ activeNotes }) {
  const chord = detectChord([...activeNotes])
  const hasNotes = activeNotes.size > 0

  return (
    <div className="flex flex-col items-center justify-center gap-2.5" style={{ width: 160 }}>
      <span style={{
        fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.22em',
        textTransform: 'uppercase', color: 'rgba(168,85,247,0.5)',
      }}>
        Chord
      </span>

      <div style={{
        padding: '14px 22px',
        borderRadius: 16,
        minWidth: 110,
        textAlign: 'center',
        background: chord
          ? 'linear-gradient(135deg, rgba(124,58,237,0.28) 0%, rgba(6,182,212,0.1) 100%)'
          : hasNotes
          ? 'rgba(255,255,255,0.025)'
          : 'rgba(255,255,255,0.015)',
        border: chord
          ? '1px solid rgba(124,58,237,0.5)'
          : '1px solid rgba(255,255,255,0.06)',
        boxShadow: chord
          ? '0 0 28px rgba(124,58,237,0.28), inset 0 1px 0 rgba(255,255,255,0.07)'
          : 'none',
        transition: 'all 0.12s ease',
      }}>
        {chord ? (
          <div className="flex items-baseline justify-center" style={{ gap: 1 }}>
            <span style={{
              fontSize: '2rem', fontWeight: 900, letterSpacing: '-0.03em',
              color: '#f0e6ff', fontFamily: 'monospace',
              textShadow: '0 0 22px rgba(168,85,247,0.75)',
              lineHeight: 1,
            }}>
              {chord.root}
            </span>
            {chord.suffix && (
              <span style={{
                fontSize: '0.9rem', fontWeight: 700,
                color: '#a78bfa', alignSelf: 'flex-end',
                paddingBottom: 3,
                textShadow: '0 0 12px rgba(167,139,250,0.6)',
              }}>
                {chord.suffix}
              </span>
            )}
            {chord.inversion && (
              <span style={{
                fontSize: '0.75rem', fontWeight: 600,
                color: 'rgba(34,211,238,0.8)', alignSelf: 'flex-end',
                paddingBottom: 3, marginLeft: 1,
              }}>
                /{chord.inversion}
              </span>
            )}
          </div>
        ) : (
          <span style={{
            color: hasNotes ? 'rgba(168,85,247,0.35)' : 'rgba(71,85,105,0.35)',
            fontSize: '1rem', fontFamily: 'monospace',
            transition: 'color 0.15s',
          }}>
            —
          </span>
        )}
      </div>

      <span style={{
        fontSize: '0.6rem', letterSpacing: '0.05em',
        color: chord ? 'rgba(148,163,184,0.45)' : 'transparent',
        transition: 'color 0.15s ease',
        textAlign: 'center',
        minHeight: '0.8rem',
      }}>
        {chord?.full ?? ''}
      </span>
    </div>
  )
}
