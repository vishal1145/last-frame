import React, { useEffect, useRef, useState } from 'react'
import { EMAIL } from '../data.js'
import { WA_URL } from './Nav.jsx'
import Footer from './Footer.jsx'
// ribbon.js (WebGL strip), formatStage.js (projector stage) and the viewfinder (in git-less backups) were replaced 2026-11-23 by
// the glass mosaic below (shapeGlass.js): the chosen shape is built of glass, and breaks and re-forms into the next one
import { createWallGlass } from '../wallGlass.js' // shapeGlass.js (the floating mosaic) was the step before: "poora whole background me ho"

// "Films in every shape. let's make it happen." — the old Shapes section and the contact block as one scene (2026-11-22).
// One strip of film flies through the whole section in 3D (ribbon.js, drawn on a canvas): it comes in far away at the
// top-left, sweeps down across the open half close to the viewer, turns back into the depth behind the brief and runs
// out at the top-right, twisting as it goes. Every frame on the strip is a different delivery shape — 2.39:1, 16:9,
// 1:1, 4:5, 9:16 — each playing a live film, the same films coming round in other shapes. The chosen shape's frames carry
// an amber edge; it walks the five shapes on its own until the visitor picks one (a frame on the strip or a chip), and
// the brief says where the film will run. The brief form itself is unchanged. Clips: free Mixkit stock (854×480) and
// 854px copies of three of ours (shapes/sneakers, unboxing, coffee, from work/).
export const SHAPES = [
  { k: 'cine', ar: 2.39, label: '2.39:1', dims: '4096 × 1716', use: 'Cinema · TVC' },
  { k: 'wide', ar: 16 / 9, label: '16:9', dims: '1920 × 1080', use: 'YouTube · Web' },
  { k: 'sq', ar: 1, label: '1:1', dims: '1080 × 1080', use: 'Feed' },
  { k: 'port', ar: 4 / 5, label: '4:5', dims: '1080 × 1350', use: 'Post' },
  { k: 'tall', ar: 9 / 16, label: '9:16', dims: '1080 × 1920', use: 'Reels · Shorts' },
]
const S = (n, w = 854, h = 480) => ({ src: `/video/shapes/${n}.mp4`, w, h })
const FILMS = { runway: S('runway'), sneakers: S('sneakers'), dance: S('dance', 480, 854), ink: S('ink'), mascara: S('mascara'), juice: S('juice'), unboxing: S('unboxing'), heels: S('heels'), honey: S('honey'), coffee: S('coffee') }
// the frames along the strip, in order: [shape, film]. Phones carry fewer films (fewer decoders), so films repeat in other shapes.
const REEL = {
  desk: [['wide', 'sneakers'], ['tall', 'dance'], ['sq', 'ink'], ['cine', 'mascara'], ['port', 'juice'], ['tall', 'unboxing'], ['wide', 'heels'], ['sq', 'honey'], ['cine', 'coffee']],
  stack: [['wide', 'sneakers'], ['tall', 'dance'], ['sq', 'ink'], ['cine', 'mascara'], ['port', 'juice'], ['tall', 'juice'], ['wide', 'ink'], ['sq', 'dance'], ['cine', 'sneakers'], ['port', 'mascara'], ['tall', 'ink'], ['wide', 'juice']],
}
// machines with few cores decode fewer films at once: the later films fold back onto the first ones (other shapes, same films)
const MAX_FILMS = typeof navigator !== 'undefined' && navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4 ? 6 : 9
const fold = (list) => { const u = [...new Set(list.map((f) => f[1]))]; return list.map(([k, f]) => [k, u.indexOf(f) < MAX_FILMS ? f : u[u.indexOf(f) % MAX_FILMS]]) }
// the projector stage: one film per shape, warm and bright clips only
const STAGE = [['cine', 'coffee'], ['wide', 'sneakers'], ['sq', 'honey'], ['port', 'mascara'], ['tall', 'runway']]
const WALK = 4600 // long enough to watch each shape break and re-form // ms the amber edge stays on a shape before moving to the next (until the visitor picks)
const LOOKING = ['Product ad film', 'Brand film', 'Social reels', 'Explainer / demo', 'Launch film', 'Testimonial film']
const reduceMotion = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

// Brief form. No backend here: submit opens the visitor's email app with the brief pre-filled (mailto).
function BriefForm({ live, shape }) {
  const [sent, setSent] = useState(false)
  // the slate (2026-11-23, "contact form aise hi rahega, bas design unique and creative"): same fields, now a production
  // slate — a running REC timecode, chalk cells, and sprocket holes down both edges that light up as the brief fills in
  const tc = useRef(null)
  useEffect(() => {
    if (!live || reduceMotion()) return
    const t0 = performance.now() - (tc.current?._ms || 0)
    const id = setInterval(() => {
      const ms = performance.now() - t0, f = Math.floor(ms / 40) % 25, sec = Math.floor(ms / 1000)
      if (!tc.current) return
      tc.current._ms = ms
      tc.current.textContent = [Math.floor(sec / 3600), Math.floor(sec / 60) % 60, sec % 60, f].map((n) => String(n).padStart(2, '0')).join(':')
    }, 80)
    return () => clearInterval(id)
  }, [live])
  const onInput = (e) => {
    const flds = [...e.currentTarget.querySelectorAll('.fld')]
    let n = 0
    flds.forEach((f) => { const v = f.querySelector('input,select,textarea'); const full = !!(v && v.value.trim()); f.dataset.full = full ? '1' : ''; n += full })
    e.currentTarget.style.setProperty('--fill', (n / flds.length).toFixed(3))
  }
  const onSubmit = (e) => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const g = (k) => (f.get(k) || '').toString().trim()
    const subject = `Brief: ${g('looking') || 'Ad film'} — ${g('company') || g('name')}`
    const body = [
      `Name: ${g('name')}`, `Email: ${g('email')}`, `Phone: ${g('phone')}`, `Company: ${g('company')}`,
      `Looking for: ${g('looking')}`, `Runs on: ${shape.use} (${shape.label})`, '', g('message'),
    ].join('\n')
    window.location.href = `mailto:${EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    setSent(true)
  }
  return (
    <form id="contact" className={'bform' + (live ? ' live' : '') + (sent ? ' sent' : '')} onSubmit={onSubmit} onInput={onInput} onChange={onInput} aria-label="Send a brief">
      <span className="clapstick" aria-hidden="true"></span>
      <span className="bf-stick" aria-hidden="true"></span>
      <span className="bf-perf bf-l" aria-hidden="true"></span><span className="bf-perf bf-r" aria-hidden="true"></span>
      <div className="bf-head">
        <h3>Send a brief</h3>
        <span className="bf-rec" aria-hidden="true"><i></i>REC <b ref={tc}>00:00:00:00</b></span>
      </div>
      <p className="mk-runs">Runs on <b key={shape.k}>{shape.use} · {shape.label}</b></p>
      <div className="row2">
        <div className="fld"><label htmlFor="bf-name">Name *</label><input id="bf-name" name="name" required autoComplete="name" /></div>
        <div className="fld"><label htmlFor="bf-company">Company</label><input id="bf-company" name="company" autoComplete="organization" /></div>
      </div>
      <div className="row2">
        <div className="fld"><label htmlFor="bf-email">Email *</label><input id="bf-email" name="email" type="email" required autoComplete="email" /></div>
        <div className="fld"><label htmlFor="bf-phone">Phone</label><input id="bf-phone" name="phone" type="tel" autoComplete="tel" /></div>
      </div>
      <div className="fld"><label htmlFor="bf-looking">I'm looking for *</label>
          <select id="bf-looking" name="looking" required defaultValue="">
            <option value="" disabled>Choose…</option>
            {LOOKING.map((o) => <option key={o}>{o}</option>)}
          </select></div>
      <div className="fld"><label htmlFor="bf-msg">The product, the audience, the deadline</label>
        <textarea id="bf-msg" name="message" placeholder="A few lines is plenty — we'll write the full brief with you." /></div>
      <button className="btn btn-amber sub" type="submit">Send the brief</button>
      {sent && <p className="ok-msg">Opening your email app — if nothing happens, write to {EMAIL}</p>}
    </form>
  )
}

export default function Contact() {
  const root = useRef(null), glassHost = useRef(null), region = useRef(null), glass = useRef(null), ptr = useRef({ x: 0, y: 0, in: false })
  const [live, setLive] = useState(false) // on screen: the strip runs, clips play, the clapper claps
  const [idx, setIdx] = useState(0)
  const [auto, setAuto] = useState(true) // the amber edge walks the shapes until the visitor picks
  const idxRef = useRef(0); idxRef.current = idx
  const shape = SHAPES[idx]
  const pick = (i) => { setAuto(false); setIdx(i) }

  useEffect(() => {
    const io = new IntersectionObserver(([e]) => setLive(e.isIntersecting), { threshold: 0.06 })
    io.observe(root.current)
    return () => io.disconnect()
  }, [])
  // the glass mosaic
  useEffect(() => {
    const films = Object.fromEntries(STAGE.map(([k, film]) => [k, FILMS[film]]))
    const gl = createWallGlass(glassHost.current, {
      shapes: SHAPES, films, reduce: reduceMotion(),
      getChosen: () => SHAPES[idxRef.current].k,
      getPointer: () => ptr.current,
      getRegion: () => { const h = glassHost.current.getBoundingClientRect(), r = region.current?.getBoundingClientRect(); return r && r.width ? { x: r.left - h.left, y: r.top - h.top, w: r.width, h: r.height } : null },
    })
    glass.current = gl
    return () => { gl.destroy(); glass.current = null }
  }, [])
  useEffect(() => { glass.current?.[live ? 'start' : 'stop']() }, [live])
  useEffect(() => {
    if (!auto || !live || reduceMotion()) return
    const id = setInterval(() => setIdx((i) => (i + 1) % SHAPES.length), WALK)
    return () => clearInterval(id)
  }, [auto, live])

  return (
    <section id="wrap-sec" ref={root}>
      <div className="mk" onPointerMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); ptr.current = { x: e.clientX - r.left, y: e.clientY - r.top, in: true } }} onPointerLeave={() => { ptr.current = { ...ptr.current, in: false } }}>
        <span className="mk-bg" aria-hidden="true"></span>
        <div className="sg" ref={glassHost} aria-hidden="true"></div>
        <div className="gut rail rb-ui">
          <div className="rb-left">
            {/* rewritten 2026-11-26 ("thoda behtar tareeke se likho"): a label, the ask, one line on what happens next, and the direct lines */}
            <div className="mk-head rv" id="formats">
              <h2 className="sec-h">Got a product? <span className="ser">let's make it a film.</span></h2>
              <p className="mk-sub">Tell us what you're launching and where it will run. We'll come back with an <strong>idea, a timeline and a quote</strong>.</p>
              <ul className="mk-reach">
                <li><span>Email</span><a href={`mailto:${EMAIL}`}>{EMAIL}</a></li>
                <li><span>WhatsApp</span><a href={WA_URL} target="_blank" rel="noopener noreferrer">Chat with us</a></li>
              </ul>
            </div>
            {/* the film window (sg-region) was removed 2026-11-26 ("remove this, keep word only"); put it back to show a film again */}
            {/* the format chips were removed 2026-11-23 ("not looking good"): the shapes walk on their own */}
          </div>
          <div className="rb-right rv">
            <BriefForm live={live} shape={shape} />
          </div>
        </div>
      </div>

      <Footer />
    </section>
  )
}
