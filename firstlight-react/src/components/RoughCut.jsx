import React, { useEffect, useRef, useState } from 'react'

// One brief in, every film out: the studio's mark at the centre, light threads running out to everything a client gets
// back — a reel in a phone, a demo in a browser, a launch film in a player, a feed post, the brief chat, the delivered
// formats. The network unfolds from the centre when it scrolls into view; pulses travel the threads; the cards float at
// different depths and their contents keep moving; hovering a card lights its thread.
const CARDS = [
  { k: 'phone', t: 'Social reel', d: { x: 14, y: 50, s: 1, z: .1, b: 70 }, m: { x: 21, y: 18, s: .72, z: .1, b: 40 }, clip: '/video/sneakers.mp4', poster: '/video/sneakers.jpg' },
  { k: 'browser', t: 'Product demo', d: { x: 33, y: 17, s: 1, z: .3, b: -60 }, m: { x: 72, y: 13, s: .62, z: .3, b: -34 }, clip: '/video/ad-HEROCARD-FINAL.mp4', poster: '/video/ad-HEROCARD-FINAL.jpg' },
  { k: 'quote', t: 'Testimonial', d: { x: 57, y: 10, s: .92, z: .65, b: 40 }, m: null, poster: '/video/interview.jpg' },
  { k: 'player', t: 'Launch film', d: { x: 84, y: 25, s: 1, z: .2, b: -70 }, m: { x: 79, y: 38, s: .66, z: .2, b: -40 }, clip: '/video/runway.mp4', poster: '/video/runway.jpg' },
  { k: 'post', t: 'Product ad', d: { x: 88, y: 70, s: 1, z: .1, b: 60 }, m: { x: 75, y: 77, s: .72, z: .1, b: 40 }, clip: '/video/perfume.mp4', poster: '/video/perfume.jpg' },
  { k: 'stats', t: 'Delivered', d: { x: 63, y: 83, s: .92, z: .5, b: -40 }, m: { x: 30, y: 87, s: .78, z: .5, b: -30 }, poster: null },
  { k: 'chat', t: 'The brief', d: { x: 29, y: 80, s: 1, z: .2, b: 70 }, m: { x: 26, y: 61, s: .8, z: .2, b: 44 }, poster: null },
  { k: 'vo', t: 'Voice-over', d: { x: 70, y: 49, s: .86, z: .75, b: -30 }, m: null, poster: null },
]
// threads that end in a glowing node instead of a card: they give the network its density
const FREE = { d: [{ x: 6, y: 20, b: 30 }, { x: 47, y: 5, b: -40 }, { x: 96, y: 48, b: 50 }, { x: 8, y: 92, b: -50 }, { x: 46, y: 97, b: 40 }, { x: 97, y: 93, b: -30 }, { x: 22, y: 30, b: -20 }], m: [{ x: 5, y: 40, b: 30 }, { x: 94, y: 60, b: -30 }, { x: 50, y: 98, b: 30 }] }
const CENTER = { d: { x: 50, y: 50 }, m: { x: 44, y: 46 } }
const DUST = Array.from({ length: 22 }, (_, i) => ({ x: (i * 37 + 13) % 100, y: (i * 59 + 29) % 100, s: 2 + (i % 3), d: -(i * .7), t: 8 + (i % 4) * 2 }))
const bez = (a, b, c, d, t) => { const u = 1 - t; return u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c + t * t * t * d }
const dbez = (a, b, c, d, t) => { const u = 1 - t; return 3 * u * u * (b - a) + 6 * u * t * (c - b) + 3 * t * t * (d - c) }

export default function RoughCut() {
  const still = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
  const stage = useRef(null), vids = useRef([])
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [mobile, setMobile] = useState(false)
  const [live, setLive] = useState(still)
  const [hot, setHot] = useState(null)
  const [par, setPar] = useState({ x: 0, y: 0 })
  useEffect(() => {
    const el = stage.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => { setSize({ w: e.contentRect.width, h: e.contentRect.height }); setMobile(e.contentRect.width < 640) })
    ro.observe(el)
    const io = new IntersectionObserver(([e]) => { vids.current.forEach((v) => { if (!v) return; if (e.isIntersecting) v.play().catch(() => {}); else v.pause() }); if (e.isIntersecting && e.intersectionRatio >= .3) setLive(true) }, { threshold: [.05, .3] })
    io.observe(el)
    return () => { ro.disconnect(); io.disconnect() }
  }, [])
  const L = mobile ? 'm' : 'd', c0 = CENTER[L]
  const cards = CARDS.filter((c) => c[L])
  const cx = (size.w * c0.x) / 100, cy = (size.h * c0.y) / 100
  // a thread from the core to a point: a cubic curve bowed sideways, so they fan out
  const thread = (p) => {
    const ax = (size.w * p.x) / 100, ay = (size.h * p.y) / 100, dx = ax - cx, dy = ay - cy, len = Math.hypot(dx, dy) || 1
    const nx = -dy / len, ny = dx / len, b = p.b
    const P = [[cx, cy], [cx + dx * .25 + nx * b, cy + dy * .25 + ny * b], [cx + dx * .7 + nx * b * .6, cy + dy * .7 + ny * b * .6], [ax, ay]]
    return { d: `M${P[0]} C${P[1]} ${P[2]} ${P[3]}`, P }
  }
  // a short branch peeling off a thread at t, ending in a node
  const branch = (P, t, side) => {
    const x = bez(P[0][0], P[1][0], P[2][0], P[3][0], t), y = bez(P[0][1], P[1][1], P[2][1], P[3][1], t)
    let tx = dbez(P[0][0], P[1][0], P[2][0], P[3][0], t), ty = dbez(P[0][1], P[1][1], P[2][1], P[3][1], t); const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l
    const nx = -ty * side, ny = tx * side, ex = x + tx * 58 + nx * 46, ey = y + ty * 58 + ny * 46
    return { d: `M${x},${y} Q${x + tx * 34 + nx * 8},${y + ty * 34 + ny * 8} ${ex},${ey}`, ex, ey }
  }
  const move = (e) => { if (e.pointerType !== 'mouse') return; const r = stage.current.getBoundingClientRect(); setPar({ x: ((e.clientX - r.left) / r.width - .5) * 2, y: ((e.clientY - r.top) / r.height - .5) * 2 }) }
  const ready = size.w > 0
  return (
    <section id="roughcut" className="hub-sec">
      <div className="gut rail">
        <div className="sec-head-row rv">
          <div><h2 className="sec-h nw">One brief <span className="ser ser-in">in,</span> <span className="ser">every film out.</span></h2></div>
          <p className="sec-p">A logo, a screen recording and a few lines from you. Back comes every film and format you need.</p>
        </div>
        <div className="rv">{/* reveal wrapper: the stage's own class list changes when it goes live, which would drop the observer's 'in' */}
        <div className={'hub-stage' + (live ? ' live' : '')} ref={stage} onPointerMove={move} onPointerLeave={() => setPar({ x: 0, y: 0 })} style={{ '--px': par.x.toFixed(3), '--py': par.y.toFixed(3) }}>
          <div className="hub-dust" aria-hidden="true">{DUST.map((p, i) => <i key={i} style={{ left: p.x + '%', top: p.y + '%', '--s': p.s + 'px', '--d': p.d + 's', '--t': p.t + 's' }}></i>)}</div>
          <svg className="hub-net" width={size.w} height={size.h} viewBox={`0 0 ${size.w || 1} ${size.h || 1}`} aria-hidden="true">
            <defs>
              <filter id="hubGlow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2.6" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
              <filter id="hubSoft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="6" /></filter>
            </defs>
            {ready && FREE[L].map((p, i) => {
              const th = thread(p)
              return (
                <g key={'f' + i} className="thread free" style={{ '--d': `${.5 + i * .08}s` }}>
                  <path d={th.d} pathLength="1" className="halo" /><path d={th.d} pathLength="1" className="core" />
                  <circle cx={th.P[3][0]} cy={th.P[3][1]} r="4" className="node end" />
                  {!still && <circle r="2.4" className="pulse dim"><animateMotion dur={`${6 + (i % 3)}s`} begin={`${2 + i * .5}s`} repeatCount="indefinite" path={th.d} /></circle>}
                </g>
              )
            })}
            {ready && cards.map((c, i) => {
              const th = thread(c[L]), br = branch(th.P, .55 + (i % 3) * .08, i % 2 ? 1 : -1)
              return (
                <g key={c.k} className={'thread' + (hot === i ? ' hot' : '')} style={{ '--d': `${.25 + i * .09}s` }}>
                  <path d={th.d} className="under" filter="url(#hubSoft)" />
                  <path d={th.d} pathLength="1" className="halo" />
                  <path d={th.d} pathLength="1" className="core" />
                  <path d={br.d} pathLength="1" className="core twig" />
                  <circle cx={br.ex} cy={br.ey} r="3.2" className="node" />
                  <circle cx={th.P[3][0]} cy={th.P[3][1]} r="5" className="node end" />
                  {!still && <circle r="3.4" className="pulse"><animateMotion dur={`${3.4 + (i % 4) * .7}s`} begin={`${1 + i * .45}s`} repeatCount="indefinite" path={th.d} /></circle>}
                  {!still && <circle r="2" className="pulse dim"><animateMotion dur={`${5 + (i % 3) * .8}s`} begin={`${2.2 + i * .3}s`} repeatCount="indefinite" path={th.d} /></circle>}
                </g>
              )
            })}
          </svg>
          {/* the core */}
          <div className="hub-core" style={{ left: c0.x + '%', top: c0.y + '%' }} aria-hidden="true"><i className="glow"></i><i className="ring"></i><i className="ring r2"></i><span className="tile"><span className="mark"><i></i></span></span></div>
          {/* the cards */}
          {cards.map((c, i) => {
            const p = c[L]
            return (
              <div key={c.k} className={'hub-card ' + c.k + (hot === i ? ' hot' : '')} style={{ left: p.x + '%', top: p.y + '%', '--s': p.s, '--z': p.z, '--b': `${-(i * 1.3)}s`, '--d': `${.35 + i * .09}s`, '--fx': `${((c0.x - p.x) / 100) * size.w}px`, '--fy': `${((c0.y - p.y) / 100) * size.h}px` }}
                   onPointerEnter={() => setHot(i)} onPointerLeave={() => setHot(null)} aria-label={c.t}>
                <div className="fly"><div className="par"><div className="bob">
                  {c.k === 'phone' && <div className="ph"><i className="notch"></i><video ref={(el) => { vids.current[0] = el }} src={c.clip} poster={c.poster} muted loop playsInline preload="metadata" aria-hidden="true" /><span className="cap">Reel · 9:16</span><i className="heart"></i></div>}
                  {c.k === 'browser' && <div className="br"><div className="bar"><i></i><i></i><i></i><span>yourproduct.com</span></div><video ref={(el) => { vids.current[1] = el }} src={c.clip} poster={c.poster} muted loop playsInline preload="metadata" aria-hidden="true" /><i className="cur"></i></div>}
                  {c.k === 'quote' && <div className="qt"><img src={c.poster} alt="" /><div><i className="l"></i><i className="l"></i><i className="l s"></i><span><b>★</b><b>★</b><b>★</b><b>★</b><b>★</b></span></div></div>}
                  {c.k === 'player' && <div className="pl"><video ref={(el) => { vids.current[2] = el }} src={c.clip} poster={c.poster} muted loop playsInline preload="metadata" aria-hidden="true" /><div className="ctl"><b></b><i></i><span>0:12 / 0:30</span></div></div>}
                  {c.k === 'post' && <div className="po"><div className="hd"><i></i><span><b></b><b className="s"></b></span></div><video ref={(el) => { vids.current[3] = el }} src={c.clip} poster={c.poster} muted loop playsInline preload="metadata" aria-hidden="true" /><div className="ic"><i></i><i></i><i></i><em>2,418 likes</em></div></div>}
                  {c.k === 'stats' && <div className="st"><span className="k"><i></i>Delivered</span><div className="chips"><em>4K master</em><em>16:9</em><em>9:16</em><em>1:1</em><em>Captions</em><em>SRT</em></div></div>}
                  {c.k === 'chat' && <div className="ch"><span className="in">Brief + logo + a screen recording 📎</span><span className="out">Got it. Script draft by Thursday.</span><span className="in">Perfect 🙌</span><span className="typing"><i></i><i></i><i></i></span></div>}
                  {c.k === 'vo' && <div className="vo"><span className="k"><i className="wave"><b></b><b></b><b></b><b></b></i>Voice-over</span><div className="chips"><em>Hindi</em><em>English</em><em>Tamil</em><em>Telugu</em><em>+4</em></div></div>}
                </div></div></div>
              </div>
            )
          })}
        </div>
        </div>
      </div>
    </section>
  )
}
