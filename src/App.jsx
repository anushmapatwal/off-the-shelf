import React, { useEffect, useState } from 'react'
import Clock from './Clock.jsx'
import Logo from './Logo.jsx'
import Card from './Card.jsx'
import ShelfScene from './ShelfScene.jsx'
import { thatFit, bestFit } from './shelf.js'

const MIN_MINUTES = 3
const MAX_MINUTES = 180
const DEFAULT_MINUTES = 25

function formatTime(date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
}

function formatDuration(mins) {
  const m = Math.max(0, Math.round(mins))
  if (m >= MAX_MINUTES) return 'plenty of time'
  if (m < 60) return `${m} mins`
  const h = Math.floor(m / 60)
  const rem = m % 60
  if (rem === 0) return h === 1 ? '1 hour' : `${h} hours`
  return `${h} hr ${rem} min`
}

export default function App() {
  const [now, setNow] = useState(() => new Date())
  const [dragging, setDragging] = useState(false)
  const [sheet, setSheet] = useState(null) // 'shelf' | 'suggest' | null

  const [endMs, setEndMs] = useState(() => {
    const raw = Date.now() + DEFAULT_MINUTES * 60000
    return Math.round(raw / 300000) * 300000
  })

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 10000)
    return () => clearInterval(t)
  }, [])

  const minutesLeft = Math.max(0, (endMs - now.getTime()) / 60000)
  const endDate = new Date(endMs)
  const fits = thatFit(minutesLeft)
  const pick = bestFit(minutesLeft)
  const rest = fits.filter((i) => i.id !== pick?.id)

  return (
    <div className="scene">
      <div className="scene-bg" aria-hidden="true" />
      <div className="scene-tint" aria-hidden="true" />

      <main className="stage">
        <Card>
          <Logo />

          <p className="headline">How much time do you have?</p>

          <div className="readout" aria-live="polite">
            <span>Until {formatTime(endDate)}</span>
            <span className="readout-dot" aria-hidden="true" />
            <span>{formatDuration(minutesLeft)}</span>
          </div>

          <p className="hint">Drag the clock hand to change the time.</p>

          <div className="actions">
            <button className="btn-solid" onClick={() => setSheet('shelf')}>
              From your shelf
            </button>
            <button className="btn-outline" onClick={() => setSheet('suggest')}>
              Suggest Me
            </button>
          </div>
        </Card>

        <div className="clock-wrap">
          <Clock
            now={now}
            endMs={endMs}
            setEndMs={setEndMs}
            minMinutes={MIN_MINUTES}
            maxMinutes={MAX_MINUTES}
            dragging={dragging}
            setDragging={setDragging}
          />
        </div>
      </main>

      {sheet === 'shelf' && (
        <ShelfScene
          items={fits}
          best={pick}
          rest={rest}
          minutesLabel={formatDuration(minutesLeft)}
          endLabel={formatTime(endDate)}
          onClose={() => setSheet(null)}
        />
      )}

      {sheet === 'suggest' && (
        <div className="sheet-backdrop" onClick={() => setSheet(null)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <p className="sheet-kicker">Off my shelf</p>
            <h2 className="sheet-title">Suggestions from the Substack</h2>
            <p className="sheet-note">
              This is where posts from anushmaa.substack.com will appear, picked to fit your{' '}
              {formatDuration(minutesLeft)}.
            </p>
            <button className="btn-solid" onClick={() => setSheet(null)}>
              Back to the clock
            </button>
          </div>
        </div>
      )}

    </div>
  )
}
