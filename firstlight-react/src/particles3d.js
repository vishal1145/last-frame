// The film act as a particle storm (three.js), 2026-11-25 (user: "aise awsome look nhi aa rha … kuchh awsome look wala",
// replacing the glass shards of shards3d.js, which stays as an alternative). Every film is drawn by ~22k glowing points that
// each carry one pixel of the playing video. A film arrives out of a storm — a galaxy, a tunnel of light, a turning sphere
// or a rolling wave, different each visit — and the points stream into place to form the picture; while it plays the
// surface breathes and the pointer pushes the points aside; then it blows back into a storm and the next film forms.
// The last film spirals into one point of light, which the converge act flares into the brand mark.
// Same API as createShards: { update(t, act0, act1), destroy() }. Throws without WebGL (caller falls back to 2D).
// All motion is in the vertex shader; per frame the CPU sets a handful of uniforms.
import * as THREE from 'three'

const clamp01 = (v) => Math.max(0, Math.min(1, v))
const sstep = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t) }
const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]] } return a }
const SMALL = new Set(['coffee.mp4', 'embers.mp4', 'interview.mp4', 'perfume.mp4', 'runway.mp4', 'sneakers.mp4', 'unboxing.mp4'])
const smallClip = (src) => (src && /^\/video\/[^/]+\.mp4$/.test(src) && SMALL.has(src.split('/').pop()) ? src.replace('/video/', '/video/sm/') : src)

const W = 16, H = 9, COLS = 200, ROWS = 112
// timing inside the act (ms from act0): film k forms at STEP·k, holds, then blows away
const STEP = 1900, IN = 1000, HOLD = 1650, OUT = 750
const STORMS = ['galaxy', 'tunnel', 'sphere', 'wave'] // index = uniform value

const VERT = /* glsl */`
  attribute vec2 aUv;
  attribute vec4 aRnd;
  uniform sampler2D map;
  uniform float uT, uB, uTime, uIn, uOut, uGather, uPx, uScale, uSweep, uAlpha;
  uniform vec2 uPtr;
  uniform float uPtrOn;
  varying vec3 vCol;
  varying float vA, vLoose;
  const float PI = 3.14159265;
  mat2 r2(float a) { float c = cos(a), s = sin(a); return mat2(c, s, -s, c); }
  // where a point is while it is part of a storm
  vec3 storm(float m, vec4 r, float t) {
    if (m < .5) {          // galaxy: arms that wind tighter toward the core, the whole disc tilted
      float rad = 1. + pow(r.x, .7) * 15., a = r.y * 6.2832 + rad * .38 + t * .0009 * (9. / (rad + 2.));
      vec3 p = vec3(cos(a) * rad, (r.z - .5) * (2.6 - rad * .1), sin(a) * rad);
      p.yz = r2(-1.05) * p.yz; return p + vec3(0., 0., -6.);
    } else if (m < 1.5) {  // tunnel: rings of light rushing at the camera
      float a = r.y * 6.2832 + t * .0007, rad = 6. + r.x * 5., z = -38. + fract(r.z + t * .00028) * 50.;
      return vec3(cos(a) * rad * 1.5, sin(a) * rad, z);
    } else if (m < 2.5) {  // a turning sphere of points
      float th = r.y * 6.2832 + t * .0005, ph = acos(2. * r.z - 1.), rad = 8. + r.x * 1.5;
      return vec3(sin(ph) * cos(th) * rad * 1.3, cos(ph) * rad, sin(ph) * sin(th) * rad - 4.);
    }
    float x = (r.x - .5) * 46., z = (r.y - .5) * 30. - 10.;   // a rolling wave
    return vec3(x, sin(x * .28 + t * .0022) * 2.2 + cos(z * .3 + t * .0016) * 1.8 - 3. + (r.z - .5) * .6, z);
  }
  void main() {
    vec2 home = (aUv - .5) * vec2(${W}., ${H}.);
    // forming: centre first, with a scatter; leaving: the edges first
    float dIn = length(aUv - .5) * 520. + aRnd.w * 380.;
    float dOut = (.75 - length(aUv - .5)) * 300. + aRnd.w * 260.;
    float pin = clamp((uT - dIn) / 900., 0., 1.); pin = pin * pin * (3. - 2. * pin);
    float po = clamp((uT - uB - dOut) / ${OUT - 200}., 0., 1.); po = po * po;
    vec3 P = vec3(home, 0.);
    // the picture breathes: a slow swell runs across it, each point twinkles in depth
    P.z += (sin(home.x * .5 + uTime * .0026) * .22 + cos(home.y * .7 - uTime * .0019) * .16) + (aRnd.x - .5) * .05;
    // the pointer pushes the points aside and lifts them
    vec2 dp = home - uPtr; float pf = exp(-dot(dp, dp) / 3.2) * uPtrOn * pin * (1. - po);
    P.xy += normalize(dp + 1e-4) * pf * 1.4; P.z += pf * 2.2;
    // arriving out of one storm, curling on the way
    vec3 S = storm(uIn, aRnd, uTime);
    vec3 curl = vec3(sin(aRnd.y * 40.), cos(aRnd.z * 40.), sin(aRnd.x * 40.)) * 4.;
    P = mix(S, P, pin) + curl * sin(pin * PI) * .6;
    // leaving: into another storm, or (last film) a spiral down into one point
    if (po > 0.) {
      if (uGather > .5) {
        vec3 g = vec3(0., -1.15, 3.); /* the middle of the view, where the mark flares */ vec3 d = P - g; d.xy = r2(po * 7. * (1. - aRnd.x * .4)) * d.xy;
        P = g + d * pow(1. - po, 1.6);
      } else P = mix(P, storm(uOut, aRnd.yzxw, uTime), po) + curl * sin(po * PI) * .8;
    }
    float loose = max(1. - pin, po); vLoose = loose;
    vec3 c = texture2D(map, aUv).rgb;
    float s = aUv.x + aUv.y * .45 - uSweep; c += vec3(1., .9, .75) * exp(-s * s * 90.) * .3 * (1. - loose); // the sheen
    vec3 warm = mix(vec3(1., .78, .45), vec3(.75, .85, 1.), aRnd.z);
    vCol = mix(c, c * 1.4 + warm * .35, loose) + vec3(1., .95, .85) * pf * .5;
    vec4 mv = modelViewMatrix * vec4(P, 1.);
    float sz = mix(.14, .05 + aRnd.x * .1, loose) * (1. + pf * .6);
    gl_PointSize = max(1., sz * uScale * uPx / -mv.z);
    vA = uAlpha * mix(1., .55 + aRnd.y * .45, loose) * smoothstep(-60., -8., mv.z) * (uGather > .5 ? 1. : 1. - smoothstep(.8, 1., po));
    gl_Position = projectionMatrix * mv;
  }`
const FRAG = /* glsl */`
  varying vec3 vCol;
  varying float vA, vLoose;
  void main() {
    vec2 q = gl_PointCoord - .5; float d = length(q);
    float soft = exp(-d * d * 14.), hard = 1. - smoothstep(.36, .5, d);   // loose: a glowing dot; formed: a solid pixel
    float a = mix(hard, soft, vLoose) * vA;
    if (a < .01) discard;
    gl_FragColor = vec4(vCol * a, a);
  }`

function titleTexture(title, k, n) {
  const c = document.createElement('canvas'); c.width = 2048; c.height = 200; const g = c.getContext('2d')
  g.textAlign = 'center'; g.textBaseline = 'middle'
  g.fillStyle = '#FFC46E'; g.font = '500 34px "Spline Sans Mono", monospace'
  g.fillText(`FILM ${String(k + 1).padStart(2, '0')} / ${String(n).padStart(2, '0')}`.split('').join(' '), 1024, 40)
  g.fillStyle = '#F2F1EC'; g.font = '800 120px "Big Shoulders Display", sans-serif'
  g.fillText(title.toUpperCase(), 1024, 135)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t
}

export function createParticles3d(host, films, { getPointer } = {}) {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, powerPreference: 'high-performance', premultipliedAlpha: true })
  if (!renderer.getContext()) throw new Error('no webgl')
  const dpr = Math.min(devicePixelRatio || 1, 1.5)
  renderer.setPixelRatio(dpr); renderer.setClearColor(0x000000, 0)
  const cv = renderer.domElement; cv.className = 'sh3-cv'; host.appendChild(cv)
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(35, 1, .1, 200); camera.position.z = 22
  const stage = new THREE.Group(); scene.add(stage)
  const fonts = document.fonts?.load ? Promise.all(['800 120px "Big Shoulders Display"', '500 34px "Spline Sans Mono"'].map((f) => document.fonts.load(f))).catch(() => {}) : Promise.resolve()

  // one shared cloud of points: a pixel of the frame each, and four random numbers
  const N = COLS * ROWS, uv = new Float32Array(N * 2), rnd = new Float32Array(N * 4), pos = new Float32Array(N * 3)
  for (let j = 0, i = 0; j < ROWS; j++) for (let c = 0; c < COLS; c++, i++) {
    uv[i * 2] = (c + .5) / COLS; uv[i * 2 + 1] = (j + .5) / ROWS
    for (let k = 0; k < 4; k++) rnd[i * 4 + k] = Math.random()
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('aUv', new THREE.BufferAttribute(uv, 2)); geo.setAttribute('aRnd', new THREE.BufferAttribute(rnd, 4))

  // every film forms out of its own storm and leaves into another: shuffled on each visit
  const pin = new URLSearchParams(location.search).get('hx_storm') // e.g. ?hx_storm=galaxy,tunnel,sphere,wave (for review)
  const order = (pin ? pin.split(',').filter((s) => STORMS.includes(s)) : []).concat(shuffle(STORMS))
  const loader = new THREE.TextureLoader()
  const F = films.map((film, k) => {
    const el = document.createElement('video')
    Object.assign(el, { src: smallClip(film.clip), muted: true, loop: true, playsInline: true, preload: 'auto', crossOrigin: 'anonymous' })
    const vtex = new THREE.VideoTexture(el); vtex.colorSpace = THREE.SRGBColorSpace; vtex.minFilter = THREE.LinearFilter; vtex.generateMipmaps = false
    const poster = loader.load(film.poster); poster.colorSpace = THREE.SRGBColorSpace
    const v = { el, vtex, poster, ready: false, on: false }
    el.addEventListener('playing', () => { v.ready = true })
    const group = new THREE.Group(); stage.add(group)
    const last = k === films.length - 1
    const mat = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, depthTest: false,
      blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, // premultiplied: solid when formed, glowing where loose points overlap
      uniforms: { map: { value: poster }, uT: { value: -1e4 }, uB: { value: HOLD }, uTime: { value: 0 }, uIn: { value: STORMS.indexOf(order[k % order.length]) },
        uOut: { value: STORMS.indexOf(order[(k + 1) % order.length]) }, uGather: { value: last ? 1 : 0 }, uPx: { value: 1 }, uScale: { value: 1 },
        uSweep: { value: -1 }, uAlpha: { value: 0 }, uPtr: { value: new THREE.Vector2(99, 99) }, uPtrOn: { value: 0 } } })
    const pts = new THREE.Points(geo, mat); pts.frustumCulled = false; group.add(pts)
    const tmat = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, opacity: 0 })
    const title = new THREE.Mesh(new THREE.PlaneGeometry(W * 1.25, W * 1.25 * 200 / 2048), tmat)
    title.position.y = -H / 2 - 1.25; group.add(title)
    fonts.then(() => { tmat.map = titleTexture(film.title || '', k, films.length); tmat.needsUpdate = true })
    return { k, v, group, mat, tmat, title }
  })

  // the point of light the last film spirals into
  const glowTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'), r = g.createRadialGradient(64, 64, 0, 64, 64, 64)
    r.addColorStop(0, 'rgba(255,244,218,1)'); r.addColorStop(.3, 'rgba(255,196,110,.6)'); r.addColorStop(1, 'rgba(232,160,19,0)')
    g.fillStyle = r; g.fillRect(0, 0, 128, 128); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t
  })()
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }))
  scene.add(glow)

  let vw = 0, vh = 0, vW = 1, vH = 1
  const size = () => {
    vw = host.clientWidth || innerWidth; vh = host.clientHeight || innerHeight
    renderer.setSize(vw, vh, false); camera.aspect = vw / vh; camera.updateProjectionMatrix()
    vH = 2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)); vW = vH * camera.aspect
    stage.scale.setScalar(Math.min(vW * .72 / W, vH * .74 / (H + 3)))
    stage.position.y = 1.15 * stage.scale.x // the picture and its title sit centred together
    const px = vh * dpr / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)))
    F.forEach((f) => { f.mat.uniforms.uPx.value = px; f.mat.uniforms.uScale.value = stage.scale.x })
  }
  size(); addEventListener('resize', size)

  const tilt = { x: 0, y: 0 }, ptr = new THREE.Vector2(99, 99)
  let painted = false, ptrOn = 0
  const stopAll = () => F.forEach((f) => { if (f.v.on) { f.v.el.pause(); f.v.on = false } })

  return {
    update(t, act0, act1) {
      const on = t > act0 - 300 && t < act1 + 400
      if (!on) { if (painted) { renderer.clear(); painted = false; stopAll() } return }
      painted = true
      const fadeAct = sstep(act0 - 300, act0 + 200, t) * (1 - sstep(act1 - 150, act1 + 300, t))
      const Pt = getPointer ? getPointer() : null
      tilt.x += ((Pt?.in ? (Pt.y / vh - .5) * .3 : 0) - tilt.x) * .06; tilt.y += ((Pt?.in ? (Pt.x / vw - .5) * .42 : 0) - tilt.y) * .06
      // the pointer in the picture's own units (near enough: the tilt is small)
      if (Pt?.in) { const s = stage.scale.x; ptr.set(((Pt.x / vw - .5) * vW) / s, (-(Pt.y / vh - .5) * vH - stage.position.y) / s) }
      ptrOn += ((Pt?.in ? 1 : 0) - ptrOn) * .08
      let glowA = 0
      for (const f of F) {
        const last = f.k === F.length - 1
        const a0 = act0 + 100 + f.k * STEP, b0 = a0 + HOLD, end = b0 + OUT + 600
        const live = t > a0 - 200 && t < end
        f.group.visible = live
        if (live && !f.v.on) { f.v.on = true; f.v.el.currentTime = 0; f.v.el.play().catch(() => {}) }
        if (!live && f.v.on) { f.v.el.pause(); f.v.on = false }
        if (!live) continue
        const u = f.mat.uniforms
        u.map.value = f.v.ready ? f.v.vtex : f.v.poster
        u.uAlpha.value = fadeAct; u.uT.value = t - a0; u.uTime.value = t
        u.uSweep.value = -.6 + 2.6 * clamp01((t - a0 - IN * .8) / 1300)
        u.uPtr.value.copy(ptr); u.uPtrOn.value = ptrOn
        const formed = sstep(a0 + IN * .7, a0 + IN + 300, t) * (1 - sstep(b0 - 50, b0 + 200, t))
        f.group.rotation.set(tilt.x * formed + Math.sin(t * .0006 + f.k) * .04, tilt.y * formed + Math.sin(t * .0008 + f.k * 2) * .09, 0)
        f.group.position.z = (t - a0) * .0005
        f.tmat.opacity = fadeAct * sstep(a0 + IN * .9, a0 + IN + 350, t) * (1 - sstep(b0 - 250, b0, t))
        f.title.position.y = -H / 2 - 1.25 - (1 - sstep(a0 + IN * .9, a0 + IN + 350, t)) * .4
        if (last) glowA = sstep(b0 + 150, b0 + OUT, t) * (1 - sstep(act1 - 100, act1 + 300, t))
      }
      glow.material.opacity = glowA * fadeAct; glow.scale.setScalar((1 + glowA * 5) * stage.scale.x); glow.position.set(0, 0, 3 * stage.scale.x)
      renderer.render(scene, camera)
    },
    destroy() {
      removeEventListener('resize', size); stopAll()
      F.forEach((f) => { f.v.el.removeAttribute('src'); f.v.el.load(); f.v.vtex.dispose(); f.v.poster.dispose(); f.mat.dispose(); f.tmat.map?.dispose(); f.tmat.dispose(); f.title.geometry.dispose() })
      geo.dispose(); glowTex.dispose(); glow.material.dispose(); renderer.dispose(); host.replaceChildren()
    },
  }
}
