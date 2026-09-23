import React, { useCallback, useEffect, useRef } from 'react'

/* The clock is Anushma's illustration (public/art/clock-face.webp) with the
   hands, the time arc and the drag handle drawn over it in SVG.
   Coordinates below are in the illustration's own pixel space (2400 x 3040),
   measured from the artwork: the dial centre and radius. */

const VB_W = 2400
const VB_H = 3040
const CX = 1188
const CY = 1747
const R_DIAL = 795

const R_ARC = R_DIAL * 0.84
const R_KNOB = R_DIAL * 0.84
const HOUR_LEN = R_DIAL * 0.45
const MIN_LEN = R_DIAL * 0.66

function pointAt(angleDeg, radius) {
  const a = ((angleDeg - 90) * Math.PI) / 180
  return [CX + radius * Math.cos(a), CY + radius * Math.sin(a)]
}

function arcPath(startDeg, sweepDeg, radius) {
  const sweep = Math.max(0.01, Math.min(359.9, sweepDeg))
  const [x1, y1] = pointAt(startDeg, radius)
  const [x2, y2] = pointAt(startDeg + sweep, radius)
  const large = sweep > 180 ? 1 : 0
  return `M ${x1} ${y1} A ${radius} ${radius} 0 ${large} 1 ${x2} ${y2}`
}

export function minuteAngle(date) {
  return (date.getMinutes() + date.getSeconds() / 60) * 6
}

export function hourAngle(date) {
  return ((date.getHours() % 12) + date.getMinutes() / 60) * 30
}

/* a hand drawn as a tapered blade, like the illustration's */
function handPath(angleDeg, length, baseWidth) {
  const [tipX, tipY] = pointAt(angleDeg, length)
  const [lx, ly] = pointAt(angleDeg - 90, baseWidth / 2)
  const [rx, ry] = pointAt(angleDeg + 90, baseWidth / 2)
  const [bx, by] = pointAt(angleDeg + 180, baseWidth * 0.6)
  return `M ${lx} ${ly} L ${tipX} ${tipY} L ${rx} ${ry} L ${bx} ${by} Z`
}

export default function Clock({ now, endMs, setEndMs, minMinutes, maxMinutes, dragging, setDragging }) {
  const wrapRef = useRef(null)
  const lastSnap = useRef(null)

  const minutesLeft = Math.max(0, (endMs - now.getTime()) / 60000)
  const startAngle = minuteAngle(now)
  const sweep = minutesLeft * 6

  const pointToEnd = useCallback(
    (clientX, clientY) => {
      const el = wrapRef.current
      if (!el) return null
      const rect = el.getBoundingClientRect()
      const vbX = ((clientX - rect.left) / rect.width) * VB_W
      const vbY = ((clientY - rect.top) / rect.height) * VB_H
      const dx = vbX - CX
      const dy = vbY - CY
      if (Math.hypot(dx, dy) < 80) return null
      let ang = (Math.atan2(dx, -dy) * 180) / Math.PI
      if (ang < 0) ang += 360

      const rel = (((ang - startAngle) % 360) + 360) % 360
      const base = rel / 6
      const k = Math.max(0, Math.round((minutesLeft - base) / 60))
      let mins = Math.max(minMinutes, Math.min(maxMinutes, base + k * 60))

      const raw = now.getTime() + mins * 60000
      const snapped = Math.round(raw / 300000) * 300000
      const snappedMins = (snapped - now.getTime()) / 60000
      if (snappedMins < minMinutes || snappedMins > maxMinutes) return raw
      return snapped
    },
    [now, startAngle, minutesLeft, minMinutes, maxMinutes]
  )

  const handleMove = useCallback(
    (e) => {
      const next = pointToEnd(e.clientX, e.clientY)
      if (next == null) return
      if (lastSnap.current !== next) {
        lastSnap.current = next
        if (navigator.vibrate) navigator.vibrate(6)
      }
      setEndMs(next)
    },
    [pointToEnd, setEndMs]
  )

  const onPointerDown = (e) => {
    e.preventDefault()
    e.currentTarget.setPointerCapture?.(e.pointerId)
    setDragging(true)
    handleMove(e)
  }

  const onPointerMove = (e) => {
    if (!dragging) return
    handleMove(e)
  }

  const endDrag = (e) => {
    if (!dragging) return
    e.currentTarget.releasePointerCapture?.(e.pointerId)
    setDragging(false)
  }

  const onKeyDown = (e) => {
    const step = 5 * 60000
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
      e.preventDefault()
      setEndMs(Math.min(now.getTime() + maxMinutes * 60000, endMs + step))
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
      e.preventDefault()
      setEndMs(Math.max(now.getTime() + minMinutes * 60000, endMs - step))
    }
  }

  useEffect(() => {
    const stop = () => setDragging(false)
    window.addEventListener('pointerup', stop)
    window.addEventListener('pointercancel', stop)
    return () => {
      window.removeEventListener('pointerup', stop)
      window.removeEventListener('pointercancel', stop)
    }
  }, [setDragging])

  const endDate = new Date(endMs)
  const [knobX, knobY] = pointAt(minuteAngle(endDate), R_KNOB)
  const overAnHour = minutesLeft > 60

  return (
    <div
      ref={wrapRef}
      className={`clock ${dragging ? 'is-dragging' : ''}`}
      role="slider"
      tabIndex={0}
      aria-label="When do you need to stop?"
      aria-valuemin={minMinutes}
      aria-valuemax={maxMinutes}
      aria-valuenow={Math.round(minutesLeft)}
      aria-valuetext={`Until ${endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}, about ${Math.round(minutesLeft)} minutes`}
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      <img className="clock-art" src="/art/clock-face.webp" alt="" draggable="false" />

      <svg className="clock-layer" viewBox={`0 0 ${VB_W} ${VB_H}`} aria-hidden="true">
        {/* the time you have */}
        {overAnHour && (
          <circle cx={CX} cy={CY} r={R_ARC} fill="none" stroke="#4280CF" strokeWidth="52" opacity="0.22" />
        )}
        <path
          className="arc"
          d={arcPath(startAngle, overAnHour ? sweep - 360 : sweep, R_ARC)}
          fill="none"
          stroke="#4280CF"
          strokeWidth="52"
          strokeLinecap="round"
          opacity="0.75"
        />

        {/* now */}
        <g fill="#1F1B18">
          <path d={handPath(hourAngle(now), HOUR_LEN, 58)} />
          <path d={handPath(startAngle, MIN_LEN, 42)} />
        </g>

        {/* the end time you drag */}
        <g className="end-hand">
          <line
            x1={CX}
            y1={CY}
            x2={knobX}
            y2={knobY}
            stroke="#E2412B"
            strokeWidth="26"
            strokeLinecap="round"
          />
          <circle cx={knobX} cy={knobY} r="62" fill="#E2412B" stroke="#FFFFFF" strokeWidth="14" />
        </g>

        <circle cx={CX} cy={CY} r="44" fill="#1F1B18" />
        <circle cx={CX} cy={CY} r="16" fill="#FDFBF4" />
      </svg>
    </div>
  )
}
