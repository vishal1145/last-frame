import React, { useEffect, useState } from 'react'
import { clients } from '../data.js'
import { LAND, INDIA } from '../globeDots.js'

// Dotted globe with the TheRoughCut mark at the centre: arcs fly out from it to every client logo around the globe.
const RADIUS = 41, LONG = 1.6, GAP = 8.5, BOW = .16 // LONG: the straight-on logos sit a touch further out, so their wires are a little longer
// every second logo "slipped" out of its slot: nudged off, tilted, a different size, and still settling.
const SLIP = [{ dr: -2.5, da: 7, rot: -17, sc: 1.08 }, { dr: -2, da: -7, rot: 15, sc: .9 }, { dr: -3, da: -7, rot: -20, sc: .86 }, { dr: -2.5, da: 7, rot: 18, sc: .78 }]
const at = (deg, r) => { const a = (deg * Math.PI) / 180; return [50 + r * Math.cos(a), 50 + r * Math.sin(a)] }
// logos whose artwork sits smaller / bigger inside its image file: tweak so the visible gap to the wire is the same for all
const SIZE = { SocialRipple: 1.18, Lyro: 1.15 } // extra size for straight-on logos
const PAD = { MITRO: -1.3, ApnaMunshi: -.4 }
const gapOf = (name, sc) => 6.2 * sc + (GAP - 6.2) + (PAD[name] || 0) // same visible gap between a wire tip and its logo
const BUBBLES = clients.map((c, i) => {
  const odd = i % 2 === 1, sl = odd ? SLIP[(i >> 1) % SLIP.length] : { dr: 0, da: 0, rot: 0, sc: SIZE[c.name] || 1 }
  const base = -90 + (i * 360) / clients.length, r = odd ? RADIUS + sl.dr : RADIUS + LONG - GAP + gapOf(c.name, sl.sc) // long wires (straight-on logos) are all the same length; slipped logos sit closer in, so their wires are shorter
  const [x, y] = at(base + sl.da, r), [gx, gy] = at(base, RADIUS)
  return { name: c.name, logo: c.logo, odd, r, rot: sl.rot, sc: sl.sc, x, y, gx, gy }
})
const ARCS = BUBBLES.map((b, i) => {
  const dx = b.x - 50, dy = b.y - 50, side = i % 2 ? 1 : -1
  const gap = gapOf(b.name, b.sc)
  const endX = b.x - (dx / b.r) * gap, endY = b.y - (dy / b.r) * gap
  return `M50,50 Q${50 + dx / 2 - dy * BOW * side},${50 + dy / 2 + dx * BOW * side} ${endX},${endY}`
})
const STEP = 2600 // ms each logo stays lit

// "BRANDS" erases and writes itself again, over and over (user, 2026-11-23): type, hold, delete, pause — only while on screen.
// The full word stays as an invisible ghost so the line never changes size.
const WORD = 'Brands'
function TypedWord() {
  const [n, setN] = useState(WORD.length), ref = React.useRef(null)
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let on = false, del = false, tid = 0, cur = WORD.length
    const step = () => {
      if (!on) return
      if (!del && cur === WORD.length) { del = true; tid = setTimeout(step, 2200); return } // hold the full word
      if (del && cur === 0) { del = false; tid = setTimeout(step, 450); return } // a beat on the empty line
      cur += del ? -1 : 1; setN(cur)
      tid = setTimeout(step, del ? 75 : 130)
    }
    const io = new IntersectionObserver(([e]) => { const was = on; on = e.isIntersecting; if (on && !was) tid = setTimeout(step, 900); if (!on) clearTimeout(tid) }, { threshold: .2 })
    io.observe(ref.current)
    return () => { io.disconnect(); clearTimeout(tid) }
  }, [])
  return (
    <span className="lk lk-2 tw" ref={ref}>
      <span className="tw-ghost" aria-hidden="true">{WORD}</span>
      <span className="tw-type" aria-hidden="true">{WORD.slice(0, n)}<i className="tw-caret"></i></span>
      <span className="sr-only">{WORD}</span>
    </span>
  )
}

export default function Clients() {
  const [active, setActive] = useState(0)
  const [hold, setHold] = useState(false)
  // the glow steps through the logos one at a time; hovering a logo lights just that one and holds it
  useEffect(() => {
    if (hold || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const id = setTimeout(() => setActive((a) => (a + 1) % clients.length), STEP)
    return () => clearTimeout(id)
  }, [active, hold])
  return (
    <section id="craft">
      <div className="gut rail sphere-grid">
        <div className="sphere-copy">
          {/* a type lockup: every line runs the full column width, BRANDS the biggest word, so the heading stands as tall as the globe (2026-11-23) */}
          <h2 className="sec-h nw rv lockup"><span className="lk lk-1">Trusted by</span><TypedWord /><span className="ser lk lk-3">across India.</span></h2>
        </div>
        <div className="sphere rv" aria-hidden="true">
          <span className="sphere-glow"></span>
          <svg className="net" viewBox="0 0 100 100">
            <defs>
              <radialGradient id="globe-body" cx=".36" cy=".3" r=".85">
                <stop offset="0" stopColor="#fff" stopOpacity=".95" />
                <stop offset=".6" stopColor="#dfe7ec" stopOpacity=".8" />
                <stop offset="1" stopColor="#b9cad6" stopOpacity=".75" />
              </radialGradient>
            </defs>
            <circle className="globe-body" cx="50" cy="50" r="29.6" fill="url(#globe-body)" />
            <g className="orbit o-out"><circle cx="50" cy="50" r="47.6" /><circle className="sat" cx="97.6" cy="50" r="1.1" /><circle className="sat" cx="16.4" cy="83.6" r=".8" /></g>
            <g className="orbit o-in"><circle cx="50" cy="50" r="35.8" /><circle className="sat" cx="50" cy="14.2" r=".9" /><circle className="sat" cx="81" cy="68" r=".7" /></g>
            {LAND.map((l) => <path className="globe-dots" key={l.w} d={l.d} strokeWidth={l.w} opacity={l.o} />)}
            <path className="globe-india" d={INDIA} />
            {ARCS.map((d, i) => (
              <g key={i} className={i === active ? 'on' : ''}>
                <path className="net-line" d={d} />
                <path className="net-pulse" d={d} pathLength="100" style={{ animationDelay: `${i * -.38}s` }} />
                <circle className="net-dot" r=".8">
                  <animateMotion dur={`${3.4 + (i % 3) * .6}s`} begin={`${i * -.55}s`} repeatCount="indefinite" path={d} />
                  <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;.12;.85;1" dur={`${3.4 + (i % 3) * .6}s`} begin={`${i * -.55}s`} repeatCount="indefinite" />
                </circle>
              </g>
            ))}
            <circle className="net-ring" cx="50" cy="50" r="11" />
            <circle className="net-ring late" cx="50" cy="50" r="11" />
          </svg>
          <span className="hub"><img src="/brand/lastframe-mark.png" alt="" /></span>
          {BUBBLES.map((b, i) => (
            <span className={'bubble' + (b.odd ? ' odd' : '') + (i === active ? ' on' : '')} key={b.name} style={{ left: `${b.x}%`, top: `${b.y}%`, '--rot': `${b.rot}deg`, '--sc': b.sc, '--wd': `${i * -.7}s` }}
                  onMouseEnter={() => { setHold(true); setActive(i) }} onMouseLeave={() => setHold(false)}>
              <img src={b.logo} alt="" loading="lazy" />
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
