import React, { useEffect, useRef, useState } from 'react'
import { steps } from '../data.js'

const PAL = [
  { pc: '#FDE2D4', pk: '#B5532C' },
  { pc: '#DDEFE3', pk: '#2F7A55' },
  { pc: '#E4DDF5', pk: '#6A4DB0' },
  { pc: '#D9EAF7', pk: '#2F6E9E' },
]
const STEP = 5200 // ms each step stays selected

// muted looping clip that only plays while its step is on screen
function Clip({ name, on, className }) {
  const ref = useRef(null)
  useEffect(() => {
    const v = ref.current
    if (!v) return
    if (on) v.play().catch(() => {}); else v.pause()
  }, [on])
  return <video ref={ref} className={'clip ' + (className || '')} src={`/video/sm/${name}.mp4`} poster={`/video/sm/${name}.jpg`} muted loop playsInline preload="metadata" aria-hidden="true" />
}

// ---- one small animated scene per step (pure CSS, restarts every time the step is selected) ----
const Brief = ({ on }) => (
  <div className="sc s1">
    <div className="doc">
      <div className="doc-h"><b>New brief</b><span>draft</span></div>
      <div className="brow"><em>Product</em><span className="type">Acme Analytics Dashboard</span></div>
      <div className="brow"><em>Audience</em><span className="bchips"><i>Founders</i><i>Product teams</i></span></div>
      <div className="brow"><em>Runs on</em><span className="bchips"><i>Website</i><i>App Store</i><i>Ads</i></span></div>
      <div className="brow"><em>Goal</em><span className="sk"><u></u><u></u></span></div>
      <div className="att"><span className="thumb"><Clip name="unboxing" on={on} /></span><span className="tx"><b>screen-recording.mp4</b><em>+ demo-login.txt</em></span></div>
    </div>
    <span className="fl f1"><i></i>Rec</span>
  </div>
)
const Story = ({ on }) => (
  <div className="sc s2">
    <div className="frames">
      {[0, 1, 2, 3, 4, 5].map((n) => (
        <div className="fr" key={n} style={{ '--n': n }}><span className="a" style={{ backgroundImage: `url(/video/sm/${FILMS[n]}.jpg)` }}></span><span className="b"></span><b>{n + 1}</b></div>
      ))}
    </div>
    <div className="vo">
      <span>VO</span>
      <div className="wave">{Array.from({ length: 26 }, (_, n) => <u key={n} style={{ '--n': n, '--h': (n * 37) % 60 }}></u>)}</div>
    </div>
  </div>
)
const Animate = ({ on }) => (
  <div className="sc s3">
    <div className="mon"><Clip name="runway" on={on} /><i className="o1"></i><i className="o2"></i><i className="o3"></i><span>00:12</span></div>
    <div className="tl">
      {[[6, 34], [22, 44], [40, 38]].map(([l, w], n) => (
        <div className="trk" key={n} style={{ '--n': n }}><u style={{ left: `${l}%`, width: `${w}%` }}><s></s><s></s></u></div>
      ))}
      <span className="head"></span>
    </div>
  </div>
)
const Deliver = ({ on }) => (
  <div className="sc s4">
    <div className="ratios">
      <div className="rt r169" style={{ '--n': 0 }}><Clip name="perfume" on={on} /><i>16:9</i><b>✓</b></div>
      <div className="rt r916" style={{ '--n': 1 }}><Clip name="sneakers" on={on} /><i>9:16</i><b>✓</b></div>
      <div className="rt r11" style={{ '--n': 2 }}><Clip name="coffee" on={on} /><i>1:1</i><b>✓</b></div>
    </div>
    <div className="files"><i>.mp4</i><i>.mov</i><i>.gif</i><i>captions</i></div>
    <div className="stamp">Approved</div>
    <svg className="plane" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 3L10.5 13.5" /><path d="M21 3l-6.5 18-4-7.5L3 9.5z" /></svg>
  </div>
)
const FILMS = ['perfume', 'coffee', 'runway', 'unboxing', 'embers', 'sneakers']
const SCENES = [Brief, Story, Animate, Deliver]

export default function Process() {
  const rootRef = useRef(null)
  const [seen, setSeen] = useState(false)
  const [active, setActive] = useState(0)
  const [hold, setHold] = useState(false)
  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect() } }, { threshold: 0.35 })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  // steps advance on their own; hovering the section pauses it
  useEffect(() => {
    if (!seen || hold || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const id = setTimeout(() => setActive((a) => (a + 1) % steps.length), STEP)
    return () => clearTimeout(id)
  }, [seen, hold, active])
  const pal = PAL[active]
  return (
    <section id="process">
      <div className="gut rail">
        <div className="sec-head-row rv">
          <div>
            <h2 className="sec-h nw">From brief <span className="ser ser-in">to</span> <span className="ser">final frame.</span></h2>
          </div>
          <p className="sec-p">Four steps, fully remote. You sign off at each one.</p>
        </div>
        <div className={'px-grid' + (seen ? ' seen' : '') + (hold ? ' hold' : '')} ref={rootRef} style={{ '--pc': pal.pc, '--pk': pal.pk }}
             onPointerEnter={(e) => { if (e.pointerType === 'mouse') setHold(true) }} onPointerLeave={() => setHold(false)}>
          <ol className="px-list">
            {steps.map((st, i) => (
              <li key={st.k} className={'px-item' + (i === active ? ' on' : '') + (i < active ? ' past' : '')} style={{ '--ik': PAL[i].pk }}>
                <button type="button" className="px-head" onClick={() => setActive(i)} onPointerEnter={(e) => { if (e.pointerType === 'mouse') setActive(i) }} aria-expanded={i === active}>
                  <span className="px-n">{String(i + 1).padStart(2, '0')}</span>
                  <span className="px-t">{st.t}</span>
                  <svg className="px-arr" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                </button>
                <div className="px-body"><div>
                  <p>{st.d}</p>
                  <span className="px-ok"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>You sign off</span>
                </div></div>
                <i className="px-bar" key={active === i ? 'a' + active : 'x'}></i>
              </li>
            ))}
          </ol>
          <div className="px-stage" aria-hidden="true">
            <div className="px-top"><span className="dots"><i></i><i></i><i></i></span><span className="lab">{steps[active].k} · {steps[active].t}</span><span className="cnt">{String(active + 1).padStart(2, '0')}<em> / 04</em></span></div>
            {SCENES.map((S, i) => (
              <div className={'px-scene' + (i === active ? ' on' : '')} key={i} style={{ '--sk': PAL[i].pk, '--sc': PAL[i].pc }}><S on={i === active} /></div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
