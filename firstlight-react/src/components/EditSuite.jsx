import React, { useEffect, useRef, useState } from 'react'
import { workFilms } from '../data.js'

// "Fresh from the edit suite." — a coverflow of the films fanned around the viewer: the centre card plays,
// its neighbours sit tilted on either side, the far ones fade out. It rolls on its own every few seconds
// while on screen, waits while the pointer is over it, and can be swiped / clicked / arrow-keyed.
const FILMS = workFilms // the nine films of the Work reel (workFilms already includes `projects`)
const SM = new Set(['perfume', 'coffee', 'runway', 'unboxing', 'embers', 'interview', 'sneakers']) // have a 480px rendition
const small = (path) => { if (path.split('/').length !== 3) return path; const name = path.split('/').pop().split('.')[0]; return SM.has(name) ? path.replace('/video/', '/video/sm/') : path }
const HOLD = 3200 // ms each film stays in the centre
// how far out, how far back and how much turned a card sits, by distance from the centre
const POSE = [
  { x: 0, z: 0, r: 0 },
  { x: 0.8, z: 60, r: 18 },
  { x: 1.32, z: 200, r: 38 },
  { x: 1.55, z: 320, r: 50 },
]

export default function EditSuite() {
  const n = FILMS.length
  const [active, setActive] = useState(0)
  const [hold, setHold] = useState(false) // pointer over / finger down: the carousel waits
  const [seen, setSeen] = useState(false) // on screen: only then does it roll and play
  const stage = useRef(null)
  const vids = useRef([])
  const drag = useRef(null)
  const go = (d) => setActive((a) => (a + d + n) % n)

  useEffect(() => {
    const el = stage.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setSeen(e.isIntersecting), { threshold: 0.3 })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  useEffect(() => {
    if (!seen || hold || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const t = setInterval(() => go(1), HOLD)
    return () => clearInterval(t)
  }, [seen, hold, n])
  // the centre film plays, the rest hold their frame
  useEffect(() => {
    vids.current.forEach((v, i) => { if (!v) return; if (i === active && seen) v.play().catch(() => {}); else v.pause() })
  }, [active, seen])

  // signed distance from the centre, the short way round
  const off = (i) => { let d = i - active; if (d > n / 2) d -= n; if (d < -n / 2) d += n; return d }
  const down = (e) => { drag.current = { x: e.clientX, moved: false }; setHold(true) }
  const move = (e) => {
    const d = drag.current
    if (!d || d.moved) return
    const dx = e.clientX - d.x
    if (Math.abs(dx) > 40) { d.moved = true; go(dx < 0 ? 1 : -1) }
  }
  const up = () => { drag.current = null }
  const pick = (i) => { if (drag.current && drag.current.moved) return; if (i !== active) setActive(i) }
  const key = (e) => { if (e.key === 'ArrowRight') { e.preventDefault(); go(1) } if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1) } }

  return (
    <section id="edit-suite">
      <div className="gut rail">
        <div className="es-head rv">
          <span className="es-eye">Latest cuts</span>
          <h2 className="sec-h nw">Fresh from the <span className="ser ser-in">edit suite.</span></h2>
        </div>
      </div>
      <div className="rv">
        <div className="es-stage" ref={stage} tabIndex={0} role="region" aria-roledescription="carousel" aria-label="Latest films"
             onPointerEnter={() => setHold(true)} onPointerLeave={() => { setHold(false); up() }}
             onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onKeyDown={key}>
          {FILMS.map((p, i) => {
            const o = off(i), a = Math.abs(o), s = Math.sign(o), pose = POSE[Math.min(a, 3)]
            return (
              <div key={p.no} className={'es-card' + (o === 0 ? ' on' : '') + (o > 0 ? ' r' : '') + (a >= 3 ? ' far' : '')}
                   style={{ '--x': pose.x * s, '--z': pose.z, '--r': pose.r * s, '--a': a }}
                   onClick={() => pick(i)} aria-hidden={o !== 0}>
                <video ref={(el) => { vids.current[i] = el }} src={small(p.clip)} poster={small(p.poster)} muted loop playsInline preload="metadata" aria-hidden="true" draggable="false" />
                <span className="es-chip">{p.kind}</span>
                <span className="es-live" aria-hidden="true"><i></i>Playing</span>
                <span className="es-title">{p.title}</span>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
