// The settled hero's film tunnel in real 3D (three.js, WebGL) — the same idea as tunnel.js (an endless tunnel lined with our
// films, a warm light at its end where the headline stands), drawn properly: true perspective instead of two affine
// triangles per frame, frames bent to the tunnel wall with rounded corners and a glass rim, the nearest frames playing their
// real film (only a few videos decode at once), amber dust drifting past, and the frame under the pointer lifting off the
// wall toward the camera with its rim lit (the flight slows; click it to watch). Same API as createTunnel:
// { update(now), click(x, y) → picked?, destroy() }. Throws if WebGL is unavailable, so the caller can fall back to the 2D one.
// Kept light for weak integrated GPUs (the user's HD 4400): no post-processing, pixel ratio capped, one draw per frame.
import * as THREE from 'three'

const clamp01 = (v) => Math.max(0, Math.min(1, v))
const sstep = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t) }
// a small copy of the clip when there is one (public/video/sm/), so the few playing videos stay cheap to decode
const smallClip = (src) => (src && /^\/video\/[^/]+\.mp4$/.test(src) && SMALL.has(src.split('/').pop()) ? src.replace('/video/', '/video/sm/') : src)
const SMALL = new Set(['coffee.mp4', 'embers.mp4', 'interview.mp4', 'perfume.mp4', 'runway.mp4', 'sneakers.mp4', 'unboxing.mp4'])

const VERT = /* glsl */`
  uniform float uLift;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec3 p = position;
    p.xy *= 1.0 - uLift * .16; // a hovered frame comes off the wall, toward the axis
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }`
const FRAG = /* glsl */`
  uniform sampler2D map;
  uniform float uAlpha, uLit, uAspect;
  varying vec2 vUv;
  float rbox(vec2 p, vec2 b, float r) { vec2 q = abs(p) - b + r; return length(max(q, 0.)) + min(max(q.x, q.y), 0.) - r; }
  void main() {
    vec2 p = (vUv - .5) * vec2(uAspect, 1.);
    float d = rbox(p, vec2(uAspect, 1.) * .5, .07);
    float aa = fwidth(d) * 1.2;
    float shape = 1. - smoothstep(-aa, aa, d);
    if (shape < .01) discard;
    vec3 col = texture2D(map, vUv).rgb;
    col *= 1. + .12 * uLit;                                      // the film reads clean (2026-11-25: "shadow black, clean this"); lit frames a touch brighter
    float rim = 1. - smoothstep(0., .018 + aa, -d);              // the glass edge
    vec3 rimCol = mix(vec3(.95, .94, .9), vec3(1., .77, .43), uLit);
    col = mix(col, rimCol, rim * (.25 + .6 * uLit));
    gl_FragColor = vec4(col, shape * uAlpha);
  }`

export function createTunnel3d(host, films, { getPointer, alpha, onPick }) {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' })
  if (!renderer.getContext()) throw new Error('no webgl')
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5))
  renderer.setClearColor(0x000000, 0)
  const cv = renderer.domElement; cv.className = 'tn3-cv'; host.appendChild(cv)
  const vg = document.createElement('div'); vg.className = 'tn3-vg'; host.appendChild(vg) // the vignette that keeps the edges quiet

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(62, 1, .1, 200)
  const tube = new THREE.Group(); scene.add(tube)

  // the tunnel: rings of PER frames; each ring twisted a little further, so the walls spiral
  const R = 5, PER = 8, RINGS = 14, LEN = 4.6, GAP = 1.5, D = LEN + GAP, SPAN = RINGS * D, NEAR = 1.2
  const dA = (Math.PI * 2 / PER) * .78, H = R * dA // a frame's height, across the wall (gaps between neighbours)
  // one bent panel, shared: across the wall it follows the circle, along the tunnel it runs straight (the picture runs along z)
  const geo = (() => {
    const g = new THREE.PlaneGeometry(1, 1, 1, 10), pos = g.attributes.position, uv = g.attributes.uv
    for (let i = 0; i < pos.count; i++) {
      const u = uv.getX(i), v = uv.getY(i), th = (v - .5) * dA
      pos.setXYZ(i, R * Math.sin(th), R * Math.cos(th), (u - .5) * LEN) // x/y on the wall, z along the tunnel
      uv.setXY(i, 1 - u, v) // the picture's left edge is far down the tunnel
    }
    g.computeBoundingSphere(); return g
  })()

  // posters for every film; a <video> made only when its frame comes near, at most MAX_VIDEO playing at once
  const loader = new THREE.TextureLoader()
  const posters = films.map((f) => { const t = loader.load(f.poster); t.colorSpace = THREE.SRGBColorSpace; t.minFilter = THREE.LinearFilter; t.generateMipmaps = false; return t })
  const vids = films.map(() => null) // { el, tex, ready }
  const MAX_VIDEO = 3
  const videoFor = (i) => {
    if (vids[i]) return vids[i]
    const el = document.createElement('video')
    Object.assign(el, { src: smallClip(films[i].clip), muted: true, loop: true, playsInline: true, preload: 'auto', crossOrigin: 'anonymous' })
    const tex = new THREE.VideoTexture(el); tex.colorSpace = THREE.SRGBColorSpace; tex.minFilter = THREE.LinearFilter; tex.generateMipmaps = false
    const v = { el, tex, ready: false, on: false }
    el.addEventListener('playing', () => { v.ready = true })
    return (vids[i] = v)
  }

  const frames = []
  for (let j = 0; j < RINGS; j++) for (let k = 0; k < PER; k++) {
    const film = (j * PER + k * 3) % films.length
    const mat = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, side: THREE.DoubleSide,
      uniforms: { map: { value: posters[film] }, uAlpha: { value: 0 }, uLit: { value: 0 }, uLift: { value: 0 }, uAspect: { value: LEN / H } },
    })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.rotation.z = (k / PER) * Math.PI * 2 + j * .34
    tube.add(mesh)
    frames.push({ j, k, film, mesh, mat, ph: Math.random() * 6.28, sp: .3 + Math.random() * .5, lift: 0 })
  }

  // amber dust drifting toward the camera: depth you can feel between the walls
  const DUST = 380
  const dpos = new Float32Array(DUST * 3)
  for (let i = 0; i < DUST; i++) { const a = Math.random() * 6.28, r = Math.sqrt(Math.random()) * R * .92; dpos.set([Math.cos(a) * r, Math.sin(a) * r, -Math.random() * SPAN], i * 3) }
  const dgeo = new THREE.BufferGeometry(); dgeo.setAttribute('position', new THREE.BufferAttribute(dpos, 3))
  const dmat = new THREE.PointsMaterial({ color: 0xffc46e, size: .045, transparent: true, opacity: .7, depthWrite: false, blending: THREE.AdditiveBlending })
  const dust = new THREE.Points(dgeo, dmat); scene.add(dust)

  // the light at the end of the tunnel: a soft additive glow far down the axis
  const glowTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d')
    const r = g.createRadialGradient(128, 128, 0, 128, 128, 128)
    r.addColorStop(0, 'rgba(255,230,180,1)'); r.addColorStop(.25, 'rgba(255,196,110,.55)'); r.addColorStop(.6, 'rgba(232,160,19,.14)'); r.addColorStop(1, 'rgba(232,160,19,0)')
    g.fillStyle = r; g.fillRect(0, 0, 256, 256); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t
  })()
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: .9 }))
  glow.position.z = -SPAN * .55; glow.scale.setScalar(SPAN * .42); scene.add(glow)

  let vw = 0, vh = 0, sx = 1
  const size = () => {
    vw = host.clientWidth || innerWidth; vh = host.clientHeight || innerHeight
    renderer.setSize(vw, vh, false); camera.aspect = vw / vh
    sx = Math.min(1.9, Math.max(1, vw / vh * .95)) // an elliptic tunnel as wide as the screen (no blank sides on wide screens)
    tube.scale.set(sx, 1, 1); dust.scale.set(sx, 1, 1)
    camera.updateProjectionMatrix()
  }
  size(); addEventListener('resize', size)

  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2()
  let travel = 0, slow = 0, last = 0, hover = null, la = 0
  const cam = { x: 0, y: 0 }

  const pick = (x, y) => {
    ndc.set((x / vw) * 2 - 1, -(y / vh) * 2 + 1); ray.setFromCamera(ndc, camera)
    const hit = ray.intersectObjects(frames.filter((f) => f.mat.uniforms.uAlpha.value > .15).map((f) => f.mesh), false)[0]
    return hit ? frames.find((f) => f.mesh === hit.object) : null
  }

  return {
    update(now) {
      const dt = Math.min(now - last || 16, 50); last = now
      la = alpha()
      cv.style.opacity = vg.style.opacity = la.toFixed(3)
      if (la < .01) { hover = null; for (const v of vids) if (v?.on) { v.el.pause(); v.on = false } return }
      const P = getPointer()
      cam.x += ((P.in ? P.x / vw - .5 : 0) - cam.x) * .04; cam.y += ((P.in ? P.y / vh - .5 : 0) - cam.y) * .04
      camera.position.set(cam.x * 1.1, -cam.y * .8, 0); camera.lookAt(-cam.x * .6, cam.y * .45, -20)
      camera.rotation.z += cam.x * .06
      travel += dt * (D / 1700) * (1 - slow * .8)
      tube.rotation.z = now * .00005

      hover = P.in ? pick(P.x, P.y) : null
      slow += ((hover ? 1 : 0) - slow) * .08
      cv.style.cursor = hover ? 'pointer' : ''

      // place every frame, fade it by distance, light it now and then (and when hovered)
      const near = []
      for (const f of frames) {
        const zd = NEAR + (((f.j * D - travel) % SPAN) + SPAN) % SPAN // distance ahead of the camera
        f.mesh.position.z = -zd
        const fog = sstep(SPAN * .62, SPAN * .3, zd) * sstep(LEN * .25, LEN * 1.1, zd) // far ones (behind the headline) and near ones (filling the screen) fade out
        const pulse = Math.pow(Math.max(0, Math.sin(now * .001 * f.sp + f.ph)), 8)
        f.lift += ((f === hover ? 1 : 0) - f.lift) * .12
        const u = f.mat.uniforms
        u.uAlpha.value = la * fog // solid: no dark stage showing through the film
        u.uLit.value = Math.max(pulse * .7, f.lift)
        u.uLift.value = f.lift
        f.mesh.renderOrder = -Math.round(zd * 10)
        if (fog > .5) near.push([zd, f])
      }

      // the nearest frames play their film; everyone else shows the poster
      near.sort((a, b) => a[0] - b[0])
      const want = new Set()
      if (hover) want.add(hover.film)
      for (const [, f] of near) { if (want.size >= MAX_VIDEO) break; want.add(f.film) }
      vids.forEach((v, i) => {
        if (want.has(i)) { const vv = videoFor(i); if (!vv.on) { vv.on = true; vv.el.play().catch(() => {}) } }
        else if (v?.on) { v.el.pause(); v.on = false }
      })
      for (const f of frames) { const v = vids[f.film]; f.mat.uniforms.map.value = v?.on && v.ready ? v.tex : posters[f.film] }

      // dust drifts toward the camera with the flight
      const arr = dgeo.attributes.position.array, step = dt * (D / 1700) * (1 - slow * .8) * 1.4
      for (let i = 2; i < arr.length; i += 3) { arr[i] += step; if (arr[i] > 0) arr[i] -= SPAN }
      dgeo.attributes.position.needsUpdate = true
      dmat.opacity = .7 * la

      renderer.render(scene, camera)
    },
    click(x, y) { const f = pick(x, y); if (f) onPick(f.film); return !!f },
    destroy() {
      removeEventListener('resize', size)
      for (const v of vids) if (v) { v.el.pause(); v.el.removeAttribute('src'); v.el.load(); v.tex.dispose() }
      posters.forEach((t) => t.dispose()); glowTex.dispose(); geo.dispose(); dgeo.dispose(); dmat.dispose()
      frames.forEach((f) => f.mat.dispose()); renderer.dispose(); host.replaceChildren()
    },
  }
}
