// "Films in every shape" stage (2026-11-23, replaces the WebGL strip of ribbon.js, which rendered black streaky frames on the
// user's own Chrome: its films went through hidden 1px <video>s into GL textures). Five screens, one per delivery shape, each at
// its true aspect ratio and the same area, float in the dark on a slow orbit behind the page. The chosen shape's screen flies
// out of the orbit into the open space and a projector beam (canvas, dust in the light) lands on it. Click a screen to pick it.
// The videos are real, visible elements, so the browser always decodes them. Plain CSS 3D + one small 2D canvas.
const clamp01 = (v) => Math.max(0, Math.min(1, v))
const ease = (t) => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

export function createStage(root, { shapes, getChosen, getRegion, onPick, reduce }) {
  const panels = [...root.querySelectorAll('.fs-p')]
  const beam = root.querySelector('.fs-beam'), g = beam.getContext('2d')
  const N = panels.length
  const st = panels.map((el, i) => ({ el, k: el.dataset.k, ar: +el.dataset.ar, v: el.querySelector('video'), mix: 0, from: 0, t: 1, i }))
  let W = 0, H = 0, raf = 0, running = false, spin = 0, last = 0, hover = -1
  const dust = Array.from({ length: 70 }, () => ({ u: Math.random(), w: Math.random() * 2 - 1, s: .4 + Math.random() * 1.4, ph: Math.random() * 6.28, sp: .02 + Math.random() * .05 }))
  const size = () => {
    W = root.clientWidth; H = root.clientHeight
    const r = Math.min(2, devicePixelRatio || 1) * .5 // the beam is soft: half resolution is plenty
    beam.width = Math.max(2, Math.round(W * r)); beam.height = Math.max(2, Math.round(H * r)); g.setTransform(r, 0, 0, r, 0, 0)
    const A = Math.min(W * W * .05, H * H * .16, 150000) // the same area for every shape
    for (const p of st) { p.w = Math.sqrt(A * p.ar); p.h = Math.sqrt(A / p.ar); p.el.style.width = p.w + 'px'; p.el.style.height = p.h + 'px' }
  }
  const ro = new ResizeObserver(size); ro.observe(root); size()

  // orbit pose (behind the page) and front pose (in the open region)
  // the others circle BEHIND the chosen screen, round the open region, so they never sit on the heading or the chips
  let R = null
  const orbitPose = (p, ts) => {
    const stacked = W < 940 // phones: a tighter, nearer ring, or the screens shrink to stamps
    const a = spin + (p.i / N) * Math.PI * 2, rx = Math.max(R.w * (stacked ? .5 : .62), 160)
    const x = R.x + R.w / 2 + Math.sin(a) * rx, z = (stacked ? -380 : -760) + Math.cos(a) * (stacked ? 200 : 360)
    const y = R.y + R.h * (p.i % 2 ? .4 : .62) + Math.sin(ts * .0006 + p.i * 1.7) * 12
    return { x, y, z, ry: -Math.sin(a) * 30, s: 1 }
  }
  const frontPose = (p, ts) => {
    const s = Math.min((R.w * .9) / p.w, (R.h * .86) / p.h, 2.6)
    return { x: R.x + R.w / 2, y: R.y + R.h / 2 + Math.sin(ts * .0009) * 6, z: 0, ry: 6 + Math.sin(ts * .0005) * 3, s }
  }
  const lerp = (a, b, t) => a + (b - a) * t
  let front = null
  const frame = (ts) => {
    raf = running ? requestAnimationFrame(frame) : 0
    const dt = Math.min(ts - last || 16, 50); last = ts
    if (!reduce) spin += dt * .00007 * (hover >= 0 ? .3 : 1)
    const chosen = getChosen()
    R = getRegion() || { x: W * .1, y: H * .5, w: W * .4, h: H * .4 }
    front = null
    for (const p of st) {
      const want = p.k === chosen ? 1 : 0
      p.mix += (want - p.mix) * Math.min(1, dt * (reduce ? 1 : .0032))
      const m = ease(clamp01(p.mix)), o = orbitPose(p, ts), f = m > 0.001 ? frontPose(p, ts) : o
      const x = lerp(o.x, f.x, m), y = lerp(o.y, f.y, m), z = lerp(o.z, f.z, m), ry = lerp(o.ry, f.ry, m), s = lerp(o.s, f.s, m)
      // arc the flight up toward the camera so it never cuts through the others
      const lift = Math.sin(m * Math.PI) * 220
      p.el.style.transform = `translate3d(${(x - p.w / 2).toFixed(1)}px,${(y - p.h / 2).toFixed(1)}px,${(z + lift).toFixed(1)}px) rotateY(${ry.toFixed(2)}deg) scale(${s.toFixed(3)})`
      const lit = Math.max(m, hover === p.i ? .55 : 0)
      p.el.style.setProperty('--lit', lit.toFixed(3))
      p.el.style.zIndex = String(Math.round(m * 10 + (z + 2000) / 400))
      if (m > .5) front = p
      // only the screen in the light plays (one decoder on weak machines); the rest hold their poster still
      const shouldPlay = running && !reduce && (want === 1 || hover === p.i)
      if (p.v && shouldPlay && p.v.paused) p.v.play().catch(() => {})
      else if (p.v && !shouldPlay && !p.v.paused) p.v.pause()
    }
    drawBeam(ts)
  }
  const drawBeam = (ts) => {
    g.clearRect(0, 0, W, H)
    if (!front || front.mix < .6) return
    const r = front.el.getBoundingClientRect(), b = root.getBoundingClientRect()
    const L = r.left - b.left, T = r.top - b.top, Rr = L + r.width, B = T + r.height
    const stacked = W < 940
    const P = stacked ? { x: W * 1.02, y: T - 160 } : { x: W * .8, y: -H * .06 }
    const a = clamp01((front.mix - .6) / .4) * (.85 + Math.sin(ts * .011) * .05 + Math.sin(ts * .037) * .03) // projector flicker
    // the cone: from the lens to the far corners of the screen
    const corners = [[L, T], [Rr, T], [Rr, B], [L, B]]
    const ang = corners.map(([x, y]) => Math.atan2(y - P.y, x - P.x))
    let i0 = 0, i1 = 0; ang.forEach((v, i) => { if (v < ang[i0]) i0 = i; if (v > ang[i1]) i1 = i })
    const gr = g.createLinearGradient(P.x, P.y, (L + Rr) / 2, (T + B) / 2)
    gr.addColorStop(0, `rgba(255,236,200,${.34 * a})`); gr.addColorStop(.55, `rgba(255,214,150,${.1 * a})`); gr.addColorStop(1, `rgba(255,200,120,${.06 * a})`)
    g.save(); g.beginPath(); g.moveTo(P.x, P.y); g.lineTo(...corners[i0]); g.lineTo(...corners[i1]); g.closePath(); g.fillStyle = gr; g.fill()
    g.clip()
    // dust in the light
    const mx = (L + Rr) / 2, my = (T + B) / 2, half = Math.hypot(Rr - L, B - T) / 2
    for (const d of dust) {
      d.u = (d.u + d.sp * .004) % 1
      const u = d.u, x = P.x + (mx - P.x) * u + Math.sin(ts * .0004 + d.ph) * 8, y = P.y + (my - P.y) * u
      const nx = -(my - P.y), ny = mx - P.x, nl = Math.hypot(nx, ny) || 1
      const off = d.w * half * u
      g.globalAlpha = a * .7 * Math.sin(u * Math.PI); g.fillStyle = '#FFE6B8'
      g.beginPath(); g.arc(x + nx / nl * off, y + ny / nl * off, d.s, 0, 6.283); g.fill()
    }
    g.restore(); g.globalAlpha = 1
    // the lens
    const lg = g.createRadialGradient(P.x, P.y, 0, P.x, P.y, 90)
    lg.addColorStop(0, `rgba(255,240,210,${.55 * a})`); lg.addColorStop(1, 'rgba(255,240,210,0)')
    g.fillStyle = lg; g.fillRect(P.x - 90, P.y - 90, 180, 180)
    // light spilling under the screen
    const fg = g.createRadialGradient(mx, B + 18, 0, mx, B + 18, r.width * .7)
    fg.addColorStop(0, `rgba(232,160,19,${.16 * a})`); fg.addColorStop(1, 'rgba(232,160,19,0)')
    g.fillStyle = fg; g.fillRect(mx - r.width, B - 40, r.width * 2, 140)
  }

  const onClick = (e) => { const el = e.target.closest('.fs-p'); if (el) onPick(el.dataset.k) }
  const onOver = (e) => { const el = e.target.closest('.fs-p'); hover = el ? +el.dataset.i : -1 }
  root.addEventListener('click', onClick); root.addEventListener('pointerover', onOver); root.addEventListener('pointerleave', () => { hover = -1 })
  const play = (on) => { if (!on) st.forEach((p) => p.v && p.v.pause()) } // the frame loop starts the one in the light
  return {
    start() { if (running) return; running = true; last = 0; play(true); raf = requestAnimationFrame(frame) },
    stop() { running = false; cancelAnimationFrame(raf); raf = 0; play(false) },
    destroy() { this.stop(); ro.disconnect(); root.removeEventListener('click', onClick); root.removeEventListener('pointerover', onOver) },
  }
}
