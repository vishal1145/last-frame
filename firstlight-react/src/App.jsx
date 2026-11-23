import React, { useEffect } from 'react'
import Nav from './components/Nav.jsx'
import Hero from './components/Hero.jsx'
import Stats from './components/Stats.jsx'
import Carousel from './components/Carousel.jsx'
import Work from './components/Work.jsx'
import Clients from './components/Clients.jsx'
import Services from './components/Services.jsx'
import Showreel from './components/Showreel.jsx'
import EditSuite from './components/EditSuite.jsx'
import Shapes from './components/Shapes.jsx'
import Process from './components/Process.jsx'
import RoughCut from './components/RoughCut.jsx'
import Contact from './components/Contact.jsx'
import { tilesA, tilesA2 } from './data.js'

// Hidden for now, not removed: set to true to bring a section back
const SHOW_NOW_PLAYING = false
const SHOW_SERVICES = false
const SHOW_STATS = false
const SHOW_SHOWREEL = false // "A few seconds. a thousand impressions." poster wall — replaced by the edit-suite coverflow (2026-11-18)
const SHOW_SHAPES = false // "Films in every shape." — merged into the contact section (Contact.jsx) on 2026-11-22; Shapes.jsx kept for restore
const SHOW_EDIT_SUITE = false // "Fresh from the edit suite." auto-rolling coverflow of the films — hidden on request (2026-11-18)
const SHOW_PROCESS = false // "From brief to final frame" steps — replaced by the rough-cut comparison
const SHOW_HUB = false // "One brief in, every film out" network scene — hidden for now (user: not looking good)

export default function App() {
  useEffect(() => {
    const io = new IntersectionObserver((es) => {
      es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target) } })
    }, { threshold: 0.14 })
    const watch = (root) => root.querySelectorAll?.('.rv:not(.in)').forEach((el) => io.observe(el))
    watch(document)
    // pick up .rv elements added later (hot reloads, sections that mount after this effect), or they stay invisible
    const mo = new MutationObserver((ms) => ms.forEach((m) => m.addedNodes.forEach((n) => {
      if (n.nodeType !== 1) return
      if (n.matches('.rv:not(.in)')) io.observe(n)
      watch(n)
    })))
    mo.observe(document.body, { childList: true, subtree: true })
    // arriving from another page with #section: React renders after the browser's own jump, so do it here
    if (location.hash) document.fonts.ready.then(() => document.querySelector(location.hash)?.scrollIntoView({ behavior: 'instant' }))
    return () => { io.disconnect(); mo.disconnect() }
  }, [])

  return (
    <>
      <div className="grain" aria-hidden="true"></div>
      <Nav />
      <Hero />
      {SHOW_STATS && <Stats />}
      {SHOW_NOW_PLAYING && (
        <Carousel sectionId="dailies" id="carA" tiles={tilesA} tiles2={tilesA2} tilt
          head="NOW PLAYING" sub="AD FILMS — ALWAYS ROLLING" />
      )}
      <Work />
      <Clients />
      {SHOW_SERVICES && <Services />}
      {SHOW_SHOWREEL && <Showreel />}
      {SHOW_EDIT_SUITE && <EditSuite />}
      {SHOW_SHAPES && <Shapes />}
      {SHOW_PROCESS && <Process />}
      {SHOW_HUB && <RoughCut />}
      <Contact />
    </>
  )
}
