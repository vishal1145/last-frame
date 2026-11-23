// Where every hero reel card sits. Cards are evenly spaced in v (0..1 round the loop): they travel in a single row,
// split into two lanes through the middle while growing, then close back into a row. scatterAmount() swings that
// middle stretch between fully scattered (1) and a plain row (0) every few seconds. Lanes open before the cards grow
// and shut after they shrink, which is what keeps neighbours from ever touching.
export const REEL_COUNT = 24
const FROM = .45, TO = .79, EDGE = .097, CENTRE = .62 // the stretch of the loop where the cards scatter
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))
const smooth = (t) => { const k = clamp(t, 0, 1); return k * k * (3 - 2 * k) }
const mix = (a, b, t) => a + (b - a) * t
const SCATTERED = 3.6, TO_ROW = 1.3, IN_ROW = 2, TO_SCATTER = 1.3 // seconds in each part of the cycle
export function scatterAmount(seconds) {
  const t = seconds % (SCATTERED + TO_ROW + IN_ROW + TO_SCATTER)
  if (t < SCATTERED) return 1
  if (t < SCATTERED + TO_ROW) return 1 - smooth((t - SCATTERED) / TO_ROW)
  if (t < SCATTERED + TO_ROW + IN_ROW) return 0
  return smooth((t - SCATTERED - TO_ROW - IN_ROW) / TO_SCATTER)
}
const bloom = (v) => smooth((v - FROM) / EDGE) * (1 - smooth((v - TO + EDGE) / EDGE))

export function reelLayout(W, H, titleTop) {
  const narrow = W < 940, GAP = Math.max(16, W * .015)
  const top = 72, bottom = narrow ? titleTop - 16 : H - 16 // cards stay between the nav and, on phones, the title
  const big = Math.min(narrow ? W * .4 : W * .165, ((bottom - top - GAP - 40) / 2) * .75)
  const small = narrow ? W * .15 : W * .04
  const rowStep = small + GAP, wideStep = Math.max((big + GAP) / 2 + big * .1, rowStep)
  const midX = narrow ? W * .5 : W * .58
  const yMid = (top + bottom) / 2, yLeft = narrow ? yMid : H * .2, yRight = narrow ? yMid : H * .46
  // x(v) is the running total of the step between neighbours, so the row opens up exactly where the cards scatter
  const SAMPLES = 1800, xs = new Float64Array(SAMPLES + 1)
  for (let k = 1; k <= SAMPLES; k++) xs[k] = xs[k - 1] + mix(rowStep, wideStep, bloom(k / SAMPLES)) * REEL_COUNT / SAMPLES
  const shift = midX - xs[Math.round(CENTRE * SAMPLES)]
  return { big, ends: [shift, xs[SAMPLES] + shift, midX - CENTRE * REEL_COUNT * rowStep, midX + (1 - CENTRE) * REEL_COUNT * rowStep], at(i, phase, jx, jy, amount = 1, near = 0) {
    // near: how close the cursor is (0..1); it scatters that stretch of the row the same way the middle does
    const v = (i / REEL_COUNT + phase) % 1, b = Math.max(bloom(v) * amount, near)
    const open = smooth(b / .42), grow = smooth((b - .62) / .38)
    const w = mix(small, big * (.9 + .1 * Math.abs(jx)), grow), h = w * 4 / 3
    const part = (big * 4 / 3 + GAP * .5) / 2
    const reach = open * (part + 10) + h / 2, lane = (i % 2 ? 1 : -1) * open * (part + Math.abs(jy) * 10)
    const x = mix(midX + (v - CENTRE) * REEL_COUNT * rowStep, xs[Math.round(v * SAMPLES)] + shift, amount)
    const ribbon = v < CENTRE ? mix(yLeft, yMid, smooth((v - .4) / .15)) : mix(yMid, yRight, smooth((v - .7) / .1))
    const y = mix(mix(yLeft, yRight, smooth((v - .12) / .66)), ribbon, amount) // the plain row is one long wave
    return { x, y: clamp(y, top + reach, bottom - reach) + lane, w, h, rot: jy * 4.5 * grow, big: grow > .5 }
  } }
}
