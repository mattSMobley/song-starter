import { useEffect, useRef, useState } from 'react'

// Show, don't tell: when a kid sits still and something is glowing as the next
// step, a cartoon hand flies over and pretend-taps it. Silent, and gone on any touch.
const IDLE_MS = 10000      // stillness before the first demo
const GAP_MS = 10000       // stillness between demos
const DEMO_MS = 3200       // matches the tapHint animation in kids.css
const MAX_PER_STEP = 3     // then stop; a hand on screen forever is just noise

// target: a key naming the next step (changes when the step changes), and a
// function that finds the element to point at. Null when there's no next step.
export default function TapHint({ target, paused }) {
  const [spot, setSpot] = useState(null)        // { x, y, id }
  const lastTouch = useRef(Date.now())
  const lastDemo = useRef(0)
  const shown = useRef({})                       // step key → demos shown
  const targetRef = useRef(target)
  targetRef.current = target

  // Any touch anywhere resets the clock and hides the hand
  useEffect(() => {
    const touch = () => { lastTouch.current = Date.now(); setSpot(null) }
    document.addEventListener('pointerdown', touch, true)
    return () => document.removeEventListener('pointerdown', touch, true)
  }, [])

  // A new step starts its own count and its own wait
  useEffect(() => { lastTouch.current = Date.now(); setSpot(null) }, [target?.key])

  useEffect(() => {
    if (paused) { setSpot(null); return }
    const timer = setInterval(() => {
      const t = targetRef.current
      if (!t) return
      const now = Date.now()
      const n = shown.current[t.key] ?? 0
      if (n >= MAX_PER_STEP) return
      if (now - lastTouch.current < IDLE_MS || now - lastDemo.current < DEMO_MS + GAP_MS) return
      const el = t.find()
      const r = el?.getBoundingClientRect()
      if (!r || !r.width || r.bottom < 0 || r.top > innerHeight) return
      shown.current[t.key] = n + 1
      lastDemo.current = now
      setSpot({ x: r.left + r.width / 2, y: r.top + r.height / 2, id: now })
      setTimeout(() => setSpot(s => (s?.id === now ? null : s)), DEMO_MS)
    }, 500)
    return () => clearInterval(timer)
  }, [paused])

  if (!spot) return null
  return (
    <div key={spot.id} className="tap-hint" aria-hidden="true" style={{ left: spot.x, top: spot.y }}>
      <span className="tap-ring" />
      <span className="tap-ring r2" />
      <span className="tap-hand">👆</span>
    </div>
  )
}
