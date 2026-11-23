import React, { useEffect, useRef, useState } from 'react'
import { workFilms as projects } from '../data.js'
import { usePlayWhenVisible, isTouch } from '../video.js'

// One film frame. The open frame plays its clip; on touch devices clips play while in view. No native video controls.
function Frame({ p, i, open, after, d, playing, onOpen }) {
  const vid = useRef(null)
  const [broken, setBroken] = useState(false)
  useEffect(() => {
    const v = vid.current
    if (!v || isTouch) return
    v.muted = !playing
    if (open || playing) v.play().catch(() => {}); else v.pause()
  }, [open, playing])
  usePlayWhenVisible(vid, isTouch && !!p.clip && !broken)
  // no native controls anywhere: while a film plays, tapping it pauses / resumes it silently
  const toggle = () => { const v = vid.current; if (!v) return; if (v.paused) v.play().catch(() => {}); else v.pause() }
  return (
    <div role="button" tabIndex={0} className={'frame' + (open ? ' open' : '') + (playing ? ' playing' : '')} style={{ '--d': d, '--sh': after ? '30px' : '-30px' }}
         onClick={() => playing ? toggle() : onOpen(i)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); playing ? toggle() : onOpen(i) } }} aria-label={`Play ${p.title}`}>
      {p.clip && !broken
        ? <video ref={vid} className="art" src={p.clip} poster={p.poster || undefined} muted={!playing} loop playsInline preload="metadata" onError={() => setBroken(true)} aria-hidden={!playing} />
        : <span className="art" style={{ background: p.art }} aria-hidden="true"></span>}
      <span className="fside" aria-hidden="true">{p.title}</span>
      <span className="fmeta"><b>{p.title}</b></span>
    </div>
  )
}

// Scroll-driven: the section is tall, its content pins to the viewport, and scrolling steps through the films
// one at a time (1 → 2 → 3 …). After the last one the page scrolls on. Mobile / reduced-motion: a plain list.
export default function Work() {
  const trackRef = useRef(null)
  const pinRef = useRef(null)
  const [scrollOpen, setOpen] = useState(0) // frame the scroll position has opened
  const [pick, setPick] = useState(null) // frame the visitor clicked: it opens and plays its film inline, with sound
  const open = pick ?? scrollOpen
  const playing = pick
  const n = projects.length
  // click plays the film right inside its frame (no popup)
  const openFilm = (i) => { if (projects[i].clip) setPick(i) }
  useEffect(() => { setPick(null) }, [scrollOpen]) // scrolling on hands control back to the scroll
  useEffect(() => {
    const pinned = () => matchMedia('(min-width: 901px) and (prefers-reduced-motion: no-preference)').matches
    let raf = 0
    const update = () => {
      raf = 0
      const track = trackRef.current, pin = pinRef.current
      if (!track || !pin || !pinned()) return
      // the reel sticks at T inside .reel-track; it travels until the track's bottom pushes it off
      const T = parseFloat(getComputedStyle(pin).top) || 0
      const trackTop = track.getBoundingClientRect().top + scrollY
      const start = trackTop - T
      const end = trackTop + track.offsetHeight - pin.offsetHeight - T
      const p = Math.min(1, Math.max(0, (scrollY - start) / Math.max(1, end - start)))
      setOpen(Math.min(n - 1, Math.floor(p * n)))
    }
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update) }
    update()
    addEventListener('scroll', onScroll, { passive: true })
    addEventListener('resize', onScroll)
    return () => { removeEventListener('scroll', onScroll); removeEventListener('resize', onScroll); if (raf) cancelAnimationFrame(raf) }
  }, [n])
  return (
    <section id="work" style={{ '--n': n }}>
      <div className="gut rail">
        <div className="sec-head-row rv">
          <h2 className="sec-h nw one">See what <span className="ser ser-in">we've delivered.</span></h2>
        </div>
        <div className="reel-track" ref={trackRef}>
        <div className="reel-pin" ref={pinRef}>
          <div className="reel rv">
            {projects.map((p, i) => <Frame key={p.no} p={p} i={i} open={i === open} after={i > open} d={Math.abs(i - open)} playing={i === playing} onOpen={openFilm} />)}
          </div>
        </div>
        <div className="reel-space" aria-hidden="true"></div>
        </div>
      </div>
    </section>
  )
}
