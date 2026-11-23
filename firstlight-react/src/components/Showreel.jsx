import React from 'react'

// Poster wall behind the copy (Netflix-style): tilted rows of our clips' posters, each row a marquee rolling
// the opposite way from its neighbour, under a dark shade.
const POSTERS = ['/video/sm/perfume.jpg', '/video/sm/coffee.jpg', '/video/sm/runway.jpg', '/video/sm/unboxing.jpg',
                 '/video/sm/embers.jpg', '/video/sm/interview.jpg', '/video/sneakers.jpg', '/video/hero-bg.jpg']
const ROWS = 6, COLS = 9

export default function Showreel() {
  return (
    <section id="screen-sec">
      <div className="wall" aria-hidden="true">
        {Array.from({ length: ROWS }).map((_, r) => (
          <div className={'wrow' + (r % 2 ? ' rev' : '')} key={r} style={{ animationDuration: `${46 + r * 7}s` }}>
            {[0, 1].map((dup) => Array.from({ length: COLS }).map((_, c) => (
              <i key={dup + '-' + c} style={{ backgroundImage: `url(${POSTERS[(c + r * 3) % POSTERS.length]})` }}></i>
            )))}
          </div>
        ))}
      </div>
      <div className="wall-shade" aria-hidden="true"></div>
      <div className="gut rail inwrap">
        <div className="scr-center">
          <h2 className="sec-h rv">A few seconds. <span className="ser">a thousand impressions.</span></h2>
          <div className="scr-stats rv num">
            <div><b>ADS</b><span>Product commercials</span></div>
            <div><b>FILMS</b><span>Brand stories</span></div>
            <div><b>REELS</b><span>Social campaigns</span></div>
          </div>
        </div>
      </div>
    </section>
  )
}
