import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { projects } from '../data.js'
import { reelLayout, scatterAmount, REEL_COUNT } from '../reelPath.js'

// Hero reel: playing films travel in a row, and every few seconds the middle scatters and closes back into a row (see
// reelPath.js); the cursor scatters whatever stretch it passes over. Clicking a card opens its film. Cards are built at
// full size and scaled down, so they stay sharp when they grow. Six muted feed videos supply all the cards: each card
// paints its own crop onto a small canvas, with a still underneath until its video is ready.
const CROPS = [0, .33, .66, 1] // where in the frame each card's portrait crop sits; one card per crop, per film
const name = (p) => p.clip.replace('/video/', '').replace('.mp4', '')
const CARDS = Array.from({ length: REEL_COUNT }, (_, i) => {
  const film = i % projects.length, still = Math.floor(i / projects.length)
  return { film, crop: CROPS[still], src: `/video/reel/${name(projects[film])}-${still}.jpg`, jx: Math.sin(i * 12.9), jy: Math.sin(i * 78.2) }
})
const DRIFT = .017 // of the loop per second
const ROUND_ROBIN = 3 // small cards repainted per frame; the big scattered ones repaint every frame
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))

function drawGrid(ctx, W, H, px, power) {
  const scale = ctx.canvas.width / W, gap = Math.max(46, W / 26), cx = W * .55, cy = H * .5, R = Math.max(W, H) * .42
  const warp = (x, y) => {
    let dx = x - cx, dy = y - cy, k = 1 + .2 * Math.exp(-(dx * dx + dy * dy) / (R * R))
    x = cx + dx * k; y = cy + dy * k
    const near = (x - px) / (W * .2), f = power * Math.exp(-near * near) * 18
    return [x + near * f, y]
  }
  const line = (from, step, n) => {
    ctx.beginPath()
    for (let i = 0; i <= n; i++) { const [a, b] = step(from, i / n); i ? ctx.lineTo(a * scale, b * scale) : ctx.moveTo(a * scale, b * scale) }
    ctx.stroke()
  }
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
  ctx.strokeStyle = 'rgba(242,241,236,.075)'
  ctx.lineWidth = scale
  for (let x = -gap; x <= W + gap; x += gap) line(x, (v, t) => warp(v, -gap + t * (H + gap * 2)), 28)
  for (let y = -gap; y <= H + gap; y += gap) line(y, (v, t) => warp(-gap + t * (W + gap * 2), v), 40)
}

function ReelPlayer({ start, from, onClose }) {
  const box = useRef(null), vid = useRef(null), closeBtn = useRef(null)
  const [film, setFilm] = useState(start)
  const [paused, setPaused] = useState(false)
  const p = projects[film]
  const step = (d) => { setFilm((f) => (f + d + projects.length) % projects.length); setPaused(false) }
  useLayoutEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const to = box.current.getBoundingClientRect()
    const dx = from.left + from.width / 2 - (to.left + to.width / 2), dy = from.top + from.height / 2 - (to.top + to.height / 2)
    box.current.animate(
      [{ transform: `translate(${dx}px,${dy}px) scale(${from.width / to.width})`, opacity: .6 }, { transform: 'none', opacity: 1 }],
      { duration: 520, easing: 'cubic-bezier(.2,.8,.2,1)' },
    )
  }, [from])
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') step(-1)
      if (e.key === 'ArrowRight') step(1)
    }
    addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeBtn.current.focus({ preventScroll: true })
    return () => { removeEventListener('keydown', onKey); document.body.style.overflow = overflow }
  }, [onClose])
  useEffect(() => { if (paused) vid.current.pause(); else vid.current.play().catch(() => {}) }, [paused, film])
  return createPortal(
    <div className="rp" onClick={onClose} role="dialog" aria-modal="true" aria-label={p.title}>
      <div className="rp-box" ref={box} onClick={(e) => e.stopPropagation()}>
        <video ref={vid} key={film} src={p.clip} poster={p.poster} muted loop playsInline autoPlay />
        <button className="rp-btn pause" type="button" onClick={() => setPaused((v) => !v)} aria-label={paused ? 'Play' : 'Pause'}><i className={paused ? 'play' : ''}></i></button>
        <button className="rp-btn close" type="button" ref={closeBtn} onClick={onClose} aria-label="Close">✕</button>
        <p className="rp-cap"><b>{p.title}</b><span>{p.kind} · {p.tc}</span></p>
      </div>
      <button className="rp-btn prev" type="button" onClick={(e) => { e.stopPropagation(); step(-1) }} aria-label="Previous film">‹</button>
      <button className="rp-btn next" type="button" onClick={(e) => { e.stopPropagation(); step(1) }} aria-label="Next film">›</button>
    </div>,
    document.body
  )
}

export default function FilmReel() {
  const ref = useRef(null), held = useRef(false)
  const [open, setOpen] = useState(null)
  held.current = open !== null
  useEffect(() => {
    const el = ref.current, hero = el.closest('#call'), canvas = el.querySelector('.reel-grid'), ctx = canvas.getContext('2d')
    const cards = [...el.querySelectorAll('.reel-card')], videos = [...el.querySelectorAll('video')]
    const screens = cards.map((c) => c.querySelector('canvas').getContext('2d'))
    let W = 0, H = 0, layout = null, phase = 0, amount = 1, clock = 0, next = 0, live = false, running = false, last = performance.now(), raf = 0, px = 0, targetX = 0, power = 0, target = 0, drawn = '', checked = 0
    const shown = new Set()
    const fit = () => {
      const box = el.getBoundingClientRect()
      W = el.clientWidth; H = el.clientHeight
      layout = reelLayout(W, H, hero.querySelector('.call-title').getBoundingClientRect().top - box.top)
      canvas.width = W * Math.min(devicePixelRatio || 1, 2); canvas.height = H * Math.min(devicePixelRatio || 1, 2)
      el.style.setProperty('--cw', `${layout.big}px`)
      drawn = ''
    }
    const place = () => {
      shown.clear()
      const reach = W * (W < 940 ? .3 : .15)
      cards.forEach((c, i) => {
        const { jx, jy } = CARDS[i]
        let spot = layout.at(i, phase, jx, jy, amount)
        const off = (spot.x - px) / reach, near = power * Math.exp(-off * off)
        if (near > .01) spot = layout.at(i, phase, jx, jy, amount, near)
        const x = spot.x + off * Math.exp(-off * off) * W * .08 * power
        if (spot.big) shown.add(i)
        c.style.zIndex = Math.round(spot.w)
        c.style.transform = `translate3d(${x.toFixed(1)}px,${spot.y.toFixed(1)}px,0) translate(-50%,-50%) rotate(${spot.rot.toFixed(2)}deg) scale(${(spot.w / layout.big).toFixed(3)})`
      })
      const key = `${Math.round(px)}|${power.toFixed(2)}`
      if (key !== drawn) { drawn = key; drawGrid(ctx, W, H, px, power) }
    }
    const paint = (i) => {
      const { film, crop } = CARDS[i], v = videos[film], ctx2 = screens[i]
      if (v.readyState < 2) return
      const sw = v.videoHeight * .75, { width, height } = ctx2.canvas
      ctx2.drawImage(v, (v.videoWidth - sw) * crop, 0, sw, v.videoHeight, 0, 0, width, height)
    }
    const playback = () => {
      const on = live && !held.current
      if (on === running) return
      running = on
      videos.forEach((v) => { if (on) v.play().catch(() => {}); else v.pause() })
    }
    const tick = (now) => {
      const dt = Math.min((now - last) / 1000, .1)
      last = now
      px += (targetX - px) * .12
      power += (target - power) * .08
      if (!held.current) {
        phase = (phase + dt * DRIFT * (1 - .45 * power)) % 1
        clock += dt
        amount = scatterAmount(clock)
      }
      playback()
      place()
      if (running) {
        shown.forEach(paint)
        for (let k = 0; k < ROUND_ROBIN; k++) { paint(next); next = (next + 1) % REEL_COUNT }
        // browsers can pause muted background videos on their own; restart them
        if (now - checked > 1000) { checked = now; videos.forEach((v) => { if (v.paused) v.play().catch(() => {}) }) }
      }
      raf = requestAnimationFrame(tick)
    }
    const onMove = (e) => {
      if (e.pointerType !== 'mouse') return
      const x = e.clientX - el.getBoundingClientRect().left
      if (target === 0) px = x
      targetX = x; target = 1
    }
    const onLeave = () => { target = 0 }
    hero.addEventListener('pointermove', onMove)
    hero.addEventListener('pointerleave', onLeave)
    fit()
    place()
    document.fonts.ready.then(() => { fit(); place() })
    const ro = new ResizeObserver(() => { fit(); place() })
    ro.observe(el)
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches
    const io = new IntersectionObserver(([e]) => {
      cancelAnimationFrame(raf)
      live = e.isIntersecting
      playback()
      if (live && !still) { last = performance.now(); raf = requestAnimationFrame(tick) }
      else if (live) setTimeout(() => cards.forEach((_, i) => paint(i)), 600)
    })
    io.observe(el)
    return () => {
      cancelAnimationFrame(raf); io.disconnect(); ro.disconnect()
      hero.removeEventListener('pointermove', onMove); hero.removeEventListener('pointerleave', onLeave)
    }
  }, [])
  return (
    <>
      <div className="reel-bg" ref={ref}>
        <canvas className="reel-grid" aria-hidden="true"></canvas>
        {projects.map((p) => <video key={p.no} className="reel-feed" aria-hidden="true" src={p.clip.replace('/video/', '/video/sm/')} muted loop playsInline preload="auto" />)}
        {CARDS.map((c, i) => (
          <button className="reel-card" type="button" key={c.src} tabIndex={i < projects.length ? 0 : -1} aria-label={`Play ${projects[c.film].title}`}
                  onClick={(e) => setOpen({ film: c.film, from: e.currentTarget.getBoundingClientRect() })}>
            <img src={c.src} alt="" draggable="false" />
            <canvas width="240" height="320"></canvas>
          </button>
        ))}
      </div>
      {open && <ReelPlayer start={open.film} from={open.from} onClose={() => setOpen(null)} />}
    </>
  )
}
