// The settled hero since 2026-11-23 (user: the ring, the glass ribbon and the video-pill headline all "not creative, no awesome
// feel"): an endless tunnel of our films. The camera cruises forever down a cylinder whose walls are lined with the films'
// frames (rings of six, each ring twisted a little further, so the walls spiral); a warm light waits at the end, and the
// headline stands in it. Frames light up now and then as they pass; the pointer steers the camera; click a frame to watch it.
// One 2D canvas: each frame is a quad on the wall, drawn as two affine-mapped triangles, faded by distance.
const clamp01 = (v) => Math.max(0, Math.min(1, v))
const sstep = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t) }

export function createTunnel(host, films, { getPointer, alpha, onPick }) {
  const cv = document.createElement('canvas'); cv.className = 'tn-cv'; host.appendChild(cv)
  const g = cv.getContext('2d')
  // posters pre-scaled once to 320 px: drawing the full-size images per triangle cost most of the frame
  const imgs = films.map((f) => { const im = new Image(); im.decoding = 'async'; const o = { c: null }; im.onload = () => { const c = document.createElement('canvas'), k = 320 / im.naturalWidth; c.width = 320; c.height = Math.round(im.naturalHeight * k); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); o.c = c }; im.src = f.poster; return o })
  let vw = 0, vh = 0, R = 0, RX = 0, F = 0, hw = 0, len = 0, D = 0
  const PER = 7, RINGS = 12
  const size = () => {
    vw = host.clientWidth || innerWidth; vh = host.clientHeight || innerHeight
    cv.width = vw; cv.height = vh
    R = Math.min(vw, vh) * .62; F = Math.min(vw, vh) * 1.05
    RX = R * Math.min(2.1, Math.max(1, vw / vh * 1.05)) // an elliptic tunnel as wide as the screen (user: "sirf center me, side blank")
    hw = R * Math.sin(Math.PI / PER) * .58 // half the frame's height, across the wall (dark gaps between frames)
    len = hw * 2 * 16 / 9; D = len * 1.5 // the frame runs along the tunnel; rings follow each other with a gap
  }
  size(); addEventListener('resize', size)
  const frames = []
  for (let j = 0; j < RINGS; j++) for (let k = 0; k < PER; k++) frames.push({ j, k, film: (j * PER + k * 3) % films.length, ph: Math.random() * 6.28, sp: .3 + Math.random() * .5 })
  let travel = 0, slow = 0, last = 0, hits = [], cam = { x: 0, y: 0 }

  // affine-map the image triangle (s) onto the screen triangle (d)
  const tri = (im, s, d, a) => {
    const [s0, s1, s2] = s, [d0, d1, d2] = d
    const sa = s1[0] - s0[0], sb = s2[0] - s0[0], sc = s1[1] - s0[1], sd = s2[1] - s0[1], det = sa * sd - sb * sc || 1e-6
    const ia = sd / det, ib = -sb / det, ic = -sc / det, id = sa / det
    const da = d1[0] - d0[0], db = d2[0] - d0[0], dc = d1[1] - d0[1], dd = d2[1] - d0[1]
    const A = da * ia + db * ic, B = da * ib + db * id, C = dc * ia + dd * ic, Dm = dc * ib + dd * id
    g.save(); g.beginPath(); g.moveTo(d0[0], d0[1]); g.lineTo(d1[0], d1[1]); g.lineTo(d2[0], d2[1]); g.closePath(); g.clip()
    g.globalAlpha = a; g.setTransform(A, C, B, Dm, d0[0] - A * s0[0] - B * s0[1], d0[1] - C * s0[0] - Dm * s0[1])
    g.drawImage(im, 0, 0); g.restore()
  }

  return {
    update(now) {
      const la = alpha(); const dt = Math.min(now - last || 16, 50); last = now
      g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, vw, vh)
      if (la < .01) { hits = []; return }
      const P = getPointer()
      cam.x += (((P.in ? P.x / vw - .5 : 0)) - cam.x) * .04; cam.y += (((P.in ? P.y / vh - .5 : 0)) - cam.y) * .04
      travel += dt * (D / 1900) * (1 - slow * .75)
      const cx = vw / 2 - cam.x * vw * .12, cy = vh * .5 - cam.y * vh * .12, roll = now * .00004 + cam.x * .12
      // the light at the end of the tunnel
      const lg = g.createRadialGradient(cx, cy, 0, cx, cy, Math.min(vw, vh) * .55)
      lg.addColorStop(0, `rgba(255,214,150,${.26 * la})`); lg.addColorStop(.35, `rgba(232,160,19,${.1 * la})`); lg.addColorStop(1, 'rgba(232,160,19,0)')
      g.fillStyle = lg; g.fillRect(0, 0, vw, vh)
      const span = RINGS * D, near = R * .25, list = []
      for (const f of frames) {
        const zd = near + (((f.j * D - travel) % span) + span) % span // distance ahead of the camera
        const ang = (f.k / PER) * Math.PI * 2 + f.j * .32 + roll
        const ca = Math.cos(ang), sa = Math.sin(ang)
        const X = RX * ca, Y = R * sa, tl = Math.hypot(RX * sa, R * ca) || 1, tx = -RX * sa / tl, ty = R * ca / tl
        const fog = sstep(span + near, span * .5, zd) * sstep(R * .55, R * 1.25, zd) // frames vanish before they fill the screen
        if (fog < .01) continue
        // corners: across the wall (±hw along the tangent) × along the tunnel (zd ± len/2)
        const pr = (u, v) => { const z = Math.max(8, zd + v), x = X + tx * u, y = Y + ty * u; return [cx + F * x / z, cy + F * y / z] }
        const q = [pr(-hw, len / 2), pr(hw, len / 2), pr(hw, -len / 2), pr(-hw, -len / 2)] // far-left, far-right, near-right, near-left
        const pulse = Math.pow(Math.max(0, Math.sin(now * .001 * f.sp + f.ph)), 8)
        list.push({ zd, q, a: la * fog * (.55 + .45 * pulse), film: f.film, lit: pulse })
      }
      list.sort((p, r) => r.zd - p.zd)
      hits = []
      for (const it of list) {
        const im = imgs[it.film].c; if (!im) continue
        const W = im.width, H = im.height, [a, b, c, d] = it.q
        // the picture runs along the tunnel: its left edge far, its right edge near
        tri(im, [[0, 0], [0, H], [W, H]], [a, b, c], it.a); tri(im, [[0, 0], [W, H], [W, 0]], [a, c, d], it.a)
        g.globalAlpha = it.a * (.25 + .5 * it.lit); g.strokeStyle = it.lit > .3 ? '#FFC46E' : 'rgba(242,241,236,.6)'; g.lineWidth = 1
        g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(c[0], c[1]); g.lineTo(d[0], d[1]); g.closePath(); g.stroke()
        hits.push(it)
      }
      g.globalAlpha = 1
      // a dark vignette keeps the edges quiet and the light in the middle
      const vg = g.createRadialGradient(cx, cy, Math.min(vw, vh) * .25, vw / 2, vh / 2, Math.max(vw, vh) * .75)
      vg.addColorStop(0, 'rgba(8,7,6,0)'); vg.addColorStop(1, `rgba(8,7,6,${.85 * la})`); g.fillStyle = vg; g.fillRect(0, 0, vw, vh)
      // under the pointer: slow the flight
      const over = P.in && hits.length ? hitAt(P.x, P.y) : null
      slow += ((over ? 1 : 0) - slow) * .08
      cv.style.cursor = over ? 'pointer' : ''
    },
    click(x, y) { const it = hitAt(x, y); if (it) onPick(it.film); return !!it },
    destroy() { removeEventListener('resize', size); host.replaceChildren() },
  }
  function hitAt(x, y) { // the nearest frame whose quad holds the point
    for (let i = hits.length - 1; i >= 0; i--) { const q = hits[i].q; if (inside(x, y, q)) return hits[i] }
    return null
  }
  function inside(x, y, q) { let s = 0; for (let i = 0; i < 4; i++) { const [x1, y1] = q[i], [x2, y2] = q[(i + 1) % 4], c = (x2 - x1) * (y - y1) - (y2 - y1) * (x - x1); if (c !== 0) { if (s && Math.sign(c) !== s) return false; s = Math.sign(c) } } return true }
}
