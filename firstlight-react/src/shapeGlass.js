// "Films in every shape" as glass (2026-11-23, user: the viewfinder "design aur background not looking good"). The chosen
// delivery shape is a mosaic of thick rounded glass triangles carrying its film (a real <video>, drawn into a picture canvas);
// when the shape changes the mosaic bursts apart and the shards fly in to lock into the new aspect ratio — the mirror break
// the user liked in the hero opening. The canvas covers the whole section so shards can fly past the text; the mosaic sits in
// the region the page gives it (getRegion), tilts toward the pointer and floats. One 2D canvas, the same glass recipe as shards.js.
const clamp01 = (v) => Math.max(0, Math.min(1, v))
const easeOut = (t) => 1 - Math.pow(1 - t, 3)
const easeIn = (t) => t * t * t
const D2R = Math.PI / 180
const prng = (seed) => () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let x = Math.imul(seed ^ (seed >>> 15), 1 | seed); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296 }
const rx = (p, a) => { const c = Math.cos(a), s = Math.sin(a); return [p[0], p[1] * c - p[2] * s, p[1] * s + p[2] * c] }
const ry = (p, a) => { const c = Math.cos(a), s = Math.sin(a); return [p[0] * c + p[2] * s, p[1], -p[0] * s + p[2] * c] }
const rz = (p, a) => { const c = Math.cos(a), s = Math.sin(a); return [p[0] * c - p[1] * s, p[0] * s + p[1] * c, p[2]] }
const rot = (p, x, y, z) => rx(ry(rz(p, z), y), x)

function roundPath(g, v, r) {
  const q = (a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, k = Math.min(r, l * .3) / l; return [a[0] + dx * k, a[1] + dy * k] }
  g.beginPath(); const s = q(v[0], v[1]); g.moveTo(s[0], s[1])
  for (const i of [1, 2, 0]) { const p = v[(i + 2) % 3], n = v[(i + 1) % 3], a = q(v[i], p), b = q(v[i], n); g.lineTo(a[0], a[1]); g.quadraticCurveTo(v[i][0], v[i][1], b[0], b[1]) }
  g.closePath()
}

export function createShapeGlass(host, { shapes, films, getChosen, getRegion, getPointer, reduce }) {
  const cv = document.createElement('canvas'); cv.className = 'sg-cv'; host.appendChild(cv)
  const g = cv.getContext('2d')
  let vw = 0, vh = 0
  const size = () => { vw = host.clientWidth; vh = host.clientHeight; cv.width = vw; cv.height = vh }
  const ro = new ResizeObserver(size); ro.observe(host); size()
  const pat = (w, hh, stops) => { const c = document.createElement('canvas'); c.width = w; c.height = hh; const x = c.getContext('2d'), gr = x.createLinearGradient(0, 0, w, hh); stops.forEach(([o, col]) => gr.addColorStop(o, col)); x.fillStyle = gr; x.fillRect(0, 0, w, hh); return g.createPattern(c, 'repeat') }
  const BACK = pat(420, 420, [[0, '#15171d'], [.25, '#2f8f84'], [.45, '#1c1e26'], [.65, '#6a5aa8'], [.85, '#1c1e26'], [1, '#2f8f84']])
  const GLOSS = pat(260, 260, [[0, 'rgba(255,255,255,.28)'], [.3, 'rgba(255,255,255,0)'], [.7, 'rgba(255,255,255,0)'], [1, 'rgba(255,255,255,.14)']])
  const DARK = pat(300, 300, [[0, '#2c2e36'], [.5, '#0e0f13'], [1, '#24262e']])
  // one film per shape: a <video> (2D drawImage, no GL) drawn into its picture canvas, the poster until it has a frame
  const media = {}
  for (const s of shapes) {
    const f = films[s.k], v = document.createElement('video'); v.muted = true; v.loop = true; v.playsInline = true; v.preload = 'none'; v.src = f.src
    const im = new Image(); im.src = f.src.replace('.mp4', '.jpg')
    const pic = document.createElement('canvas'); pic.width = s.ar >= 1 ? 480 : Math.round(480 * s.ar); pic.height = s.ar >= 1 ? Math.round(480 / s.ar) : 480
    media[s.k] = { v, im, pic, pg: pic.getContext('2d'), ar: s.ar, label: s.label, use: s.use, last: -1e9 }
  }
  const paint = (m, t) => {
    if (t - m.last < 66) return; m.last = t
    const src = m.v.readyState >= 2 ? m.v : (m.im.complete && m.im.naturalWidth ? m.im : null), W = m.pic.width, H = m.pic.height
    if (!src) { m.pg.fillStyle = '#26231e'; m.pg.fillRect(0, 0, W, H); return }
    const sw = src.videoWidth || src.naturalWidth, sh = src.videoHeight || src.naturalHeight, k = Math.max(W / sw, H / sh)
    m.pg.drawImage(src, (W - sw * k) / 2, (H - sh * k) / 2, sw * k, sh * k)
  }
  // a mosaic for a shape: a jittered triangle mesh over its rectangle (unit width), ~26 tiles whatever the aspect
  const mosaics = {}
  shapes.forEach((s, si) => {
    const rnd = prng(300 + si * 17), ar = s.ar, Wn = 1, Hn = 1 / ar
    const cols = Math.max(2, Math.round(Math.sqrt(13 * ar))), rows = Math.max(2, Math.round(13 / cols))
    const P = []
    for (let r = 0; r <= rows; r++) { P[r] = []; for (let c = 0; c <= cols; c++) { const ex = c === 0 || c === cols, ey = r === 0 || r === rows; P[r][c] = [c / cols * Wn + (ex ? 0 : (rnd() - .5) * .4 * Wn / cols), r / rows * Hn + (ey ? 0 : (rnd() - .5) * .4 * Hn / rows)] } }
    const tiles = []
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const a = P[r][c], b = P[r][c + 1], d = P[r + 1][c], e = P[r + 1][c + 1]
      for (const tri of ((r + c) % 2 ? [[a, b, e], [a, e, d]] : [[a, b, d], [b, e, d]])) {
        const gx = (tri[0][0] + tri[1][0] + tri[2][0]) / 3, gy = (tri[0][1] + tri[1][1] + tri[2][1]) / 3
        const src = tri.map((p) => [gx + (p[0] - gx) * .93, gy + (p[1] - gy) * .93])
        const ox = gx - Wn / 2, oy = gy - Hn / 2, ol = Math.hypot(ox, oy) || 1, dist = ol / (Math.hypot(Wn, Hn) / 2)
        tiles.push({ src, loc: src.map((p) => [p[0] - gx, p[1] - gy]), ox, oy, dist,
          sc: [ox / ol * (.6 + rnd() * .9) + (rnd() - .5) * .4, oy / ol * (.6 + rnd() * .9) + (rnd() - .5) * .4, -.8 - rnd() * 1.4, (rnd() - .5) * 220, (rnd() - .5) * 220, (rnd() - .5) * 160],
          bu: [ox / ol * (1 + rnd() * 1.2), oy / ol * (1 + rnd() * 1.2), .8 + rnd() * 1.2, (rnd() - .5) * 260, (rnd() - .5) * 260, (rnd() - .5) * 200],
          din: dist * 380 + rnd() * 140, dout: (1 - dist) * 160 + rnd() * 120 })
      }
    }
    mosaics[s.k] = { tiles, ar }
  })
  let cur = null, prev = null, switchAt = -1e9, raf = 0, running = false, tilt = { x: 0, y: 0 }
  const P = 1000
  const frame = (t) => {
    raf = running ? requestAnimationFrame(frame) : 0
    const want = getChosen()
    if (want !== cur) { prev = cur; cur = want; switchAt = reduce ? -1e9 : t; for (const k in media) { if (k === cur) media[k].v.play().catch(() => {}); else if (k !== prev) media[k].v.pause() } }
    if (prev && t - switchAt > 1400) { media[prev].v.pause(); prev = null }
    const R = getRegion(); if (!R) return
    const ptr = getPointer(); tilt.x += ((ptr.in ? (ptr.y - (R.y + R.h / 2)) / vh : 0) - tilt.x) * .06; tilt.y += ((ptr.in ? (ptr.x - (R.x + R.w / 2)) / vw : 0) - tilt.y) * .06
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, vw, vh)
    const cx = R.x + R.w / 2, cy = R.y + R.h / 2, list = []
    const place = (k, phase) => { // phase: 'in' (the chosen one) or 'out' (the one breaking)
      const M = mosaics[k], m = media[k]; paint(m, t)
      const scale = Math.min(R.w / 1, R.h * M.ar / 1) * .92 // the unit-wide mosaic, contained in the region
      const since = t - switchAt, float = Math.sin(t * .0007) * 6
      const gx = (-tilt.x * 14 + Math.sin(t * .0004) * 3) * D2R, gy = (tilt.y * 18 + Math.sin(t * .0005) * 4) * D2R
      for (const s of M.tiles) {
        let pa = 1, pe = 0
        if (phase === 'in') pa = easeOut(clamp01((since - 260 - s.din) / 760))
        else pe = easeIn(clamp01((since - s.dout) / 620))
        const alpha = clamp01(pa * 3) * (1 - pe * pe); if (alpha < .01) continue
        const k1 = 1 - pa, sc = s.sc, bu = s.bu
        const T = [(sc[0] * k1 + bu[0] * pe) * scale + s.ox * scale, (sc[1] * k1 + bu[1] * pe) * scale + s.oy * scale, (sc[2] * k1 + bu[2] * pe) * scale]
        const Rr = [(sc[3] * k1 + bu[3] * pe) * D2R, (sc[4] * k1 + bu[4] * pe) * D2R, (sc[5] * k1 + bu[5] * pe) * D2R]
        const to3 = (p, dz) => { const q = rot([p[0] * scale, p[1] * scale, dz], Rr[0], Rr[1], Rr[2]), w = rx(ry([q[0] + T[0], q[1] + T[1], q[2] + T[2]], gy), gx); return w }
        const proj = (w) => { const kk = P / Math.max(80, P - w[2]); return [cx + w[0] * kk, cy + float + w[1] * kk, kk] }
        const v3 = s.loc.map((p) => to3(p, 0)), b3 = s.loc.map((p) => to3([p[0] + 2 / scale, p[1] + 3 / scale], -8))
        list.push({ z: (v3[0][2] + v3[1][2] + v3[2][2]) / 3, v: v3.map(proj), b: b3.map(proj), a: alpha, pic: m.pic, src: s.src.map((p) => [p[0] * m.pic.width, p[1] * m.pic.width]) })
      }
    }
    if (prev) place(prev, 'out')
    if (cur) place(cur, 'in')
    list.sort((p, q) => p.z - q.z)
    for (const it of list) draw(it)
    g.globalAlpha = 1
  }
  const draw = ({ v, b, a, pic, src }) => {
    const r = 6 * v[0][2]
    g.globalAlpha = a
    roundPath(g, b, r); g.fillStyle = BACK; g.fill()
    g.save(); roundPath(g, v, r); g.clip()
    const x0 = Math.min(v[0][0], v[1][0], v[2][0]) - 2, y0 = Math.min(v[0][1], v[1][1], v[2][1]) - 2, x1 = Math.max(v[0][0], v[1][0], v[2][0]) + 2, y1 = Math.max(v[0][1], v[1][1], v[2][1]) + 2
    g.fillStyle = DARK; g.fillRect(x0, y0, x1 - x0, y1 - y0)
    const [s0, s1, s2] = src, [d0, d1, d2] = v
    const sa = s1[0] - s0[0], sb = s2[0] - s0[0], sc = s1[1] - s0[1], sd = s2[1] - s0[1], det = sa * sd - sb * sc || 1e-6
    const ia = sd / det, ib = -sb / det, ic = -sc / det, id = sa / det
    const da = d1[0] - d0[0], db = d2[0] - d0[0], dc = d1[1] - d0[1], dd = d2[1] - d0[1]
    const A = da * ia + db * ic, B = da * ib + db * id, C = dc * ia + dd * ic, Dm = dc * ib + dd * id
    g.setTransform(A, C, B, Dm, d0[0] - A * s0[0] - B * s0[1], d0[1] - C * s0[0] - Dm * s0[1]); g.drawImage(pic, 0, 0); g.setTransform(1, 0, 0, 1, 0, 0)
    g.fillStyle = GLOSS; g.fillRect(x0, y0, x1 - x0, y1 - y0)
    g.restore()
    roundPath(g, v, r); g.strokeStyle = 'rgba(255,255,255,.3)'; g.lineWidth = .8; g.stroke()
  }
  return {
    start() { if (running) return; running = true; raf = requestAnimationFrame(frame); if (cur) media[cur].v.play().catch(() => {}) },
    stop() { running = false; cancelAnimationFrame(raf); raf = 0; for (const k in media) media[k].v.pause() },
    destroy() { this.stop(); ro.disconnect(); host.replaceChildren() },
  }
}
