import React, { useEffect, useRef, useState } from 'react'
import { services } from '../data.js'
import Slot from './Slot.jsx'
import { isTouch } from '../video.js'
import Lightbox from './Lightbox.jsx'

const pad = (n) => String(n + 1).padStart(2, '0')

// TV channel wall: one big screen, six channels. Hover/tap a channel to switch (with a flick of static);
// left alone, it channel-surfs on its own every 4.5s.
export default function Services() {
  const [ch, setCh] = useState(0)
  const [hold, setHold] = useState(false)
  const [broken, setBroken] = useState({})
  const [film, setFilm] = useState(null)
  const vid = useRef(null)
  const openFilm = (x) => { if (x.clip) setFilm({ title: x.t, sub: `Take · ${x.tag}`, src: x.clip, poster: x.poster }) }
  useEffect(() => {
    if (hold || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const iv = setInterval(() => setCh((c) => (c + 1) % services.length), 4500)
    return () => clearInterval(iv)
  }, [hold])
  useEffect(() => { vid.current?.play().catch(() => {}) }, [ch])
  const s = services[ch]
  const useClip = s.clip && !broken[ch]
  return (
    <section id="post">
      <div className="gut rail">
        <Slot bold="SERVICES" />
        <div className="sec-head-row rv">
          <h2 className="sec-h">Every kind <span className="ser">of ad film.</span></h2>
          <p className="sec-p">Written, designed and animated under one roof.</p>
        </div>
        <div className="tvwall rv" onMouseEnter={() => setHold(true)} onMouseLeave={() => setHold(false)}>
          <div className="tv">
            <div className="screen" role="button" tabIndex={0} aria-label={`Play ${s.t}`} onClick={() => openFilm(s)}
                 onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openFilm(s) } }}>
              {useClip
                ? <video key={s.clip} ref={vid} src={s.clip} poster={s.poster || undefined} autoPlay muted loop playsInline preload="metadata"
                         onError={() => setBroken((b) => ({ ...b, [ch]: true }))} />
                : <span key={'a' + ch} className="art" style={{ background: s.art }}></span>}
              <span key={'s' + ch} className="snow"></span>
              <span className="osd tl num">CH {pad(ch)}</span>
              <span className="osd tr num">TAKE · {s.tag}</span>
              <span className="osd bl">{s.t}<small>THEROUGHCUT · AD FILMS</small></span>
              <span className="tvplay" aria-hidden="true"><i></i></span>
            </div>
          </div>
          <ol className="channels">
            {services.map((x, i) => (
              <li key={x.t}>
                <button type="button" className={i === ch ? 'on' : ''}
                   onMouseEnter={() => setCh(i)} onFocus={() => setCh(i)}
                   onClick={() => { setCh(i); openFilm(x) }} aria-label={`Play ${x.t}`}>
                  <span className="chno num">CH {pad(i)}</span>
                  <span className="chname">{x.t}</span>
                  <span className="chtag num">{x.tag}</span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      </div>
      <Lightbox item={film} onClose={() => setFilm(null)} />
    </section>
  )
}
