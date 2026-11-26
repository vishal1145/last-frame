// "Films in every shape" as a wall of glass (2026-11-23, user: the glass mosaic should fill "poora whole background").
// The whole section is a wall of dark glass triangles. Through it, in the chosen delivery shape, a film shines: the tiles
// inside that window carry the picture (clipped exactly to the shape, so 2.39:1 or 9:16 reads true, with the glass seams
// across it). When the shape changes, the tiles flip in a wave from the window outward — mid-flip each shows its iridescent
// back — and land on the other side with the new film in the new shape. Tiles near the pointer tip toward it; a sheen of
// light crosses the wall now and then. One 2D canvas over the section background.
const clamp01 = (v) => Math.max(0, Math.min(1, v))
const sstep = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t) }
const prng = (seed) => () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let x = Math.imul(seed ^ (seed >>> 15), 1 | seed); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296 }

export function createWallGlass(host, { shapes, films, getChosen, getRegion, getPointer, reduce }) {
  const cv = document.createElement('canvas'); cv.className = 'sg-cv'; host.appendChild(cv)
  const g = cv.getContext('2d')
  const pat = (w, hh, stops) => { const c = document.createElement('canvas'); c.width = w; c.height = hh; const x = c.getContext('2d'), gr = x.createLinearGradient(0, 0, w, hh); stops.forEach(([o, col]) => gr.addColorStop(o, col)); x.fillStyle = gr; x.fillRect(0, 0, w, hh); return g.createPattern(c, 'repeat') }
  const DARK = pat(520, 520, [[0, '#1b1a1d'], [.35, '#0c0c0f'], [.7, '#17161a'], [1, '#0a0a0c']])
  const BACK = pat(380, 380, [[0, '#2f8f84'], [.3, '#6a5aa8'], [.55, '#c98a52'], [.8, '#2f8f84'], [1, '#6a5aa8']])
  const media = {}
  for (const s of shapes) {
    const f = films[s.k], v = document.createElement('video'); v.muted = true; v.loop = true; v.playsInline = true; v.preload = 'none'; v.src = f.src
    const im = new Image(); im.src = f.src.replace('.mp4', '.jpg')
    media[s.k] = { v, im, ar: s.ar }
  }
  let vw = 0, vh = 0, tiles = []
  const cache = document.createElement('canvas'), cg = cache.getContext('2d'); let cacheOk = false
  const build = () => { // a jittered triangle mesh over the whole section
    vw = host.clientWidth; vh = host.clientHeight; cv.width = vw; cv.height = vh; cache.width = vw; cache.height = vh; cacheOk = false
    const rnd = prng(77), cell = Math.max(70, Math.min(120, vw / 12)), cols = Math.ceil(vw / cell) + 1, rows = Math.ceil(vh / (cell * .86)) + 1
    const P = []
    for (let r = 0; r <= rows; r++) { P[r] = []; for (let c = 0; c <= cols; c++) P[r][c] = [(c - .5) * cell + (r % 2) * cell * .5 + (rnd() - .5) * cell * .35, (r - .5) * cell * .86 + (rnd() - .5) * cell * .3] }
    tiles = []
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const a = P[r][c], b = P[r][c + 1], d = P[r + 1][c], e = P[r + 1][c + 1]
      for (const tri of ((r + c) % 2 ? [[a, b, e], [a, e, d]] : [[a, b, d], [b, e, d]])) {
        const cx = (tri[0][0] + tri[1][0] + tri[2][0]) / 3, cy = (tri[0][1] + tri[1][1] + tri[2][1]) / 3
        tiles.push({ v: tri.map((p) => [cx + (p[0] - cx) * .94, cy + (p[1] - cy) * .94]), cx, cy, ph: rnd() * 6.28, tip: 0 })
      }
    }
  }
  const ro = new ResizeObserver(build); ro.observe(host); build()
  // the window: the chosen shape contained in the region
  const windowFor = (k, R) => { const ar = media[k].ar, w = Math.min(R.w, R.h * ar) * .96, h = w / ar; return { x: R.x + (R.w - w) / 2, y: R.y + (R.h - h) / 2, w, h } }
  let cur = null, prev = null, switchAt = -1e9, raf = 0, running = false, full = true // full: the whole wall needs a redraw
  const FLIP = 520, WAVE = 900 // each tile's flip, and how long the wave takes to cross the wall
  const drawFilm = (k, W, clipTri) => {
    const m = media[k], src = m.v.readyState >= 2 ? m.v : (m.im.complete && m.im.naturalWidth ? m.im : null)
    g.save(); g.beginPath(); g.moveTo(...clipTri[0]); g.lineTo(...clipTri[1]); g.lineTo(...clipTri[2]); g.closePath(); g.clip()
    g.beginPath(); g.rect(W.x, W.y, W.w, W.h); g.clip()
    if (src) { const sw = src.videoWidth || src.naturalWidth, sh = src.videoHeight || src.naturalHeight, s = Math.max(W.w / sw, W.h / sh); g.drawImage(src, W.x + (W.w - sw * s) / 2, W.y + (W.h - sh * s) / 2, sw * s, sh * s) }
    else { g.fillStyle = '#2a2620'; g.fillRect(W.x, W.y, W.w, W.h) }
    g.restore()
  }
  const hits = (t, W) => { // does the tile touch the window
    const xs = t.v.map((p) => p[0]), ys = t.v.map((p) => p[1])
    return Math.max(...xs) > W.x && Math.min(...xs) < W.x + W.w && Math.max(...ys) > W.y && Math.min(...ys) < W.y + W.h
  }
  const tri = (c, v) => { c.beginPath(); c.moveTo(v[0][0], v[0][1]); c.lineTo(v[1][0], v[1][1]); c.lineTo(v[2][0], v[2][1]); c.closePath() }
  const paintCache = () => { // the still wall: dark glass, a soft highlight, hairline rims — drawn once
    cg.clearRect(0, 0, vw, vh)
    for (const t of tiles) { tri(cg, t.v); cg.fillStyle = DARK; cg.fill(); cg.fillStyle = `rgba(255,236,210,${(.05 + .03 * Math.sin(t.ph)).toFixed(3)})`; cg.fill(); cg.strokeStyle = 'rgba(255,255,255,.07)'; cg.lineWidth = 1; cg.stroke() }
    cacheOk = true
  }
  const filmRect = (k, W) => { // the film, clipped to the window
    const m = media[k], src = m.v.readyState >= 2 ? m.v : (m.im.complete && m.im.naturalWidth ? m.im : null)
    g.save(); g.beginPath(); g.rect(W.x, W.y, W.w, W.h); g.clip()
    if (src) { const sw = src.videoWidth || src.naturalWidth, sh = src.videoHeight || src.naturalHeight, s = Math.max(W.w / sw, W.h / sh); g.drawImage(src, W.x + (W.w - sw * s) / 2, W.y + (W.h - sh * s) / 2, sw * s, sh * s) }
    else { g.fillStyle = '#2a2620'; g.fillRect(W.x, W.y, W.w, W.h) }
    // the glass seams across the picture, and a little shade so it sits behind the glass
    for (const t of tiles) if (hits(t, W)) { tri(g, t.v); g.fillStyle = 'rgba(255,240,220,.04)'; g.fill(); g.strokeStyle = 'rgba(10,10,12,.55)'; g.lineWidth = 2.2; g.stroke(); g.strokeStyle = 'rgba(255,255,255,.22)'; g.lineWidth = .8; g.stroke() }
    g.restore()
  }
  const overlays = (now, P) => { // one sheen band crossing the wall, and the pointer's light
    const sx = ((now * .00012) % 1.6 - .3) * (vw + vh), lg = g.createLinearGradient(sx - 220, 0, sx + 220, 220)
    lg.addColorStop(0, 'rgba(255,236,210,0)'); lg.addColorStop(.5, 'rgba(255,236,210,.07)'); lg.addColorStop(1, 'rgba(255,236,210,0)')
    g.fillStyle = lg; g.fillRect(0, 0, vw, vh)
    if (P.in) { const rg = g.createRadialGradient(P.x, P.y, 0, P.x, P.y, 200); rg.addColorStop(0, 'rgba(255,214,150,.12)'); rg.addColorStop(1, 'rgba(255,214,150,0)'); g.fillStyle = rg; g.fillRect(P.x - 200, P.y - 200, 400, 400) }
  }
  const frame = (now) => {
    raf = running ? requestAnimationFrame(frame) : 0
    const R = getRegion()
    if (!R) { // no window (2026-11-26: the film box was removed, "keep word only"): just the still glass wall
      if (!cacheOk) { paintCache(); full = true }
      if (full) { g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, vw, vh); g.drawImage(cache, 0, 0); full = false }
      return
    }
    const want = getChosen()
    if (want !== cur) { prev = cur; cur = want; switchAt = reduce || !prev ? -1e9 : now; media[cur].v.play().catch(() => {}) }
    const Wn = windowFor(cur, R), Wo = prev ? windowFor(prev, R) : Wn
    const since = now - switchAt, ocx = Wn.x + Wn.w / 2, ocy = Wn.y + Wn.h / 2, far = Math.hypot(vw, vh)
    if (prev && since > WAVE + FLIP + 50) { if (prev !== cur) media[prev].v.pause(); prev = null }
    const P = getPointer()
    g.setTransform(1, 0, 0, 1, 0, 0); if (prev) g.clearRect(0, 0, vw, vh)
    if (!prev) { // idle: the cached wall + the film in its window + the tiles the pointer tips
      if (!cacheOk) { paintCache(); full = true }
      if (!P.in && !tiles.some((t) => t.tip > .02)) { // nothing moves but the film: repaint only its window
        if (full) { g.clearRect(0, 0, vw, vh); g.drawImage(cache, 0, 0); full = false }
        const x = Math.floor(Wn.x) - 3, y = Math.floor(Wn.y) - 3, w = Math.ceil(Wn.w) + 6, h = Math.ceil(Wn.h) + 6
        g.clearRect(x, y, w, h); g.drawImage(cache, x, y, w, h, x, y, w, h)
        filmRect(cur, Wn)
        g.strokeStyle = 'rgba(232,160,19,.75)'; g.lineWidth = 1.5; g.strokeRect(Wn.x + .5, Wn.y + .5, Wn.w - 1, Wn.h - 1)
        return
      }
      full = true
      g.clearRect(0, 0, vw, vh); g.drawImage(cache, 0, 0)
      filmRect(cur, Wn)
      for (const t of tiles) {
        const pd = P.in ? Math.hypot(t.cx - P.x, t.cy - P.y) : 1e9, tipW = P.in ? Math.pow(clamp01(1 - pd / 190), 2) : 0
        t.tip += (tipW - t.tip) * .12; if (t.tip < .02) continue
        const sx = 1 - t.tip * .35, v = t.v.map((p) => [t.cx + (p[0] - t.cx) * sx, p[1] + (p[1] - t.cy) * t.tip * .06])
        if (hits(t, Wn)) { tri(g, t.v); g.strokeStyle = `rgba(255,214,150,${(.2 + t.tip * .6).toFixed(3)})`; g.lineWidth = 1.4; g.stroke(); continue } // film tiles only glow at the rim
        tri(g, t.v); g.fillStyle = '#0b0a0c'; g.fill() // the gap the tipped tile leaves
        tri(g, v); g.fillStyle = BACK; g.globalAlpha = t.tip * .55; g.fill(); g.globalAlpha = 1
        g.fillStyle = hits(t, Wn) ? 'rgba(0,0,0,0)' : DARK; if (!hits(t, Wn)) { g.globalAlpha = 1 - t.tip * .5; g.fill(); g.globalAlpha = 1 }
        g.strokeStyle = `rgba(255,214,150,${(.15 + t.tip * .5).toFixed(3)})`; g.lineWidth = 1; g.stroke()
      }
      overlays(now, P)
      g.strokeStyle = 'rgba(232,160,19,.75)'; g.lineWidth = 1.5; g.strokeRect(Wn.x + .5, Wn.y + .5, Wn.w - 1, Wn.h - 1)
      return
    }
    full = true
    const sheenX = ((now * .00012) % 1.6 - .3) * (vw + vh) // a band of light sweeping the wall
    for (const t of tiles) {
      // the flip: delayed by distance from the window, 0 → π
      const d = Math.hypot(t.cx - ocx, t.cy - ocy) / far
      const f = prev ? clamp01((since - d * WAVE) / FLIP) : 1
      const ang = sstep(0, 1, f) * Math.PI, side = ang < Math.PI / 2 ? 'old' : 'new'
      // the pointer tips nearby tiles a little
      const pd = P.in ? Math.hypot(t.cx - P.x, t.cy - P.y) : 1e9, tipW = P.in ? Math.pow(clamp01(1 - pd / 190), 2) : 0
      t.tip += (tipW - t.tip) * .12
      const sx = Math.abs(Math.cos(ang)) * (1 - t.tip * .35) // the triangle squashes across its vertical axis as it turns
      const v = t.v.map((p) => [t.cx + (p[0] - t.cx) * sx, p[1] + (p[1] - t.cy) * t.tip * .06])
      g.beginPath(); g.moveTo(...v[0]); g.lineTo(...v[1]); g.lineTo(...v[2]); g.closePath()
      const edgeOn = Math.abs(Math.cos(ang)) < .35 && prev
      if (edgeOn) { g.fillStyle = BACK; g.globalAlpha = .9; g.fill(); g.globalAlpha = 1 }
      else {
        g.fillStyle = DARK; g.fill()
        const k = side === 'old' && prev ? prev : cur, W = side === 'old' && prev ? Wo : Wn
        if (hits(t, W)) { drawFilm(k, W, v); g.beginPath(); g.moveTo(...v[0]); g.lineTo(...v[1]); g.lineTo(...v[2]); g.closePath() } // restore() keeps the clip's path: rebuild ours
      }
      // glass: a soft highlight, the sheen band, the pointer glow and a hairline rim
      const sh = Math.max(0, 1 - Math.abs(t.cx + t.cy - sheenX) / 160)
      const lit = .05 + sh * .16 + t.tip * .22 + .03 * Math.sin(now * .0008 + t.ph)
      g.fillStyle = `rgba(255,236,210,${lit.toFixed(3)})`; g.fill()
      g.strokeStyle = `rgba(255,255,255,${(.07 + t.tip * .3 + sh * .15).toFixed(3)})`; g.lineWidth = 1; g.stroke()
    }
    // the window's edge: an amber hairline round the chosen shape, faded in once the wave has passed
    const wa = prev ? sstep(WAVE * .4, WAVE + FLIP, since) : 1
    g.strokeStyle = `rgba(232,160,19,${(.75 * wa).toFixed(3)})`; g.lineWidth = 1.5; g.strokeRect(Wn.x + .5, Wn.y + .5, Wn.w - 1, Wn.h - 1)
  }
  return {
    start() { if (running) return; running = true; raf = requestAnimationFrame(frame); if (cur) media[cur].v.play().catch(() => {}) },
    stop() { running = false; cancelAnimationFrame(raf); raf = 0; for (const k in media) media[k].v.pause() },
    destroy() { this.stop(); ro.disconnect(); host.replaceChildren() },
  }
}
