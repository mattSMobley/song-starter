// Hand-drawn instrument pictures. Kids learn what a real violin or marimba looks
// like, so these show the actual instrument, not an emoji stand-in.
// One style for all: flat colors, a soft dark outline, 100×100 canvas.

const O = '#3b2f4a'          // outline
const WOOD = '#b8743a', WOOD_D = '#8a5226', WOOD_L = '#e0a865'
const GOLD = '#f5c542', GOLD_D = '#c9932a'
const SILVER = '#dfe4ee', SILVER_D = '#9aa3b5'

// Draws its shapes twice: once fat in the outline color, then filled on top,
// so overlapping parts merge into one silhouette with a single outer outline.
function Blob({ children, w = 5 }) {
  return (
    <>
      <g stroke={O} strokeWidth={w}>{children}</g>
      <g stroke="none">{children}</g>
    </>
  )
}

// Two-ellipse violin-family body (upper + lower bout).
function FiddleBody({ cy1, rx1, ry1, cy2, rx2, ry2, fill }) {
  return (
    <Blob>
      <ellipse cx="50" cy={cy1} rx={rx1} ry={ry1} fill={fill} />
      <ellipse cx="50" cy={cy2} rx={rx2} ry={ry2} fill={fill} />
    </Blob>
  )
}

const FHoles = ({ y, dx }) => (
  <g fill="none" strokeWidth="1.8">
    <path d={`M${50 - dx} ${y - 7} q-3 7 0 14`} />
    <path d={`M${50 + dx} ${y - 7} q3 7 0 14`} />
  </g>
)

const ART = {
  guitar: () => (
    <g transform="rotate(38 50 50)">
      <rect x="45.5" y="4" width="9" height="13" rx="2" fill={WOOD_D} />
      <Blob>
        <circle cx="50" cy="52" r="15" fill={WOOD_L} />
        <circle cx="50" cy="73" r="20" fill={WOOD_L} />
      </Blob>
      <rect x="47" y="12" width="6" height="40" fill={WOOD_D} />
      <circle cx="50" cy="58" r="7" fill={O} />
      <rect x="42" y="76" width="16" height="4" rx="1.5" fill={WOOD_D} />
      <g stroke="#f4f0e6" strokeWidth="0.9">
        {[48, 50, 52].map(x => <line key={x} x1={x} y1="8" x2={x} y2="78" />)}
      </g>
    </g>
  ),

  xylophone: () => {
    const colors = ['#e8484f', '#f58a3a', '#f5c542', '#6cc04a', '#3fb6a8', '#4a8fe0', '#6a5fd6', '#b65fd0']
    return (
      <>
        <line x1="10" y1="38" x2="90" y2="44" strokeWidth="5" stroke={WOOD_D} />
        <line x1="10" y1="68" x2="90" y2="60" strokeWidth="5" stroke={WOOD_D} />
        {colors.map((c, i) => {
          const h = 44 - i * 3.2, x = 12 + i * 9.6
          return <rect key={i} x={x} y={53 - h / 2} width="8" height={h} rx="2" fill={c} />
        })}
        <line x1="58" y1="92" x2="84" y2="78" strokeWidth="5" stroke={O} />
        <line x1="58" y1="92" x2="84" y2="78" strokeWidth="2.5" stroke={WOOD_L} />
        <circle cx="86" cy="77" r="6" fill="#e8484f" />
      </>
    )
  },

  bass: () => (
    <g transform="rotate(38 50 50)">
      <rect x="44" y="0" width="12" height="12" rx="3" fill={WOOD_D} />
      {[3, 9].map(y => <g key={y}><circle cx="41" cy={y} r="2.3" fill={SILVER} /><circle cx="59" cy={y} r="2.3" fill={SILVER} /></g>)}
      <rect x="47" y="8" width="6" height="56" fill={WOOD_L} />
      <Blob>
        <ellipse cx="50" cy="76" rx="19" ry="16" fill="#3f6fd8" />
        <ellipse cx="44" cy="60" rx="9" ry="10" fill="#3f6fd8" />
        <ellipse cx="57" cy="64" rx="8" ry="9" fill="#3f6fd8" />
      </Blob>
      <path d="M40 66 Q50 60 58 70 L60 84 Q48 88 40 80 Z" fill="#fbf7ef" strokeWidth="1.5" />
      <rect x="47" y="8" width="6" height="58" fill={WOOD_L} />
      <rect x="43" y="70" width="14" height="5" rx="1.5" fill={O} />
      <rect x="44" y="83" width="12" height="4" rx="1" fill={SILVER_D} />
      <g stroke="#f4f0e6" strokeWidth="0.9">
        {[48.2, 49.4, 50.6, 51.8].map(x => <line key={x} x1={x} y1="6" x2={x} y2="85" />)}
      </g>
    </g>
  ),

  marimba: () => {
    const tubes = [40, 36, 32, 28, 24, 21, 18, 15]
    return (
      <>
        <line x1="8" y1="42" x2="8" y2="94" strokeWidth="4" stroke={WOOD_D} />
        <line x1="92" y1="42" x2="92" y2="94" strokeWidth="4" stroke={WOOD_D} />
        {tubes.map((len, i) => (
          <rect key={i} x={13 + i * 9.6} y="48" width="7" height={len} rx="3.5" fill={GOLD} />
        ))}
        <rect x="6" y="42" width="88" height="7" rx="2" fill={WOOD_D} />
        {tubes.map((_, i) => (
          <rect key={i} x={11.5 + i * 9.6} y={30 + i * 0.8} width="9" height={13 - i * 0.8} rx="2"
            fill={i % 2 ? '#9b4f2a' : '#b35f33'} />
        ))}
        <line x1="34" y1="6" x2="52" y2="26" strokeWidth="2.5" stroke={WOOD_D} />
        <line x1="66" y1="6" x2="58" y2="26" strokeWidth="2.5" stroke={WOOD_D} />
        <circle cx="53" cy="26" r="5" fill="#8b6fd6" />
        <circle cx="58" cy="26" r="5" fill="#8b6fd6" />
      </>
    )
  },

  musicbox: () => (
    <>
      <path d="M18 52 L26 18 H74 L82 52 Z" fill={WOOD_D} />
      <path d="M24 48 L30 22 H70 L76 48 Z" fill="#f2b6c6" strokeWidth="1.5" />
      <path d="M50 40 C40 32 42 26 47 27 C49 27.5 50 29 50 30 C50 29 51 27.5 53 27 C58 26 60 32 50 40 Z" fill="#e8484f" strokeWidth="1.5" />
      <path d="M82 66 H90 V56" fill="none" strokeWidth="5.5" stroke={O} />
      <path d="M82 66 H90 V56" fill="none" strokeWidth="2.8" stroke={GOLD} />
      <circle cx="90" cy="54" r="3.5" fill={GOLD} />
      <rect x="14" y="52" width="72" height="34" rx="4" fill={WOOD} />
      <rect x="14" y="52" width="72" height="7" fill={WOOD_D} />
      <rect x="22" y="64" width="56" height="16" rx="3" fill="none" stroke={WOOD_D} strokeWidth="2" />
      <circle cx="50" cy="72" r="3" fill={GOLD} />
    </>
  ),

  steeldrum: () => (
    <>
      <path d="M12 44 V66 A38 14 0 0 0 88 66 V44 Z" fill="#e8484f" />
      <path d="M12 56 A38 14 0 0 0 88 56" fill="none" stroke={GOLD} strokeWidth="3" />
      <ellipse cx="50" cy="44" rx="38" ry="15" fill={SILVER} />
      <ellipse cx="50" cy="46" rx="31" ry="10" fill="#c7cedc" strokeWidth="1.5" />
      <g fill={SILVER} strokeWidth="1.3">
        <ellipse cx="50" cy="46" rx="7" ry="3.5" />
        <ellipse cx="33" cy="45" rx="6" ry="3.2" />
        <ellipse cx="67" cy="45" rx="6" ry="3.2" />
        <ellipse cx="42" cy="52" rx="5" ry="2.6" />
        <ellipse cx="58" cy="52" rx="5" ry="2.6" />
        <ellipse cx="42" cy="39.5" rx="5" ry="2.4" />
        <ellipse cx="58" cy="39.5" rx="5" ry="2.4" />
      </g>
      <line x1="24" y1="8" x2="40" y2="34" strokeWidth="3" stroke={WOOD_D} />
      <line x1="78" y1="10" x2="62" y2="34" strokeWidth="3" stroke={WOOD_D} />
      <circle cx="41" cy="35" r="4.5" fill="#e8484f" />
      <circle cx="61" cy="35" r="4.5" fill="#e8484f" />
    </>
  ),

  glock: () => (
    <>
      <rect x="6" y="20" width="88" height="62" rx="7" fill="#c23a4a" />
      <rect x="11" y="25" width="78" height="52" rx="4" fill="#3c2638" strokeWidth="1.5" />
      {Array.from({ length: 8 }, (_, i) => {
        const h = 42 - i * 3, x = 15 + i * 9.4
        return (
          <g key={i}>
            <rect x={x} y={51 - h / 2} width="7.5" height={h} rx="1.5" fill={SILVER} strokeWidth="1.5" />
            <line x1={x + 2} y1={51 - h / 2 + 3} x2={x + 2} y2={51 + h / 2 - 3} stroke="#fff" strokeWidth="1.2" />
          </g>
        )
      })}
      <line x1="60" y1="96" x2="84" y2="84" strokeWidth="4.5" stroke={O} />
      <line x1="60" y1="96" x2="84" y2="84" strokeWidth="2" stroke={WOOD_L} />
      <circle cx="86" cy="83" r="4.5" fill="#fbf7ef" />
    </>
  ),

  kalimba: () => {
    const lens = [30, 36, 42, 48, 54, 48, 42, 36, 30]
    return (
      <>
        <rect x="18" y="8" width="64" height="86" rx="14" fill={WOOD} />
        <circle cx="50" cy="78" r="7.5" fill={O} />
        <rect x="22" y="20" width="56" height="5" rx="2" fill={SILVER_D} />
        {lens.map((l, i) => (
          <line key={i} x1={26 + i * 6} y1="18" x2={26 + i * 6} y2={18 + l}
            strokeWidth="4.2" stroke={O} />
        ))}
        {lens.map((l, i) => (
          <line key={i} x1={26 + i * 6} y1="18" x2={26 + i * 6} y2={18 + l}
            strokeWidth="2" stroke={SILVER} />
        ))}
        <rect x="22" y="30" width="56" height="4" rx="2" fill={WOOD_D} strokeWidth="1.5" />
      </>
    )
  },

  strings: () => (
    <>
      <circle cx="50" cy="5" r="4.5" fill={WOOD_D} />
      <rect x="47.5" y="7" width="5" height="10" fill={WOOD_D} />
      <line x1="50" y1="84" x2="50" y2="98" strokeWidth="2.5" />
      <FiddleBody cy1={42} rx1={17} ry1={16} cy2={68} rx2={21} ry2={19} fill="#8f4320" />
      <rect x="46.5" y="10" width="7" height="50" rx="2" fill={O} />
      <FHoles y={60} dx={12} />
      <rect x="43" y="65" width="14" height="3" rx="1" fill={WOOD_L} strokeWidth="1.2" />
      <path d="M45 72 H55 L53 86 H47 Z" fill={O} />
      <g stroke="#f4f0e6" strokeWidth="0.7">
        {[48.5, 50, 51.5].map(x => <line key={x} x1={x} y1="12" x2={x} y2="66" />)}
      </g>
    </>
  ),
}

export default function InstrumentArt({ id, className = 'inst-art' }) {
  const draw = ART[id]
  if (!draw) return null
  return (
    <svg className={className} viewBox="0 0 100 100" aria-hidden="true"
      stroke={O} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      {draw()}
    </svg>
  )
}

export const ART_IDS = Object.keys(ART)

// An instrument's emoji when one shows the real thing, otherwise its drawing.
export const InstIcon = ({ inst }) => inst.icon ?? <InstrumentArt id={inst.id} />
