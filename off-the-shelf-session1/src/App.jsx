import React, { useEffect, useMemo, useRef, useState } from 'react'
import Clock from './Clock.jsx'
import Logo from './Logo.jsx'
import { countThatFit, bestFit } from './shelf.js'

const MIN_MINUTES = 3
const MAX_MINUTES = 180
const DEFAULT_MINUTES = 25

function greetingFor(date) {
  const h = date.getHours()
  if (h < 5) return 'Still up'
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  if (h < 21) return 'Good evening'
  return 'Good evening'
}

function formatTime(date) {
  return date
    .toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    .replace(' ', '')
    .toLowerCase()
}

function formatDuration(mins) {
  const m = Math.max(0, Math.round(mins))
  if (m >= MAX_MINUTES) return 'plenty of time'
  if (m < 60) return `${m} minutes`
  const h = Math.floor(m / 60)
  const rem = m % 60
  if (rem === 0) return h === 1 ? '1 hour' : `${h} hours`
  return `${h} hr ${rem} min`
}

export default function App() {
  const [now, setNow] = useState(() => new Date())
  const [dragging, setDragging] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const [touched, setTouched] = useState(false)

  // the suggested default: now + 25 min, snapped to the next 5-minute mark
  const [endMs, setEndMs] = useState(() => {
    const raw = Date.now() + DEFAULT_MINUTES * 60000
    return Math.round(raw / 300000) * 300000
  })

  const name = useMemo(() => {
    try {
      return localStorage.getItem('ots.name') || ''
    } catch {
      return ''
    }
  }, [])

  // keep "now" fresh so the window quietly counts down
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 10000)
    return () => clearInterval(t)
  }, [])

  const handleEnd = (ms) => {
    setTouched(true)
    setEndMs(ms)
  }

  const minutesLeft = Math.max(0, (endMs - now.getTime()) / 60000)
  const endDate = new Date(endMs)
  const fits = countThatFit(minutesLeft)
  const pick = bestFit(minutesLeft)

  return (
    <div className="scene">
      <div className="scene-bg" aria-hidden="true" />
      <div className="scene-wash" aria-hidden="true" />

      <main className={`stage ${revealed ? 'is-revealed' : ''}`}>
        <section className="panel">
          <Logo />

          <p className="greeting">
            {greetingFor(now)}
            {name ? `, ${name}` : ''}.
          </p>

          <h1 className="headline">How much time do you have?</h1>

          <div className="readout" aria-live="polite">
            <span className="readout-time">Until {formatTime(endDate)}</span>
            <span className="readout-dot">·</span>
            <span className="readout-dur">{formatDuration(minutesLeft)}</span>
          </div>

          <p className="hint">
            {touched
              ? `${fits} ${fits === 1 ? 'thing fits' : 'things fit'} in that.`
              : `Set to ${formatTime(endDate)} — about ${formatDuration(minutesLeft)}. Drag the brass hand to change it.`}
          </p>

          <div className="actions">
            <button className="btn-primary" onClick={() => setRevealed(true)}>
              Show me
            </button>
            <button className="btn-quiet" onClick={() => setRevealed(true)}>
              Just show my shelf
            </button>
          </div>
        </section>

        <section className="clock-wrap">
          <Clock
            now={now}
            endMs={endMs}
            setEndMs={handleEnd}
            minMinutes={MIN_MINUTES}
            maxMinutes={MAX_MINUTES}
            dragging={dragging}
            setDragging={setDragging}
          />
          <p className="clock-caption">
            Now {formatTime(now)} — drag to when you need to stop
          </p>
        </section>
      </main>

      {revealed && (
        <div className="sheet-backdrop" onClick={() => setRevealed(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <p className="sheet-kicker">Off the shelf for you</p>
            {pick ? (
              <>
                <h2 className="sheet-title">{pick.title}</h2>
                <p className="sheet-meta">
                  {pick.type} · {pick.minutes} min — fits your {formatDuration(minutesLeft)} with room to spare
                </p>
              </>
            ) : (
              <>
                <h2 className="sheet-title">Nothing fits that window yet</h2>
                <p className="sheet-meta">Session 2 adds splitting long things into parts.</p>
              </>
            )}
            <p className="sheet-note">
              The shelf itself lands in the next session. For now the clock is doing the real work:
              it knows you have until {formatTime(endDate)}, and that {fits} of 7 things fit.
            </p>
            <button className="btn-primary" onClick={() => setRevealed(false)}>
              Back to the clock
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
