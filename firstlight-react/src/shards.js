// The glass ribbon of the hero opening (2026-11-23, after hyperframes.heygen.com: "mirror break hokar ek video banti hai, right
// bottom corner se left top corner pe move karti hai"). A continuous band of thick rounded glass triangles flows from the bottom-
// right corner to the top-left: down at the right they tumble loose and dark, in the middle they lock into a tilted band that
// carries a playing film (the picture stays put; the tiles slide through it like through a window, the film's title across it),
// and toward the top-left the band twists and folds into thin iridescent sheets on its way out. Films change as it flows.
// All drawn on ONE 2D canvas (a CSS-3D element per tile ran at 5 fps on the user's HD 4400): per vertex a point on a 3D path +
// the band's twisted normal → perspective projection → the picture affine-mapped into a rounded clip, gloss, edge, back plate.
const clamp01 = (v) => Math.max(0, Math.min(1, v))
const sstep = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t) }
const D2R = Math.PI / 180
const prng = (seed) => () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let x = Math.imul(seed ^ (seed >>> 15), 1 | seed); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296 }
const rx = (p, a) => { const c = Math.cos(a), s = Math.sin(a); return [p[0], p[1] * c - p[2] * s, p[1] * s + p[2] * c] }
const ry = (p, a) => { const c = Math.cos(a), s = Math.sin(a); return [p[0] * c + p[2] * s, p[1], -p[0] * s + p[2] * c] }
const rz = (p, a) => { const c = Math.cos(a), s = Math.sin(a); return [p[0] * c - p[1] * s, p[0] * s + p[1] * c, p[2]] }
const norm = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l] }
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]

function roundPath(g, v, r) {
  const q = (a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, k = Math.min(r, l * .3) / l; return [a[0] + dx * k, a[1] + dy * k] }
  g.beginPath(); const s = q(v[0], v[1]); g.moveTo(s[0], s[1])
  for (const i of [1, 2, 0]) { const p = v[(i + 2) % 3], n = v[(i + 1) % 3], a = q(v[i], p), b = q(v[i], n); g.lineTo(a[0], a[1]); g.quadraticCurveTo(v[i][0], v[i][1], b[0], b[1]) }
  g.closePath()
}

// opts.loop: the settled hero's ribbon — no act; the film shown is opts.getIndex() (cross-fades on change), opacity opts.alpha(),
// and opts.path(vw, vh, phone) gives its own route { A, B, bend }.
// opts.h(vw, vh, phone): triangle height; opts.getPointer(): { x, y, in } in the host's coordinates — glass near it lifts away.
export function createShards(host, films, { start = 0, loop = false, getIndex, alpha, path, h: hOpt, getPointer } = {}) {
  const cv = document.createElement('canvas'); cv.className = 'sh-cv'; host.appendChild(cv)
  const g = cv.getContext('2d')
  let vw = 0, vh = 0, dpr = 1
  const size = () => { vw = host.clientWidth || innerWidth; vh = host.clientHeight || innerHeight; dpr = 1; cv.width = Math.round(vw * dpr); cv.height = Math.round(vh * dpr) }
  size(); addEventListener('resize', size)
  const phone = vw < 700
  // the band: rows of triangles, side `a`; its length in band units covers the whole path
  const rows = 4, h = Math.round(hOpt ? hOpt(vw, vh, phone) : Math.min(phone ? vw * .17 : vh * .135, 112)), bandH = rows * h, a = h / .866 // small triangles, four rows (user: "triangle chhote, 3–4 row, tab chaudi hogi")
  const route = path ? path(vw, vh, phone) : null
  const A3 = route ? route.A : phone ? [vw * 1.2, vh * .95, 260] : [vw * 1.12, vh * 1.18, 240] // bottom-right, near
  const B3 = route ? route.B : phone ? [-vw * .35, vh * .08, -420] : [-vw * .22, -vh * .1, -420] // top-left, far
  const pathLen = Math.hypot(B3[0] - A3[0], B3[1] - A3[1], B3[2] - A3[2])
  const cols = Math.ceil(pathLen / (a / 2)) + 2, Lu = cols * (a / 2)
  const bend = route ? route.bend : phone ? [vw * .04, vh * .02, 0] : [vw * .02, -vh * .06, 0] // a gentle arc
  const pathAt = (s) => { const k = Math.sin(Math.PI * s); return [A3[0] + (B3[0] - A3[0]) * s + bend[0] * k, A3[1] + (B3[1] - A3[1]) * s + bend[1] * k, A3[2] + (B3[2] - A3[2]) * s] }
  // the picture: a window in band coordinates, in the locked stretch
  const S0 = .36, S1 = phone ? .8 : .8, pu0 = S0 * Lu, pu1 = S1 * Lu, PW = pu1 - pu0
  const pic = document.createElement('canvas'); pic.width = 640; pic.height = Math.round(640 * bandH / PW); const pg = pic.getContext('2d')
  // the films: a real <video> each (2D drawImage, no GL), the poster until it has a frame
  const media = films.map((f) => { const v = document.createElement('video'); v.muted = true; v.loop = true; v.playsInline = true; v.preload = loop ? 'none' : 'auto'; v.src = f.clip; const im = new Image(); im.src = f.poster; return { v, im, title: f.title, cap: null } })
  const caption = (m) => { // the title, drawn once (shadowBlur every frame is costly)
    const c = document.createElement('canvas'); c.width = pic.width; c.height = pic.height; const x = c.getContext('2d')
    x.font = `800 ${Math.round(pic.height * .3)}px "Big Shoulders Display", Impact, sans-serif`; x.fillStyle = 'rgba(255,255,255,.92)'; x.shadowColor = 'rgba(0,0,0,.45)'; x.shadowBlur = 12
    x.fillText(m.title.toUpperCase(), pic.width * .06, pic.height * .9); return c
  }
  // fills shared by every tile, built once (a gradient per tile per frame cost ~6 fps here)
  const pat = (w, hh, paint) => { const c = document.createElement('canvas'); c.width = w; c.height = hh; paint(c.getContext('2d'), w, hh); return g.createPattern(c, 'repeat') }
  const lin = (x, w, hh, stops) => { const gr = x.createLinearGradient(0, 0, w, hh); stops.forEach(([o, c]) => gr.addColorStop(o, c)); x.fillStyle = gr; x.fillRect(0, 0, w, hh) }
  const BACK = pat(420, 420, (x, w, hh) => lin(x, w, hh, [[0, '#15171d'], [.25, '#2f8f84'], [.45, '#1c1e26'], [.65, '#6a5aa8'], [.85, '#1c1e26'], [1, '#2f8f84']]))
  const DARK = pat(300, 300, (x, w, hh) => lin(x, w, hh, [[0, '#34363f'], [.5, '#0d0e12'], [1, '#2a2c34']]))
  const IRI = pat(360, 360, (x, w, hh) => lin(x, w, hh, [[0, 'rgba(120,230,215,.9)'], [.35, 'rgba(170,150,255,.85)'], [.7, 'rgba(255,190,120,.85)'], [1, 'rgba(120,230,215,.9)']]))
  const GLOSS = pat(240, 240, (x, w, hh) => lin(x, w, hh, [[0, 'rgba(255,255,255,.3)'], [.3, 'rgba(255,255,255,0)'], [.7, 'rgba(255,255,255,0)'], [1, 'rgba(255,255,255,.18)']]))
  const rnd = prng(4242)
  const tiles = []
  for (let r = 0; r < rows; r++) for (let k = 0; k < cols; k++) {
    const up = (k + r) % 2 === 0, u = k * a / 2, v0 = r * h, v1 = (r + 1) * h
    const loc = up ? [[u - a / 2, v1], [u + a / 2, v1], [u, v0]] : [[u - a / 2, v0], [u + a / 2, v0], [u, v1]]
    const gu = (loc[0][0] + loc[1][0] + loc[2][0]) / 3, gv = (loc[0][1] + loc[1][1] + loc[2][1]) / 3
    tiles.push({ loc: loc.map((p) => [gu + (p[0] - gu) * .93 - gu, gv + (p[1] - gv) * .93]), gu,
      off: [(rnd() - .3) * 420, (rnd() - .2) * 380, (rnd() - .5) * 300], rot: [(rnd() - .5) * 2.6, (rnd() - .5) * 2.6, (rnd() - .5) * 2.6], ph: rnd() * 6.28 })
  }
  const P = 1100, Ox = () => vw * .5, Oy = () => vh * .46
  const proj = (p) => { const k = P / Math.max(60, P - p[2]); return [Ox() + (p[0] - Ox()) * k, Oy() + (p[1] - Oy()) * k, k] }
  const speed = Lu / 12000 // a tile crosses the whole screen in ~12 s (user: "thoda slow and smooth", then "running slow karo")
  let painted = false, playing = -1, lastPic = -1e9

  let cur = -1, prev = -1, switchAt = 0
  const paintPicture = (t, act0, act1) => {
    let i, nx, mix
    if (loop) { // follow the chosen film, cross-fading from the last one
      const want = getIndex() % media.length
      if (want !== cur) { prev = cur; cur = want; switchAt = t }
      mix = sstep(220, 760, t - switchAt) // the new film shows while the glass is apart
      if (prev >= 0 && mix < 1) { i = prev; nx = cur } else { i = cur; nx = cur; mix = 0 }
    } else {
      const n = media.length, seg = (act1 - act0) / n, x = (t - act0) / seg; i = Math.max(0, Math.min(n - 1, Math.floor(x))); const f = x - i
      nx = Math.min(n - 1, i + 1); mix = i < n - 1 ? sstep(.82, 1, f) : 0
    }
    const key = i * 100 + nx
    if (playing !== key) { media.forEach((m, j) => { if (j === i || j === nx) m.v.play().catch(() => {}); else m.v.pause() }); playing = key }
    const W = pic.width, H = pic.height
    const draw = (m, al) => {
      if (al <= 0) return; pg.globalAlpha = al
      const src = m.v.readyState >= 2 ? m.v : (m.im.complete && m.im.naturalWidth ? m.im : null)
      if (src) { const sw = src.videoWidth || src.naturalWidth, sh = src.videoHeight || src.naturalHeight, sc = Math.max(W / sw, H / sh); pg.drawImage(src, (W - sw * sc) / 2, (H - sh * sc) / 2, sw * sc, sh * sc) }
      else { pg.fillStyle = '#26231e'; pg.fillRect(0, 0, W, H) }
      if (!m.cap && document.fonts.check('800 20px "Big Shoulders Display"')) m.cap = caption(m)
      pg.drawImage(m.cap || (m.cap0 ||= caption(m)), 0, 0) // the title across the band, in the site's display face
    }
    pg.globalAlpha = 1; pg.fillStyle = '#111'; pg.fillRect(0, 0, W, H)
    draw(media[i], 1); if (mix > 0) draw(media[nx], mix)
    pg.globalAlpha = 1
  }

  const drawTile = (it) => {
    const { v: verts, b: back, a: alpha, img, src, iri, dark } = it
    const crs = (verts[1][0] - verts[0][0]) * (verts[2][1] - verts[0][1]) - (verts[1][1] - verts[0][1]) * (verts[2][0] - verts[0][0])
    const r = 8 * verts[0][2]
    g.globalAlpha = alpha
    roundPath(g, back, r); g.fillStyle = BACK; g.fill()
    g.save(); roundPath(g, verts, r); g.clip()
    const x0 = Math.min(verts[0][0], verts[1][0], verts[2][0]) - 2, y0 = Math.min(verts[0][1], verts[1][1], verts[2][1]) - 2
    const x1 = Math.max(verts[0][0], verts[1][0], verts[2][0]) + 2, y1 = Math.max(verts[0][1], verts[1][1], verts[2][1]) + 2
    g.fillStyle = DARK; g.fillRect(x0, y0, x1 - x0, y1 - y0)
    if (!dark) {
      const [s0, s1, s2] = src, [d0, d1, d2] = verts
      const sa = s1[0] - s0[0], sb = s2[0] - s0[0], sc = s1[1] - s0[1], sd = s2[1] - s0[1], det = sa * sd - sb * sc || 1e-6
      const ia = sd / det, ib = -sb / det, ic = -sc / det, id = sa / det
      const da = d1[0] - d0[0], db = d2[0] - d0[0], dc = d1[1] - d0[1], dd = d2[1] - d0[1]
      const A = da * ia + db * ic, B = da * ib + db * id, C = dc * ia + dd * ic, Dm = dc * ib + dd * id
      g.setTransform(dpr * A, dpr * C, dpr * B, dpr * Dm, dpr * (d0[0] - A * s0[0] - B * s0[1]), dpr * (d0[1] - C * s0[0] - Dm * s0[1]))
      g.drawImage(img, 0, 0, PW, bandH)
      g.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    if (iri > .01) { // folding into the sheets at the top-left: the glass takes over
      g.globalAlpha = alpha * iri; g.fillStyle = IRI; g.fillRect(x0, y0, x1 - x0, y1 - y0); g.globalAlpha = alpha
    }
    g.fillStyle = GLOSS; g.fillRect(x0, y0, x1 - x0, y1 - y0)
    g.restore()
    roundPath(g, verts, r); g.strokeStyle = 'rgba(255,255,255,.3)'; g.lineWidth = .8; g.stroke()
  }

  return {
    update(t, act0, act1) {
      const la = loop ? alpha() : 1
      const on = loop ? la > .01 : t > act0 - 300 && t < act1 + 400
      if (!on) { if (painted) { g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height); painted = false; media.forEach((m) => m.v.pause()); playing = -1 } return }
      painted = true
      const tq = performance.now()
      if (t - lastPic > 60 || t < lastPic) { paintPicture(t, act0, act1); lastPic = t } // the film at ~15 fps is plenty under the glass
      const tp = performance.now()
      g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height); g.setTransform(dpr, 0, 0, dpr, 0, 0)
      const fadeAct = loop ? la : sstep(act0 - 300, act0 + 300, t) * (1 - sstep(act1 - 500, act1 + 300, t))
      const shift = (t - start) * speed
      const view = [0, 0, 1]
      const list = []
      for (const T of tiles) {
        const uc = (((T.gu + shift) % Lu) + Lu) % Lu, sc = uc / Lu // the tile's centre along the path, 0 = bottom-right
        const lock = sstep(.12, S0 - .02, sc), fold = sstep(S1 - .02, .97, sc)
        const fade = sstep(0, .06, sc) * (1 - sstep(.93, 1, sc)) * fadeAct; if (fade < .01) continue
        const tw = (28 + fold * 62) * D2R // the band leans back, then twists into sheets
        // the mirror break: when the film changes, the locked glass bursts apart in a wave along the band and settles back
        const since = t - switchAt - (1 - sc) * 520
        const burst = loop && prev >= 0 && lock > .6 ? sstep(0, 240, since) * (1 - sstep(340, 1150, since)) : 0
        const tumble = Math.max(1 - lock, burst * .7), tt = t * .001
        const place = (p, dz) => { // p: [u offset from the centre, v] → screen 3D
          const s = clamp01((uc + p[0]) / Lu), C = pathAt(s), C2 = pathAt(Math.min(1, s + .01)), Tn = norm([C2[0] - C[0], C2[1] - C[1], C2[2] - C[2]])
          const N = norm(cross(Tn, view)) // across the band, in the screen plane
          const Nt = norm([N[0] * Math.cos(tw), N[1] * Math.cos(tw), Math.sin(tw)]) // leaned back
          const vv = (p[1] - bandH / 2) * (1 - fold * .55)
          return [C[0] + Nt[0] * vv, C[1] + Nt[1] * vv, C[2] + Nt[2] * vv + dz]
        }
        let v3 = T.loc.map((p) => place(p, 0)), b3 = T.loc.map((p) => place([p[0] + 2, p[1] + 3], -8))
        if (tumble > .01) { // loose: off the band and turning on its own
          const cx = (v3[0][0] + v3[1][0] + v3[2][0]) / 3, cy = (v3[0][1] + v3[1][1] + v3[2][1]) / 3, cz = (v3[0][2] + v3[1][2] + v3[2][2]) / 3
          const R = [T.rot[0] * tt + T.ph, T.rot[1] * tt + T.ph * .7, T.rot[2] * tt].map((x) => x * tumble)
          const o = T.off.map((x) => x * tumble * tumble)
          const tr = (q) => { const w = rx(ry(rz([q[0] - cx, q[1] - cy, q[2] - cz], R[2]), R[1]), R[0]); return [cx + w[0] + o[0], cy + w[1] + o[1], cz + w[2] + o[2]] }
          v3 = v3.map(tr); b3 = b3.map(tr)
        }
        if (getPointer) { // the glass near the pointer lifts toward the viewer and leans away from it
          const P0 = getPointer(), cx = (v3[0][0] + v3[1][0] + v3[2][0]) / 3, cy = (v3[0][1] + v3[1][1] + v3[2][1]) / 3, cz = (v3[0][2] + v3[1][2] + v3[2][2]) / 3
          const c2 = proj([cx, cy, cz]), dx = c2[0] - P0.x, dy = c2[1] - P0.y, d = Math.hypot(dx, dy) || 1
          const want = P0.in ? Math.pow(clamp01(1 - d / 170), 2) : 0
          T.push = (T.push || 0) + (want - (T.push || 0)) * .16
          if (T.push > .005) {
            const k = T.push, o = [dx / d * k * 40, dy / d * k * 40, k * 150], R = [-dy / d * k * .7, dx / d * k * .7, 0]
            const tr = (q) => { const w = rx(ry([q[0] - cx, q[1] - cy, q[2] - cz], R[1]), R[0]); return [cx + w[0] + o[0], cy + w[1] + o[1], cz + w[2] + o[2]] }
            v3 = v3.map(tr); b3 = b3.map(tr)
          }
        }
        const src = T.loc.map((p) => route && route.upright ? [uc + p[0] - pu0, bandH - p[1]] : [pu1 - (uc + p[0]), p[1]]) // the picture stays put (route.upright: a steep band reads along +u), the tile slides through it (u read from the far end: the band runs up-left)
        const inPic = uc + a / 2 > pu0 && uc - a / 2 < pu1
        const pv = v3.map(proj); if (pv.every((q) => q[0] < -80) || pv.every((q) => q[0] > vw + 80) || pv.every((q) => q[1] < -80) || pv.every((q) => q[1] > vh + 80)) continue
        list.push({ z: (v3[0][2] + v3[1][2] + v3[2][2]) / 3, v: pv, b: b3.map(proj), a: fade, img: pic, src, iri: fold, dark: !inPic || lock < .6 })
      }
      const tl = performance.now()
      list.sort((p, q) => p.z - q.z)
      for (const it of list) drawTile(it)
      g.globalAlpha = 1
      const st = cv.__rb || (cv.__rb = { n: 0, pic: 0, geo: 0, draw: 0, tiles: 0 }); st.n++; st.pic += tp - tq; st.geo += tl - tp; st.draw += performance.now() - tl; st.tiles = list.length // draw stats (read in devtools: document.querySelector('.sh-cv').__rb)
    },
    destroy() { removeEventListener('resize', size); media.forEach((m) => { m.v.pause(); m.v.removeAttribute('src'); m.v.load() }); host.replaceChildren() },
  }
}
