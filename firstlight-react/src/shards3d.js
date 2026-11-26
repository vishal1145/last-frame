// The glass act of the opening in real 3D (three.js) since 2026-11-24 (user: "this section can make more better and creative").
// On the night stage: for each film, thick glass shards fly in and lock into one clean, upright 16:9 screen playing the film —
// its title set below it; a sheen runs across the glass and the screen leans toward the pointer; then the screen breaks
// and the next film assembles behind it. The last film does not break: its pieces fall into one point of light, which the
// converge act flares into the brand mark. Same API as createShards: { update(t, act0, act1), destroy() }.
//
// 2026-11-25 (user: "mirror diffrent diffrent shape me brek ho also diffrent diffrent shape me merge ho"): every film cuts
// its glass in its own pattern (real shattered glass, a spider-web impact, honeycomb, blocks, long slivers, triangles),
// arrives its own way (spiral out of the depth, rain from above, a sweep from the side, a bloom from the centre) and
// breaks its own way (burst at the camera, falling under gravity, a vortex, a blast from an impact point). The choice is
// shuffled on every load. All motion runs in the vertex shader: per frame the CPU only sets a few uniforms.
// Throws without WebGL so the caller can fall back to the 2D ribbon.
import * as THREE from 'three'

const clamp01 = (v) => Math.max(0, Math.min(1, v))
const sstep = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t) }
const prng = (seed) => () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let x = Math.imul(seed ^ (seed >>> 15), 1 | seed); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296 }
const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]] } return a }
const SMALL = new Set(['coffee.mp4', 'embers.mp4', 'interview.mp4', 'perfume.mp4', 'runway.mp4', 'sneakers.mp4', 'unboxing.mp4'])
const smallClip = (src) => (src && /^\/video\/[^/]+\.mp4$/.test(src) && SMALL.has(src.split('/').pop()) ? src.replace('/video/', '/video/sm/') : src)

// the screen, in world units; the group is scaled to fit the viewport
const W = 16, H = 9, TH = .2 // glass thickness
// timing inside the act (ms from act0): film k assembles at STEP·k, holds, then breaks (the last one gathers into a point)
const STEP = 1900, IN = 900, HOLD = 1650, OUT = 700

// ---------- 2D polygons (CCW arrays of [x, y]) ----------
const RECT = [[-W / 2, -H / 2], [W / 2, -H / 2], [W / 2, H / 2], [-W / 2, H / 2]]
const area = (p) => { let s = 0; for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; s += a[0] * b[1] - b[0] * a[1] } return s / 2 }
const ccw = (p) => (area(p) < 0 ? p.slice().reverse() : p)
// keep the side where a·x + b·y <= c (Sutherland–Hodgman against one half-plane)
const clip = (poly, a, b, c) => {
  const out = [], f = (p) => a * p[0] + b * p[1] - c
  for (let i = 0; i < poly.length; i++) {
    const P = poly[i], Q = poly[(i + 1) % poly.length], fp = f(P), fq = f(Q)
    if (fp <= 0) out.push(P)
    if ((fp < 0 && fq > 0) || (fp > 0 && fq < 0)) { const t = fp / (fp - fq); out.push([P[0] + (Q[0] - P[0]) * t, P[1] + (Q[1] - P[1]) * t]) }
  }
  return out
}
const toRect = (p) => { p = clip(p, -1, 0, W / 2); p = clip(p, 1, 0, W / 2); p = clip(p, 0, -1, H / 2); return clip(p, 0, 1, H / 2) }
// the outline the shards lock into — a different one for every film (2026-11-25, user: "teeno bar same hi shape me merge ho
// rha hai … her bari diffrent"). All convex, all inside the W×H film frame so the picture maps straight onto them.
const ngon = (n, rx, ry, rot = 0) => Array.from({ length: n }, (_, i) => { const a = rot + i * 6.2832 / n; return [Math.cos(a) * rx, Math.sin(a) * ry] })
const SHAPES = {
  circle: ngon(48, H * .56, H * .5),
  hexagon: ngon(6, W * .36, H * .5 / .866),
  diamond: [[0, -H / 2], [W * .38, 0], [0, H / 2], [-W * .38, 0]],
  slant: [[-W * .5, -H * .42], [W * .36, -H * .42], [W * .5, H * .42], [-W * .36, H * .42]],
  octagon: ngon(8, W * .34, H * .54, Math.PI / 8),
  cinema: [[-W * .5, -H * .27], [W * .46, -H * .27], [W * .5, H * .27], [-W * .46, H * .27]],
}
for (const k in SHAPES) SHAPES[k] = SHAPES[k].map(([x, y]) => [Math.max(-W / 2, Math.min(W / 2, x)), Math.max(-H / 2, Math.min(H / 2, y))])
// cut a polygon to a convex CCW outline
const toShape = (p, shape) => { for (let i = 0; i < shape.length && p.length; i++) { const a = shape[i], b = shape[(i + 1) % shape.length], dx = b[0] - a[0], dy = b[1] - a[1]; p = clip(p, dy, -dx, dy * a[0] - dx * a[1]) } return p }
// Voronoi cells of the seeds inside a convex region
const voronoi = (seeds, region) => seeds.map((s, i) => {
  let p = region
  for (let j = 0; j < seeds.length && p.length; j++) {
    if (j === i) continue
    const o = seeds[j], a = o[0] - s[0], b = o[1] - s[1]
    p = clip(p, a, b, (o[0] * o[0] + o[1] * o[1] - s[0] * s[0] - s[1] * s[1]) / 2)
  }
  return p
})

// the cutting patterns
const PATTERNS = {
  // real broken glass: irregular cells, smaller round the point of impact
  glass(r) {
    const cx = (r() - .5) * W * .4, cy = (r() - .5) * H * .4, seeds = []
    for (let i = 0; i < 70; i++) seeds.push([(r() - .5) * W, (r() - .5) * H])
    for (let i = 0; i < 45; i++) { const a = r() * 6.283, d = Math.pow(r(), 1.6) * 4; seeds.push([cx + Math.cos(a) * d * 1.4, cy + Math.sin(a) * d]) }
    return { polys: voronoi(seeds.map(([x, y]) => [Math.max(-W / 2, Math.min(W / 2, x)), Math.max(-H / 2, Math.min(H / 2, y))]), RECT), impact: [cx, cy] }
  },
  // a spider-web impact: rings round a point, cut by crooked spokes
  radial(r) {
    const cx = (r() - .5) * W * .3, cy = (r() - .5) * H * .3, S = 15, RINGS = [0, .7, 1.6, 2.8, 4.3, 6.1, 8.3, 11, 14.5, 19]
    const ang = Array.from({ length: S }, (_, i) => (i + (r() - .5) * .55) * 6.283 / S)
    const V = RINGS.map((R, j) => ang.map((a) => { const rr = R * (1 + (r() - .5) * .22 * (j > 0)); return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * .9] }))
    const polys = []
    for (let i = 0; i < S; i++) polys.push(toRect([[cx, cy], V[1][i], V[1][(i + 1) % S]]))
    for (let j = 1; j < RINGS.length - 1; j++) for (let i = 0; i < S; i++) {
      const n = (i + 1) % S, q = toRect(ccw([V[j][i], V[j + 1][i], V[j + 1][n], V[j][n]]))
      if (j > 3 && r() < .45 && q.length > 2) { // the outer cells crack once more along the ring
        const m = (k) => [(V[j][k][0] + V[j + 1][k][0]) / 2, (V[j][k][1] + V[j + 1][k][1]) / 2]
        polys.push(toRect(ccw([V[j][i], m(i), m(n), V[j][n]])), toRect(ccw([m(i), V[j + 1][i], V[j + 1][n], m(n)])))
      } else polys.push(q)
    }
    return { polys, impact: [cx, cy] }
  },
  // honeycomb
  hex(r) {
    const s = 1.45, seeds = []
    for (let row = -5; row <= 5; row++) for (let c = -7; c <= 7; c++) seeds.push([c * s + (row & 1 ? s / 2 : 0) + (r() - .5) * .1, row * s * .866 + (r() - .5) * .1])
    return { polys: voronoi(seeds, RECT), impact: [0, 0] }
  },
  // blocks of many sizes, like a cut-up poster
  blocks(r) {
    const polys = [], split = (x0, y0, x1, y1, d) => {
      const w = x1 - x0, h = y1 - y0, a = w * h
      if (a < 1.1 || (a < 6 && r() < .4) || d > 8) { polys.push([[x0, y0], [x1, y0], [x1, y1], [x0, y1]]); return }
      const t = .3 + r() * .4
      if (w / h > 1.2 || (w / h > .8 && r() < .5)) { const m = x0 + w * t; split(x0, y0, m, y1, d + 1); split(m, y0, x1, y1, d + 1) }
      else { const m = y0 + h * t; split(x0, y0, x1, m, d + 1); split(x0, m, x1, y1, d + 1) }
    }
    split(-W / 2, -H / 2, W / 2, H / 2, 0)
    return { polys, impact: [0, 0] }
  },
  // long slivers on a slant: Voronoi in a squeezed, turned space
  slivers(r) {
    const th = (r() < .5 ? -1 : 1) * (.35 + r() * .5), c = Math.cos(th), s = Math.sin(th), k = .28
    const fw = ([x, y]) => [(c * x + s * y) * k, -s * x + c * y], bw = ([X, Y]) => { const u = X / k, v = Y; return [c * u - s * v, s * u + c * v] }
    const seeds = Array.from({ length: 110 }, () => fw([(r() - .5) * W, (r() - .5) * H]))
    return { polys: voronoi(seeds, RECT.map(fw)).map((p) => p.map(bw)), impact: [0, 0] }
  },
  // crystal: irregular cells, each split once more by a random chord — pieces of 3 to 7 sides, no two alike
  // (2026-11-25, user: the triangle cut "ek shape me ho rha … i want diffrent diffrent")
  crystal(r) {
    const seeds = Array.from({ length: 62 }, () => [(r() - .5) * W, (r() - .5) * H]), polys = []
    for (const p of voronoi(seeds, RECT)) {
      if (p.length < 3) continue
      let cx = 0, cy = 0; p.forEach(([x, y]) => { cx += x; cy += y }); cx /= p.length; cy /= p.length
      if (r() < .25) { polys.push(p); continue }
      const th = r() * Math.PI, a = Math.cos(th), b = Math.sin(th), c = a * cx + b * cy + (r() - .5) * .5
      polys.push(clip(p, a, b, c), clip(p, -a, -b, -c))
    }
    return { polys, impact: [0, 0] }
  },
}

// ---------- the shader: every shard moves on the GPU ----------
const VERT = /* glsl */`
  attribute vec3 aHome, aFrom, aVel;
  attribute vec4 aRot0, aSpin, aOrbit;
  attribute vec2 aTime, aFace;
  uniform float uT, uB, uGrav, uSwirl, uGather, uTime;
  uniform vec2 uRipC;
  uniform vec2 uSize;
  uniform vec3 uGatherP;
  varying vec2 vUv;
  varying vec3 vN, vV;
  varying float vFront, vEdge, vLoose, vFade, vPh;
  vec3 rot(vec3 v, vec3 k, float a) { float c = cos(a), s = sin(a); return v * c + cross(k, v) * s + k * dot(k, v) * (1. - c); }
  void main() {
    float pin = 1. - pow(1. - clamp((uT - aTime.x) / 650., 0., 1.), 3.);          // assembling: into its place, turning square
    float po = pow(clamp((uT - uB - aTime.y) / ${OUT - 150}., 0., 1.), 2.2);         // breaking
    vec3 home = aHome;
    if (aOrbit.x > .5) { // a satellite: circles the screen while it holds
      float a = aOrbit.y + uTime * aOrbit.z;
      home = vec3(cos(a) * uSize.x * .52 * aOrbit.w, sin(a) * uSize.y * .64 * aOrbit.w, sin(a * 1.7 + aOrbit.y) * 2.6);
    }
    vec3 p = position, n = normal, P = mix(aFrom, home, pin);
    // the locked screen is alive (2026-11-25, user: "merge hone ke bad blank dikh rha hai … kuchh move hota rhe"):
    // a slow ripple runs through the glass — each shard lifts and tips as it passes, so the light slides over the seams
    float lockW = pin * (1. - po) * (1. - aOrbit.x);
    vec2 rv = aHome.xy - uRipC; float rd = length(rv), ph = rd * .85 - uTime * .0034;
    P.z += sin(ph) * .3 * lockW;
    vec3 tax = normalize(vec3(-rv.y, rv.x, 0.) + vec3(.0001, 0., 0.)); float ta = cos(ph) * .2 * lockW;
    p = rot(p, tax, ta); n = rot(n, tax, ta);
    float a0 = aRot0.w * (1. - pin); p = rot(p, aRot0.xyz, a0); n = rot(n, aRot0.xyz, a0);
    float sc = 1.;
    if (po > 0.) {
      float sa = po * aSpin.w; p = rot(p, aSpin.xyz, sa); n = rot(n, aSpin.xyz, sa);
      if (uGather > .5) { P = mix(P, uGatherP, po); sc = 1. - po * .92; }
      else {
        float sw = uSwirl * po * (1.2 - length(aHome.xy) / 12.), c = cos(sw), s = sin(sw);
        P.xy = mat2(c, s, -s, c) * P.xy * (1. + abs(uSwirl) * po * .2);
        P += aVel * po; P.y -= uGrav * po * po;
      }
    }
    vUv = (aHome.xy + position.xy) / uSize + .5;
    vFront = aFace.x; vEdge = aFace.y; vLoose = max(max(1. - pin, po), .45 * aOrbit.x);
    vPh = fract(sin(dot(aHome.xy, vec2(12.9898, 78.233))) * 43758.5453);
    vFade = uGather > .5 ? 1. : 1. - smoothstep(.75, 1., po);
    vec4 mv = viewMatrix * modelMatrix * vec4(P + p * sc, 1.);
    vN = normalize(mat3(viewMatrix) * mat3(modelMatrix) * n); vV = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }`
const FRAG = /* glsl */`
  uniform sampler2D map;
  uniform float uAlpha, uSweep, uTime;
  varying vec2 vUv;
  varying vec3 vN, vV;
  varying float vFront, vEdge, vLoose, vFade, vPh;
  void main() {
    if (vFade < .01) discard;
    vec3 N = normalize(vN), V = normalize(vV), L = normalize(vec3(-.4, .6, .7));
    float spec = pow(max(dot(reflect(-L, N), V), 0.), 36.);
    float fres = pow(1. - max(dot(N, V), 0.), 3.);
    vec3 col;
    if (vFront > .5) {
      col = texture2D(map, clamp(vUv, 0., 1.)).rgb;
      col *= mix(1., .5, vLoose);                                       // loose glass is darker; locked, the film reads clean
      float edge = 1. - smoothstep(0., .09, vEdge);                     // the bevel where neighbours meet
      col = mix(col, vec3(1., .86, .62), edge * (.05 + .55 * vLoose)); // locked, the seams almost vanish
      float s = vUv.x + vUv.y * .45 - uSweep;                           // a sheen crossing the locked screen
      col += vec3(1., .9, .75) * exp(-s * s * 90.) * .35 * (1. - vLoose);
      float gl = pow(max(sin(uTime * .0021 + vPh * 60.), 0.), 70.);  // now and then one shard catches the light
      col += vec3(1., .93, .8) * gl * .55 * (1. - vLoose) + vec3(1., .8, .5) * gl * edge * .6;
    } else {
      col = vec3(.05, .05, .06) + vec3(1., .74, .38) * fres * .7;        // the glass body: dark, an amber rim
    }
    col += vec3(1.) * spec * (.25 + .55 * vLoose);
    gl_FragColor = vec4(col, uAlpha * vFade);
  }`

// one film's glass: every shard extruded into a prism around its centroid, all in one geometry
function buildGlass(polys, shard) {
  const pos = [], nor = [], home = [], from = [], vel = [], rot0 = [], spin = [], time = [], face = [], orb = []
  polys.forEach((poly) => {
    let orbit = [0, 0, 0, 0]; if (poly.orbit) { orbit = poly.orbit; poly = poly.p }
    if (poly.length < 3) return
    poly = ccw(poly); const A = area(poly); if (A < .012) return
    let cx = 0, cy = 0
    for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length], x = a[0] * b[1] - b[0] * a[1]; cx += (a[0] + b[0]) * x; cy += (a[1] + b[1]) * x }
    cx /= 6 * A; cy /= 6 * A
    const rm = Math.sqrt(A / Math.PI), k = Math.max(.94, 1 - .01 / rm) // a hairline gap between shards
    const L = poly.map(([x, y]) => [(x - cx) * k, (y - cy) * k])
    const s = shard(cx, cy)
    const put = (p, n, fr, ed) => { pos.push(...p); nor.push(...n); home.push(cx, cy, 0); from.push(...s.from); vel.push(...s.vel); rot0.push(...s.rot0); spin.push(...s.spin); time.push(s.dIn, s.dOut); face.push(fr, ed); orb.push(...orbit) }
    const z = TH / 2
    for (let i = 0; i < L.length; i++) {
      const a = L[i], b = L[(i + 1) % L.length], dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1
      const dc = Math.abs(a[0] * dy - a[1] * dx) / len // centroid → this edge: the bevel fades over it
      put([0, 0, z], [0, 0, 1], 1, dc); put([a[0], a[1], z], [0, 0, 1], 1, 0); put([b[0], b[1], z], [0, 0, 1], 1, 0)
      put([0, 0, -z], [0, 0, -1], 0, 1); put([b[0], b[1], -z], [0, 0, -1], 0, 1); put([a[0], a[1], -z], [0, 0, -1], 0, 1)
      const sn = [dy / len, -dx / len, 0]
      put([a[0], a[1], z], sn, 0, 1); put([a[0], a[1], -z], sn, 0, 1); put([b[0], b[1], -z], sn, 0, 1)
      put([a[0], a[1], z], sn, 0, 1); put([b[0], b[1], -z], sn, 0, 1); put([b[0], b[1], z], sn, 0, 1)
    }
  })
  const g = new THREE.BufferGeometry(), F = (a, n) => new THREE.Float32BufferAttribute(a, n)
  g.setAttribute('position', F(pos, 3)); g.setAttribute('normal', F(nor, 3)); g.setAttribute('aHome', F(home, 3)); g.setAttribute('aFrom', F(from, 3))
  g.setAttribute('aVel', F(vel, 3)); g.setAttribute('aRot0', F(rot0, 4)); g.setAttribute('aSpin', F(spin, 4)); g.setAttribute('aTime', F(time, 2)); g.setAttribute('aFace', F(face, 2)); g.setAttribute('aOrbit', F(orb, 4))
  return g
}

// how the shards arrive (from, rotation, delay) …
const ARRIVE = {
  spiral: (r, x, y, d) => { const a = Math.atan2(y, x) + 1.3 + r() * .6, R = 7 + r() * 12; return { from: [Math.cos(a) * R, Math.sin(a) * R, -28 - r() * 22], ang: 3 + r() * 5, dIn: d * 520 + r() * 160 } },
  rain: (r, x, y) => ({ from: [x + (r() - .5) * 3, y + 13 + r() * 9, -3 - r() * 9], ang: 2 + r() * 3, dIn: (y / H + .5) * 460 + r() * 170 }),
  sweep: (r, x, y) => ({ from: [x - W * 1.3 - r() * 10, y + (r() - .5) * 6, 2 - r() * 14], ang: 4 + r() * 4, dIn: (x / W + .5) * 520 + r() * 130 }),
  sides: (r, x, y) => { const k = Math.floor(r() * 4), far = 16 + r() * 8, j = (r() - .5) * 8 // each piece from its own side
    const f = [[-far, y + j, -r() * 10], [far, y + j, -r() * 10], [x + j, far * .7, -r() * 10], [x + j, -far * .7, -r() * 10]][k]
    return { from: f, ang: 4 + r() * 5, dIn: r() * 560 } },
  cross: (r, x, y) => ({ from: [x + Math.sign(x || 1) * (14 + r() * 8), y + (x < 0 ? -1 : 1) * (5 + r() * 5), -6 - r() * 12], ang: 3 + r() * 4, dIn: (1 - Math.abs(x) / (W / 2)) * 300 + r() * 220 }), // the two halves from opposite corners
  bloom: (r, x, y, d) => ({ from: [(r() - .5) * 1.2, (r() - .5) * 1.2, -32 - r() * 10], ang: 5 + r() * 4, dIn: d * 620 + r() * 110 }),
}
// … and how they leave (velocity, spin, delay; gravity and swirl are per film)
const BREAK = {
  burst: (r, x, y, d) => ({ vel: [x * (.35 + r() * .5), y * (.35 + r() * .5), 16 + r() * 12], spin: 4 + r() * 6, dOut: d * 300 + r() * 120 }),
  fall: (r, x, y) => ({ vel: [(r() - .5) * 3, r() * 2.5, 2 + r() * 6], spin: 2 + r() * 4, dOut: (y / H + .5) * 330 + r() * 110 }),
  vortex: (r, x, y, d) => ({ vel: [0, 0, 6 + r() * 10], spin: 5 + r() * 5, dOut: Math.max(0, .75 - d) * 380 + r() * 80 }),
  blast: (r, x, y, d, imp) => { const dx = x - imp[0], dy = y - imp[1], l = Math.hypot(dx, dy) || 1, v = 14 + r() * 10; return { vel: [dx / l * v, dy / l * v, 4 + r() * 6], spin: 6 + r() * 6, dOut: l / 10 * 380 + r() * 60 } },
  gather: (r, x, y, d) => ({ vel: [0, 0, 0], spin: 3 + r() * 4, dOut: d * 300 + r() * 120 }),
}
// each screen comes together turned its own way, settles with a little of that lean, and swings further as it breaks
const POSES = [[.05, .62, -.1], [.05, -.62, .1], [.55, .1, .06], [-.45, -.25, -.08], [.2, .45, .22], [-.15, -.4, -.24]] // rx, ry, rz
const BREAK_U = { burst: [0, 0], fall: [26, 0], vortex: [0, 3.2], blast: [0, 0], gather: [0, 0] } // [gravity, swirl]

function titleTexture(title, k, n) {
  const c = document.createElement('canvas'); c.width = 2048; c.height = 200; const g = c.getContext('2d')
  g.textAlign = 'center'; g.textBaseline = 'middle'
  g.fillStyle = '#FFC46E'; g.font = '500 34px "Spline Sans Mono", monospace'
  g.fillText(`FILM ${String(k + 1).padStart(2, '0')} / ${String(n).padStart(2, '0')}`.split('').join(' '), 1024, 40)
  g.fillStyle = '#F2F1EC'; g.font = '800 120px "Big Shoulders Display", sans-serif'
  g.fillText(title.toUpperCase(), 1024, 135)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t
}

export function createShards3d(host, films, { getPointer } = {}) {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' })
  if (!renderer.getContext()) throw new Error('no webgl')
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5)); renderer.setClearColor(0x000000, 0)
  const cv = renderer.domElement; cv.className = 'sh3-cv'; host.appendChild(cv)
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(35, 1, .1, 200); camera.position.z = 22
  const stage = new THREE.Group(); scene.add(stage)
  const fonts = document.fonts?.load ? Promise.all(['800 120px "Big Shoulders Display"', '500 34px "Spline Sans Mono"'].map((f) => document.fonts.load(f))).catch(() => {}) : Promise.resolve()

  // a fresh mix on every visit: no two films share a cut, an arrival or a break
  const pin = new URLSearchParams(location.search).get('hx_cut') // e.g. ?hx_cut=radial,blocks,glass pins the cuts (for review)
  const pinS = (new URLSearchParams(location.search).get('hx_shape') || '').split(',').filter((k) => SHAPES[k]) // e.g. ?hx_shape=circle,diamond,cinema
  const shapes = pinS.length ? pinS : shuffle(Object.keys(SHAPES))
  const pinned = pin ? pin.split(',').filter((k) => PATTERNS[k]) : [], pats = pinned.length ? pinned : shuffle(Object.keys(PATTERNS)), arr = shuffle(Object.keys(ARRIVE)), poses = shuffle(POSES.map((_, i) => i)), brk = shuffle(['burst', 'fall', 'vortex', 'blast'])
  const loader = new THREE.TextureLoader()
  const F = films.map((film, k) => {
    const el = document.createElement('video')
    Object.assign(el, { src: smallClip(film.clip), muted: true, loop: true, playsInline: true, preload: 'auto', crossOrigin: 'anonymous' })
    const vtex = new THREE.VideoTexture(el); vtex.colorSpace = THREE.SRGBColorSpace; vtex.minFilter = THREE.LinearFilter; vtex.generateMipmaps = false
    const poster = loader.load(film.poster); poster.colorSpace = THREE.SRGBColorSpace
    const v = { el, vtex, poster, ready: false, on: false }
    el.addEventListener('playing', () => { v.ready = true })
    const group = new THREE.Group(); stage.add(group)

    const last = k === films.length - 1, rnd = prng(31 + k * 977 + Math.floor(Math.random() * 1e6))
    const cut = PATTERNS[pats[k % pats.length]](rnd), shape = SHAPES[shapes[k % shapes.length]], impact = cut.impact
    const polys = cut.polys.map((p) => toShape(ccw(p), shape))
    for (let i = 0; i < 20; i++) { // small loose pieces that orbit the screen
      const cx = (rnd() - .5) * W * .8, cy = (rnd() - .5) * H * .8, n = 3 + Math.floor(rnd() * 3), R = .22 + rnd() * .4, a0 = rnd() * 6.283
      const p = Array.from({ length: n }, (_, j) => { const a = a0 + j * 6.283 / n + (rnd() - .5) * .8, rr = R * (.6 + rnd() * .6); return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr] })
      polys.push({ p, orbit: [1, rnd() * 6.283, (rnd() < .5 ? -1 : 1) * (.00035 + rnd() * .0005), 1 + rnd() * .22] })
    }
    const arrive = ARRIVE[arr[k % arr.length]], bName = last ? 'gather' : brk[k % brk.length], leave = BREAK[bName]
    const axis = () => { const a = new THREE.Vector3(rnd() - .5, rnd() - .5, rnd() - .5).normalize(); return [a.x, a.y, a.z] }
    const geo = buildGlass(polys, (x, y) => {
      const d = Math.hypot(x / W, y / H), a = arrive(rnd, x, y, d), b = leave(rnd, x, y, d, impact)
      return { from: a.from, rot0: [...axis(), a.ang], dIn: a.dIn, vel: b.vel, spin: [...axis(), b.spin], dOut: b.dOut }
    })
    const mat = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: true,
      uniforms: { map: { value: poster }, uAlpha: { value: 0 }, uSweep: { value: -1 }, uSize: { value: new THREE.Vector2(W, H) },
        uT: { value: -1e4 }, uB: { value: HOLD }, uGrav: { value: BREAK_U[bName][0] }, uSwirl: { value: BREAK_U[bName][1] * (rnd() < .5 ? -1 : 1) },
        uGather: { value: last ? 1 : 0 }, uTime: { value: 0 }, uRipC: { value: new THREE.Vector2(impact[0], impact[1]) }, uGatherP: { value: new THREE.Vector3(0, 0, 3) } } })
    const pose = POSES[poses[k % poses.length]] // the screen's own tilt
    const mesh = new THREE.Mesh(geo, mat); mesh.frustumCulled = false; group.add(mesh)

    const tmat = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, opacity: 0 })
    const title = new THREE.Mesh(new THREE.PlaneGeometry(W * 1.25, W * 1.25 * 200 / 2048), tmat)
    title.position.y = -H / 2 - 1.25; group.add(title)
    fonts.then(() => { tmat.map = titleTexture(film.title || '', k, films.length); tmat.needsUpdate = true })
    return { k, v, group, mat, mesh, tmat, title, pose }
  })

  // the point of light the last screen falls into
  const glowTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'), r = g.createRadialGradient(64, 64, 0, 64, 64, 64)
    r.addColorStop(0, 'rgba(255,244,218,1)'); r.addColorStop(.3, 'rgba(255,196,110,.6)'); r.addColorStop(1, 'rgba(232,160,19,0)')
    g.fillStyle = r; g.fillRect(0, 0, 128, 128); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t
  })()
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }))
  scene.add(glow)

  let vw = 0, vh = 0
  const size = () => {
    vw = host.clientWidth || innerWidth; vh = host.clientHeight || innerHeight
    renderer.setSize(vw, vh, false); camera.aspect = vw / vh; camera.updateProjectionMatrix()
    const vH = 2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)), vW = vH * camera.aspect
    stage.scale.setScalar(Math.min(vW * .72 / W, vH * .74 / (H + 3)))
    stage.position.y = 1.15 * stage.scale.x // the screen and its title sit centred together (the title hangs below the screen)
  }
  size(); addEventListener('resize', size)

  const tilt = { x: 0, y: 0 }
  let painted = false
  const stopAll = () => F.forEach((f) => { if (f.v.on) { f.v.el.pause(); f.v.on = false } })

  return {
    update(t, act0, act1) {
      const on = t > act0 - 300 && t < act1 + 400
      if (!on) { if (painted) { renderer.clear(); painted = false; stopAll() } return }
      painted = true
      const fadeAct = sstep(act0 - 300, act0 + 200, t) * (1 - sstep(act1 - 150, act1 + 300, t))
      const Pt = getPointer ? getPointer() : null
      tilt.x += ((Pt?.in ? (Pt.y / vh - .5) * .35 : 0) - tilt.x) * .06; tilt.y += ((Pt?.in ? (Pt.x / vw - .5) * .5 : 0) - tilt.y) * .06
      let glowA = 0
      for (const f of F) {
        const last = f.k === F.length - 1
        const a0 = act0 + 100 + f.k * STEP, b0 = a0 + HOLD, end = b0 + OUT + 500
        const live = t > a0 - 200 && t < end
        f.group.visible = live
        // its film plays while it is on screen
        if (live && !f.v.on) { f.v.on = true; f.v.el.currentTime = 0; f.v.el.play().catch(() => {}) }
        if (!live && f.v.on) { f.v.el.pause(); f.v.on = false }
        if (!live) continue
        const u = f.mat.uniforms
        u.map.value = f.v.ready ? f.v.vtex : f.v.poster
        u.uAlpha.value = fadeAct; u.uT.value = t - a0; u.uTime.value = t
        u.uSweep.value = -.6 + 2.6 * clamp01((t - a0 - IN * .7) / 1300)
        const locked = sstep(a0 + IN * .6, a0 + IN + 200, t) * (1 - sstep(b0 - 50, b0 + 150, t))
        const turn = 1 - .72 * sstep(a0 + 150, a0 + IN + 250, t) + .9 * sstep(b0 - 100, b0 + OUT, t) // turned in → a slight lean → swings as it breaks
        f.group.rotation.set(f.pose[0] * turn + tilt.x * locked + Math.sin(t * .0006 + f.k) * .03, f.pose[1] * turn + tilt.y * locked + Math.sin(t * .0005 + f.k * 2) * .05 + Math.sin(t * .0011 + f.k) * .12 * locked, f.pose[2] * turn)
        f.group.position.z = (t - a0) * .0006 // a slow push toward the camera while it plays
        f.tmat.opacity = fadeAct * sstep(a0 + IN * .8, a0 + IN + 300, t) * (1 - sstep(b0 - 250, b0, t))
        f.title.position.y = -H / 2 - 1.25 - (1 - sstep(a0 + IN * .8, a0 + IN + 300, t)) * .4
        if (last) glowA = sstep(b0 + 100, b0 + OUT, t) * (1 - sstep(act1 - 100, act1 + 300, t))
      }
      glow.material.opacity = glowA * fadeAct; glow.scale.setScalar((1 + glowA * 5) * stage.scale.x); glow.position.z = 3 * stage.scale.x
      renderer.render(scene, camera)
    },
    destroy() {
      removeEventListener('resize', size); stopAll()
      F.forEach((f) => { f.v.el.removeAttribute('src'); f.v.el.load(); f.v.vtex.dispose(); f.v.poster.dispose(); f.mat.dispose(); f.mesh.geometry.dispose(); f.tmat.map?.dispose(); f.tmat.dispose(); f.title.geometry.dispose() })
      glowTex.dispose(); glow.material.dispose(); renderer.dispose(); host.replaceChildren()
    },
  }
}
