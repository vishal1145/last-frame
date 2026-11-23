import React, { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

// Full-screen player. Rendered into <body> (portal) so transformed ancestors can't trap position:fixed.
export default function Lightbox({ item, onClose }) {
  const vid = useRef(null)
  useEffect(() => {
    if (!item) return
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    vid.current?.play().catch(() => {})
    return () => { removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [item, onClose])
  if (!item) return null
  return createPortal(
    <div className="lb" onClick={onClose} role="dialog" aria-modal="true" aria-label={item.title}>
      <div className="lb-box" onClick={(e) => e.stopPropagation()}>
        <div className="lb-bar">
          <span className="lb-title"><b>{item.title}</b>{item.sub && <span>{item.sub}</span>}</span>
          <button className="lb-close" type="button" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <video ref={vid} src={item.src} poster={item.poster || undefined} autoPlay playsInline />
      </div>
    </div>,
    document.body
  )
}
