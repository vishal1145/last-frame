import React, { useEffect, useState } from 'react'

// WhatsApp number, country code + digits only (e.g. 919876543210). Empty = opens WhatsApp without a number.
const WA_NUMBER = '919953813101'
const WA_TEXT = "Hi LastFrame, I'd like to talk about a video for my product."
const WA_URL = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(WA_TEXT)}`

export default function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const [past, setPast] = useState(false)
  useEffect(() => {
    // transparent over the hero film; solid paper once the hero has scrolled past
    // top: transparent · inside the hero: dark glass (so the title never shows through) · after the hero: paper
    const on = () => { const hero = document.getElementById('call'); setScrolled(window.scrollY > 8); setPast(!hero || window.scrollY > hero.offsetHeight - 72) }
    on()
    addEventListener('scroll', on, { passive: true })
    return () => removeEventListener('scroll', on)
  }, [])
  return (
    <div className={'nav-wrap' + (scrolled ? ' scrolled' : '') + (past ? ' past' : '')}>
      <div className="gut rail">
        <nav>
          <a className="brand" href="/#call" aria-label="LastFrame — home"><img className="lg lg-light" src="/brand/lastframe-light.png" alt="" width="1862" height="500" decoding="async" /><img className="lg lg-dark" src="/brand/lastframe.png" alt="LastFrame" width="1862" height="500" decoding="async" /></a>
          <a className="wa-btn" href={WA_URL} target="_blank" rel="noreferrer" aria-label="Connect on WhatsApp">
            <svg viewBox="0 0 32 32" aria-hidden="true"><path fill="currentColor" d="M16.04 3C9.39 3 4 8.38 4 15.02c0 2.12.56 4.19 1.61 6.01L4 29l8.15-1.57a12.03 12.03 0 0 0 3.89.65C22.69 28.08 28 22.7 28 16.05 28 9.4 22.69 3 16.04 3Zm0 22.05c-1.2 0-2.38-.24-3.48-.7l-.5-.2-4.84.93.97-4.7-.22-.5a9.04 9.04 0 0 1-1.4-4.86c0-5 4.07-9.07 9.08-9.07 5.02 0 9.1 4.07 9.1 9.1 0 5-4.08 9-9.07 9Zm5.2-6.77c-.28-.14-1.65-.82-1.9-.91-.26-.1-.44-.14-.63.14-.19.28-.72.9-.88 1.09-.16.19-.32.21-.6.07-.28-.14-1.18-.43-2.24-1.38-.83-.74-1.39-1.65-1.55-1.93-.16-.28-.02-.43.12-.57.13-.12.28-.32.42-.48.14-.16.19-.28.28-.47.1-.19.05-.35-.02-.49-.07-.14-.63-1.52-.87-2.08-.23-.54-.46-.47-.63-.48h-.54c-.19 0-.49.07-.75.35-.26.28-.99.97-.99 2.36 0 1.4 1.02 2.74 1.16 2.93.14.19 2 3.06 4.85 4.29.68.29 1.2.46 1.62.6.68.22 1.3.19 1.79.12.55-.08 1.65-.67 1.89-1.32.23-.65.23-1.21.16-1.32-.07-.12-.26-.19-.54-.33Z"/></svg>
            <span>Connect on WhatsApp</span>
          </a>
        </nav>
      </div>
    </div>
  )
}
