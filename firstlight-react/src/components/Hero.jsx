import React, { useEffect, useRef, useState } from 'react'
import { projects, workFilms, heroVideo } from '../data.js'
import { LAND, INDIA } from '../globeDots.js'
import FilmReel from './FilmReel.jsx'
import Lightbox from './Lightbox.jsx'
import '../hero-motion.css'
import { createShards } from '../shards.js'
import { createTunnel } from '../tunnel.js'
import { createGlass3d } from '../glass3d.js'

const SHOW_REEL = false
const reduceMotion = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

// Studio-ident hero, all in one 3D language. Stars → the dotted earth (the site's own globe data, India lit) grows toward
// the camera → through the atmosphere and the clouds → a film corridor: the eight films hang in deep space and the camera
// flies between them → the light of the field gathers into one point that flares into the brand mark, the wordmark joins
// it → the logo flies into the nav, and an amber lead runs from it to the headline, the button and the film ring, which
// ignites and keeps turning. The stage the hero settles into (night, stars, drifting bokeh dust, rays from the logo) is
// the same space the corridor flew through. Everything is drawn in code; no stock footage.
// the opening, act by act (ms). ≈14.1 s, then the lead (LEAD_MS) and the ring lighting card by card: ~18 s to settled
// (user, 2026-11-22: "poora animation 15–20 sec tak chale"; before that it was 7.2 s + a 1.5 s lead)
// (the 3.2 s "set" act with four lamp cones was cut the same night: "mountain part looking bakwas" — its time went to the corridor)
// (2026-11-23, "ye blank jaisa kyu aa rha hai": the haze + soft clouds held an empty screen for ~1.3 s. Now the haze is a
// short glow at the rim, the clouds rush outward like a tunnel and the first film is already in the middle of the view)
const T = { space: 2000, approach: 3200, clouds: 500, corridor: 6400, converge: 1000, logo: 900, hold: 700, dock: 700 }
// (2026-11-25, user: "ye earth thoda slow work krna hai": space 1400→2000, approach 1900→3200 — the earth comes in calmly)
const M = {}; { let a = 0; for (const k in T) { M[k] = [a, a + T[k]]; a += T[k] } M.end = a }
const LEAD_MS = 2600
const SPIN = 11 // deg/s: the film ring's resting spin (a full turn in ~33 s)
const DAY_STAGE = false // was on with the 3D glass hero (HERO_GL, defined below) (ink type on greige, like the reference); before: greige settled stage rejected the same day ("background not looking good"); history: back on 2026-11-23 as the HyperFrames-like greige studio (user: dark settled bg "theek nahi lag raha"); was false since 2026-11-22 — true = the pastel "lights on" stage after the logo docks; off since 2026-11-22 (user: "jaisa pehle tha background waise hi rehne do")
// pastel light in the night stage (user, 2026-11-22: "use pastel colour also"): peach, rose, lavender, mint, sky, butter
const PASTEL = [[255, 211, 182], [249, 197, 213], [216, 204, 244], [198, 241, 223], [197, 227, 246], [255, 241, 184]]
const PASTEL_CSS = PASTEL.map((c) => `rgb(${c.join(',')})`)
const PIN = typeof location !== 'undefined' && new URLSearchParams(location.search).has('hx_t') ? +new URLSearchParams(location.search).get('hx_t') : null

const F = (p, word) => p && { title: p.title, word, poster: p.poster, clip: p.clip }
const FILMS = [
  { title: heroVideo.title, word: 'product ads', poster: heroVideo.poster, clip: heroVideo.src },
  F(projects[2], 'fashion films'), F(projects[3], 'launch films'), F(projects[5], 'social reels'), F(workFilms[6], 'explainer videos'),
  F(projects[4], 'brand films'), F(projects[1], 'food films'), F(projects[0], 'beauty ads'),
].filter(Boolean)
const N = FILMS.length
// the settled tunnel's own films (2026-11-25: "new and clean video not blur"): sharp 1280×720 Mixkit clips (Free licence,
// mixkit.co/license) in public/video/tunnel/ — the old ones were 480×270/960×540 copies that smeared on the near frames
const TN = (n, title) => ({ title, poster: `/video/tunnel/${n}.jpg`, clip: `/video/tunnel/${n}.mp4` })
const TUNNEL_FILMS = [TN('soda', 'The Pour'), TN('fashion', 'Studio Fashion'), TN('launch', 'The Launch'), TN('social', 'Social Reel'),
  TN('explainer', 'The Explainer'), TN('brand', 'Fresh Press'), TN('food', 'Food Film'), TN('beauty', 'Beauty Close-Up'), TN('chocolate', 'Dark Chocolate')]
const two = (n) => String(n).padStart(2, '0')
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v)
const easeIn = (t) => t * t * t
const easeOut = (t) => 1 - Math.pow(1 - t, 3)
const smooth = (t) => t * t * (3 - 2 * t)
const easeInOut = (t) => (t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2)
const prng = (seed) => () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let x = Math.imul(seed ^ (seed >>> 15), 1 | seed); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296 }

// the corridor: film i hangs at depth z, off to one side, angled in toward the flight line
const GAP = 560
// the corridor carries more films than the ring: the ring's eight, the rest of the work reel, and four stock films with set names
const EXTRA = [['The Edit Suite', workFilms[7]], ['Studio Light', workFilms[8]]].filter(([, f]) => f).map(([title, f]) => ({ title, poster: f.poster, clip: f.clip }))
const STOCK = [['Golden Hour', 'honey'], ['Close-Up', 'mascara'], ['Fresh Press', 'juice'], ['Colour Burst', 'ink']].map(([title, n]) => ({ title, poster: `/video/shapes/${n}.jpg`, clip: `/video/shapes/${n}.mp4` }))
const CORR = [...FILMS, ...EXTRA, ...STOCK].slice(0, 14)
// the corridor act since 2026-11-23 (user reference: hyperframes.dev — "background screen colour kuch aisa, aur ye design bhi"):
// out of the clouds into a warm greige studio with a soft rainbow arc; three films arrive as thick glass triangles, lock into
// the picture, turn, and burst past the camera; then the lights go down for the logo. The old poster corridor is off.
const SHOW_CORRIDOR = false
// the settled stage, clean (2026-11-23, after the greige and the murky purple both read badly): the brand's deep ink with one
// warm amber pool under the ring — no aurora, no rays from the logo, fewer stars; the ring's film light still spills over it
const CLEAN_STAGE = true
// the settled hero since 2026-11-23 (user, on the ring: "creative nahi lag raha, awesome feel nahi, kuch new and modern try karo"):
// giant type with the films INSIDE the headline — rounded video capsules between the words. The middle one plays the film the
// amber word names; the two others hold stills of other films with a slow push-in. Films change every few seconds with a wipe;
// hovering a capsule widens it (the words make room), clicking plays the film. A small "now playing" strip sits bottom right.
// The ring is off (its code stays behind this flag).
const HERO_PILLS = false // the pill headline + big frame was rejected the same hour ("not looking good, creative nahi lag raha")
// the settled hero now: an endless tunnel of the films (tunnel.js), the headline centred in the light at its end
const HERO_TUNNEL = true // back the same day: the 3D glass hero was rejected ("pehle jaisa tha vaise karo") // the tunnel was the hero the manager called "much better, we need some more effort"
// the tunnel in real 3D (tunnel3d.js, three.js) since 2026-11-24 (user: "three.js sample use kr skte hai, can make more better"):
// true perspective, frames bent to the wall, the near ones playing their film, dust, hover lift. false = the 2D canvas tunnel
const TUNNEL_3D = true
// the settled hero now (manager: "try the reference I sent — hyperframes — check three.js samples"): the glass ribbon in real
// 3D (glass3d.js, WebGL2), on the reference's warm greige studio with a soft spectral light, the headline in ink
const HERO_GL = false
const PILL_MS = 4200
// the settled hero (2026-11-23, "isko bhi kuch behtar banao"): the glass ribbon keeps flowing on the dark stage, carrying the
// film the (now invisible) ring has in front — the counter, the caption, drag and click still drive it; the headline word follows.
const SETTLED_RIBBON = false // off 2026-11-23: the ribbon in the settled hero was rejected twice (dark: "achha nahi lag raha", greige: "creativity not looking good") — the ring is back
// the glass act in real 3D (shards3d.js, three.js) since 2026-11-24 (user: "this section can make more better and creative"): on the
// night stage, glass assembles into a clean screen per film, shatters toward the camera, the last one falls into the point the
// logo flares from. false = the 2D glass ribbon on the greige studio
const SHARDS_3D = true
const SHARD_FILMS = [FILMS[0], FILMS.find((f) => /Runway/.test(f.title)) || FILMS[1], STOCK[0]].filter(Boolean)
// the clouds we punch through: set round the middle (never on it), each flies outward as it grows, so the view opens
const CLOUDS = Array.from({ length: 9 }, (_, i) => { const a = i * 2.4 + .6, r = .15 + (i % 3) * .055; return { x: 50 + Math.cos(a) * r * 125, y: 50 + Math.sin(a) * r * 100, w: 300 + ((i * 131) % 380) } })
const FLY = CORR.map((_, i) => { const r = prng(100 + i); return { sgn: i % 2 ? 1 : -1, xr: .24 + r() * .1, yr: (r() - .5) * .26, ry: 12 + r() * 12, rz: (r() - .5) * 6, z: -(900 + i * GAP) } })
const CAM_TOTAL = 900 + (CORR.length - 1) * GAP + 600 // the camera ends just past the last film
// two films the camera flies straight through (they play for real): corridor progress at the pass solved from camZ = (.35co + .65co²)·CAM_TOTAL
const THRUS = [[3.5, FILMS[0]], [9.5, STOCK[2]]].map(([k, film]) => { const z = -(900 + k * GAP), co = (-.35 + Math.sqrt(.35 * .35 + 4 * .65 * ((-z - 90) / CAM_TOTAL))) / (2 * .65); return { z, film, co } })

function pathFrom(pts, r = 14) {
  const P = pts.filter((p, i) => i === 0 || Math.abs(p.x - pts[i - 1].x) > .5 || Math.abs(p.y - pts[i - 1].y) > .5)
  let d = `M${P[0].x} ${P[0].y}`
  for (let i = 1; i < P.length; i++) {
    const A = P[i - 1], B = P[i], C = P[i + 1]
    if (!C) { d += ` L${B.x} ${B.y}`; break }
    const ab = Math.hypot(B.x - A.x, B.y - A.y), bc = Math.hypot(C.x - B.x, C.y - B.y), rr = Math.min(r, ab / 2, bc / 2)
    const ux = (B.x - A.x) / ab, uy = (B.y - A.y) / ab, vx = (C.x - B.x) / bc, vy = (C.y - B.y) / bc
    d += ` L${B.x - ux * rr} ${B.y - uy * rr} Q${B.x} ${B.y} ${B.x + vx * rr} ${B.y + vy * rr}`
  }
  return d
}

export default function Hero() {
  const sec = useRef(null), cv = useRef(null)
  const R = useRef({}) // scene element refs by name
  const el = (k) => (n) => { R.current[k] = n }
  const svg = useRef(null), trace = useRef(null), comet = useRef(null), cometGlow = useRef(null), lead = useRef(null), halo = useRef(null)
  const [stage, setStage] = useState('ident') // ident → live (the lead runs) → settled
  const [lift, setLift] = useState(false)      // the night stage is up (from the corridor on)
  const [seen, setSeen] = useState({})
  const [pillHold, setPillHold] = useState(false)
  const [wi, setWi] = useState(0)
  const [play, setPlay] = useState(null) // a ring card clicked: its film plays full-screen
  const [day, setDay] = useState(false) // the lights are on: the pastel studio stage (after the logo has docked)
  const st = useRef({ skip: false, skipAt: 0 })

  useEffect(() => {
    if (!(HERO_PILLS || HERO_TUNNEL || HERO_GL) || !seen.ring || pillHold || reduceMotion()) return
    const id = setTimeout(() => setWi((i) => (i + 1) % N), PILL_MS)
    return () => clearTimeout(id)
  }, [seen.ring, wi, pillHold])
  st.current.wi = wi // the glass and the tunnel read the current film from here (the ring used to set it)
  const glRef = useRef(null)
  useEffect(() => { // the settled hero's 3D glass ribbon
    if (!HERO_GL || !R.current.g3 || reduceMotion()) return
    let g3 = null
    try {
      g3 = createGlass3d(R.current.g3, FILMS, {
        getIndex: () => st.current.wi || 0, alpha: () => st.current.g3A || 0, getPointer: () => st.current.ptr || { x: 0, y: 0, in: false },
        path: (vw, vh, phone) => phone
          ? { A: [vw * 1.3, vh * .56, 160], B: [-vw * .4, vh * .1, -360], bend: [0, -vh * .03, 0], h: vw * .1, flipU: true, flipV: false }
          : { A: [vw * 1.14, vh * 1.02, 160], B: [vw * .08, vh * .02, -360], bend: [0, -vh * .08, 0], h: Math.min(vh * .095, 80), flipU: true, flipV: false }, // derived: canvas x must run down-right along the band, canvas y down-left across it
      })
    } catch (e) { console.warn('glass3d', e) }
    glRef.current = g3
    return () => { g3?.destroy(); glRef.current = null }
  }, [])
  const tunnelRef = useRef(null)
  useEffect(() => { // the settled hero's film tunnel
    if (!HERO_TUNNEL || !R.current.tunnel || reduceMotion()) return
    const opts = {
      getPointer: () => st.current.ptr || { x: 0, y: 0, in: false }, alpha: () => st.current.tnA || 0,
      onPick: (i) => { const f = TUNNEL_FILMS[i]; setPlay({ title: f.title, sub: f.word, src: f.clip, poster: f.poster }) },
    }
    const host = R.current.tunnel
    let tn = null, gone = false
    const flat = () => { host.replaceChildren(); tn = tunnelRef.current = createTunnel(host, TUNNEL_FILMS, opts) } // no WebGL: the 2D canvas tunnel
    // three.js loads in its own chunk while the opening plays (the tunnel only shows once the logo docks)
    if (TUNNEL_3D) import('../tunnel3d.js').then(({ createTunnel3d }) => {
      if (gone) return
      try { tn = tunnelRef.current = createTunnel3d(host, TUNNEL_FILMS, opts) } catch (e) { console.warn('tunnel3d', e); flat() }
    }, flat)
    else flat()
    return () => { gone = true; tn?.destroy(); tunnelRef.current = null }
  }, [])
  const shardsRef = useRef(null), ribbonRef = useRef(null)
  useEffect(() => { // the settled hero's ribbon
    if (!SETTLED_RIBBON || !R.current.ribbon || reduceMotion()) return
    const rb = createShards(R.current.ribbon, FILMS, {
      loop: true, getIndex: () => st.current.wi || 0, alpha: () => st.current.ribA || 0,
      // a gentle diagonal across the upper right (the steep version read as a heavy slab with sideways text: "not looking good")
      path: (vw, vh, phone) => phone
        ? { A: [vw * 1.3, vh * .5, 160], B: [-vw * .4, vh * .02, -360], bend: [0, -vh * .03, 0] }
        : { A: [vw * 1.14, vh * .8, 160], B: [vw * .16, -vh * .14, -360], bend: [0, -vh * .07, 0] },
      h: (vw, vh, phone) => (phone ? vw * .1 : Math.min(vh * .095, 80)), // smaller glass: a lighter band
      getPointer: () => st.current.ptr || { x: 0, y: 0, in: false },
    })
    ribbonRef.current = rb
    return () => { rb.destroy(); ribbonRef.current = null }
  }, [])
  useEffect(() => { // the glass films of the corridor act (shards.js), built once; the frame loop drives them
    if (!R.current.shards || reduceMotion()) return
    const host = R.current.shards
    let sh = null, gone = false
    const flat = () => { host.replaceChildren(); sh = shardsRef.current = createShards(host, SHARD_FILMS, { start: M.corridor[0] + 250, step: 1900 }) }
    // three.js loads in its own chunk during the first acts (space, the globe, the clouds: ~3.8 s before the glass)
    // 2026-11-25: the films now form out of a particle storm (user: "kuchh awsome look wala"); ?hx_fx=shards shows the glass shards
    const glass = new URLSearchParams(location.search).get('hx_fx') === 'shards'
    if (SHARDS_3D) (glass ? import('../shards3d.js').then((m) => m.createShards3d) : import('../particles3d.js').then((m) => m.createParticles3d)).then((create) => {
      if (gone) return
      try { sh = shardsRef.current = create(host, SHARD_FILMS, { getPointer: () => st.current.ptr || { x: 0, y: 0, in: false } }) } catch (e) { console.warn('films3d', e); flat() }
    }, () => { if (!gone) flat() })
    else flat()
    return () => { gone = true; sh?.destroy(); shardsRef.current = null }
  }, [])
  useEffect(() => {
    const root = sec.current, canvas = cv.current
    if (!root || !canvas) return
    const html = document.documentElement
    const Q = R.current
    const ctx = canvas.getContext('2d')
    const brandEl = () => document.querySelector('.nav-wrap .brand .lg-light') || document.querySelector('.nav-wrap .brand')
    const setRail = () => { const b = brandEl()?.getBoundingClientRect(); if (b) root.style.setProperty('--rail', (b.left + b.height / 2).toFixed(1) + 'px') }
    const flyEls = [...root.querySelectorAll('.sk-fly:not(.sk-thru)')], thruEls = [...root.querySelectorAll('.sk-thru')]; let thruPlaying = false
    let W = 0, H = 0, dpr = 1
    const placeFly = () => { const mob = W <= 860; flyEls.forEach((e, i) => { const m = FLY[i]; const x = m.sgn * (mob ? m.xr * .7 : m.xr) * W, y = m.yr * H * (mob ? .7 : 1); e.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,${m.z}px) rotateY(${(-m.sgn * m.ry).toFixed(1)}deg) rotateZ(${m.rz.toFixed(1)}deg)` }); thruEls.forEach((e, i) => { e.style.transform = `translate3d(0,0,${THRUS[i].z}px)` }) }
    const fitPills = () => { // the longest headline row (a pill + "explainer videos" ≈ 9.6em with a hovered pill) must end before the film frame
      const h = root.querySelector('.pl-h'), st = root.querySelector('.pl-stage'); if (!h || !st) return
      if (W <= 860) { h.style.removeProperty('--plcap'); return }
      const room = st.getBoundingClientRect().left - h.getBoundingClientRect().left - 48
      h.style.setProperty('--plcap', Math.max(44, room / 9.6).toFixed(1) + 'px')
    }
    // a real night sky (2026-11-25, user: "nyt me jaise sky hota hai vaisa kro"): drawn once per size — the Milky Way as a
    // diagonal band of glow with dark dust lanes, thousands of faint stars (denser in the band), true star colours
    const SKYC = [[170, 192, 255], [200, 214, 255], [232, 238, 255], [255, 255, 255], [255, 247, 234], [255, 229, 196], [255, 205, 158]]
    const skyCol = (r) => SKYC[r < .1 ? 0 : r < .26 ? 1 : r < .5 ? 2 : r < .72 ? 3 : r < .87 ? 4 : r < .96 ? 5 : 6]
    // its own layer under the stars: drawn only when the size changes, faded by the compositor (opacity), never redrawn per frame
    // (2026-11-25, user: "is it work very slow" — it was a full-screen drawImage every frame on top of the 3D)
    const skyC = document.createElement('canvas'); skyC.className = 'sk-starsky'; skyC.setAttribute('aria-hidden', 'true'); root.prepend(skyC)
    let skyW = 0, skyH = 0, skyO = ''
    const buildSky = () => {
      if (Math.abs(W - skyW) < 2 && Math.abs(H - skyH) < 60) return // ignore tiny resizes (mobile toolbars)
      skyW = W; skyH = H
      const q = Math.min(dpr, 1.5), c = skyC; c.width = Math.max(1, Math.round(W * q)); c.height = Math.max(1, Math.round(H * q))
      const g = c.getContext('2d'); g.setTransform(q, 0, 0, q, 0, 0)
      const r = prng(7), gauss = () => (r() + r() + r() + r() - 2) / 2
      const ax = -.05 * W, ay = .92 * H, bx = 1.05 * W, by = .06 * H, L = Math.hypot(bx - ax, by - ay), ux = (bx - ax) / L, uy = (by - ay) / L, nx = -uy, ny = ux
      const band = Math.min(W, H) * .2
      g.globalCompositeOperation = 'lighter'
      for (let i = 0; i < 170; i++) { // the band's glow: soft overlapping clouds, warmer at the core
        const t = r(), o = gauss() * band * .55, x = ax + ux * L * t + nx * o, y = ay + uy * L * t + ny * o, rad = band * (.35 + r() * .6)
        const core = 1 - Math.min(1, Math.abs(t - .55) * 1.6), col = '120,140,200' // a faint cool tint, not a white smoke (user: "ye white color ka kyu aa rha hai")
        const gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, `rgba(${col},${(.006 + core * .006).toFixed(3)})`); gr.addColorStop(1, `rgba(${col},0)`)
        g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2)
      }
      g.globalCompositeOperation = 'source-over'
      for (let i = 0; i < 26; i++) { // dark dust lanes along the middle of the band
        const t = r(), o = gauss() * band * .18, x = ax + ux * L * t + nx * o, y = ay + uy * L * t + ny * o, rad = band * (.18 + r() * .3)
        g.save(); g.translate(x, y); g.rotate(Math.atan2(uy, ux)); g.scale(2.4, 1)
        const gr = g.createRadialGradient(0, 0, 0, 0, 0, rad); gr.addColorStop(0, 'rgba(3,5,12,.12)'); gr.addColorStop(1, 'rgba(3,5,12,0)')
        g.fillStyle = gr; g.fillRect(-rad, -rad, rad * 2, rad * 2); g.restore()
      }
      const dot = (x, y, a) => { const s = .35 + Math.pow(r(), 3) * 1.1, k = skyCol(r()); g.fillStyle = `rgba(${k[0]},${k[1]},${k[2]},${a.toFixed(3)})`; g.fillRect(x - s / 2, y - s / 2, s, s) }
      const nAll = Math.round(W * H / 700), nBand = Math.round(L * band / 110)
      for (let i = 0; i < nAll; i++) dot(r() * W, r() * H, .12 + Math.pow(r(), 2.5) * .7)
      for (let i = 0; i < nBand; i++) { const t = r(), o = gauss() * band * .6; dot(ax + ux * L * t + nx * o, ay + uy * L * t + ny * o, .08 + Math.pow(r(), 3) * .55) }
    }
    const size = () => { dpr = Math.min(devicePixelRatio || 1, 2); W = root.clientWidth; H = root.clientHeight; canvas.width = W * dpr; canvas.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); buildSky(); setRail(); placeFly(); fitPills(); if (Q.amb) { Q.amb.width = W >= H ? 96 : 54; Q.amb.height = Math.max(8, Math.round(Q.amb.width * H / W)) } }
    size(); const ro = new ResizeObserver(size); ro.observe(root)

    // particles
    const rnd = prng(42)
    const stars = Array.from({ length: 240 }, (_, i) => ({ x: rnd(), y: rnd(), z: .3 + rnd() * .7, ph: rnd() * 6.28, c: skyCol(rnd()), big: i % 24 === 0, mid: false, sp: .6 + rnd() * .9 })) // brighter since 2026-11-23 (user: "stars bahut dim hai", then "chamak nahi rahe")
    // star sprite, drawn once: a soft glow round the brightest stars (no four-point glints: the real sky has none)
    const sprite = (n, draw) => { const c = document.createElement('canvas'); c.width = c.height = n; draw(c.getContext('2d'), n / 2); return c }
    const GLOW = sprite(64, (g, h) => { const r = g.createRadialGradient(h, h, 0, h, h, h); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.12, 'rgba(255,250,240,.85)'); r.addColorStop(.35, 'rgba(220,230,255,.22)'); r.addColorStop(1, 'rgba(200,215,255,0)'); g.fillStyle = r; g.fillRect(0, 0, h * 2, h * 2) })
    // bokeh dust: points in a depth field that drift toward the camera, parallax with the pointer, and gather into the mark
    const dust = Array.from({ length: 130 }, (_, i) => ({ x: rnd() * 2 - 1, y: rnd() * 2 - 1, z: .25 + rnd(), r: .5 + rnd() * 1.5, ph: rnd() * 6.28, sp: .5 + rnd(), c: PASTEL[i % PASTEL.length] }))
    const clouds = CLOUDS.map((c, i) => ({ ...c, start: M.clouds[0] - 450 + (i / 9) * (T.clouds + 250) }))
    const ptr = { x: 0, y: 0, in: false, hot: false }
    st.current.ptr = ptr // the settled ribbon's glass reacts to it
    const par = { x: 0, y: 0 }

    const rm = reduceMotion()
    let dayOn = false
    const lightsOn = () => { if (dayOn || !DAY_STAGE) return; dayOn = true; setDay(true); html.classList.add('hx-day') } // the night gives way to the pastel stage (off: DAY_STAGE)
    const finishInstant = () => { lightsOn(); html.classList.remove('hx-intro'); setLift(true); setStage('settled'); setSeen({ h1: 1, cta: 1, ring: 1 }); ['globe', 'haze', 'clouds', 'logo', 'sun', 'skip', 'corridor', 'flash', 'nebula', 'meteors', 'shards'].forEach((k) => Q[k] && (Q[k].style.display = 'none')); Q.rays && (Q.rays.style.opacity = .6) }
    if (rm) { finishInstant(); skyC.style.opacity = '1'; return () => { ro.disconnect(); skyC.remove() } }
    html.classList.add('hx-intro')
    // the page stays at the top until the whole opening has played (the lead has lit the ring); a pinned frame or a #hash load is left alone
    const lockable = PIN == null && !location.hash, keys = new Set(['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '])
    const block = (e) => { if (e.type === 'keydown' && !keys.has(e.key)) return; if (e.cancelable) e.preventDefault() }
    const unlock = () => { html.classList.remove('hx-lock'); for (const t of ['wheel', 'touchmove', 'keydown']) removeEventListener(t, block) }
    if (lockable) { html.classList.add('hx-lock'); scrollTo({ top: 0, behavior: 'instant' }); for (const t of ['wheel', 'touchmove', 'keydown']) addEventListener(t, block, { passive: false }) }
    const safety = setTimeout(() => { html.classList.remove('hx-intro'); unlock() }, 26000)

    let brightS = 0, raf = 0, on = true, t0 = 0, leadRun = null, docked = false, ended = false, lifted = false, starsV = 0, zoomV = 0, hazeV = 0, dustV = 0, pullV = 0, raysV = 0, rayA = 0, last = 0, sunX = 0, sunY = 0
    // the film ring: resting spin, drag with inertia, the card facing the camera is "front"
    const ringEl = Q.ring, ringCards = [...root.querySelectorAll('.sk-orbit:not(.sk-mirror) > .sk-card')], mirrorCards = [...root.querySelectorAll('.sk-mirror > .sk-card')]
    const ambCtx = Q.amb?.getContext('2d'); let ambN = 0
    const sparks = [...root.querySelectorAll('.sk-spark i')].map((el) => [+el.dataset.k, el])
    let spin = 0, vel = 0, drag = null, hoverRing = false, frontI = -1, dragMoved = 0, lastX = 0, lastT = 0, target = null, holdUntil = 0
    // the counter under the ring: bring film i to the front by the shortest way, then hold it a few seconds
    st.current.goTo = (i) => { const want = -i * 360 / N, d = ((want - spin) % 360 + 540) % 360 - 180; target = spin + d; holdUntil = performance.now() + 5000 }
    let downCard = null // the card under the finger at pointerdown: with pointer capture on the ring, the click's target is the ring itself
    const rDown = (e) => { if (e.button || e.target.closest?.('.sk-count')) return; drag = true; lastX = e.clientX; lastT = performance.now(); dragMoved = 0; downCard = e.target.closest?.('.sk-card[data-i]'); ringEl.setPointerCapture?.(e.pointerId); ringEl.classList.add('drag') }
    const rMove = (e) => { if (!drag) return; const now = performance.now(), dx = e.clientX - lastX, dtm = Math.max(1, now - lastT); spin += dx * .45; vel = Math.max(-1.8, Math.min(1.8, dx * .45 / dtm)); dragMoved += Math.abs(dx); lastX = e.clientX; lastT = now }
    const rUp = () => { if (!drag) return; drag = null; ringEl.classList.remove('drag') }
    const rClick = (e) => {
      if (dragMoved > 6) { e.preventDefault(); e.stopPropagation(); return }
      const card = e.target.closest?.('.sk-card[data-i]') || downCard; downCard = null; if (!card) return
      e.preventDefault(); e.stopPropagation()
      const f = FILMS[+card.dataset.i]; setPlay({ title: f.title, sub: f.word, src: f.clip, poster: f.poster })
    }
    const rEnter = () => { hoverRing = true }, rLeave = () => { hoverRing = false }
    if (ringEl) { ringEl.addEventListener('pointerdown', rDown); ringEl.addEventListener('pointermove', rMove); ringEl.addEventListener('pointerup', rUp); ringEl.addEventListener('pointercancel', rUp); ringEl.addEventListener('click', rClick, true); ringEl.addEventListener('pointerenter', rEnter); ringEl.addEventListener('pointerleave', rLeave) }
    const u = (t, a, b) => clamp01((t - a) / (b - a))
    const set = (k, prop, v) => { const n = Q[k]; if (n) n.style[prop] = v }

    const drawCanvas = (now, dt) => {
      ctx.clearRect(0, 0, W, H)
      const cx = W / 2, cy = H / 2
      const skyA = starsV * (1 - clamp01(zoomV * 4)) // the still sky fades as the warp starts
      const so = skyA < .01 ? '0' : skyA.toFixed(2); if (so !== skyO) { skyO = so; skyC.style.opacity = so }
      if (starsV > .01) {
        for (const s of stars) {
          const x = s.x * W, y = s.y * H, tw = .78 + .22 * Math.sin(now * .0021 * s.sp + s.ph) * Math.sin(now * .0013 + s.ph * 2)
          const a = Math.min(1, starsV * tw * (s.big ? 1 : .18 + .82 * s.z * s.z * s.z)) // a natural sky: most stars faint and fine, a few bright ("ye dots achhe nahi lag rahe")
          if (a < .01) continue
          ctx.fillStyle = `rgba(${s.c[0]},${s.c[1]},${s.c[2]},${a.toFixed(3)})`
          if (zoomV > .02) { // warp (2026-11-24, user: "ye dot line wali bni hai, ese behtr"): the stars really fly out from the centre,
            // faster toward the edges, each with a tail that fades to nothing — instead of fixed dashes that read as a dotted pattern
            const dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy) || 1, R = Math.max(W, H) * .5
            const grow = 1 + zoomV * (.0009 + s.z * .0016) * dt // perspective: the further out, the faster
            s.x = (cx + dx * grow) / W; s.y = (cy + dy * grow) / H
            s.fin = Math.min(1, (s.fin ?? 1) + dt / 400)
            if (s.x < -.05 || s.x > 1.05 || s.y < -.05 || s.y > 1.05) { // gone off screen: born again near the middle
              const ang = Math.random() * 6.283, r = (.04 + Math.random() * .22) * R
              s.x = (cx + Math.cos(ang) * r) / W; s.y = (cy + Math.sin(ang) * r) / H; s.fin = 0
            }
            const len = zoomV * (8 + 150 * s.z * s.z) * (d / R), hx = s.x * W, hy = s.y * H
            const tx = hx - dx / d * len, ty = hy - dy / d * len, aa = a * s.fin * Math.min(1, .35 + d / R)
            const gr = ctx.createLinearGradient(tx, ty, hx, hy)
            gr.addColorStop(0, `rgba(${s.c[0]},${s.c[1]},${s.c[2]},0)`); gr.addColorStop(1, `rgba(${s.c[0]},${s.c[1]},${s.c[2]},${aa.toFixed(3)})`)
            ctx.strokeStyle = gr; ctx.lineWidth = .5 + s.z * 1.1; ctx.lineCap = 'round'
            ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(hx, hy); ctx.stroke()
          } else if (s.big || s.mid) {
            // the brightest stars: a crisp point with a soft halo that breathes a little
            const gs = 4 + s.z * 4 + 1.2 * Math.sin(now * .0017 * s.sp + s.ph)
            ctx.globalCompositeOperation = 'lighter'
            ctx.fillRect(x - .9, y - .9, 1.8, 1.8)
            ctx.globalAlpha = Math.min(1, a * .6); ctx.drawImage(GLOW, x - gs, y - gs, gs * 2, gs * 2)
            ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'
          } else { const r = .5 + s.z * s.z * .9; ctx.fillRect(x - r / 2, y - r / 2, r, r) }
        }
      }
      if (dustV > .01) {
        ctx.globalCompositeOperation = dayOn ? 'source-over' : 'lighter' // on the pastel stage the bokeh is soft discs, not light
        const k = 1 - pullV * .92, gx = cx + (sunX - cx) * pullV, gy = cy + (sunY - cy) * pullV
        for (const d of dust) {
          d.z -= (.00003 + zoomV * .00025) * dt
          if (d.z < .22) { d.z = 1.25; d.x = rnd() * 2 - 1; d.y = rnd() * 2 - 1 }
          const f = .9 / d.z, depth = 1.3 - d.z
          const x = gx + (d.x * k + par.x * .2 * depth) * W * .55 * f, y = gy + (d.y * k + par.y * .14 * depth + Math.sin(now * .0003 * d.sp + d.ph) * .03) * H * .55 * f
          if (x < -40 || x > W + 40 || y < -40 || y > H + 40) continue
          const edge = Math.min(1, (1.25 - d.z) / .2, (d.z - .22) / .18)
          const a = dustV * edge * (.07 + .2 * Math.abs(Math.sin(now * .0009 * d.sp + d.ph))) * (1 + pullV * 1.6) * (dayOn ? .7 : 1)
          if (a < .01) continue
          const s = d.r * (1.4 + depth * 5)
          const c = d.c.join(','), g = ctx.createRadialGradient(x, y, 0, x, y, s); g.addColorStop(0, `rgba(${c},${Math.min(1, a).toFixed(3)})`); g.addColorStop(.5, `rgba(${c},${(a * .45).toFixed(3)})`); g.addColorStop(1, `rgba(${c},0)`)
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, s, 0, 6.283); ctx.fill()
        }
        ctx.globalCompositeOperation = 'source-over'
      }
      if (ptr.in && !ptr.hot && lifted) { // the pointer carries a little light over the stage
        ctx.globalCompositeOperation = 'lighter'
        const g = ctx.createRadialGradient(ptr.x, ptr.y, 0, ptr.x, ptr.y, 170); g.addColorStop(0, 'rgba(255,220,180,.09)'); g.addColorStop(.5, 'rgba(216,204,244,.035)'); g.addColorStop(1, 'rgba(216,204,244,0)')
        ctx.fillStyle = g; ctx.fillRect(ptr.x - 170, ptr.y - 170, 340, 340)
        ctx.globalCompositeOperation = 'source-over'
      }
    }

    const dock = () => {
      docked = true
      const logo = Q.logo, b = brandEl()
      if (!logo || !b) { html.classList.remove('hx-intro'); return afterDock() }
      const lr = logo.getBoundingClientRect(), br = b.getBoundingClientRect(), hr = root.getBoundingClientRect()
      const sc = br.height / lr.height
      // from here the rays fan out from the nav mark: the light has become the logo
      root.style.setProperty('--sx', (br.left - hr.left + br.height / 2).toFixed(1) + 'px'); root.style.setProperty('--sy', (br.top - hr.top + br.height / 2).toFixed(1) + 'px')
      const dx = (br.left + br.width / 2) - (lr.left + lr.width / 2), dy = (br.top + br.height / 2) - (lr.top + lr.height / 2)
      logo.style.transformOrigin = '50% 50%'
      logo.animate([{ transform: 'translate(-50%,-50%) translate(0px,0px) scale(1)' }, { transform: `translate(-50%,-50%) translate(${dx.toFixed(1)}px,${dy.toFixed(1)}px) scale(${sc.toFixed(4)})` }], { duration: T.dock, easing: 'cubic-bezier(.7,0,.2,1)', fill: 'forwards' })
        .finished.then(() => { if (!on) return; html.classList.remove('hx-intro'); logo.style.opacity = 0; afterDock() }).catch(() => {})
    }
    const afterDock = async () => {
      setStage('live'); lightsOn()
      // the lead: from the docked logo down the rail to the headline and button, then across to the film ring
      const b = brandEl().getBoundingClientRect(), logo = { x: b.left + b.height / 2, y: b.top + b.height / 2, size: b.height }
      const q = (s) => root.querySelector(s)?.getBoundingClientRect()
      const h1 = q('.vf-h'), cta = q('.vf-btn'), ring = q('.sk-ring') || q('.pl-meta') || cta
      const mobile = W <= 860, railX = mobile ? 12 : logo.x
      const yCta = cta.top + cta.height / 2, ringCX = ring.left + ring.width / 2, ringMidY = ring.top + ring.height / 2, ringLow = ring.bottom + 18
      const y1 = logo.y + logo.size / 2 + 16
      const pts = [{ x: logo.x, y: logo.y }, { x: logo.x, y: y1 }, { x: railX, y: y1 }]
      let ringHit
      if (mobile) { // the ring sits above the words: visit it first, loop round it, then down the rail past the words
        ringHit = { x: ringCX, y: ringMidY }
        pts.push({ x: railX, y: ringMidY }, { x: ringCX, y: ringMidY }, { x: ringCX, y: ringLow }, { x: railX, y: ringLow }, { x: railX, y: yCta })
      } else {
        ringHit = { x: ringCX, y: ringLow }
        pts.push({ x: railX, y: yCta }, { x: ringCX, y: yCta }, { x: ringCX, y: ringLow })
      }
      const S = svg.current; S.setAttribute('viewBox', `0 0 ${W} ${H}`)
      const d = pathFrom(pts); [trace, comet, cometGlow].forEach((r) => r.current.setAttribute('d', d))
      const L = trace.current.getTotalLength(); trace.current.style.strokeDasharray = L; trace.current.style.strokeDashoffset = L
      S.classList.add('on')
      // waypoints are resolved to a distance along the path up front, so a slow frame can never jump past one
      const onRail = (pt) => Math.abs(pt.x - railX) < 2
      const tests = {
        h1: (pt) => onRail(pt) && pt.y >= h1.top + h1.height * .3 && pt.y < yCta,
        cta: (pt) => onRail(pt) && pt.y >= yCta - 18, // just before the rounded corner leaves the rail
        ring: (pt) => Math.hypot(pt.x - ringHit.x, pt.y - ringHit.y) < 4,
      }
      const SAMPLES = 900, P = Array.from({ length: SAMPLES }, (_, i) => trace.current.getPointAtLength(L * i / (SAMPLES - 1)))
      const lenOf = (test) => { const i = P.findIndex(test); return i < 0 ? L : L * i / (SAMPLES - 1) }
      const wps = Object.entries(tests).map(([k, test]) => [k, lenOf(test)])
      const done = new Set(), tl = performance.now()
      leadRun = (now) => {
        const t = Math.min(1, (now - tl) / LEAD_MS), e = easeInOut(t), len = e * L, pt = trace.current.getPointAtLength(len)
        trace.current.style.strokeDashoffset = L - len
        const tail = Math.min(150, len)
        for (const r of [comet, cometGlow]) { r.current.style.strokeDasharray = `${tail} ${L}`; r.current.style.strokeDashoffset = -(len - tail) }
        lead.current.setAttribute('cx', pt.x); lead.current.setAttribute('cy', pt.y); halo.current.setAttribute('cx', pt.x); halo.current.setAttribute('cy', pt.y)
        for (const [k, at] of wps) if (!done.has(k) && (t >= 1 || len >= at)) { done.add(k); setSeen((s) => ({ ...s, [k]: true })) }
        if (t >= 1) { leadRun = null; setStage('settled'); unlock(); S.classList.add('done'); setTimeout(() => S.classList.add('gone'), 1000) }
      }
    }

    const frame = (now) => {
      raf = requestAnimationFrame(frame)
      if (!t0) t0 = now
      const dt = Math.min(now - last || 16, 50); last = now
      let t = now - t0
      if (PIN != null) t = PIN // ?hx_t=<ms> freezes the ident at that moment (for checking frames)
      if (st.current.skip && !st.current.skipAt) st.current.skipAt = t
      if (st.current.skipAt) t = Math.max(t, M.dock[0] + (t - st.current.skipAt)) // skip: jump to the dock
      par.x += ((ptr.in ? (ptr.x / W - .5) : 0) - par.x) * .04; par.y += ((ptr.in ? (ptr.y / H - .5) : 0) - par.y) * .04

      if (!ended) {
        const ap = u(t, M.approach[0], M.approach[1]), cl = u(t, M.clouds[0], M.clouds[1]), co = u(t, M.corridor[0], M.corridor[1]), cvg = u(t, M.converge[0] - 300, M.converge[1])
        // space + approach: the globe grows toward the camera, stars streak; after the clouds the stars come back and streak again through the corridor
        // the studio lights: up as we leave the clouds, down before the logo
        const brightV = SHOW_CORRIDOR || SHARDS_3D ? 0 : smooth(u(t, M.corridor[0] - 350, M.corridor[0] + 250)) * (1 - smooth(u(t, M.corridor[1] - 800, M.corridor[1] - 100)))
        set('bright', 'opacity', brightV.toFixed(3))
        shardsRef.current?.update(t, M.corridor[0], M.corridor[1])
        starsV = Math.max(u(t, 0, 900) * (1 - cl), .8 * u(t, M.clouds[0] + 150, M.corridor[0] + 500)) * (1 - brightV)
        // space: a pastel nebula breathes behind the stars and two meteors cross
        set('nebula', 'opacity', (u(t, 150, 1100) * (1 - u(t, M.approach[0] + 600, M.clouds[0]))).toFixed(3))
        if (Q.meteors) for (const [k, s0] of [[0, 450], [1, 1000]]) { const m = Q.meteors.children[k]; if (!m) continue; const life = u(t, s0, s0 + 650); m.style.opacity = (Math.sin(life * Math.PI) * .9).toFixed(3); m.style.transform = `translate(${(life * 34 - 17).toFixed(1)}vw,${(life * 14 - 7).toFixed(1)}vh) rotate(-22deg)` }
        zoomV = Math.max(easeIn(ap) * (1 - cl), .5 * u(t, M.corridor[0] - 100, M.corridor[0] + 500) * (1 - u(t, M.corridor[1] - 200, M.converge[0] + 500)))
        const gs = .34 + easeIn(ap) * 3.4, gop = u(t, 700, 1500) * (1 - u(t, M.approach[1] - 200, M.clouds[0] + 150))
        set('globe', 'transform', `translate(-50%,-50%) scale(${gs.toFixed(3)}) rotate(${(-5 + ap * 7).toFixed(2)}deg)`); set('globe', 'opacity', gop.toFixed(3))
        Q.globe?.style.setProperty('--rim', u(t, M.approach[0] + 300, M.approach[1] - 300).toFixed(3)) // the sunrise rim comes up as we close in
        hazeV = smooth(u(t, M.approach[1] - 800, M.approach[1] - 100)) * (1 - smooth(u(t, M.clouds[0] - 100, M.clouds[1] + 100))) // a short swell of light at the rim, not a held fog
        set('haze', 'opacity', (hazeV * .82).toFixed(3))
        if (Q.clouds) for (let i = 0; i < clouds.length; i++) {
          const c = clouds[i], n = Q.clouds.children[i]; if (!n) continue
          const life = u(t, c.start, c.start + 900), e = easeIn(life), s = .45 + e * 3.4, k = e * 1.6, op = Math.sin(life * Math.PI) * .8
          n.style.opacity = op.toFixed(3); n.style.transform = `translate(calc(-50% + ${((c.x - 50) * k).toFixed(2)}vw),calc(-50% + ${((c.y - 50) * k).toFixed(2)}vh)) scale(${s.toFixed(3)})`
        }
        // out of the clouds into the night stage: dust field up, the corridor flies past
        if (t >= M.corridor[0] - 250 && !lifted) { lifted = true; setLift(true) }
        dustV = u(t, M.corridor[0] - 200, M.corridor[0] + 1000)
        const camZ = (.35 * co + .65 * co * co) * CAM_TOTAL // gentle start, then the flight keeps gathering speed
        const corrOn = t >= M.corridor[0] - 300 && t <= M.converge[0] + 200 // up while the clouds part: the first film waits in the middle
        if (Q.corridor) Q.corridor.classList.toggle('on', corrOn)
        if (Q.cam) Q.cam.style.transform = `translateZ(${camZ.toFixed(1)}px) rotateZ(${(Math.sin(co * Math.PI * 2) * 1.6 - par.x * 2).toFixed(2)}deg) translate(${(-par.x * 30).toFixed(1)}px,${(-par.y * 20).toFixed(1)}px)`
        if (corrOn) for (let i = 0; i < flyEls.length; i++) {
          const depth = -(FLY[i].z + camZ) // distance in front of the camera; negative once it has flown past
          const op = clamp01((3400 - depth) / 1100) * clamp01((depth + 500) / 700) * (1 - u(t, M.converge[0] - 200, M.converge[0] + 200))
          flyEls[i].style.opacity = op.toFixed(3); flyEls[i].style.setProperty('--dim', (clamp01((depth - 500) / 2600) * .75).toFixed(3))
        }
        if (corrOn) for (let i = 0; i < thruEls.length; i++) { // the films we fly straight through: each fills the view, then a flash and we are out the other side
          const depth = -(THRUS[i].z + camZ)
          const op = clamp01((3400 - depth) / 1100) * (depth > 90 ? 1 : 0) * (1 - u(t, M.converge[0] - 200, M.converge[0] + 200))
          thruEls[i].style.opacity = op.toFixed(3); thruEls[i].style.setProperty('--dim', (clamp01((depth - 500) / 2600) * .75).toFixed(3))
        }
        if (corrOn && !thruPlaying) { thruPlaying = true; thruEls.forEach((e) => e.querySelector('video')?.play().catch(() => {})) }
        if (!corrOn && thruPlaying && t > M.corridor[1]) { thruPlaying = false; thruEls.forEach((e) => e.querySelector('video')?.pause()) }
        let passFlash = 0; if (SHOW_CORRIDOR) for (const h of THRUS) { const tp = M.corridor[0] + h.co * T.corridor; passFlash = Math.max(passFlash, Math.sin(Math.PI * u(t, tp - 80, tp + 260)) * .9) }
        // converge: the dust gathers into one point that flares into the mark; the light then glides into the logo's mark
        pullV = smooth(cvg) * (1 - smooth(u(t, M.logo[0], M.logo[1])))
        const sunV = easeOut(cvg), gl = easeInOut(u(t, M.logo[0] - 200, M.logo[0] + 300))
        const logoR = Q.logo?.getBoundingClientRect(), hr = root.getBoundingClientRect()
        const markX = logoR ? logoR.left - hr.left + logoR.height / 2 : W / 2, markY = logoR ? logoR.top - hr.top + logoR.height / 2 : H * .44, markS = logoR ? logoR.height : 120
        const sx = W / 2 + (markX - W / 2) * gl, sy = H * .47 + (markY - H * .47) * gl
        sunX = sx; sunY = sy
        const ss = (.12 + .88 * sunV) * (1 + (markS / 150 - 1) * gl)
        if (!docked) {
          set('sun', 'opacity', u(t, M.converge[0] - 100, M.converge[0] + 250).toFixed(3)); set('sun', 'transform', `translate(-50%,-50%) scale(${ss.toFixed(3)})`); set('sun', 'left', sx.toFixed(1) + 'px'); set('sun', 'top', sy.toFixed(1) + 'px')
          root.style.setProperty('--sx', sx.toFixed(1) + 'px'); root.style.setProperty('--sy', sy.toFixed(1) + 'px')
          raysV = sunV * .95; set('rays', 'opacity', raysV.toFixed(3))
          set('flash', 'opacity', Math.max(Math.sin(Math.PI * u(t, M.converge[1] - 200, M.converge[1] + 260)) * .6, passFlash).toFixed(3))
          set('logo', 'opacity', u(t, M.logo[0], M.logo[1]).toFixed(3))
        }
        if (t >= M.logo[0] && Q.logo && !Q.logo.classList.contains('sk-lit')) Q.logo.classList.add('sk-lit')
        set('skip', 'opacity', (u(t, 1200, 1800) * (1 - u(t, M.hold[1] - 200, M.hold[1]))).toFixed(3))
        if (t >= M.dock[0] && !docked) { dock(); set('sun', 'transition', 'opacity .6s'); set('sun', 'opacity', 0) }
        if (t >= M.end + 50) { ended = true; ['globe', 'haze', 'clouds', 'skip', 'corridor', 'flash', 'nebula', 'meteors', 'shards'].forEach((k) => Q[k] && (Q[k].style.display = 'none')) }
      } else {
        // the night stage: stars, the dust field, rays from the logo
        const k = Math.min(1, dt * .0012)
        starsV += ((dayOn ? 0 : CLEAN_STAGE ? .45 : .8) - starsV) * k; zoomV += (0 - zoomV) * k; pullV += (0 - pullV) * k; dustV = Math.min(1, dustV + dt / 1600)
        raysV += ((dayOn || CLEAN_STAGE ? 0 : SETTLED_RIBBON ? .28 : .6) - raysV) * k; set('rays', 'opacity', raysV.toFixed(3))
        // lights on: the same greige studio + rainbow arcs as the glass act
        brightS += ((dayOn ? 1 : 0) - brightS) * Math.min(1, dt * .0016); set('bright', 'opacity', brightS.toFixed(3))
      }
      // the film ring: resting spin (slower under the pointer), drag inertia eases back to it; the card facing the
      // camera is lit, plays its clip and names the headline's amber word
      root.style.setProperty('--mx', par.x.toFixed(3)); root.style.setProperty('--my', par.y.toFixed(3)) // pointer parallax for the copy
      if (Q.orbit) {
        const auto = SPIN / 1000 * (hoverRing && !drag ? .25 : 1)
        // the ring only starts turning once the lead has lit it, from rest, so film 01 faces the camera as the words appear
        if (target != null) { spin += (target - spin) * Math.min(1, dt * .005); vel = 0; if (Math.abs(target - spin) < .15) { spin = target; target = null } }
        else if (!drag && ringEl?.classList.contains('in')) { const want = now < holdUntil ? 0 : auto; vel += (want - vel) * Math.min(1, dt * .0015); spin += vel * dt }
        // a spark runs along the film's lower edge, round and round, with its reflection
        if (sparks.length && ringEl?.classList.contains('in')) {
          const r = (ringCards[0].offsetWidth || 200) * 1.42 + 10, phi = -(now / 1000) * 42
          for (const [k, el] of sparks) el.style.transform = `rotateY(${(phi - k * 2.6).toFixed(2)}deg) translateZ(${r}px)`
        }
        // a camera on a slider: the tilt, a slow dolly and the eye point all breathe, on top of the pointer parallax
        const ts = now / 1000, tilt = -12 - par.y * 7 + 2.5 * Math.sin(ts * .23), dz = 30 * Math.sin(ts * .19), px = par.x * 22 + 10 * Math.sin(ts * .13), py = par.y * 14 + 6 * Math.sin(ts * .29)
        Q.orbit.style.transform = `translate3d(${px.toFixed(1)}px,${py.toFixed(1)}px,${dz.toFixed(1)}px) rotateX(${tilt.toFixed(2)}deg) rotateY(${spin.toFixed(2)}deg)`
        ringEl.style.perspectiveOrigin = `${(50 + 6 * Math.sin(ts * .15)).toFixed(2)}% ${(36 + 3 * Math.sin(ts * .11)).toFixed(2)}%`
        if (Q.mirror) { // the floor sits at the lowest edge of the nearest card: half a card height plus what the tilt pushes it down
          const cw = ringCards[0].offsetWidth || 200, floor = cw * .28125 * Math.cos(tilt * Math.PI / 180) + cw * 1.42 * Math.sin(-tilt * Math.PI / 180)
          Q.mirror.style.transform = `translate3d(${px.toFixed(1)}px,${(py + 2 * floor).toFixed(1)}px,${dz.toFixed(1)}px) scaleY(-1) rotateX(${tilt.toFixed(2)}deg) rotateY(${spin.toFixed(2)}deg)`
        }
        let best = -2, bi = 0
        for (let i = 0; i < ringCards.length; i++) {
          const c = Math.cos((i * 360 / N + spin) * Math.PI / 180)
          ringCards[i].style.setProperty('--lit', (.18 + .82 * (c + 1) / 2).toFixed(3))
          if (mirrorCards[i]) mirrorCards[i].style.setProperty('--mf', (.06 + .4 * Math.pow((c + 1) / 2, 2)).toFixed(3))
          if (c > best) { best = c; bi = i }
        }
        // the front film's light spills over the whole stage: a tiny canvas, blended frame over frame, scaled up by CSS
        if (ambCtx && frontI >= 0 && (ambN++ & 1)) {
          const fc = ringCards[frontI], v = fc.querySelector('video'), src = v && v.readyState >= 2 ? v : fc.querySelector('img')
          if (src && (src.videoWidth || src.naturalWidth)) { const aw = Q.amb.width, ah = Q.amb.height, sw = src.videoWidth || src.naturalWidth, sh = src.videoHeight || src.naturalHeight, k = Math.max(aw / sw, ah / sh) * 1.15; ambCtx.globalAlpha = .1; ambCtx.filter = 'blur(3px) saturate(1.7)'; ambCtx.drawImage(src, (aw - sw * k) / 2, (ah - sh * k) / 2, sw * k, sh * k) }
        }
        if (bi !== frontI) {
          if (frontI >= 0) { ringCards[frontI].classList.remove('front'); mirrorCards[frontI]?.classList.remove('front'); ringCards[frontI].querySelector('video')?.pause() }
          frontI = bi; const fc = ringCards[bi]; fc.classList.add('front'); mirrorCards[bi]?.classList.add('front')
          const v = fc.querySelector('video'); if (v && !SETTLED_RIBBON) { if (!v.getAttribute('src')) v.src = v.dataset.src; v.play().catch(() => {}) } // the ribbon plays the film now
          setWi(bi); st.current.wi = bi
        }
      }
      rayA += dt * .0018; set('rays', 'transform', `translate(-50%,-50%) rotate(${rayA.toFixed(2)}deg)`)
      drawCanvas(now, dt)
      if (glRef.current) { // the glass comes in with the studio lights
        st.current.g3A = (st.current.g3A || 0) + ((dayOn ? 1 : 0) - (st.current.g3A || 0)) * Math.min(1, dt * .0014)
        glRef.current.update(now)
      }
      if (tunnelRef.current) { // the tunnel opens as the logo docks
        st.current.tnA = (st.current.tnA || 0) + ((ended || docked ? 1 : 0) - (st.current.tnA || 0)) * Math.min(1, dt * .0012)
        tunnelRef.current.update(now)
      }
      if (ribbonRef.current) { // fades in once the lead has lit the ring's place
        const want = ended && ringEl?.classList.contains('in') ? 1 : 0
        st.current.ribA = (st.current.ribA || 0) + (want - (st.current.ribA || 0)) * Math.min(1, dt * .002)
        ribbonRef.current.update(now, 0, 0)
      }
      if (leadRun) leadRun(now)
      const f = Q.focus
      if (f) { f.style.opacity = ptr.in ? 1 : 0; f.style.transform = `translate3d(${ptr.x.toFixed(1)}px,${ptr.y.toFixed(1)}px,0) translate(-50%,-50%) scale(${ptr.hot ? .72 : 1})`; f.classList.toggle('hot', ptr.hot) }
      const p = +clamp01(scrollY / (H * .9)).toFixed(3); root.style.setProperty('--p', p)
    }
    raf = requestAnimationFrame(frame)
    const btn = root.querySelector('.vf-btn')
    const magnet = (x, y) => { // the button leans toward a pointer that comes near
      if (!btn) return
      const b = btn.getBoundingClientRect(), r = root.getBoundingClientRect(), dx = x - (b.left - r.left + b.width / 2), dy = y - (b.top - r.top + b.height / 2), d = Math.hypot(dx, dy)
      const k = d < 120 ? .3 : 0; btn.style.setProperty('--bx', (dx * k).toFixed(1) + 'px'); btn.style.setProperty('--by', (dy * k).toFixed(1) + 'px')
    }
    const move = (e) => { const r = root.getBoundingClientRect(); ptr.x = e.clientX - r.left; ptr.y = e.clientY - r.top; ptr.in = true; ptr.hot = !!e.target.closest?.('a, button'); magnet(ptr.x, ptr.y) }
    const leave = () => { ptr.in = false; ptr.hot = false; magnet(-1e4, -1e4) }
    root.addEventListener('pointermove', move); root.addEventListener('pointerleave', leave)
    const io = new IntersectionObserver(([e]) => { cancelAnimationFrame(raf); raf = 0; if (e.isIntersecting) { last = 0; raf = requestAnimationFrame(frame) } }, { threshold: 0 })
    io.observe(root)
    return () => { on = false; cancelAnimationFrame(raf); clearTimeout(safety); ro.disconnect(); skyC.remove(); io.disconnect(); root.removeEventListener('pointermove', move); root.removeEventListener('pointerleave', leave); html.classList.remove('hx-intro'); html.classList.remove('hx-day'); unlock()
      if (ringEl) { ringEl.removeEventListener('pointerdown', rDown); ringEl.removeEventListener('pointermove', rMove); ringEl.removeEventListener('pointerup', rUp); ringEl.removeEventListener('pointercancel', rUp); ringEl.removeEventListener('click', rClick, true); ringEl.removeEventListener('pointerenter', rEnter); ringEl.removeEventListener('pointerleave', rLeave) } }
  }, [])

  if (SHOW_REEL) return <section id="call" className="hx has-reel"><FilmReel /></section>

  const In = (k) => (seen[k] ? ' in' : '')
  const Pill = ({ film, live, k }) => (
    <button type="button" className={'pill pill-' + k} onClick={() => setPlay({ title: film.title, sub: film.word, src: film.clip, poster: film.poster })}
            onMouseEnter={() => setPillHold(true)} onMouseLeave={() => setPillHold(false)} aria-label={`Play ${film.title}`}>
      <span className="pill-in" key={film.title}>
        <img src={film.poster} alt="" decoding="async" />
        {live && <video src={film.clip} poster={film.poster} muted loop playsInline autoPlay preload="auto" />}
      </span>
    </button>
  )
  const word = FILMS[wi].word
  return (
    <>
      <svg ref={svg} className="ld-path" aria-hidden="true">
        <path ref={trace} className="ld-trace" /><path ref={cometGlow} className="ld-cometglow" /><path ref={comet} className="ld-comet" />
        <circle ref={halo} className="ld-halo" r="12" /><circle ref={lead} className="ld-lead" r="4.5" />
      </svg>
      <section id="call" ref={sec} className={'hx hx-sky ' + stage + (lift ? ' lift' : '') + (day ? ' day' : '') + (SETTLED_RIBBON ? ' rbn' : '') + (CLEAN_STAGE ? ' clean' : '') + (HERO_GL ? ' gl' : '')} onClick={(e) => { if (stage === 'ident') { st.current.skip = true; return } if (glRef.current && stage === 'settled' && !e.target.closest('a,button')) { const f = FILMS[wi]; setPlay({ title: f.title, sub: f.word, src: f.clip, poster: f.poster }); return } if (tunnelRef.current && !e.target.closest('a,button')) { const r = e.currentTarget.getBoundingClientRect(); tunnelRef.current.click(e.clientX - r.left, e.clientY - r.top) } }}>
        <span className="sk-sky sk-night" aria-hidden="true"></span>
        <span className="sk-sky sk-stage" aria-hidden="true"></span>
        <span className="sk-sky sk-day" aria-hidden="true"></span>
        {CLEAN_STAGE && <span className="sk-sky sk-clean" aria-hidden="true"></span>}
        <span ref={el('nebula')} className="sk-nebula" aria-hidden="true"></span>
        <span className="sk-aurora" aria-hidden="true"></span>
        <canvas ref={el('amb')} className="sk-ambient" width="96" height="54" aria-hidden="true"></canvas>
        <canvas ref={cv} className="sk-canvas" aria-hidden="true"></canvas>

        {/* the earth: the site's own dotted globe */}
        <div ref={el('globe')} className="sk-globe" aria-hidden="true">
          <svg viewBox="0 0 100 100">
            <defs><radialGradient id="sk-gb" cx="38%" cy="34%" r="70%"><stop offset="0" stopColor="#1b3350" /><stop offset=".7" stopColor="#0a1322" /><stop offset="1" stopColor="#050912" /></radialGradient></defs>
            <circle cx="50" cy="50" r="29.6" fill="url(#sk-gb)" />
            {LAND.map((l) => <path key={l.w} className="sk-dots" d={l.d} strokeWidth={l.w} opacity={l.o} />)}
            <path className="sk-india" d={INDIA} />
          </svg>
        </div>
        <span ref={el('haze')} className="sk-haze" aria-hidden="true"></span>
        <span ref={el('meteors')} className="sk-meteors" aria-hidden="true"><i></i><i></i></span>
        <div ref={el('clouds')} className="sk-clouds" aria-hidden="true">
          {CLOUDS.map((c, i) => <i key={i} style={{ left: `${c.x.toFixed(1)}%`, top: `${c.y.toFixed(1)}%`, width: `${c.w}px` }}></i>)}
        </div>

        {/* the studio (warm greige, a rainbow arc) and the glass films — the corridor act since 2026-11-23 */}
        <div ref={el('bright')} className="sk-bright" aria-hidden="true"><span className="sk-rb"></span><span className="sk-rb sk-rb2"></span><span className="sk-spec"></span><span className="sk-spec sk-spec2"></span></div>
        <div ref={el('shards')} className="sk-shards" aria-hidden="true"></div>
        {HERO_GL && <div ref={el('g3')} className="sk-g3" aria-hidden="true"></div>}
        {HERO_TUNNEL && <div ref={el('tunnel')} className="sk-tunnel" aria-hidden="true"></div>}
        {/* a simple "Coming soon" board hanging on two threads from the top, swaying gently (2026-11-26) */}
        <div className="soon-hang" role="note"><i className="soon-th"></i><i className="soon-th"></i><span className="soon-board">Coming soon</span></div>
        {SETTLED_RIBBON && <div ref={el('ribbon')} className="sk-shards sk-ribbon" aria-hidden="true"></div>}

        {/* the film corridor the camera flies through (off: SHOW_CORRIDOR) */}
        {SHOW_CORRIDOR && <div ref={el('corridor')} className="sk-corridor" aria-hidden="true">
          <div ref={el('cam')} className="sk-cam">
            {CORR.map((f, i) => (
              <div key={i} className="sk-fly">
                <img src={f.poster} alt="" decoding="async" />
                <b>{two(i + 1)}</b><span>{f.title}</span>
              </div>
            ))}
            {THRUS.map((h, i) => (
              <div key={'t' + i} className="sk-fly sk-thru">
                <video src={h.film.clip} poster={h.film.poster} muted loop playsInline preload="metadata"></video>
                <b>▶</b><span>{h.film.title}</span>
              </div>
            ))}
          </div>
        </div>}

        {/* the light: rays, the gathering point, the flash, and the brand arriving */}
        <span ref={el('rays')} className="sk-rays" aria-hidden="true"></span>
        <span ref={el('sun')} className="sk-sun" aria-hidden="true"></span>
        <span ref={el('flash')} className="sk-flash" aria-hidden="true"></span>
        <img ref={el('logo')} className="sk-logo" src="/brand/lastframe-light.png" alt="" aria-hidden="true" />
        <span ref={el('skip')} className="sk-skip" aria-hidden="true">Skip ▸</span>

        {/* the hero itself */}
        <div className={'dv-copy' + (HERO_PILLS ? ' pl' : '') + (HERO_TUNNEL ? ' tn' : '')}>
          {HERO_PILLS ? (
            <h1 className={'vf-h pl-h' + In('h1')}>
              <span className="pl-row"><span className="l"><i>We cut</i></span><Pill k="a" film={FILMS[(wi + 3) % N]} /></span>
              <span className="pl-row"><Pill k="b" film={FILMS[wi]} /><span className="w"><em key={word}>{word}</em></span></span>
              <span className="pl-row"><span className="l l2"><i>that sell.</i></span><Pill k="c" film={FILMS[(wi + 5) % N]} /></span>
            </h1>
          ) : (
          <h1 className={'vf-h' + In('h1')}>
            <span className="l"><i>We cut</i></span>{' '}
            <span className="w"><em key={word}>{word}</em></span>
            <br />
            <span className="l l2"><i>that sell.</i></span>
          </h1>)}
          <div className={'vf-cta' + In('cta')}>
            <a className="vf-btn" href="#contact">Start a project</a>
          </div>
        </div>

        <span className="sk-flare" aria-hidden="true"></span>
        {HERO_PILLS && (
          <div className={'pl-stage' + In('ring')}>
          {/* the film itself, big, on the right (user: "this side showing blank"); the next two wait behind it like a deck */}
          <div className="pl-frame-wrap">
            <span className="pl-deck pl-d2" aria-hidden="true"><img src={FILMS[(wi + 2) % N].poster} alt="" /></span>
            <span className="pl-deck pl-d1" aria-hidden="true"><img src={FILMS[(wi + 1) % N].poster} alt="" /></span>
            <button type="button" className="pl-frame" onClick={() => { const f = FILMS[wi]; setPlay({ title: f.title, sub: f.word, src: f.clip, poster: f.poster }) }}
                    onMouseEnter={() => setPillHold(true)} onMouseLeave={() => setPillHold(false)} aria-label={`Play ${FILMS[wi].title}`}>
              <span className="pl-frame-in" key={wi}>
                <img src={FILMS[wi].poster} alt="" />
                <video src={FILMS[wi].clip} poster={FILMS[wi].poster} muted loop playsInline autoPlay preload="auto" />
              </span>
              <span className="pl-play" aria-hidden="true">▶</span>
            </button>
          </div>
          <div className={'pl-meta' + In('ring')}>
            <p className="pl-now"><b key={'n' + wi}>{two(wi + 1)}</b><span key={'t' + wi}>{FILMS[wi].title}</span></p>
            <span className="pl-bar"><i key={'p' + wi} style={{ animationDuration: PILL_MS + 'ms', animationPlayState: pillHold ? 'paused' : 'running' }}></i></span>
            <ol className="pl-count" aria-label="Films">
              {FILMS.map((f, i) => <li key={i}><button type="button" className={i === wi ? 'on' : ''} onClick={() => setWi(i)} aria-label={`Show ${f.title}`} aria-current={i === wi}>{two(i + 1)}</button></li>)}
            </ol>
          </div>
          </div>
        )}
        {/* the film ring: the eight films orbit in the light; drag to spin, the front one plays, click one to watch it */}
        {!HERO_PILLS && !HERO_TUNNEL && !HERO_GL && <div ref={el('ring')} className={'sk-ring' + In('ring')}>
          <div ref={el('orbit')} className="sk-orbit">
            {FILMS.map((f, i) => (
              <a key={i} href="#work" className="sk-card" data-i={i} style={{ '--a': (i * 360 / N) + 'deg', '--i': i, '--pc': PASTEL_CSS[i % PASTEL_CSS.length] }} aria-label={`Play ${f.title}`} draggable="false">
                <span className="face">
                  <img src={f.poster} alt="" loading="lazy" decoding="async" draggable="false" />
                  <video data-src={f.clip} muted loop playsInline preload="none"></video>
                  <b>{two(i + 1)}</b>
                </span>
                <span className="back"><b>{two(i + 1)}</b><span>{f.title}</span></span>
              </a>
            ))}
            <span className="sk-spark" aria-hidden="true">{[0, 1, 2, 3, 4, 5].map((k) => <i key={k} data-k={k} style={{ '--k': k }}></i>)}</span>
          </div>
          {/* the glossy floor: the ring mirrored below its lowest edge, each reflection fading with its distance (--mf) */}
          <div ref={el('mirror')} className="sk-orbit sk-mirror" aria-hidden="true">
            {FILMS.map((f, i) => (
              <span key={i} className="sk-card sk-mcard" style={{ '--a': (i * 360 / N) + 'deg', '--i': i }}>
                <span className="face"><img src={f.poster} alt="" loading="lazy" decoding="async" draggable="false" /></span>
              </span>
            ))}
            <span className="sk-spark sk-spark-m" aria-hidden="true">{[0, 1, 2, 3, 4, 5].map((k) => <i key={k} data-k={k} style={{ '--k': k }}></i>)}</span>
          </div>
          <span className="sk-ring-shadow" aria-hidden="true"></span>
          <p className="sk-ring-cap"><b key={'n' + wi}>{two(wi + 1)}</b><span key={'t' + wi}>{FILMS[wi].title}</span></p>
          <ol className="sk-count" aria-label="Films">
            {FILMS.map((f, i) => <li key={i} className={i === wi ? 'on' : ''}><button type="button" onClick={() => st.current.goTo?.(i)} aria-label={`Show ${f.title}`} aria-current={i === wi}>{two(i + 1)}</button></li>)}
          </ol>
        </div>}

        <span ref={el('focus')} className="vf-focus" aria-hidden="true"><i></i><i></i><i></i><i></i><em>AF</em></span>
        <div className="hx-grain" aria-hidden="true"></div>
      </section>
      <Lightbox item={play} onClose={() => setPlay(null)} />
    </>
  )
}
