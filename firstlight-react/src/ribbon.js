// "The reel" — a 3D film ribbon on a canvas (used by Contact.jsx).
// A strip of film runs along a 3D spline through the section, twisting as it goes. Every frame it is cut into thin
// slices along its length (split again wherever a picture starts or ends). Each slice is a little quad carrying: the
// film in that frame (a crop of the source video at the frame's aspect ratio), the baked strip texture (film base,
// sprocket holes, gutters, labels) and a shade for the light. WebGL paints all the slices in a handful of draw calls
// with a depth buffer, so the ribbon can twist, show its back and pass behind itself; if WebGL is missing, a 2D-canvas
// path paints the same slices one by one, far to near. No library. The strip never ends: positions along it wrap, and
// the same films come round in other shapes.

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v)
const TAU = Math.PI * 2
const norm = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l] }
const LIGHT = norm([-.35, -.55, .76]) // key light: upper left, in front
const HALF = norm([LIGHT[0], LIGHT[1], LIGHT[2] + 1]) // half vector for the gloss

// proportions of the strip, as fractions of its height
const BAND = .115, MARGIN = .03, GUT = .075 // film base above/below the picture · base between band and picture · between two frames
const HOLE_W = .06, HOLE_H = .045, PITCH = .105, HOLE_R = .012 // sprocket holes
const WIN = 1 - 2 * (BAND + MARGIN) // picture height

// The two layouts. ctrl = where the strip flies: screen x,y as fractions of the region (0,0 its centre), z as a fraction
// of the perspective distance (negative = away from the viewer). height = strip height in px · speed = px/s along the
// strip · reveal = how fast it threads in the first time · ds = slice length in px.
const LAYOUTS = {
  desk: { // the whole section: in from the top-left far away, down across the open left half close to the viewer, back into the depth behind the brief, out at the top-right
    ctrl: [[-.62, .12, -1.0], [-.36, .2, -.66], [-.15, .28, .03], [.10, .22, -.28], [.38, -.02, -.62], [.62, -.30, -1.0]],
    height: (w, h) => clamp(h * .28, 170, 290), speed: 95, reveal: 1400, ds: 5, dpr: 1.5,
  },
  stack: { // phones / tablets: an S down through the stage above the brief
    ctrl: [[-.72, -.54, -.9], [-.30, -.34, -.5], [.20, -.14, -.05], [.42, .06, -.35], [.05, .22, -.12], [-.36, .40, -.45], [-.78, .62, -.9]],
    height: (w, h) => clamp(h * .23, 100, 160), speed: 65, reveal: 900, ds: 7, dpr: 1.25,
  },
}

// Catmull-Rom through the control points
function catmull(pts, per) {
  const out = []
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i ? i - 1 : 0], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)]
    for (let j = 0; j < per; j++) {
      const t = j / per, t2 = t * t, t3 = t2 * t, q = [0, 0, 0]
      for (let k = 0; k < 3; k++) q[k] = .5 * (2 * p1[k] + (p2[k] - p0[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (3 * p1[k] - p0[k] - 3 * p2[k] + p3[k]) * t3)
      out.push(q)
    }
  }
  out.push(pts[pts.length - 1].slice())
  return out
}
const measure = (pts) => { const cum = new Float64Array(pts.length); for (let i = 1; i < pts.length; i++) cum[i] = cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1], pts[i][2] - pts[i - 1][2]); return cum }
// point + unit tangent at arc length s; idx is where the previous search ended (s only grows within a frame)
function sampleAt(pts, cum, s, idx) {
  while (idx < cum.length - 2 && cum[idx + 1] < s) idx++
  const a = pts[idx], b = pts[idx + 1], seg = cum[idx + 1] - cum[idx] || 1, t = clamp((s - cum[idx]) / seg, 0, 1)
  const c = pts[Math.min(pts.length - 1, idx + 2)], d = pts[Math.max(0, idx - 1)]
  return { p: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t], T: norm([c[0] - d[0], c[1] - d[1], c[2] - d[2]]), idx }
}
// the centre crop of a w×h source at aspect ar
const cropFor = (w, h, ar) => (w / h > ar ? { x: (w - h * ar) / 2, y: 0, w: h * ar, h } : { x: 0, y: (h - w / ar) / 2, w, h: w / ar })
const rrect = (g, x, y, w, h, r) => { g.beginPath(); if (g.roundRect) g.roundRect(x, y, w, h, r); else g.rect(x, y, w, h); g.fill() }

// The strip texture: one long image of the film base with transparent picture windows and sprocket holes, plus the
// frame table (where each picture sits along the loop). Baked once per size. maxW caps the texture width.
function bake(Hr, list, shapeOf, films, maxW) {
  const gut = GUT * Hr, winH = WIN * Hr, top = (BAND + MARGIN) * Hr
  const fr = []; let s = 0
  for (const [k, film] of list) {
    const sh = shapeOf[k], ww = winH * sh.ar, f = films[film]
    fr.push({ k, sh, film, fs: s, fw: ww + gut, ws: s + gut / 2, ww, crop: cropFor(f.w, f.h, sh.ar) })
    s += ww + gut
  }
  const L = s, pad = 64, ts = Math.min(Hr < 160 ? 2 : 1.5, maxW / (L + pad)), tex = document.createElement('canvas')
  tex.width = Math.ceil((L + pad) * ts); tex.height = Math.ceil(Hr * ts)
  const g = tex.getContext('2d'); g.scale(ts, ts)
  g.fillStyle = '#17150F'; g.fillRect(0, 0, L + pad, Hr)
  g.fillStyle = 'rgba(255,255,255,.07)'; g.fillRect(0, 0, L + pad, 1); g.fillRect(0, Hr - 1, L + pad, 1)
  // picture windows and sprocket holes are cut out (destination-out removes by the source alpha, so the fill must be opaque)
  g.globalCompositeOperation = 'destination-out'; g.fillStyle = '#000'
  for (const f of fr) g.fillRect(f.ws, top, f.ww, winH)
  const hw = HOLE_W * Hr, hh = HOLE_H * Hr, pitch = PITCH * Hr, r = HOLE_R * Hr
  for (let x = pitch / 2; x < L + pad; x += pitch) { rrect(g, x - hw / 2, BAND * Hr / 2 - hh / 2, hw, hh, r); rrect(g, x - hw / 2, Hr - BAND * Hr / 2 - hh / 2, hw, hh, r) }
  g.globalCompositeOperation = 'source-over'
  // the picture sits a touch "in" the base: a thin shade along the window's top and bottom, and the ratio + where it runs
  g.font = `500 ${(.056 * Hr).toFixed(1)}px "Spline Sans Mono", Consolas, monospace`; g.textBaseline = 'middle'
  for (const f of fr) {
    const sh = g.createLinearGradient(0, top, 0, top + winH); sh.addColorStop(0, 'rgba(0,0,0,.45)'); sh.addColorStop(.06, 'rgba(0,0,0,0)'); sh.addColorStop(.94, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,.45)')
    g.fillStyle = sh; g.fillRect(f.ws, top, f.ww, winH)
    const a = f.sh.label, b = f.sh.use.toUpperCase(), wa = g.measureText(a).width, wb = g.measureText(b).width, px = f.ws + .04 * Hr, py = top + .04 * Hr, ph = .1 * Hr, gap = .05 * Hr
    const full = wa + gap + wb + .08 * Hr < f.ww
    g.fillStyle = 'rgba(8,7,5,.6)'; g.fillRect(px, py, (full ? wa + gap + wb : wa) + .08 * Hr, ph)
    g.fillStyle = 'rgba(255,196,110,.95)'; g.fillText(a, px + .04 * Hr, py + ph / 2 + .5)
    if (full) { g.fillStyle = 'rgba(242,241,236,.8)'; g.fillText(b, px + .04 * Hr + wa + gap, py + ph / 2 + .5) }
  }
  // the pad after the seam repeats the start, so a slice across the seam reads continuous
  g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(tex, 0, 0, pad * ts, tex.height, L * ts, 0, pad * ts, tex.height)
  const at = new Uint8Array(Math.ceil(L) + 1)
  for (let i = 0; i < fr.length; i++) at.fill(i, Math.floor(fr[i].fs), Math.min(at.length, Math.ceil(fr[i].fs + fr[i].fw) + 1))
  const bnd = fr.flatMap((f) => [f.ws, f.ws + f.ww]) // where pictures start and end: slices never cross these
  return { tex, ts, L, pad, Hr, top, winH, fr, at, bnd }
}

function sprite() {
  const c = document.createElement('canvas'); c.width = c.height = 64
  const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32)
  gr.addColorStop(0, 'rgba(255,228,184,1)'); gr.addColorStop(.35, 'rgba(255,210,150,.5)'); gr.addColorStop(1, 'rgba(255,196,110,0)')
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64)
  return c
}

// ---- WebGL ----
const VS = `attribute vec3 aPos;attribute vec2 aUV;attribute vec2 aSUV;attribute vec2 aWin;attribute vec3 aShade;
uniform vec2 uRes;uniform float uDepth;varying vec2 vUV,vSUV,vWin;varying vec3 vShade;
void main(){vUV=aUV;vSUV=aSUV;vWin=aWin;vShade=aShade;gl_Position=vec4(aPos.x/uRes.x*2.-1.,1.-aPos.y/uRes.y*2.,clamp(-aPos.z/uDepth,-.99,.99),1.);}`
const FS = `precision mediump float;uniform sampler2D uPic,uStrip;uniform float uTop,uWinH,uHr;varying vec2 vUV,vSUV,vWin;varying vec3 vShade;
void main(){vec4 base=texture2D(uStrip,vSUV);float wy=(vSUV.y-uTop)/uWinH;bool inWin=vWin.x>=0.&&vWin.x<=1.&&wy>=0.&&wy<=1.;
vec3 pic=inWin?texture2D(uPic,vUV).rgb:vec3(.04,.035,.03);float a=inWin?1.:base.a;if(a<.02)discard;
vec3 col=mix(pic,base.rgb,base.a)*vShade.x+vec3(1.,.93,.82)*vShade.y;
if(vShade.z>.5&&inWin){float e=min(min(vWin.x,1.-vWin.x)*vWin.y,min(wy,1.-wy)*uWinH*uHr);if(e<2.)col=vShade.z>1.5?vec3(1.,.93,.82):vec3(.91,.63,.07);}
gl_FragColor=vec4(col*a,a);}`
// full-screen passes: aQ is the quad in clip space; vUV 0..1 with y up (matches a framebuffer texture)
const QVS = `attribute vec2 aQ;varying vec2 vUV;void main(){vUV=aQ*.5+.5;gl_Position=vec4(aQ,0.,1.);}`
// the stage behind the strip: a warm pool of light on the floor, a projector high up whose rays turn slowly through drifting haze
const BGFS = `precision mediump float;uniform vec2 uRes;uniform float uT;uniform vec2 uLight;uniform vec4 uReg;varying vec2 vUV;
float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*noise(p);p=p*2.1+vec2(1.7,9.2);a*=.5;}return v;}
void main(){vec2 px=vec2(vUV.x*uRes.x,(1.-vUV.y)*uRes.y);vec3 col=vec3(.043,.039,.031);
vec2 c1=uReg.xy+uReg.zw*vec2(.26,.74);float d1=length((px-c1)/vec2(uReg.z*.62,uReg.w*.5));col+=vec3(.91,.63,.07)*.13*max(0.,1.-d1);
vec2 c2=uReg.xy+uReg.zw*vec2(.8,.2);float d2=length((px-c2)/vec2(uReg.z*.5,uReg.w*.45));col+=vec3(.6,.42,.18)*.07*max(0.,1.-d2);
vec2 d=px-uLight;float r=length(d),a=atan(d.y,d.x);
float n1=noise(vec2(a*4.+uT*.11,.5)),n2=noise(vec2(a*9.-uT*.07,2.5));
float rays=pow(.5+.5*sin(a*13.+uT*.27+n1*6.),2.)*(.55+.45*sin(a*29.-uT*.43+n2*4.))*(.7+.3*sin(a*5.+uT*.17));
rays*=smoothstep(-.15,.5,d.y/uRes.y)*exp(-r/(uRes.y*1.15));
float haze=fbm(px*.0024+vec2(uT*.028,-uT*.011));
float flick=.94+.06*noise(vec2(uT*6.,1.));
col+=vec3(1.,.8,.5)*rays*(.07+.15*haze)*flick;col+=vec3(1.,.86,.62)*haze*.035;
gl_FragColor=vec4(col,1.);}`
const BLURFS = `precision mediump float;uniform sampler2D uTex;uniform vec2 uDir;varying vec2 vUV;
void main(){vec4 c=texture2D(uTex,vUV)*.227;c+=(texture2D(uTex,vUV+uDir)+texture2D(uTex,vUV-uDir))*.1945;c+=(texture2D(uTex,vUV+uDir*2.)+texture2D(uTex,vUV-uDir*2.))*.1216;c+=(texture2D(uTex,vUV+uDir*3.)+texture2D(uTex,vUV-uDir*3.))*.054;c+=(texture2D(uTex,vUV+uDir*4.)+texture2D(uTex,vUV-uDir*4.))*.016;gl_FragColor=c;}`
const COMPFS = `precision mediump float;uniform sampler2D uBg,uBloom;uniform float uT,uGlow;varying vec2 vUV;
float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
void main(){vec3 c=texture2D(uBg,vUV).rgb+texture2D(uBloom,vUV).rgb*uGlow;c+=(hash(gl_FragCoord.xy+fract(uT)*7.)-.5)*.016;gl_FragColor=vec4(c,1.);}`
const DVS = `attribute vec2 aP;attribute vec2 aSA;uniform vec2 uRes;uniform float uDpr;varying float vA;
void main(){gl_Position=vec4(aP.x/uRes.x*2.-1.,1.-aP.y/uRes.y*2.,0.,1.);gl_PointSize=aSA.x*uDpr;vA=aSA.y;}`
const DFS = `precision mediump float;varying float vA;void main(){float r=length(gl_PointCoord-.5)*2.;float k=smoothstep(1.,0.,r);k*=k;gl_FragColor=vec4(1.,.89,.72,1.)*(k*vA);}`
function program(gl, vs, fs) {
  const mk = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s }
  const p = gl.createProgram(); gl.attachShader(p, mk(gl.VERTEX_SHADER, vs)); gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p)
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p))
  return p
}
function texture(gl, mips, aniso) {
  const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, mips ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  if (mips && aniso) gl.texParameterf(gl.TEXTURE_2D, aniso.ext.TEXTURE_MAX_ANISOTROPY_EXT, aniso.max)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([44, 38, 32, 255])) // unexposed film until a poster or frame arrives
  if (mips) gl.generateMipmap(gl.TEXTURE_2D)
  return t
}
const VF = 12 // floats per vertex: x y z · u v · su sv · wx ww · bright spec mark
const MAXQ = 4096

/**
 * cfg: { shapes: [{k, ar, label, use}], films: {name: {el: <video>, poster, w, h}}, reel: {desk: [[shapeKey, film]...], stack: [...]},
 *        regionEl: () => element the strip flies through when stacked (null = the whole canvas), getChosen: () => shapeKey,
 *        onPick: (shapeKey) => void, reduce: boolean }
 */
export function createRibbon(canvas, cfg) {
  const shapeOf = {}; for (const s of cfg.shapes) shapeOf[s.k] = s
  const posters = {}; for (const n in cfg.films) { const im = new Image(); im.fetchPriority = 'high'; im.src = cfg.films[n].poster; posters[n] = im }
  const rm = !!cfg.reduce, debug = typeof location !== 'undefined' ? location.search : '' // for checking: ?rb_fast skips the thread-in, ?rb_2d forces the 2D path, ?rb_noaa / rb_nobg / rb_nobloom drop a pass
  const NOBG = /rb_nobg/.test(debug), NOBLOOM = /rb_nobloom/.test(debug), weak = typeof navigator !== 'undefined' && navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4
  let W = 0, H = 0, dpr = 1, kind = 'desk', lay = LAYOUTS.desk, region = { x: 0, y: 0, w: 1, h: 1 }, D = 1000, strip = null, used = []
  let raf = 0, timer = 0, running = false, last = 0, t0 = 0, phase = 0, reveal = /rb_fast/.test(debug) ? 1e9 : 0, boost = 0, lastY = 0, ds = 5, ema = 16, lastAdapt = 0
  const ptr = { x: 0, y: 0, in: false }, par = { x: 0, y: 0 }
  let hover = -1, hits = [], pulseAt = -1e9, slow = 0
  const stats = { quads: 0, ms: 0, dt: 0, gl: false, up: 0, upFail: 0, upMs: 0, buildMs: 0 }; canvas.__rb = stats // draw time, for tuning
  const rnd = (() => { let seed = 7; return () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 } })()
  const dust = Array.from({ length: 64 }, (_, i) => ({ x: rnd(), y: rnd(), near: i >= 54, r: i >= 54 ? 2.5 + rnd() * 3 : .6 + rnd() * 1.2, vy: .006 + rnd() * .01, ph: rnd() * TAU, sp: .5 + rnd() }))

  // ---- renderer: WebGL, or the 2D canvas when it is not there ----
  let gl = null, G = null, ctx = null, lost = false
  const initGL = () => {
    const prog = program(gl, VS, FS), dprog = program(gl, DVS, DFS)
    const a = (p, n) => gl.getAttribLocation(p, n), u = (p, n) => gl.getUniformLocation(p, n)
    const mips = typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext // WebGL1 has no mipmaps for odd-sized textures
    const ext = gl.getExtension('EXT_texture_filter_anisotropic') || gl.getExtension('WEBKIT_EXT_texture_filter_anisotropic')
    const aniso = ext ? { ext, max: Math.min(8, gl.getParameter(ext.MAX_TEXTURE_MAX_ANISOTROPY_EXT) || 1) } : null
    const bgp = program(gl, QVS, BGFS), blp = program(gl, QVS, BLURFS), cp = program(gl, QVS, COMPFS)
    G = {
      prog, dprog, bgp, blp, cp, vbo: gl.createBuffer(), ibo: gl.createBuffer(), dbo: gl.createBuffer(), qbo: gl.createBuffer(), mips, strip: texture(gl, mips, aniso), films: {}, maxTex: gl.getParameter(gl.MAX_TEXTURE_SIZE),
      A: { pos: a(prog, 'aPos'), uv: a(prog, 'aUV'), suv: a(prog, 'aSUV'), win: a(prog, 'aWin'), sh: a(prog, 'aShade') },
      U: { res: u(prog, 'uRes'), depth: u(prog, 'uDepth'), pic: u(prog, 'uPic'), strip: u(prog, 'uStrip'), top: u(prog, 'uTop'), winH: u(prog, 'uWinH'), hr: u(prog, 'uHr') },
      DA: { p: a(dprog, 'aP'), sa: a(dprog, 'aSA') }, DU: { res: u(dprog, 'uRes'), dpr: u(dprog, 'uDpr') },
      BGA: a(bgp, 'aQ'), BGU: { res: u(bgp, 'uRes'), t: u(bgp, 'uT'), light: u(bgp, 'uLight'), reg: u(bgp, 'uReg') },
      BLA: a(blp, 'aQ'), BLU: { tex: u(blp, 'uTex'), dir: u(blp, 'uDir') },
      CA: a(cp, 'aQ'), CU: { bg: u(cp, 'uBg'), bloom: u(cp, 'uBloom'), t: u(cp, 'uT'), glow: u(cp, 'uGlow') },
      bg: null, bl1: null, bl2: null, on: new Set(),
      verts: new Float32Array(MAXQ * 4 * VF), dverts: new Float32Array(dust.length * 4),
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, G.qbo); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW)
    for (const n in cfg.films) G.films[n] = { tex: texture(gl, mips, aniso), t: -1, ok: false }
    const idx = new Uint16Array(MAXQ * 6)
    for (let i = 0; i < MAXQ; i++) { const v = i * 4, o = i * 6; idx[o] = v; idx[o + 1] = v + 1; idx[o + 2] = v + 2; idx[o + 3] = v + 1; idx[o + 4] = v + 3; idx[o + 5] = v + 2 }
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, G.ibo); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW)
    gl.enable(gl.BLEND); gl.disable(gl.CULL_FACE); gl.clearColor(0, 0, 0, 0)
    if (strip) { gl.bindTexture(gl.TEXTURE_2D, G.strip); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, strip.tex); if (mips) gl.generateMipmap(gl.TEXTURE_2D) }
    if (W) fbos()
    stats.gl = mips ? 2 : 1
  }
  // off-screen buffers: the background at a third of the canvas, the glow at a sixth
  const fbo = (w, h) => {
    const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
    const fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fb); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0); gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    return { fb, tex, w, h }
  }
  const fbos = () => {
    for (const k of ['bg', 'bl1', 'bl2']) if (G[k]) { gl.deleteFramebuffer(G[k].fb); gl.deleteTexture(G[k].tex) }
    G.bg = fbo(Math.max(2, Math.round(canvas.width / 3)), Math.max(2, Math.round(canvas.height / 3)))
    const bw = Math.max(2, Math.round(canvas.width / 6)), bh = Math.max(2, Math.round(canvas.height / 6))
    G.bl1 = fbo(bw, bh); G.bl2 = fbo(bw, bh)
  }
  // enable exactly these attribute locations (an enabled array a program does not use can still fail the buffer check)
  const attribs = (...locs) => { for (const l of G.on) if (!locs.includes(l)) { gl.disableVertexAttribArray(l); G.on.delete(l) } for (const l of locs) if (!G.on.has(l)) { gl.enableVertexAttribArray(l); G.on.add(l) } }
  const quad = (loc) => { gl.bindBuffer(gl.ARRAY_BUFFER, G.qbo); attribs(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 8, 0); gl.drawArrays(gl.TRIANGLES, 0, 6) }
  if (!/rb_2d/.test(debug)) {
    // MSAA costs a few ms on weak desktops; the glow softens the edges anyway
    try { const o = { alpha: true, antialias: !/rb_noaa/.test(debug) && (canvas.clientWidth < 940 || !weak), premultipliedAlpha: true, depth: true, powerPreference: 'high-performance' }; gl = canvas.getContext('webgl2', o) || canvas.getContext('webgl', o); if (gl) initGL() } catch (e) { gl = null; G = null }
  }
  if (!gl) ctx = canvas.getContext('2d')
  const onLost = (e) => { e.preventDefault(); lost = true }
  const onRestored = () => { try { initGL(); size(); lost = false } catch (e) { lost = true } }
  canvas.addEventListener('webglcontextlost', onLost); canvas.addEventListener('webglcontextrestored', onRestored)
  const glow = ctx ? sprite() : null
  // 2D path: the films are painted once per frame into an atlas and the slices sample that (never the videos themselves)
  const atlas = ctx ? document.createElement('canvas') : null, actx = atlas?.getContext('2d'), slots = {}
  const packAtlas = () => {
    const SH = 270, MAXW = 2048; let x = 0, y = 0, rowW = 0
    for (const n of used) { const f = cfg.films[n], w = Math.round(SH * f.w / f.h); if (x + w > MAXW) { x = 0; y += SH } slots[n] = { x, y, w, h: SH, still: false }; x += w; rowW = Math.max(rowW, x) }
    atlas.width = Math.max(1, rowW); atlas.height = y + SH
  }
  const paintAtlas = () => { for (const n of used) { const v = cfg.films[n].el, sl = slots[n]; if (v.readyState >= 2 && !v.paused) actx.drawImage(v, sl.x, sl.y, sl.w, sl.h); else if (!sl.still) { const im = posters[n]; if (im.complete && im.naturalWidth) { actx.drawImage(im, sl.x, sl.y, sl.w, sl.h); sl.still = true } } } }
  // GL path: each used film is a texture, re-uploaded when its video has a new frame
  const UPLOADS = 5 // videos re-uploaded per frame at most (the stalest first); the rest wait a frame
  const uploadFilms = (now) => {
    const due = []
    for (const n of used) {
      const v = cfg.films[n].el, ft = G.films[n]
      if (v.readyState >= 2) { if (v.currentTime !== ft.t || !ft.ok) due.push([ft.at || 0, n]) }
      else if (!ft.ok) { const im = posters[n]; if (im.complete && im.naturalWidth) { gl.bindTexture(gl.TEXTURE_2D, ft.tex); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, im); if (G.mips) gl.generateMipmap(gl.TEXTURE_2D); ft.ok = true } }
    }
    due.sort((a, b) => a[0] - b[0])
    for (const [, n] of due.slice(0, UPLOADS)) {
      const v = cfg.films[n].el, ft = G.films[n]
      gl.bindTexture(gl.TEXTURE_2D, ft.tex)
      try { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, v); if (G.mips) gl.generateMipmap(gl.TEXTURE_2D); ft.t = v.currentTime; ft.ok = true; ft.at = now; stats.up++ } catch (e) { stats.upFail++ }
    }
  }
  const playUsed = () => { for (const n in cfg.films) { const v = cfg.films[n].el; if (running && !rm && used.includes(n)) v.play().catch(() => {}); else v.pause() } }

  const size = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight
    if (!w || !h) return
    W = w; H = h; kind = W < 940 ? 'stack' : 'desk'; lay = LAYOUTS[kind]
    dpr = Math.min(devicePixelRatio || 1, lay.dpr)
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr)
    const el = kind === 'stack' ? cfg.regionEl?.() : null
    if (el) { const r = el.getBoundingClientRect(), c = canvas.getBoundingClientRect(); region = { x: 0, y: r.top - c.top, w: W, h: r.height } }
    else region = { x: 0, y: 0, w: W, h: H }
    D = kind === 'desk' ? W : Math.max(W, region.h * .9)
    ds = lay.ds
    const list = cfg.reel[kind]
    strip = bake(lay.height(region.w, region.h), list, shapeOf, cfg.films, G ? G.maxTex : 8192)
    used = [...new Set(list.map((f) => f[1]))]
    if (G) { gl.bindTexture(gl.TEXTURE_2D, G.strip); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, strip.tex); if (G.mips) gl.generateMipmap(gl.TEXTURE_2D); fbos() }
    else { packAtlas(); for (const f of strip.fr) { const sl = slots[f.film], c = cropFor(sl.w, sl.h, f.sh.ar); f.crop = { x: sl.x + c.x, y: sl.y + c.y, w: c.w, h: c.h } } }
    playUsed()
  }
  const ro = new ResizeObserver(() => size()); ro.observe(canvas)
  size()
  document.fonts?.ready.then(() => size())

  // pointer: parallax, hover (slows the strip, lights the frame), pick
  const hitAt = (px, py) => {
    for (let i = hits.length - 8; i >= 0; i -= 8) { // nearest slices were pushed last
      const ax = hits[i], ay = hits[i + 1], bx = hits[i + 2], by = hits[i + 3], cx = hits[i + 4], cy = hits[i + 5], det = bx * cy - by * cx
      if (!det) continue
      const u = ((px - ax) * cy - (py - ay) * cx) / det, v = (bx * (py - ay) - by * (px - ax)) / det
      if (u >= 0 && u <= 1 && v >= 0 && v <= 1) return hits[i + 6]
    }
    return -1
  }
  const local = (e) => { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top] }
  const move = (e) => {
    const [x, y] = local(e)
    ptr.x = clamp((x - region.x) / region.w - .5, -.5, .5); ptr.y = clamp((y - region.y) / region.h - .5, -.5, .5); ptr.in = true
    const h = hitAt(x, y); if (h !== hover) { hover = h; canvas.style.cursor = h >= 0 ? 'pointer' : '' }
  }
  const leave = () => { ptr.in = false; hover = -1; canvas.style.cursor = '' }
  const click = (e) => { const [x, y] = local(e), h = hitAt(x, y); if (h >= 0 && strip) cfg.onPick?.(strip.fr[h].k) }
  const scroll = () => { const y = scrollY; boost = Math.min(900, boost + Math.min(260, Math.abs(y - lastY) * 1.6)); lastY = y }
  canvas.addEventListener('pointermove', move); canvas.addEventListener('pointerleave', leave); canvas.addEventListener('click', click)

  // ---- the geometry of this moment: the slices of the strip ----
  const build = (now, t, dt) => {
    par.x += ((ptr.in ? ptr.x : 0) - par.x) * .04; par.y += ((ptr.in ? ptr.y : 0) - par.y) * .04
    slow += ((hover >= 0 ? 1 : 0) - slow) * Math.min(1, dt * .006)
    boost *= Math.exp(-dt / 320)
    const v = rm ? 0 : lay.speed * (1 - .72 * slow) + boost
    phase += v * dt / 1000
    reveal += rm ? 1e9 : lay.reveal * dt / 1000
    for (const d of dust) { d.y -= d.vy * dt / 1000 * (d.near ? 1.6 : 1); d.x += Math.sin(now * .0004 * d.sp + d.ph) * .00004 * dt; if (d.y < -.03) { d.y = 1.03; d.x = rnd() } }
    // the path at this moment: the control points breathe a little
    const rw = region.w, rh = region.h, cx = region.x + rw / 2, cy = region.y + rh / 2
    const ctrl = lay.ctrl.map(([sx, sy, zf], i) => {
      const z = zf * D + (rm ? 0 : Math.sin(t * .37 + i * .8) * .035 * D), sc = D / (D - z)
      return [sx * rw / sc, (sy * rh + (rm ? 0 : Math.sin(t * .5 + i * 1.1) * .02 * rh)) / sc, z]
    })
    const pts = catmull(ctrl, 40), cum = measure(pts), L = cum[cum.length - 1]
    // the strip's edges, slice by slice; a slice never crosses the start or end of a picture
    const Hr = strip.Hr, h = Hr / 2, lam1 = TAU / (5.2 * Hr), lam2 = TAU / (2.3 * Hr), Lloop = strip.L, bnd = strip.bnd
    const yaw = par.x * .14, pit = -par.y * .08, cy1 = Math.cos(yaw), sy1 = Math.sin(yaw), cp = Math.cos(pit), sp = Math.sin(pit)
    const proj = (x, y, z) => { const x1 = x * cy1 + z * sy1, z1 = z * cy1 - x * sy1, y1 = y * cp - z1 * sp, z2 = y * sp + z1 * cp, s = D / (D - z2); return [cx + x1 * s, cy + y1 * s, z2] }
    const nextBoundary = (l) => { let lo = 0, hi = bnd.length; while (lo < hi) { const m = (lo + hi) >> 1; if (bnd[m] <= l + 1e-3) lo = m + 1; else hi = m } return lo < bnd.length ? bnd[lo] : Lloop }
    const edges = [], end = Math.min(L, reveal)
    for (let s = 0, idx = 0; ;) {
      const smp = sampleAt(pts, cum, s, idx); idx = smp.idx
      const p = smp.p, T = smp.T
      const dd = -T[1]; let ux = -T[0] * dd, uy = -1 - T[1] * dd, uz = -T[2] * dd; const ul = Math.hypot(ux, uy, uz) || 1; ux /= ul; uy /= ul; uz /= ul // up, perpendicular to the strip
      const wx = T[1] * uz - T[2] * uy, wy = T[2] * ux - T[0] * uz, wz = T[0] * uy - T[1] * ux // T × up
      const tw = rm ? 0 : .42 * Math.sin(s * lam1 + .6 * t) + .22 * Math.sin(s * lam2 - .9 * t), ct = Math.cos(tw), st = Math.sin(tw) // the twist
      const Ux = ux * ct + wx * st, Uy = uy * ct + wy * st, Uz = uz * ct + wz * st
      edges.push({ s, A: proj(p[0] + Ux * h, p[1] + Uy * h, p[2] + Uz * h), B: proj(p[0] - Ux * h, p[1] - Uy * h, p[2] - Uz * h), z: p[2], N: [Uy * T[2] - Uz * T[1], Uz * T[0] - Ux * T[2], Ux * T[1] - Uy * T[0]] })
      if (s >= end || edges.length >= MAXQ) break
      let step = ds / clamp(D / (D - p[2]), .45, 1.2)
      const l = (((s - phase) % Lloop) + Lloop) % Lloop, nb = nextBoundary(l)
      if (l + step > nb) step = nb - l + 1e-3
      s = Math.min(end, s + step)
    }
    // one quad per slice
    const nfr = strip.fr.length, chosen = cfg.getChosen?.(), pulse = Math.exp(-(now - pulseAt) / 600)
    const quads = []
    for (let j = 0; j < edges.length - 1; j++) {
      const e0 = edges[j], e1 = edges[j + 1]
      const ax = e0.A[0], ay = e0.A[1], bx = e1.A[0] - ax, by = e1.A[1] - ay, cxv = e0.B[0] - ax, cyv = e0.B[1] - ay
      const xs = [ax, ax + bx, ax + cxv, e1.B[0]], ys = [ay, ay + by, ay + cyv, e1.B[1]]
      if (Math.max(...xs) < 0 || Math.min(...xs) > W || Math.max(...ys) < 0 || Math.min(...ys) > H) continue
      const front = bx * cyv - by * cxv > 0
      const l0 = (((e0.s - phase) % Lloop) + Lloop) % Lloop, len = e1.s - e0.s
      if (len < .02) continue
      const f = strip.at[Math.min(strip.at.length - 1, l0 | 0)], fr = strip.fr[f]
      // the picture inside this slice (if any): x from/to across the slice, frame, u from/to across the picture
      let pc = null
      const piece = (fi, off) => { const g = strip.fr[fi], ws = g.ws + off, p0 = Math.max(l0, ws), p1 = Math.min(l0 + len, ws + g.ww); if (p1 > p0 + 1e-6) pc = [(p0 - l0) / len, (p1 - l0) / len, fi, (p0 - ws) / g.ww, (p1 - ws) / g.ww] }
      piece(f, 0)
      if (!pc && l0 + len > fr.fs + fr.fw) piece((f + 1) % nfr, f + 1 < nfr ? 0 : Lloop)
      // light
      const n = e0.N, sg = front ? 1 : -1
      const diff = Math.max(0, sg * (n[0] * LIGHT[0] + n[1] * LIGHT[1] + n[2] * LIGHT[2]))
      const gls = Math.pow(Math.max(0, sg * (n[0] * HALF[0] + n[1] * HALF[1] + n[2] * HALF[2])), 26)
      const fog = clamp((-e0.z - .5 * D) / (.65 * D), 0, .85)
      let dark = front ? 1 - (.88 + .12 * diff) * (1 - fog) : 1 - .34 * (1 - fog) // pictures are backlit film: their own brightness in front, a dim mirror from behind
      let spec = front ? gls * .22 * (1 - fog) : gls * .06
      const lit = pc && strip.fr[pc[2]].k === chosen, hov = pc && pc[2] === hover
      if (lit) { dark *= .8; spec += pulse * .18 * (1 - fog) }
      if (hov) dark *= .6
      quads.push({ ax, ay, bx, by, cx: cxv, cy: cyv, z0: e0.z, z1: e1.z, z: (e0.z + e1.z) / 2, front, l0, len, pc, dark, spec, mark: hov ? 2 : lit ? 1 : 0, fog })
    }
    stats.quads = quads.length
    hits = []
    for (const q of quads) if (q.front && q.pc) hits.push(q.ax, q.ay, q.bx, q.by, q.cx, q.cy, q.pc[2], 0)
    return quads
  }

  // ---- paint: WebGL ----
  const paintGL = (now, t, quads) => {
    const t1 = performance.now(); uploadFilms(now); stats.upMs += (performance.now() - t1 - stats.upMs) * .1
    const dustPass = (near) => {
      const dv = G.dverts; let n = 0
      for (const d of dust) { if (d.near !== near) continue; const a = (.05 + .1 * Math.abs(Math.sin(now * .0011 * d.sp + d.ph))) * (near ? .5 : 1); dv[n++] = region.x + d.x * region.w; dv[n++] = region.y + d.y * region.h; dv[n++] = d.r * 6; dv[n++] = a }
      gl.useProgram(G.dprog); gl.disable(gl.DEPTH_TEST); gl.depthMask(false); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE)
      gl.bindBuffer(gl.ARRAY_BUFFER, G.dbo); gl.bufferData(gl.ARRAY_BUFFER, dv.subarray(0, n), gl.DYNAMIC_DRAW)
      attribs(G.DA.p, G.DA.sa)
      gl.vertexAttribPointer(G.DA.p, 2, gl.FLOAT, false, 16, 0)
      gl.vertexAttribPointer(G.DA.sa, 2, gl.FLOAT, false, 16, 8)
      gl.uniform2f(G.DU.res, W, H); gl.uniform1f(G.DU.dpr, dpr)
      gl.drawArrays(gl.POINTS, 0, n / 4)
    }
    // slices, grouped by film so each group is one draw with its texture bound
    const groups = new Map()
    for (const q of quads) { const k = q.pc ? strip.fr[q.pc[2]].film : ''; let g = groups.get(k); if (!g) groups.set(k, (g = [])); g.push(q) }
    const V = G.verts, Hr = strip.Hr, tw = strip.L + strip.pad, top01 = strip.top / Hr, win01 = strip.winH / Hr, ranges = []; let n = 0, qi = 0
    for (const [film, list] of groups) {
      const start = qi
      for (const q of list) {
        if (qi >= MAXQ) break
        const f = q.pc ? strip.fr[q.pc[2]] : null, fl = f ? cfg.films[f.film] : null, c = f ? f.crop : null
        const u0 = c ? (c.x + q.pc[3] * c.w) / fl.w : 0, u1 = c ? (c.x + q.pc[4] * c.w) / fl.w : 0, v0 = c ? c.y / fl.h : 0, v1 = c ? (c.y + c.h) / fl.h : 0
        // the picture may cover only part of the slice (xa..xb): u and the window x run linearly across the whole slice
        const xa = q.pc ? q.pc[0] : 0, xb = q.pc ? q.pc[1] : 1, du = (u1 - u0) / Math.max(1e-6, xb - xa), uL = u0 - xa * du, uR = u0 + (1 - xa) * du
        const dw = q.pc ? (q.pc[4] - q.pc[3]) / Math.max(1e-6, xb - xa) : 0, wL = q.pc ? q.pc[3] - xa * dw : -1, wR = q.pc ? q.pc[3] + (1 - xa) * dw : -1
        const ww = f ? f.ww : 1, suL = q.l0 / tw, suR = (q.l0 + q.len) / tw, bright = 1 - q.dark, spec = q.spec, mark = q.mark
        const vAt = (sv) => v0 + (sv - top01) / win01 * (v1 - v0) // picture v from the strip's v: the picture spans the window band
        const put = (x, y, z, u, v, su, sv, wx) => { V[n++] = x; V[n++] = y; V[n++] = z; V[n++] = u; V[n++] = v; V[n++] = su; V[n++] = sv; V[n++] = wx; V[n++] = ww; V[n++] = bright; V[n++] = spec; V[n++] = mark }
        put(q.ax, q.ay, q.z0, uL, vAt(0), suL, 0, wL)                              // top-left
        put(q.ax + q.bx, q.ay + q.by, q.z1, uR, vAt(0), suR, 0, wR)                // top-right
        put(q.ax + q.cx, q.ay + q.cy, q.z0, uL, vAt(1), suL, 1, wL)                // bottom-left
        put(q.ax + q.bx + q.cx, q.ay + q.by + q.cy, q.z1, uR, vAt(1), suR, 1, wR)  // bottom-right
        qi++
      }
      ranges.push([film, start, qi - start])
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, G.vbo); gl.bufferData(gl.ARRAY_BUFFER, V.subarray(0, n), gl.DYNAMIC_DRAW)
    const S = VF * 4, A = G.A
    const drawStrip = (depth) => {
      gl.useProgram(G.prog); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
      if (depth) { gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.depthMask(true) } else { gl.disable(gl.DEPTH_TEST); gl.depthMask(false) }
      gl.bindBuffer(gl.ARRAY_BUFFER, G.vbo); attribs(A.pos, A.uv, A.suv, A.win, A.sh)
      gl.vertexAttribPointer(A.pos, 3, gl.FLOAT, false, S, 0); gl.vertexAttribPointer(A.uv, 2, gl.FLOAT, false, S, 12); gl.vertexAttribPointer(A.suv, 2, gl.FLOAT, false, S, 20)
      gl.vertexAttribPointer(A.win, 2, gl.FLOAT, false, S, 28); gl.vertexAttribPointer(A.sh, 3, gl.FLOAT, false, S, 36)
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, G.ibo)
      gl.uniform2f(G.U.res, W, H); gl.uniform1f(G.U.depth, 1.25 * D); gl.uniform1f(G.U.top, top01); gl.uniform1f(G.U.winH, win01); gl.uniform1f(G.U.hr, Hr)
      gl.uniform1i(G.U.pic, 0); gl.uniform1i(G.U.strip, 1)
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, G.strip)
      gl.activeTexture(gl.TEXTURE0)
      for (const [film, start, count] of ranges) { if (!count) continue; gl.bindTexture(gl.TEXTURE_2D, film ? G.films[film].tex : G.strip); gl.drawElements(gl.TRIANGLES, count * 6, gl.UNSIGNED_SHORT, start * 12) }
    }
    // 1. the stage behind everything, at a third of the resolution
    gl.disable(gl.DEPTH_TEST); gl.depthMask(false); gl.disable(gl.BLEND)
    gl.bindFramebuffer(gl.FRAMEBUFFER, G.bg.fb); gl.viewport(0, 0, G.bg.w, G.bg.h)
    if (NOBG) { gl.clearColor(.043, .039, .031, 1); gl.clear(gl.COLOR_BUFFER_BIT) } else {
    gl.useProgram(G.bgp)
    const lx = region.x + region.w * (kind === 'desk' ? .58 : .7) + par.x * 60, ly = region.y - region.h * .06 + par.y * 20
    gl.uniform2f(G.BGU.res, W, H); gl.uniform1f(G.BGU.t, t); gl.uniform2f(G.BGU.light, lx, ly); gl.uniform4f(G.BGU.reg, region.x, region.y, region.w, region.h)
    quad(G.BGA) }
    // 2. the strip's own light: the strip small, blurred twice
    gl.bindFramebuffer(gl.FRAMEBUFFER, G.bl1.fb); gl.viewport(0, 0, G.bl1.w, G.bl1.h); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT)
    if (!NOBLOOM) {
    drawStrip(false)
    gl.disable(gl.BLEND); gl.useProgram(G.blp); gl.uniform1i(G.BLU.tex, 0); gl.activeTexture(gl.TEXTURE0)
    gl.bindFramebuffer(gl.FRAMEBUFFER, G.bl2.fb); gl.bindTexture(gl.TEXTURE_2D, G.bl1.tex); gl.uniform2f(G.BLU.dir, 1.5 / G.bl1.w, 0); quad(G.BLA)
    gl.bindFramebuffer(gl.FRAMEBUFFER, G.bl1.fb); gl.bindTexture(gl.TEXTURE_2D, G.bl2.tex); gl.uniform2f(G.BLU.dir, 0, 1.5 / G.bl1.h); quad(G.BLA) }
    // 3. onto the canvas: stage + glow + grain
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, canvas.width, canvas.height); gl.clear(gl.DEPTH_BUFFER_BIT)
    gl.useProgram(G.cp); gl.uniform1i(G.CU.bg, 0); gl.uniform1i(G.CU.bloom, 1); gl.uniform1f(G.CU.t, t); gl.uniform1f(G.CU.glow, 1.15)
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, G.bl1.tex); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, G.bg.tex)
    quad(G.CA)
    // 4. dust behind, the strip with depth, dust in front
    dustPass(false)
    drawStrip(true)
    dustPass(true)
  }

  // ---- paint: 2D canvas fallback, one slice at a time, far to near ----
  const drawDust2d = (now, near) => {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.globalCompositeOperation = 'lighter'
    for (const d of dust) {
      if (d.near !== near) continue
      const a = (.05 + .1 * Math.abs(Math.sin(now * .0011 * d.sp + d.ph))) * (near ? .5 : 1)
      const px = region.x + d.x * region.w, py = region.y + d.y * region.h, r = d.r * 3
      ctx.globalAlpha = a; ctx.drawImage(glow, px - r, py - r, r * 2, r * 2)
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'
  }
  const paint2d = (now, quads) => {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H)
    paintAtlas(); drawDust2d(now, false)
    quads.sort((a, b) => a.z - b.z)
    const tsx = strip.ts, Hr = strip.Hr, top01 = strip.top / Hr, win01 = strip.winH / Hr, th = 2 / Hr
    for (const q of quads) {
      const lp = Math.hypot(q.bx, q.by) || 1, ov = 1 + .8 / lp
      ctx.setTransform(dpr * q.bx, dpr * q.by, dpr * q.cx, dpr * q.cy, dpr * q.ax, dpr * q.ay)
      if (q.pc) { const c = strip.fr[q.pc[2]].crop; ctx.drawImage(atlas, c.x + q.pc[3] * c.w, c.y, Math.max(.5, (q.pc[4] - q.pc[3]) * c.w), c.h, q.pc[0], top01, (q.pc[1] - q.pc[0]) * ov, win01) }
      ctx.drawImage(strip.tex, q.l0 * tsx, 0, q.len * tsx, strip.tex.height, 0, 0, ov, 1)
      // shade and gloss in one fill: black at dark then warm white at spec equals one fill of that white scaled by spec/a at alpha a
      const a = q.dark + q.spec - q.dark * q.spec, k = q.spec / (a || 1)
      ctx.fillStyle = `rgba(${Math.round(255 * k)},${Math.round(236 * k)},${Math.round(210 * k)},${a.toFixed(3)})`; ctx.fillRect(0, 0, ov, 1)
      if (q.mark && q.front && q.pc) {
        ctx.fillStyle = q.mark === 2 ? 'rgba(255,236,210,.9)' : `rgba(232,160,19,${(.9 * (1 - q.fog)).toFixed(3)})`
        const x0 = q.pc[0], w = (q.pc[1] - q.pc[0]) * ov
        ctx.fillRect(x0, top01, w, th); ctx.fillRect(x0, top01 + win01 - th, w, th)
        if (q.pc[3] <= 1e-4) ctx.fillRect(x0, top01, 2 / q.len, win01)
        if (q.pc[4] >= 1 - 1e-4) ctx.fillRect(q.pc[1] - 2 / q.len, top01, 2 / q.len, win01)
      }
    }
    drawDust2d(now, true)
  }

  const draw = (now, t, dt) => {
    if (!strip || lost) return
    const t1 = performance.now(), quads = build(now, t, dt); stats.buildMs += (performance.now() - t1 - stats.buildMs) * .1
    if (gl) paintGL(now, t, quads); else paint2d(now, quads)
  }
  const tick = (now) => {
    raf = requestAnimationFrame(tick)
    const dt = Math.min(100, now - last || 16); last = now
    ema += (dt - ema) * .08
    if (now - lastAdapt > 1000) { lastAdapt = now; if (ema > 27 && ds < lay.ds * 2) ds += 1; else if (ema < 15 && ds > lay.ds) ds -= 1 } // slice coarser on slow machines
    const t1 = performance.now(); draw(now, (now - t0) / 1000, dt); stats.ms += (performance.now() - t1 - stats.ms) * .1; stats.dt += (dt - stats.dt) * .1
  }
  const still = () => { draw(performance.now(), 0, 16); timer = setTimeout(still, 800) }

  return {
    start() { if (running) return; running = true; if (!t0) t0 = performance.now(); last = 0; lastY = scrollY; playUsed(); if (rm) still(); else raf = requestAnimationFrame(tick); addEventListener('scroll', scroll, { passive: true }) },
    stop() { if (!running) return; running = false; cancelAnimationFrame(raf); clearTimeout(timer); removeEventListener('scroll', scroll); playUsed() },
    pulse() { pulseAt = performance.now() },
    relayout: size,
    destroy() {
      this.stop(); ro.disconnect()
      canvas.removeEventListener('pointermove', move); canvas.removeEventListener('pointerleave', leave); canvas.removeEventListener('click', click)
      canvas.removeEventListener('webglcontextlost', onLost); canvas.removeEventListener('webglcontextrestored', onRestored)
      if (gl) gl.getExtension('WEBGL_lose_context')?.loseContext()
    },
  }
}
