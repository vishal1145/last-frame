import { useEffect } from 'react'

// touch / no-hover devices can't hover to play, so clips there play while in view
export const isTouch = typeof matchMedia !== 'undefined' && matchMedia('(hover:none)').matches

export function usePlayWhenVisible(ref, enabled) {
  useEffect(() => {
    const v = ref.current
    if (!enabled || !v) return
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) v.play().catch(() => {}); else v.pause() }, { threshold: 0.5 })
    io.observe(v)
    return () => io.disconnect()
  }, [ref, enabled])
}
