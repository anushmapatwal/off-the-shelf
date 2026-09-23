import React, { useEffect, useRef, useState } from 'react'

/* The scalloped card: four bumps along the top and bottom, straight sides,
   big rounded corners — drawn to the card's real size so the bumps stay round
   whatever the content does. */

const BUMPS = 4
const CORNER = 44
const STROKE = 6

function scallopPath(w, h) {
  const dx = (w - CORNER * 2) / BUMPS
  const r = dx / 2
  let d = `M 0 ${CORNER}`
  d += ` L 0 ${h - CORNER}`
  d += ` A ${CORNER} ${CORNER} 0 0 0 ${CORNER} ${h}`
  for (let i = 0; i < BUMPS; i++) d += ` a ${r} ${r} 0 0 0 ${dx} 0`
  d += ` A ${CORNER} ${CORNER} 0 0 0 ${w} ${h - CORNER}`
  d += ` L ${w} ${CORNER}`
  d += ` A ${CORNER} ${CORNER} 0 0 0 ${w - CORNER} 0`
  for (let i = 0; i < BUMPS; i++) d += ` a ${r} ${r} 0 0 0 ${-dx} 0`
  d += ` A ${CORNER} ${CORNER} 0 0 0 0 ${CORNER}`
  return d + ' Z'
}

export default function Card({ children }) {
  const ref = useRef(null)
  const [size, setSize] = useState({ w: 520, h: 470 })

  useEffect(() => {
    const el = ref.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => {
      // the drawn shape must match the card's border box, not its content box
      const { width, height } = el.getBoundingClientRect()
      setSize({ w: Math.round(width), h: Math.round(height) })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const pad = (size.w - CORNER * 2) / BUMPS / 2 + STROKE

  return (
    <div className="card" ref={ref}>
      <svg
        className="card-shape"
        viewBox={`${-pad} ${-pad} ${size.w + pad * 2} ${size.h + pad * 2}`}
        aria-hidden="true"
      >
        <path d={scallopPath(size.w, size.h)} fill="#FFFDF8" stroke="#E2412B" strokeWidth={STROKE} />
      </svg>
      <div className="card-content">{children}</div>
    </div>
  )
}
