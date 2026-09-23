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
        stroke="#453A2E"
        strokeWidth={major ? 3.4 : 1.6}
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
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" seed="7" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <filter id="softShadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="8" stdDeviation="9" floodColor="#3B2A18" floodOpacity="0.22" />
        </filter>
      </defs>

      {/* ground shadow */}
      <ellipse cx={CX} cy={CY + R_BEZEL + 30} rx="120" ry="15" fill="#4A5340" opacity="0.22" />

      <g filter="url(#softShadow)">
        {/* feet */}
        <g stroke="#A2A79C" strokeWidth="12" strokeLinecap="round">
          <line x1={CX - 82} y1={CY + 118} x2={CX - 102} y2={CY + 164} />
          <line x1={CX + 82} y1={CY + 118} x2={CX + 102} y2={CY + 164} />
        </g>
        <g stroke="#6F766A" strokeWidth="12" strokeLinecap="round" opacity="0.35">
          <line x1={CX - 96} y1={CY + 150} x2={CX - 102} y2={CY + 164} />
          <line x1={CX + 96} y1={CY + 150} x2={CX + 102} y2={CY + 164} />
        </g>

        {/* handle */}
        <path
          d={`M ${CX - 56} ${CY - 128} a 56 50 0 0 1 112 0`}
          stroke="#A2A79C"
          strokeWidth="11"
          fill="none"
          strokeLinecap="round"
        />

        {/* bells */}
        <g fill="#D9523F" stroke="#8E3325" strokeWidth="3.5" strokeLinejoin="round">
          <ellipse cx={CX - 108} cy={CY - 116} rx="46" ry="36" transform={`rotate(-40 ${CX - 108} ${CY - 116})`} />
          <ellipse cx={CX + 108} cy={CY - 116} rx="46" ry="36" transform={`rotate(40 ${CX + 108} ${CY - 116})`} />
        </g>

        {/* body */}
        <circle cx={CX} cy={CY} r={R_BEZEL} fill="#D9523F" stroke="#8E3325" strokeWidth="3.5" />
        <circle cx={CX} cy={CY} r={R_BEZEL - 11} fill="none" stroke="#EE7C64" strokeWidth="4" opacity="0.5" />
        <circle cx={CX} cy={CY} r={R_DIAL} fill="#FBF3DF" stroke="#8E3325" strokeWidth="3" />
      </g>

      {/* paper grain on the dial */}
      <circle
        cx={CX}
        cy={CY}
        r={R_DIAL - 2}
        filter="url(#grain)"
        opacity="0.16"
        style={{ mixBlendMode: 'multiply' }}
      />

      {ticks}
      {numbers}

      {/* the time you have */}
      {overAnHour && (
        <circle cx={CX} cy={CY} r={R_ARC} fill="none" stroke="#F2B233" strokeWidth="13" opacity="0.32" />
      )}
      <path
        d={arcPath(startAngle, overAnHour ? sweep - 360 : sweep, R_ARC)}
        fill="none"
        stroke="#F0A82A"
        strokeWidth="14"
        strokeLinecap="round"
        opacity="0.92"
        className="arc"
      />

      {/* now hands */}
      <g stroke="#33291F" strokeLinecap="round" className="now-hands">
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
        <circle cx={knobX} cy={knobY} r="13" fill="#F0A82A" stroke="#8C5A12" strokeWidth="2.5" />
        <circle cx={knobX} cy={knobY} r="5" fill="#FFF3D4" opacity="0.8" />
      </g>

      <circle cx={CX} cy={CY} r="9.5" fill="#33291F" />
      <circle cx={CX} cy={CY} r="3.5" fill="#FBF3DF" />

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
