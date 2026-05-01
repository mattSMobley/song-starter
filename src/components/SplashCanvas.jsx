import { useEffect, useRef } from 'react'

const WAVES = [
  { color: '#7c3aed', opacity: 0.55, amplitude: 55, frequency: 0.0028, speed: 0.7,  yRatio: 0.38 },
  { color: '#06b6d4', opacity: 0.40, amplitude: 38, frequency: 0.0045, speed: -0.5, yRatio: 0.52 },
  { color: '#ec4899', opacity: 0.30, amplitude: 48, frequency: 0.0036, speed: 0.45, yRatio: 0.65 },
  { color: '#a855f7', opacity: 0.35, amplitude: 65, frequency: 0.0022, speed: -0.35,yRatio: 0.44 },
  { color: '#22d3ee', opacity: 0.20, amplitude: 30, frequency: 0.006,  speed: 0.9,  yRatio: 0.58 },
]

export default function SplashCanvas() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    let raf
    let t = 0

    const particles = []

    function spawnParticles(W, H) {
      particles.length = 0
      const COLORS = ['#a855f7','#7c3aed','#06b6d4','#ec4899','#818cf8','#22d3ee','#f472b6']
      for (let i = 0; i < 100; i++) {
        particles.push({
          x: Math.random() * W,
          y: Math.random() * H,
          r: Math.random() * 1.8 + 0.4,
          speed: Math.random() * 0.35 + 0.08,
          drift: (Math.random() - 0.5) * 0.25,
          opacity: Math.random() * 0.7 + 0.15,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
        })
      }
    }

    function resize() {
      canvas.width  = window.innerWidth
      canvas.height = window.innerHeight
      spawnParticles(canvas.width, canvas.height)
      ctx.fillStyle = '#06060c'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    }
    resize()
    window.addEventListener('resize', resize)

    function draw() {
      raf = requestAnimationFrame(draw)
      t += 0.007
      const W = canvas.width
      const H = canvas.height

      // Trailing fade
      ctx.fillStyle = 'rgba(6,6,12,0.18)'
      ctx.fillRect(0, 0, W, H)

      // ── Sine waves ─────────────────────────────────────────────────────────
      WAVES.forEach(wave => {
        const baseY = H * wave.yRatio

        // Glow stroke
        ctx.beginPath()
        ctx.globalAlpha = wave.opacity
        ctx.strokeStyle = wave.color
        ctx.lineWidth = 1.8
        ctx.shadowColor = wave.color
        ctx.shadowBlur = 18
        for (let x = 0; x <= W; x += 3) {
          const y = baseY
            + Math.sin(x * wave.frequency + t * wave.speed) * wave.amplitude
            + Math.sin(x * wave.frequency * 2.7 + t * wave.speed * 1.6) * (wave.amplitude * 0.28)
            + Math.sin(x * wave.frequency * 0.5 + t * wave.speed * 0.4) * (wave.amplitude * 0.15)
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
        }
        ctx.stroke()

        // Soft fill below wave
        ctx.beginPath()
        ctx.globalAlpha = wave.opacity * 0.12
        ctx.shadowBlur = 0
        ctx.moveTo(0, H)
        for (let x = 0; x <= W; x += 3) {
          const y = baseY
            + Math.sin(x * wave.frequency + t * wave.speed) * wave.amplitude
            + Math.sin(x * wave.frequency * 2.7 + t * wave.speed * 1.6) * (wave.amplitude * 0.28)
          ctx.lineTo(x, y)
        }
        ctx.lineTo(W, H)
        ctx.closePath()
        const grad = ctx.createLinearGradient(0, baseY - wave.amplitude, 0, H)
        grad.addColorStop(0, wave.color + '55')
        grad.addColorStop(1, 'transparent')
        ctx.fillStyle = grad
        ctx.fill()
      })

      ctx.shadowBlur = 0

      // ── Particles ──────────────────────────────────────────────────────────
      particles.forEach(p => {
        p.y -= p.speed
        p.x += p.drift
        if (p.y < -4)              { p.y = H + 4; p.x = Math.random() * W }
        if (p.x < -4 || p.x > W + 4) { p.x = Math.random() * W }

        ctx.globalAlpha = p.opacity * (0.7 + 0.3 * Math.sin(t * 2 + p.x))
        ctx.fillStyle   = p.color
        ctx.shadowColor = p.color
        ctx.shadowBlur  = 8
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fill()
      })

      ctx.globalAlpha = 1
      ctx.shadowBlur  = 0

      // ── Center dark radial to keep text readable ───────────────────────────
      const radial = ctx.createRadialGradient(W/2, H/2, 0, W/2, H/2, W * 0.42)
      radial.addColorStop(0,   'rgba(6,6,12,0.72)')
      radial.addColorStop(0.55,'rgba(6,6,12,0.45)')
      radial.addColorStop(1,   'transparent')
      ctx.globalAlpha = 1
      ctx.fillStyle   = radial
      ctx.fillRect(0, 0, W, H)
    }

    draw()
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ display: 'block' }}
    />
  )
}
