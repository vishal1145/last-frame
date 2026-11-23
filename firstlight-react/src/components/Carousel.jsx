import React, { useEffect, useRef, useState } from 'react'
import Lightbox from './Lightbox.jsx'

// k:'clip' tiles play a small muted loop (480px rendition); the strip pauses them while off-screen

// how many EQ bars fit comfortably per tile shape (narrow shapes get fewer)
const BARS = { phone: 12 }

// tiles with a clip are buttons that open the full film in the lightbox
function Tile({ t, offset, frames, onOpen }) {
  const f = frames + offset
  const fr = f % 24, s = Math.floor(f / 24) % 60, m = Math.floor(f / 1440) % 60
  const tc = [m, s, fr].map((n) => String(n).padStart(2, '0')).join(':')
  const bars = BARS[t.shape] || 26
  const cls = ['vtile', 'v-' + t.k, t.shape && 'sh-' + t.shape, t.clip && 'clickable'].filter(Boolean).join(' ')
  const Tag = t.clip ? 'button' : 'span'
  const extra = t.clip ? { type: 'button', onClick: () => onOpen(t), 'aria-label': 'Play ' + t.t } : { 'aria-hidden': true }
  return (
    <Tag className={cls} {...extra}>
      {t.k === 'clip' && <video className="vl" src={t.clip} poster={t.poster || undefined} autoPlay muted loop playsInline preload="metadata" aria-hidden="true" />}
      {t.k === 'ken' && <span className="vl" style={{ backgroundImage: t.art }}></span>}
      {t.k === 'sun' && <><span className="vl"></span><span className="s2"></span></>}
      {t.k === 'type' && (
        <span className="vl">
          <span className="tw">
            {Array.from({ length: 12 }).map((_, j) => <b key={j}>{t.w}</b>)}
          </span>
        </span>
      )}
      {t.k === 'wave' && (
        <span className="vl">
          {Array.from({ length: bars }).map((_, b) => (
            <i key={b} style={{ animationDelay: `${(b % 7) * 0.12}s` }}></i>
          ))}
        </span>
      )}
      {t.k === 'scan' && <><span className="vl"></span><span className="blob"></span></>}
      {t.k === 'grade' && <span className="vl"></span>}
      <span className="rtc"><span className="t num">{tc}</span></span>
      <span className="lab">{t.t}</span>
      {t.clip && <span className="vplay" aria-hidden="true"><i></i></span>}
    </Tag>
  )
}

// `tiles2` (optional) renders a second strip that rolls the opposite direction.
export default function Carousel({ id, tiles, tiles2, tilt = false, head, sub, sectionId, sectionClass }) {
  const [frames, setFrames] = useState(0)
  const [open, setOpen] = useState(null)
  const secRef = useRef(null)
  // open the full-size film (the tiles play the 480px rendition)
  const openTile = (t) => setOpen({ title: t.t, src: t.clip.replace('/video/sm/', '/video/'), poster: t.poster && t.poster.replace('/video/sm/', '/video/') })
  // pause every tile clip while the strip is scrolled out of view
  useEffect(() => {
    const el = secRef.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => {
      el.querySelectorAll('video').forEach((v) => { if (e.isIntersecting) v.play().catch(() => {}); else v.pause() })
    }, { threshold: 0.05 })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  const rand = (list) => list.map(() => Math.floor(Math.random() * 2000))
  const offsets = useRef(rand(tiles))
  const offsets2 = useRef(rand(tiles2 || []))
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const iv = setInterval(() => setFrames((f) => f + 6), 250)
    return () => clearInterval(iv)
  }, [])
  const row = (list, offs, p) =>
    list.map((t, i) => <Tile key={p + i} t={t} offset={offs[i]} frames={frames} onOpen={openTile} />)
  const mixed = tiles.some((t) => t.shape)
  const strip = (
    <div className={'car-row' + (mixed ? ' mix' : '')} id={id}>
      {row(tiles, offsets.current, 'a')}{row(tiles, offsets.current, 'b')}
    </div>
  )
  const strip2 = tiles2 && (
    <div className="car-row mix rev" id={id + '2'}>
      {row(tiles2, offsets2.current, 'a')}{row(tiles2, offsets2.current, 'b')}
    </div>
  )
  // one shared perspective: the row rolling left comes toward you, the one rolling right recedes
  const body = tiles2
    ? <div className="stage"><div className="lane">{strip}</div><div className="lane">{strip2}</div></div>
    : strip
  return (
    <section ref={secRef} className={'car-sec' + (sectionClass ? ' ' + sectionClass : '')} id={sectionId}>
      <div className="gut rail">
        <p className="car-head num"><b>{head}</b><span>{sub}</span></p>
      </div>
      {tilt ? <div className="tiltL">{body}</div> : body}
      <Lightbox item={open} onClose={() => setOpen(null)} />
    </section>
  )
}
