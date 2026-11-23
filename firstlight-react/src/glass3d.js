// The settled hero's glass ribbon in real 3D (2026-11-23; the manager, on the hero: "much better, we need some more effort —
// try the reference I sent (hyperframes.heygen.com), check three.js samples"). Plain WebGL2, no library: thick glass
// triangles with rounded, bevelled edges (a prism mesh built here), lit by a key light with a sharp specular, a fresnel rim
// whose colour turns with the viewing angle (thin-film iridescence), the film on their faces (a picture canvas: video + title,
// uploaded ~15×/s), all instanced — one draw call. The band flows from the bottom-right to the top-left: loose dark shards
// tumble in at the right, lock into a band carrying the film in the middle, fold into thin sheets at the top-left. On a film
// change the band breaks and re-forms (mirror break); the pointer lifts the glass near it. Falls back to null without WebGL2.
const clamp01 = (v) => Math.max(0, Math.min(1, v))
const sstep = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t) }
const prng = (seed) => () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let x = Math.imul(seed ^ (seed >>> 15), 1 | seed); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296 }
const norm = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l] }
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
// rotate vector v by Euler (x, y, z) applied z → y → x
const eul = (v, ax, ay, az) => {
  let [x, y, z] = v, c = Math.cos(az), s = Math.sin(az); [x, y] = [x * c - y * s, x * s + y * c]
  c = Math.cos(ay); s = Math.sin(ay); [x, z] = [x * c + z * s, -x * s + z * c]
  c = Math.cos(ax); s = Math.sin(ax); [y, z] = [y * c - z * s, y * s + z * c]
  return [x, y, z]
}

// a unit triangle prism (side 1, centred on its centroid) with rounded corners and bevelled cap edges.
// attributes: position, normal, part (0 front cap, 1 bevel/side, 2 back cap)
function prism() {
  const R = .09, seg = 4, H = .085, IN = .045 // corner radius, half thickness, bevel inset
  const tri = [[-.5, -.2887], [.5, -.2887], [0, .5774]]
  const outline = () => { // the triangle with each corner replaced by an arc of radius R
    const pts = []
    for (let i = 0; i < 3; i++) {
      const p = tri[i], pa = tri[(i + 2) % 3], pb = tri[(i + 1) % 3]
      const da = norm([pa[0] - p[0], pa[1] - p[1], 0]), db = norm([pb[0] - p[0], pb[1] - p[1], 0])
      const half = Math.acos(da[0] * db[0] + da[1] * db[1]) / 2, bis = norm([da[0] + db[0], da[1] + db[1], 0])
      const c = [p[0] + bis[0] * R / Math.sin(half), p[1] + bis[1] * R / Math.sin(half)], tl = R / Math.tan(half)
      const tA = [p[0] + da[0] * tl, p[1] + da[1] * tl], tB = [p[0] + db[0] * tl, p[1] + db[1] * tl]
      let s0 = Math.atan2(tA[1] - c[1], tA[0] - c[0]), e0 = Math.atan2(tB[1] - c[1], tB[0] - c[0])
      let d = e0 - s0; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI
      for (let k = 0; k <= seg; k++) { const t = s0 + d * k / seg; pts.push([c[0] + Math.cos(t) * R, c[1] + Math.sin(t) * R]) }
    }
    return pts
  }
  const outer = outline(), inner = outer.map((q) => [q[0] * (1 - IN * 2.2), q[1] * (1 - IN * 2.2)]), n = outer.length
  const P = [], N = [], K = []
  const push = (p, nn, k) => { P.push(...p); N.push(...nn); K.push(k) }
  const quad = (a, b, c, d, nn, k) => { push(a, nn, k); push(b, nn, k); push(c, nn, k); push(a, nn, k); push(c, nn, k); push(d, nn, k) }
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n, o0 = outer[i], o1 = outer[j], i0 = inner[i], i1 = inner[j]
    // caps (fans from the centre)
    push([0, 0, H], [0, 0, 1], 0); push([i0[0], i0[1], H], [0, 0, 1], 0); push([i1[0], i1[1], H], [0, 0, 1], 0)
    push([0, 0, -H], [0, 0, -1], 2); push([i1[0], i1[1], -H], [0, 0, -1], 2); push([i0[0], i0[1], -H], [0, 0, -1], 2)
    const out = norm([(o0[1] - o1[1]), (o1[0] - o0[0]), 0]) // outward edge normal (counter-clockwise outline)
    const bevF = norm([out[0], out[1], .9]), bevB = norm([out[0], out[1], -.9])
    quad([i0[0], i0[1], H], [o0[0], o0[1], H * .45], [o1[0], o1[1], H * .45], [i1[0], i1[1], H], bevF, 1)
    quad([o0[0], o0[1], H * .45], [o0[0], o0[1], -H * .45], [o1[0], o1[1], -H * .45], [o1[0], o1[1], H * .45], out, 1)
    quad([o0[0], o0[1], -H * .45], [i0[0], i0[1], -H], [i1[0], i1[1], -H], [o1[0], o1[1], -H * .45], bevB, 1)
  }
  return { P: new Float32Array(P), N: new Float32Array(N), K: new Float32Array(K), count: K.length }
}

const VS = `#version 300 es
in vec3 aPos; in vec3 aNor; in float aPart;
in vec4 aM0; in vec4 aM1; in vec4 aM2; in vec4 aT; // per tile: basis columns (scaled) + translation, and band/flags
in vec4 aBand; // xy: tile centre in picture px, z: rotation (0 or pi), w: dark (1) / film (0)
in vec2 aFx;   // x: alpha, y: fold (iridescent sheets)
uniform vec2 uRes; uniform float uF; uniform float uDist;
out vec3 vN; out vec3 vW; out vec2 vLoc; out float vPart; out vec4 vBand; out vec2 vFx;
void main(){
  vec3 w = aM0.xyz * aPos.x + aM1.xyz * aPos.y + aM2.xyz * aPos.z + aT.xyz;
  vN = normalize(aM0.xyz * aNor.x + aM1.xyz * aNor.y + aM2.xyz * aNor.z);
  vW = w; vLoc = aPos.xy; vPart = aPart; vBand = aBand; vFx = aFx;
  float d = uDist - w.z; vec2 c = uRes * .5;
  vec2 sc = c + (w.xy - c) * (uF / d);
  vec2 ndc = sc / uRes * 2. - 1.; ndc.y = -ndc.y;
  float wc = d / uF, zn = clamp(d / (uDist * 3.), 0., 1.) * 2. - 1.;
  gl_Position = vec4(ndc * wc, zn * wc, wc);
}`
const FS = `#version 300 es
precision highp float;
in vec3 vN; in vec3 vW; in vec2 vLoc; in float vPart; in vec4 vBand; in vec2 vFx;
uniform sampler2D uPic; uniform vec2 uPicSize; uniform float uTileA; uniform vec2 uRes; uniform float uDist; uniform float uFlipU; uniform float uFlipV;
out vec4 o;
vec3 film(vec2 bp){ // band position → picture
  vec2 uv = bp / uPicSize; if (uFlipU > .5) uv.x = 1. - uv.x; if (uFlipV > .5) uv.y = 1. - uv.y;
  if (uv.x < 0. || uv.x > 1. || uv.y < 0. || uv.y > 1.) return vec3(-1.);
  return texture(uPic, uv).rgb;
}
void main(){
  vec3 N = normalize(vN); vec3 eye = vec3(uRes * .5, uDist); vec3 V = normalize(eye - vW);
  if (dot(N, V) < 0.) N = -N;
  vec3 L = normalize(vec3(-.45, -.7, .55)); vec3 H = normalize(L + V);
  float diff = max(dot(N, L), 0.), spec = pow(max(dot(N, H), 0.), 70.), fres = pow(1. - max(dot(N, V), 0.), 3.);
  vec3 iri = mix(vec3(.5, .52, .56), .55 + .45 * cos(6.2832 * (fres * 1.3 + vec3(0., .33, .67)) + vW.x * .004), .45); // a faint thin-film tint, not neon
  vec3 col;
  if (vPart < .5 && vBand.w < .5) {
    float c = cos(vBand.z), s = sin(vBand.z);
    vec2 bp = vBand.xy + mat2(c, s, -s, c) * vec2(-vLoc.x, vLoc.y) * uTileA; // local +x runs back along the band
    vec3 f = film(bp);
    col = f.x < 0. ? vec3(.07, .075, .09) : f * (.92 + .12 * diff);
  } else {
    col = vec3(.045, .048, .058) + .06 * diff;
  }
  float film01 = (vPart < .5 && vBand.w < .5) ? 1. : 0.;
  col = mix(col, iri * .85, clamp(fres * (vPart > .5 ? .6 : mix(.35, .08, film01)) + vFx.y * .5, 0., 1.)); // the film stays clean; the glass edges carry the colour
  col += vec3(1., .97, .92) * spec * (vPart > .5 ? 1.2 : .7);
  o = vec4(col, vFx.x);
}`

export function createGlass3d(host, films, { getIndex, alpha, getPointer, path }) {
  const cv = document.createElement('canvas'); cv.className = 'g3-cv'; host.appendChild(cv)
  const gl = cv.getContext('webgl2', { antialias: true, alpha: true, premultipliedAlpha: false })
  if (!gl) { cv.remove(); return null }
  const sh = (t, src) => { const s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s }
  const prog = gl.createProgram(); gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog)
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog))
  gl.useProgram(prog)
  const U = (n) => gl.getUniformLocation(prog, n), A = (n) => gl.getAttribLocation(prog, n)
  const vao = gl.createVertexArray(); gl.bindVertexArray(vao)
  const mesh = prism()
  const vbuf = (data, name, size) => { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW); const l = A(name); gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, size, gl.FLOAT, false, 0, 0) }
  vbuf(mesh.P, 'aPos', 3); vbuf(mesh.N, 'aNor', 3); vbuf(mesh.K, 'aPart', 1)
  const STRIDE = 22 // floats per instance: M0 M1 M2 T (16) + band (4) + fx (2)
  const ibuf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, ibuf)
  const iattr = [['aM0', 4, 0], ['aM1', 4, 4], ['aM2', 4, 8], ['aT', 4, 12], ['aBand', 4, 16], ['aFx', 2, 20]]
  for (const [n, size, off] of iattr) { const l = A(n); gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, size, gl.FLOAT, false, STRIDE * 4, off * 4); gl.vertexAttribDivisor(l, 1) }
  const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.enable(gl.DEPTH_TEST); gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

  let vw = 0, vh = 0, dpr = 1
  const F = 1100
  let rows = 4, h = 0, a = 0, bandH = 0, A3, B3, bend, Lu = 0, cols = 0, S0 = .34, S1 = .8, pu0 = 0, pu1 = 0, PW = 0, route = {}
  let tiles = [], data = new Float32Array(0)
  const pic = document.createElement('canvas'), pg = pic.getContext('2d')
  const setup = () => {
    vw = host.clientWidth; vh = host.clientHeight; dpr = Math.min(1.5, devicePixelRatio || 1)
    cv.width = Math.round(vw * dpr); cv.height = Math.round(vh * dpr); gl.viewport(0, 0, cv.width, cv.height)
    const phone = vw < 700
    route = path(vw, vh, phone); A3 = route.A; B3 = route.B; bend = route.bend
    h = route.h; a = h / .866; bandH = rows * h
    const len = Math.hypot(B3[0] - A3[0], B3[1] - A3[1], B3[2] - A3[2])
    cols = Math.ceil(len / (a / 2)) + 2; Lu = cols * (a / 2); pu0 = S0 * Lu; pu1 = S1 * Lu; PW = pu1 - pu0
    pic.width = 720; pic.height = Math.max(8, Math.round(720 * bandH / PW))
    const rnd = prng(4242); tiles = []
    for (let r = 0; r < rows; r++) for (let k = 0; k < cols; k++) {
      const up = (k + r) % 2 === 0
      tiles.push({ u: k * a / 2, v: r * h + (up ? h / 3 : h * 2 / 3), rot: up ? 0 : Math.PI, off: [(rnd() - .3) * 420, (rnd() - .2) * 380, (rnd() - .5) * 300], spin: [(rnd() - .5) * 2.4, (rnd() - .5) * 2.4, (rnd() - .5) * 2.4], ph: rnd() * 6.28, push: 0 })
    }
    data = new Float32Array(tiles.length * STRIDE)
    gl.uniform2f(U('uRes'), vw, vh); gl.uniform1f(U('uF'), F); gl.uniform1f(U('uDist'), F)
    gl.uniform2f(U('uPicSize'), PW, bandH); gl.uniform1f(U('uTileA'), a * .93)
    gl.uniform1f(U('uFlipU'), route.flipU ? 1 : 0); gl.uniform1f(U('uFlipV'), route.flipV ? 1 : 0)
  }
  const ro = new ResizeObserver(setup); ro.observe(host); setup()
  const pathAt = (s) => { const k = Math.sin(Math.PI * s); return [A3[0] + (B3[0] - A3[0]) * s + bend[0] * k, A3[1] + (B3[1] - A3[1]) * s + bend[1] * k, A3[2] + (B3[2] - A3[2]) * s] }

  // the films: a <video> each, drawn with the title into the picture canvas (2D; no video straight into GL)
  const media = films.map((f) => { const v = document.createElement('video'); v.muted = true; v.loop = true; v.playsInline = true; v.preload = 'none'; v.src = f.clip; const im = new Image(); im.src = f.poster; return { v, im, title: f.title } })
  let cur = -1, prev = -1, switchAt = -1e9, lastPic = -1e9
  const paint = (t) => {
    const want = getIndex() % media.length
    if (want !== cur) { prev = cur; cur = want; switchAt = t; media.forEach((m, j) => { if (j === cur) m.v.play().catch(() => {}); else if (j !== prev) m.v.pause() }) }
    if (prev >= 0 && t - switchAt > 1200) { media[prev].v.pause(); prev = -1 }
    if (t - lastPic < 60) return; lastPic = t
    const W = pic.width, H = pic.height, mix = prev >= 0 ? sstep(250, 750, t - switchAt) : 1
    const draw = (m, al) => {
      if (al <= 0) return; pg.globalAlpha = al
      const src = m.v.readyState >= 2 ? m.v : (m.im.complete && m.im.naturalWidth ? m.im : null)
      if (src) { const sw = src.videoWidth || src.naturalWidth, shh = src.videoHeight || src.naturalHeight, k = Math.max(W / sw, H / shh); pg.drawImage(src, (W - sw * k) / 2, (H - shh * k) / 2, sw * k, shh * k) }
      pg.font = `800 ${Math.round(H * .26)}px "Big Shoulders Display", Impact, sans-serif`; pg.fillStyle = 'rgba(255,255,255,.94)'
      pg.fillText(m.title.toUpperCase(), W * .06, H * .88)
    }
    pg.globalAlpha = 1; pg.fillStyle = '#121212'; pg.fillRect(0, 0, W, H)
    if (prev >= 0 && mix < 1) draw(media[prev], 1)
    draw(media[cur], prev >= 0 ? mix : 1)
    gl.bindTexture(gl.TEXTURE_2D, tex); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, pic)
  }

  const speed = () => Lu / 12000
  let painted = false
  return {
    update(t) {
      const la = alpha()
      if (la < .01) { if (painted) { gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); painted = false } return }
      painted = true
      paint(t)
      const P = getPointer(), shift = t * speed(), since = t - switchAt, tt = t * .001
      let n = 0
      for (const T of tiles) {
        const uc = (((T.u + shift) % Lu) + Lu) % Lu, sc = uc / Lu
        const lock = sstep(.12, S0 - .02, sc), fold = sstep(S1 - .02, .97, sc)
        const fade = sstep(0, .06, sc) * (1 - sstep(.93, 1, sc)) * la
        const burst = prev >= 0 && lock > .6 ? sstep(0, 240, since - (1 - sc) * 520) * (1 - sstep(340, 1150, since - (1 - sc) * 520)) : 0
        const loose = Math.max(1 - lock, burst * .7)
        // the band's frame at the tile: along (T), across (leaned back by `tw`, more as it folds)
        const C = pathAt(sc), C2 = pathAt(Math.min(1, sc + .01)), Tn = norm([C2[0] - C[0], C2[1] - C[1], C2[2] - C[2]])
        const Nn = norm(cross(Tn, [0, 0, 1])), tw = (28 + fold * 62) * Math.PI / 180
        const Ac = norm([Nn[0] * Math.cos(tw), Nn[1] * Math.cos(tw), Math.sin(tw)])
        const vv = (T.v - bandH / 2) * (1 - fold * .55)
        let pos = [C[0] + Ac[0] * vv, C[1] + Ac[1] * vv, C[2] + Ac[2] * vv]
        // tile axes: x along the band (−T: the picture reads from the far end), y across, z the face normal
        let X = [-Tn[0], -Tn[1], -Tn[2]], Y = Ac, Z = norm(cross(X, Y))
        if (loose > .01) {
          const ang = [ (T.spin[0] * tt + T.ph) * loose, (T.spin[1] * tt + T.ph * .7) * loose, T.spin[2] * tt * loose ]
          X = eul(X, ...ang); Y = eul(Y, ...ang); Z = eul(Z, ...ang)
          const o = T.off.map((x) => x * loose * loose); pos = [pos[0] + o[0], pos[1] + o[1], pos[2] + o[2]]
        }
        // the pointer lifts the glass near it
        const k0 = F / Math.max(60, F - pos[2]), sx = vw / 2 + (pos[0] - vw / 2) * k0, sy = vh / 2 + (pos[1] - vh / 2) * k0
        const want = P.in ? Math.pow(clamp01(1 - Math.hypot(sx - P.x, sy - P.y) / 170), 2) : 0
        T.push += (want - T.push) * .16
        if (T.push > .005) { pos = [pos[0] + (sx - P.x) * .25 * T.push, pos[1] + (sy - P.y) * .25 * T.push, pos[2] + 140 * T.push]; const r = T.push * .6; X = eul(X, r, 0, 0); Y = eul(Y, r, 0, 0); Z = eul(Z, r, 0, 0) }
        if (T.rot) { X = X.map((x) => -x); Y = Y.map((x) => -x) } // down-pointing tiles: the same prism turned half round
        const s = a * .93, o = n * STRIDE
        data[o] = X[0] * s; data[o + 1] = X[1] * s; data[o + 2] = X[2] * s; data[o + 3] = 0
        data[o + 4] = Y[0] * s; data[o + 5] = Y[1] * s; data[o + 6] = Y[2] * s; data[o + 7] = 0
        data[o + 8] = Z[0] * s; data[o + 9] = Z[1] * s; data[o + 10] = Z[2] * s; data[o + 11] = 0
        data[o + 12] = pos[0]; data[o + 13] = pos[1]; data[o + 14] = pos[2]; data[o + 15] = 1
        data[o + 16] = uc - pu0; data[o + 17] = T.v; data[o + 18] = T.rot; data[o + 19] = lock < .6 || uc + a < pu0 || uc - a > pu1 ? 1 : 0
        data[o + 20] = fade; data[o + 21] = fold
        n++
      }
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
      gl.bindBuffer(gl.ARRAY_BUFFER, ibuf); gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW)
      gl.bindVertexArray(vao); gl.drawArraysInstanced(gl.TRIANGLES, 0, mesh.count, n)
    },
    hit(x, y) { return y > 0 && x > 0 }, // the hero decides what a click means
    destroy() { ro.disconnect(); media.forEach((m) => m.v.pause()); gl.getExtension('WEBGL_lose_context')?.loseContext(); host.replaceChildren() },
  }
}
