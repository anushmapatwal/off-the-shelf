import React, { useCallback, useEffect, useRef } from 'react'

/* ---------- geometry helpers ---------- */

const CX = 180
const CY = 208
const R_BEZEL = 148
const R_DIAL = 126
const R_ARC = 104
const R_NUM = 94
const R_TICK = 118

const TAU = Math.PI * 2

// angle in degrees, 0 = 12 o'clock, clockwise
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

// minute-hand angle for a Date
export function minuteAngle(date) {
  return (date.getMinutes() + date.getSeconds() / 60) * 6
}

export function hourAngle(date) {
  return ((date.getHours() % 12) + date.getMinutes() / 60) * 30
}

/* ---------- component ---------- */

export default function Clock({ now, endMs, setEndMs, minMinutes, maxMinutes, dragging, setDragging }) {
  const svgRef = useRef(null)
  const lastSnap = useRef(null)

  const minutesLeft = Math.max(0, (endMs - now.getTime()) / 60000)
  const startAngle = minuteAngle(now)
  const sweep = minutesLeft * 6

  /* convert a pointer position into an end timestamp */
  const pointToEnd = useCallback(
    (clientX, clientY) => {
      const svg = svgRef.current
      if (!svg) return null
      const rect = svg.getBoundingClientRect()
      // map client px -> viewBox units
      const vbX = ((clientX - rect.left) / rect.width) * 360
      const vbY = ((clientY - rect.top) / rect.height) * 400
      const dx = vbX - CX
      const dy = vbY - CY
      if (Math.hypot(dx, dy) < 12) return null
      let ang = (Math.atan2(dx, -dy) * 180) / Math.PI // 0 at 12, clockwise
      if (ang < 0) ang += 360

      const rel = (((ang - startAngle) % 360) + 360) % 360 // minutes past now, 0..60
      const base = rel / 6
      const current = minutesLeft
      const k = Math.max(0, Math.round((current - base) / 60)) // which hour we're in
      let mins = base + k * 60
      mins = Math.max(minMinutes, Math.min(maxMinutes, mins))

      // snap the END TIME to the nearest 5 minutes on the clock
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

  /* keyboard: arrows nudge by 5 minutes */
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
  const endHandAngle = minuteAngle(endDate)
  const [knobX, knobY] = pointAt(endHandAngle, R_TICK)
  const overAnHour = minutesLeft > 60

  const ticks = []
  for (let i = 0; i < 60; i++) {
    const major = i % 5 === 0
    const [x1, y1] = pointAt(i * 6, major ? R_DIAL - 16 : R_DIAL - 10)
    const [x2, y2] = pointAt(i * 6, R_DIAL - 4)
    ticks.push(
      <line
        key={i}
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke="#241E1A"
        strokeWidth={major ? 3 : 1.4}
        strokeLinecap="round"
        opacity={major ? 0.9 : 0.55}
      />
    )
  }

  const numbers = []
  for (let n = 1; n <= 12; n++) {
    const [x, y] = pointAt(n * 30, R_NUM)
    numbers.push(
      <text key={n} x={x} y={y + 8} textAnchor="middle" className="clock-num">
        {n}
      </text>
    )
  }

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 360 400"
      className={`clock ${dragging ? 'is-dragging' : ''}`}
      role="slider"
      tabIndex={0}
      aria-label="When do you need to stop?"
      aria-valuemin={minMinutes}
      aria-valuemax={maxMinutes}
      aria-valuenow={Math.round(minutesLeft)}
      aria-valuetext={`Until ${endDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}, about ${Math.round(minutesLeft)} minutes`}
      onKeyDown={onKeyDown}
    >
      <defs>
        <radialGradient id="dialFill" cx="42%" cy="34%" r="78%">
          <stop offset="0%" stopColor="#FFF8E6" />
          <stop offset="70%" stopColor="#F6E6C4" />
          <stop offset="100%" stopColor="#EAD4AC" />
        </radialGradient>
        <linearGradient id="bezelFill" x1="20%" y1="0%" x2="80%" y2="100%">
          <stop offset="0%" stopColor="#F05A46" />
          <stop offset="45%" stopColor="#DC3B2C" />
          <stop offset="100%" stopColor="#B62A20" />
        </linearGradient>
        <linearGradient id="metalFill" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#C9CDD2" />
          <stop offset="50%" stopColor="#9BA2A9" />
          <stop offset="100%" stopColor="#767C83" />
        </linearGradient>
        <filter id="softShadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="10" stdDeviation="12" floodColor="#2B1E12" floodOpacity="0.28" />
        </filter>
      </defs>

      {/* ground shadow */}
      <ellipse cx={CX} cy={CY + R_BEZEL + 26} rx="126" ry="16" fill="#3C4A33" opacity="0.28" />

      <g filter="url(#softShadow)">
        {/* feet */}
        <g stroke="url(#metalFill)" strokeWidth="11" strokeLinecap="round">
          <line x1={CX - 84} y1={CY + 116} x2={CX - 104} y2={CY + 162} />
          <line x1={CX + 84} y1={CY + 116} x2={CX + 104} y2={CY + 162} />
        </g>

        {/* bells */}
        <g fill="url(#bezelFill)" stroke="#8E1F16" strokeWidth="3">
          <path d={`M ${CX - 132} ${CY - 86} a 46 40 0 0 1 84 -26 l -70 44 z`} />
          <path d={`M ${CX + 132} ${CY - 86} a 46 40 0 0 0 -84 -26 l 70 44 z`} />
        </g>

        {/* hammer + handle */}
        <g stroke="url(#metalFill)" strokeWidth="9" fill="none" strokeLinecap="round">
          <path d={`M ${CX - 58} ${CY - 132} a 58 46 0 0 1 116 0`} />
          <line x1={CX} y1={CY - 152} x2={CX} y2={CY - 128} />
        </g>

        {/* body */}
        <circle cx={CX} cy={CY} r={R_BEZEL} fill="url(#bezelFill)" stroke="#8E1F16" strokeWidth="3" />
        <circle cx={CX} cy={CY} r={R_BEZEL - 9} fill="none" stroke="#FF8B72" strokeWidth="3" opacity="0.45" />
        <circle cx={CX} cy={CY} r={R_DIAL} fill="url(#dialFill)" stroke="#8E1F16" strokeWidth="2.5" />
      </g>

      {ticks}
      {numbers}

      {/* the time you have */}
      {overAnHour && (
        <circle cx={CX} cy={CY} r={R_ARC} fill="none" stroke="#F2B233" strokeWidth="13" opacity="0.32" />
      )}
      <path
        d={arcPath(startAngle, overAnHour ? sweep - 360 : sweep, R_ARC)}
        fill="none"
        stroke="#F2B233"
        strokeWidth="13"
        strokeLinecap="round"
        opacity="0.92"
        className="arc"
      />

      {/* now hands */}
      <g stroke="#241E1A" strokeLinecap="round" className="now-hands">
        <line
          x1={CX}
          y1={CY}
          x2={pointAt(hourAngle(now), 58)[0]}
          y2={pointAt(hourAngle(now), 58)[1]}
          strokeWidth="9"
        />
        <line
          x1={CX}
          y1={CY}
          x2={pointAt(startAngle, 88)[0]}
          y2={pointAt(startAngle, 88)[1]}
          strokeWidth="6"
        />
      </g>

      {/* end-time hand */}
      <g className="end-hand">
        <line
          x1={CX}
          y1={CY}
          x2={knobX}
          y2={knobY}
          stroke="#B4791F"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <circle cx={knobX} cy={knobY} r="13" fill="#E8A831" stroke="#8C5A12" strokeWidth="2.5" />
        <circle cx={knobX} cy={knobY} r="5" fill="#FFF3D4" opacity="0.8" />
      </g>

      <circle cx={CX} cy={CY} r="9" fill="#241E1A" />
      <circle cx={CX} cy={CY} r="3.5" fill="#F6E6C4" />

      {/* interaction surface */}
      <circle
        cx={CX}
        cy={CY}
        r={R_BEZEL}
        fill="transparent"
        className="hit"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      />
    </svg>
  )
}
