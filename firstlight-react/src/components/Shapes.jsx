import React, { useEffect, useRef } from 'react'

// "Films in every shape." — the same frame language as the Work reel: square-cornered film frames, one per
// delivery format (2.39:1 cinema, 16:9, 1:1, 4:5, 9:16), each looping a free Mixkit clip
// (public/video/shapes/, 480px, 8 s, no audio). The frames are laid out at their true aspect ratios.
const V = (n) => ({ clip: `/video/shapes/${n}.mp4`, poster: `/video/shapes/${n}.jpg` })
const FRAMES = [
  { k: 'cine', ...V('heels'), ar: '2.39:1', use: 'Cinema · TVC' },
  { k: 'wide', ...V('model'), ar: '16:9', use: 'YouTube · Web' },
  { k: 'sq', ...V('honey'), ar: '1:1', use: 'Feed' },
  { k: 'port', ...V('mascara'), ar: '4:5', use: 'Post' },
  { k: 'tall', ...V('car'), ar: '9:16', use: 'Reels · Shorts' },
]

export default function Shapes() {
  const sec = useRef(null)
  // clips run only while the section is on screen
  useEffect(() => {
    const el = sec.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => {
      el.querySelectorAll('video').forEach((v) => { if (e.isIntersecting) v.play().catch(() => {}); else v.pause() })
    }, { threshold: 0.05 })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return (
    <section id="shapes" ref={sec} aria-label="Films in every shape">
      <div className="gut rail">
        <div className="sec-head-row rv">
          <h2 className="sec-h nw">Films in <span className="ser ser-in">every shape.</span></h2>
        </div>
        <div className="rv">
          <div className="shp-board">
            {FRAMES.map((f, i) => (
              <div key={f.k} className={'shp f-' + f.k} style={{ '--i': i }}>
                <video src={f.clip} poster={f.poster} muted loop playsInline preload="metadata" aria-hidden="true" />
                <span className="shp-use">{f.use}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
