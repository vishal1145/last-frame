import React, { useEffect, useRef, useState } from 'react'
import { stats } from '../data.js'

// Numbers count up from 0 the first time the strip is on screen. "120+" -> 120 and the suffix "+".
const parse = (n) => { const m = String(n).match(/^(\d+)(.*)$/); return { to: +m[1], suffix: m[2] } }
const MS = 1500

export default function Stats() {
  const ref = useRef(null)
  const [t, setT] = useState(() => (typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches ? 1 : 0))
  useEffect(() => {
    if (t === 1) return
    let raf = 0
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return
      io.disconnect()
      const start = performance.now()
      const tick = (now) => {
        const p = Math.min(1, (now - start) / MS)
        setT(1 - (1 - p) ** 3)
        if (p < 1) raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)
    }, { threshold: 0.4 })
    io.observe(ref.current)
    return () => { io.disconnect(); cancelAnimationFrame(raf) }
  }, [])
  return (
    <section id="stats" aria-label="At a glance">
      <div className="gut rail">
        <div className="stats rv" ref={ref}>
          {stats.map((s) => {
            const { to, suffix } = parse(s.n)
            return <div key={s.l}><b className="num">{Math.round(to * t)}{suffix}</b><span>{s.l}</span></div>
          })}
        </div>
      </div>
    </section>
  )
}
