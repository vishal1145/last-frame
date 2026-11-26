import React, { useEffect, useRef } from 'react'

// the clip that plays inside the footer wordmark
const WORDMARK_CLIP = 'embers'

export default function Footer() {
  const reelRef = useRef(null)
  // the wordmark film plays only while on screen
  useEffect(() => {
    const el = reelRef.current
    const io = new IntersectionObserver(([e]) => {
      el.querySelectorAll('video').forEach((v) => { if (e.isIntersecting) v.play().catch(() => {}); else v.pause() })
    }, { threshold: 0.05 })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return (
  <div className="gut rail">
    <footer className="wrapfoot">
      <div className="film" aria-hidden="true"></div>

      <div className="cred">
        <div className="cred-lead">
          <p className="cred-brand"><img src="/brand/lastframe.png" alt="LastFrame" width="1862" height="500" loading="lazy" decoding="async" /></p>
          <p className="cred-tag">advertisement videos, made in-house</p>
        </div>
        {/* one row of links (2026-11-26): the Studio / Office / Legal columns were removed */}
        <nav className="credits cred-row" aria-label="Footer">
          <a href="/#wrap-sec">Contact us</a><a href="/terms.html">Terms &amp; Conditions</a><a href="/privacy.html">Privacy Policy</a>
        </nav>
      </div>

      <div className="cred-base num">
        <span>© 2026 LastFrame. All rights reserved.</span>
      </div>

      <div className="horizon" aria-hidden="true">
        {/* the wordmark is a window — the film plays inside the letters (SVG text clip) */}
        <div className="giant-wrap" ref={reelRef}>
          <svg className="giant-svg" viewBox="39 50 922 170" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
            <defs>
              <clipPath id="wm-clip"><text x="500" y="214" textAnchor="middle" textLength="936" lengthAdjust="spacing">LASTFRAME</text></clipPath>
            </defs>
            <foreignObject x="-20" y="-20" width="1040" height="260" clipPath="url(#wm-clip)">
              <video xmlns="http://www.w3.org/1999/xhtml" className="giant-film" src={`/video/sm/${WORDMARK_CLIP}.mp4`} poster={`/video/sm/${WORDMARK_CLIP}.jpg`} muted loop playsInline preload="metadata" />
            </foreignObject>
            <text className="giant-fallback" x="500" y="214" textAnchor="middle" textLength="936" lengthAdjust="spacing">LASTFRAME</text>
          </svg>
        </div>
      </div>
    </footer>
  </div>
  )
}
