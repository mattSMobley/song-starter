import { useEffect, useRef } from 'react'
import { analyser } from '../audio/engine.js'

export default function Visualizer() {
  const canvasRef = useRef(null)
  const rafRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    function draw() {
      rafRef.current = requestAnimationFrame(draw)
      const W = canvas.width
      const H = canvas.height
      const data = analyser.getValue()

      ctx.clearRect(0, 0, W, H)
      ctx.fillStyle = 'rgba(10,10,15,0.3)'
      ctx.fillRect(0, 0, W, H)

      // Gradient waveform
      const gradient = ctx.createLinearGradient(0, 0, W, 0)
      gradient.addColorStop(0,   '#7c3aed')
      gradient.addColorStop(0.3, '#a855f7')
      gradient.addColorStop(0.6, '#06b6d4')
      gradient.addColorStop(1,   '#ec4899')

      ctx.beginPath()
      ctx.strokeStyle = gradient
      ctx.lineWidth = 2
      ctx.shadowColor = '#a855f7'
      ctx.shadowBlur = 6

      const sliceW = W / data.length
      let x = 0
      for (let i = 0; i < data.length; i++) {
        const v = (data[i] + 1) / 2
        const y = v * H
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
        x += sliceW
      }
      ctx.stroke()

      // Subtle mirror
      ctx.beginPath()
      ctx.strokeStyle = 'rgba(124,58,237,0.2)'
      ctx.lineWidth = 1
      ctx.shadowBlur = 0
      x = 0
      for (let i = 0; i < data.length; i++) {
        const v = (data[i] + 1) / 2
        const y = H - v * H
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
        x += sliceW
      }
      ctx.stroke()

      // Center line
      ctx.beginPath()
      ctx.strokeStyle = 'rgba(46,46,74,0.4)'
      ctx.lineWidth = 1
      ctx.shadowBlur = 0
      ctx.moveTo(0, H / 2)
      ctx.lineTo(W, H / 2)
      ctx.stroke()
    }

    draw()
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  return (
    <div className="relative w-full" style={{ height: 48 }}>
      <canvas
        ref={canvasRef}
        width={800}
        height={48}
        className="w-full h-full rounded-lg"
        style={{ background: 'rgba(10,10,15,0.6)' }}
      />
      <div className="absolute inset-0 rounded-lg pointer-events-none"
        style={{ boxShadow: 'inset 0 0 16px rgba(124,58,237,0.1)' }} />
    </div>
  )
}
