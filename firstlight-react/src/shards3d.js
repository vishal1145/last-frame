// The glass act of the opening in real 3D (three.js) since 2026-11-24 (user: "this section can make more better and creative").
// On the night stage (no greige studio): for each film, thick glass triangles spiral in out of the depth and lock into one
// clean, upright 16:9 screen playing the film — its title set below it, never cut by the seams; a sheen runs across the
// glass and the screen leans toward the pointer; then the screen shatters toward the camera and the next film assembles
// behind it. The last film does not shatter: its pieces fall into one point of light, which the converge act flares into
// the brand mark (itself a triangle). Same API as createShards for the act: { update(t, act0, act1), destroy() }.
// Throws without WebGL so the caller can fall back to the 2D ribbon. Cheap: two instanced meshes per film, no post-processing.
import * as THREE from 'three'

const clamp01 = (v) => Math.max(0, Math.min(1, v))
const sstep = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t) }
const easeOut = (t) => 1 - Math.pow(1 - clamp01(t), 3)
const easeIn = (t) => Math.pow(clamp01(t), 2.2)
const prng = (seed) => () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let x = Math.imul(seed ^ (seed >>> 15), 1 | seed); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296 }
const SMALL = new Set(['coffee.mp4', 'embers.mp4', 'interview.mp4', 'perfume.mp4', 'runway.mp4', 'sneakers.mp4', 'unboxing.mp4'])
const smallClip = (src) => (src && /^\/video\/[^/]+\.mp4$/.test(src) && SMALL.has(src.split('/').pop()) ? src.replace('/video/', '/video/sm/') : src)

// the screen, in world units; the group is scaled to fit the viewport
const W = 16, H = 9, ROWS = 7, RH = H / ROWS, A = RH / .866, TH = A * .14 // row height, triangle side, glass thickness
// timing inside the act (ms from act0): film k assembles at STEP·k, holds, then breaks (the last one gathers into a point)
const STEP = 1900, IN = 900, HOLD = 1650, OUT = 700

const VERT = /* glsl */`
  attribute vec2 aCell;
  attribute vec3 aBary;
  attribute float aFront;
  attribute float aLoose;
  uniform vec2 uSize;
  varying vec2 vUv;
  varying vec3 vBary, vN, vV;
  varying float vFront, vLoose;
  void main() {
    vUv = (aCell + position.xy) / uSize + .5;
    vBary = aBary; vFront = aFront; vLoose = aLoose;
    vec4 wp = modelMatrix * instanceMatrix * vec4(position, 1.);
    vN = normalize(mat3(viewMatrix) * mat3(modelMatrix) * mat3(instanceMatrix) * normal);
    vec4 mv = viewMatrix * wp; vV = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }`
const FRAG = /* glsl */`
  uniform sampler2D map;
  uniform float uAlpha, uSweep;
  varying vec2 vUv;
  varying vec3 vBary, vN, vV;
  varying float vFront, vLoose;
  void main() {
    if (vUv.x < 0. || vUv.x > 1. || vUv.y < 0. || vUv.y > 1.) discard; // the screen's straight edges cut the border tiles
    vec3 N = normalize(vN), V = normalize(vV), L = normalize(vec3(-.4, .6, .7));
    float spec = pow(max(dot(reflect(-L, N), V), 0.), 36.);
    float fres = pow(1. - max(dot(N, V), 0.), 3.);
    vec3 col;
    if (vFront > .5) {
      col = texture2D(map, vUv).rgb;
      col *= mix(1., .5, vLoose);                                    // loose glass is darker; locked, the film reads clean
      float e = min(min(vBary.x, vBary.y), vBary.z);
      float edge = 1. - smoothstep(0., .07, e);                      // the bevel where neighbours meet
      col = mix(col, vec3(1., .86, .62), edge * (.05 + .55 * vLoose)); // locked, the seams almost vanish
      float s = vUv.x + vUv.y * .45 - uSweep;                        // a sheen crossing the locked screen
      col += vec3(1., .9, .75) * exp(-s * s * 90.) * .35 * (1. - vLoose);
    } else {
      col = vec3(.05, .05, .06) + vec3(1., .74, .38) * fres * .7;     // the glass body: dark, an amber rim
    }
    col += vec3(1.) * spec * (.25 + .55 * vLoose);
    gl_FragColor = vec4(col, uAlpha);
  }`

// one triangular prism around its centroid; aBary only matters on the front face
function prism(up) {
  const h = RH, s = up ? 1 : -1
  const v = [[-A / 2, -s * h / 3], [A / 2, -s * h / 3], [0, s * 2 * h / 3]].map(([x, y]) => [x * .985, y * .985]) // a hairline gap between tiles
  const P = [], B = [], F = []
  const tri = (a, b, c, front, bary) => { P.push(...a, ...b, ...c); B.push(...(bary || [0, 0, 0, 0, 0, 0, 0, 0, 0])); F.push(front, front, front) }
  const f = (i) => [v[i][0], v[i][1], TH / 2], k = (i) => [v[i][0], v[i][1], -TH / 2]
  const o = up ? [0, 1, 2] : [0, 2, 1] // counter-clockwise toward +z
  tri(f(o[0]), f(o[1]), f(o[2]), 1, [1, 0, 0, 0, 1, 0, 0, 0, 1])
  tri(k(o[0]), k(o[2]), k(o[1]), 0)
  for (let i = 0; i < 3; i++) { const a = o[i], b = o[(i + 1) % 3]; tri(f(a), k(a), k(b), 0); tri(f(a), k(b), f(b), 0) }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3))
  g.setAttribute('aBary', new THREE.Float32BufferAttribute(B, 3))
  g.setAttribute('aFront', new THREE.Float32BufferAttribute(F, 1))
  g.computeVertexNormals(); return g
}

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

  // the tiles of the screen: rows of alternating up/down triangles, centroids in screen units
  const cells = [[], []] // [down, up]
  for (let r = 0; r < ROWS; r++) for (let i = -1; i <= Math.ceil(2 * W / A) + 1; i++) {
    const up = (i + r) % 2 === 0, x = -W / 2 + i * A / 2, y = -H / 2 + r * RH + (up ? RH / 3 : 2 * RH / 3)
    if (x < -W / 2 - A / 2 || x > W / 2 + A / 2) continue
    cells[up ? 1 : 0].push([x, y])
  }
  const geos = [prism(false), prism(true)]
  const fonts = document.fonts?.load ? Promise.all(['800 120px "Big Shoulders Display"', '500 34px "Spline Sans Mono"'].map((f) => document.fonts.load(f))).catch(() => {}) : Promise.resolve()

  const loader = new THREE.TextureLoader()
  const F = films.map((film, k) => {
    const el = document.createElement('video')
    Object.assign(el, { src: smallClip(film.clip), muted: true, loop: true, playsInline: true, preload: 'auto', crossOrigin: 'anonymous' })
    const vtex = new THREE.VideoTexture(el); vtex.colorSpace = THREE.SRGBColorSpace; vtex.minFilter = THREE.LinearFilter; vtex.generateMipmaps = false
    const poster = loader.load(film.poster); poster.colorSpace = THREE.SRGBColorSpace
    const v = { el, vtex, poster, ready: false, on: false }
    el.addEventListener('playing', () => { v.ready = true })
    const group = new THREE.Group(); stage.add(group)
    const mat = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: true,
      uniforms: { map: { value: poster }, uAlpha: { value: 0 }, uSweep: { value: -1 }, uSize: { value: new THREE.Vector2(W, H) } } })
    const rnd = prng(31 + k * 977)
    const meshes = cells.map((list, up) => {
      const m = new THREE.InstancedMesh(geos[up], mat, list.length); m.frustumCulled = false
      m.geometry = geos[up].clone() // per-film instanced attributes live on its own geometry copy
      m.geometry.setAttribute('aCell', new THREE.InstancedBufferAttribute(new Float32Array(list.flat()), 2))
      const loose = new THREE.InstancedBufferAttribute(new Float32Array(list.length), 1); loose.setUsage(THREE.DynamicDrawUsage)
      m.geometry.setAttribute('aLoose', loose)
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
      m.userData.tiles = list.map(([x, y]) => {
        const d = Math.hypot(x / W, y / H) // 0 centre … ~.7 corner
        const ang = Math.atan2(y, x) + 1.3 + rnd() * .6, r = 7 + rnd() * 12
        return {
          home: new THREE.Vector3(x, y, 0),
          from: new THREE.Vector3(Math.cos(ang) * r, Math.sin(ang) * r, -28 - rnd() * 22),            // spiralling in out of the depth
          qFrom: new THREE.Quaternion().setFromEuler(new THREE.Euler((rnd() - .5) * 9, (rnd() - .5) * 9, (rnd() - .5) * 6)),
          vel: new THREE.Vector3(x * (.35 + rnd() * .5), y * (.35 + rnd() * .5), 16 + rnd() * 12),      // the burst, toward the camera
          axis: new THREE.Vector3(rnd() - .5, rnd() - .5, rnd() - .5).normalize(), spin: 4 + rnd() * 6,
          dIn: d * 520 + rnd() * 160, dOut: d * 300 + rnd() * 120,
        }
      })
      group.add(m); return m
    })
    const tmat = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, opacity: 0 })
    const title = new THREE.Mesh(new THREE.PlaneGeometry(W * 1.25, W * 1.25 * 200 / 2048), tmat)
    title.position.y = -H / 2 - 1.25; group.add(title)
    fonts.then(() => { tmat.map = titleTexture(film.title || '', k, films.length); tmat.needsUpdate = true })
    return { k, v, group, mat, meshes, tmat, title }
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
    stage.position.y = 1.15 * stage.scale.x // the screen + its title sit centred together (the title hangs below the screen) // the screen and its title fit, on wide and tall screens
  }
  size(); addEventListener('resize', size)

  const GATHER = new THREE.Vector3(0, 0, 3), M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), Qs = new THREE.Quaternion(), P = new THREE.Vector3(), S = new THREE.Vector3(), I = new THREE.Quaternion()
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
        const a0 = act0 + 100 + f.k * STEP, b0 = a0 + HOLD, end = b0 + OUT + 400
        const live = t > a0 - 200 && t < end
        f.group.visible = live
        // its film plays while it is on screen
        if (live && !f.v.on) { f.v.on = true; f.v.el.currentTime = 0; f.v.el.play().catch(() => {}) }
        if (!live && f.v.on) { f.v.el.pause(); f.v.on = false }
        if (!live) continue
        f.mat.uniforms.map.value = f.v.ready ? f.v.vtex : f.v.poster
        f.mat.uniforms.uAlpha.value = fadeAct
        f.mat.uniforms.uSweep.value = -.6 + 2.6 * clamp01((t - a0 - IN * .7) / 1300)
        const locked = sstep(a0 + IN * .6, a0 + IN + 200, t) * (1 - sstep(b0 - 50, b0 + 150, t))
        f.group.rotation.set(tilt.x * locked + Math.sin(t * .0006 + f.k) * .03, tilt.y * locked + Math.sin(t * .0005 + f.k * 2) * .05, 0)
        f.group.position.z = (t - a0) * .0006 // a slow push toward the camera while it plays
        f.tmat.opacity = fadeAct * sstep(a0 + IN * .8, a0 + IN + 300, t) * (1 - sstep(b0 - 250, b0, t))
        f.title.position.y = -H / 2 - 1.25 - (1 - sstep(a0 + IN * .8, a0 + IN + 300, t)) * .4
        if (last) glowA = sstep(b0 + 100, b0 + OUT, t) * (1 - sstep(act1 - 100, act1 + 300, t))
        for (const m of f.meshes) {
          const loose = m.geometry.attributes.aLoose
          m.userData.tiles.forEach((T, i) => {
            const pin = easeOut((t - a0 - T.dIn) / 650) // assembling: out of the depth into its place, turning square
            P.lerpVectors(T.from, T.home, pin); Q.slerpQuaternions(T.qFrom, I, pin); S.setScalar(1)
            let lo = 1 - pin
            const po = easeIn((t - b0 - T.dOut) / (OUT - 150))
            if (po > 0) {
              if (last) { // gathering into one point of light
                P.lerp(GATHER, po); S.setScalar(1 - po * .92)
                Qs.setFromAxisAngle(T.axis, po * T.spin * .6); Q.multiply(Qs)
              } else { // the burst: past the camera, spinning
                P.addScaledVector(T.vel, po); Qs.setFromAxisAngle(T.axis, po * T.spin); Q.multiply(Qs)
              }
              lo = Math.max(lo, po)
            }
            loose.array[i] = lo
            M4.compose(P, Q, S); m.setMatrixAt(i, M4)
          })
          m.instanceMatrix.needsUpdate = true; loose.needsUpdate = true
        }
      }
      glow.material.opacity = glowA * fadeAct; glow.scale.setScalar((1 + glowA * 5) * stage.scale.x); glow.position.z = 3 * stage.scale.x
      renderer.render(scene, camera)
    },
    destroy() {
      removeEventListener('resize', size); stopAll()
      F.forEach((f) => { f.v.el.removeAttribute('src'); f.v.el.load(); f.v.vtex.dispose(); f.v.poster.dispose(); f.mat.dispose(); f.tmat.map?.dispose(); f.tmat.dispose(); f.title.geometry.dispose(); f.meshes.forEach((m) => m.geometry.dispose()) })
      geos.forEach((g) => g.dispose()); glowTex.dispose(); glow.material.dispose(); renderer.dispose(); host.replaceChildren()
    },
  }
}
