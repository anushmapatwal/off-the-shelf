import React, { useEffect, useRef, useState } from 'react'

/* The shelf as a row of spines.
   Hover a spine and it lifts; press it and the book turns out to face you,
   showing its cover, while the books beside it slide over to make room.
   A spine's thickness is how long the thing takes.
   Pass `pick` and that book comes off the shelf on its own, a moment after
   the shelf appears. Whatever goes in `children` sits above the row. */

const H = 220 // spine height
const COVER = Math.round(H * 0.68) // cover width
const OPEN_ANGLE = 64 // how far the book turns, in degrees
const PULL = 110 // how far it comes toward you, in px
const PERSPECTIVE = 1400

const PALETTE = [
  '#1f2a30', '#c39a3a', '#e4e0d6', '#1d2b4a', '#efe6d2', '#7a6a93', '#2e2b2a',
  '#1e3a46', '#21342b', '#b5452c', '#e07b39', '#3b4a5c', '#3f73b8', '#4a4a2e',
  '#d98f82', '#b9b2a6', '#2b4a3a', '#5a1f24', '#6f7f6e', '#2b4f55', '#3b2d5a',
  '#7d7564', '#3c2a24',
]

function hash(str) {
  let h = 0
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0
  return Math.abs(h)
}

function isLight(hex) {
  const n = parseInt(hex.slice(1), 16)
  const r = n >> 16, g = (n >> 8) & 255, b = n & 255
  return 0.299 * r + 0.587 * g + 0.114 * b > 160
}

function bookLook(item) {
  const h = hash(item.id + item.title)
  const color = PALETTE[h % PALETTE.length]
  const spine = Math.round(Math.min(58, 24 + Math.sqrt(item.minutes) * 5))
  const height = Math.round(H * (0.94 + ((h >> 4) % 7) / 100))
  return { color, spine, height, light: isLight(color) }
}

const rad = (d) => (d * Math.PI) / 180

// the width a turned book takes up on the shelf, perspective included
function openWidth(spine) {
  const flat = spine * Math.cos(rad(OPEN_ANGLE)) + COVER * Math.sin(rad(OPEN_ANGLE))
  return Math.round((flat * PERSPECTIVE) / (PERSPECTIVE - PULL)) + 10
}

function Motif({ type }) {
  // a quiet mark for what kind of thing it is, standing in for cover art
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round' }
  switch (type) {
    case 'Video':
      return (
        <svg viewBox="0 0 80 80" aria-hidden="true">
          <circle cx="40" cy="40" r="30" {...common} />
          <path d="M33 27 L55 40 L33 53 Z" {...common} />
        </svg>
      )
    case 'Podcast':
      return (
        <svg viewBox="0 0 80 80" aria-hidden="true">
          {[10, 18, 26, 34].map((r) => (
            <path key={r} d={`M${40 - r} 52 A${r} ${r} 0 0 1 ${40 + r} 52`} {...common} />
          ))}
          <circle cx="40" cy="52" r="3" fill="currentColor" />
        </svg>
      )
    case 'Thread':
      return (
        <svg viewBox="0 0 80 80" aria-hidden="true">
          <path d="M14 22 Q40 6 66 22 T66 50 Q40 66 14 50" {...common} />
          <circle cx="14" cy="22" r="3" fill="currentColor" />
          <circle cx="14" cy="50" r="3" fill="currentColor" />
        </svg>
      )
    default:
      return (
        <svg viewBox="0 0 80 80" aria-hidden="true">
          {[22, 31, 40, 49, 58].map((y, i) => (
            <line key={y} x1="14" x2={i === 4 ? 46 : 66} y1={y} y2={y} {...common} />
          ))}
        </svg>
      )
  }
}

export default function Spines({ items, pick, onAdd, children }) {
  const [open, setOpen] = useState(() => new Set())
  const [focus, setFocus] = useState(null) // the book the caption is about
  const [hover, setHover] = useState(null)
  const rowRef = useRef(null)

  useEffect(() => {
    if (!pick) return
    const t = setTimeout(() => {
      setOpen(new Set([pick]))
      setFocus(pick)
    }, 650)
    return () => clearTimeout(t)
  }, [pick])

  const toggle = (item, el) => {
    setOpen((prev) => {
      const next = new Set(prev)
      next.has(item.id) ? next.delete(item.id) : next.add(item.id)
      return next
    })
    setFocus(item.id)
    // once it has turned, make sure the whole cover is in view
    setTimeout(() => el?.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' }), 520)
  }

  const putBack = (id) => {
    setOpen((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }

  const scrollBy = (dir) => {
    const row = rowRef.current
    row?.scrollBy({ left: dir * row.clientWidth * 0.6, behavior: 'smooth' })
  }

  const shownId = hover ?? focus
  const shownIndex = items.findIndex((i) => i.id === shownId)
  const shown = items[shownIndex]

  return (
    <section className="spines">
      <div className="spines-head">
        <div>{children}</div>
        {items.length > 0 && (
          <div className="spines-arrows">
            <button onClick={() => scrollBy(-1)} aria-label="Scroll shelf left">←</button>
            <button onClick={() => scrollBy(1)} aria-label="Scroll shelf right">→</button>
          </div>
        )}
      </div>

      <div className="spines-row" ref={rowRef} onMouseLeave={() => setHover(null)}>
        {items.length === 0 && (
          // an empty shelf keeps one place open, for the first thing
          <button className="spine-ghost" onClick={onAdd}>
            <span>Add to this shelf</span>
          </button>
        )}
        {items.map((item) => {
          const look = bookLook(item)
          const isOpen = open.has(item.id)
          return (
            <button
              key={item.id}
              className={`spine-slot${isOpen ? ' is-open' : ''}`}
              style={{
                '--c': look.color,
                '--ink': look.light ? '#2a2723' : '#f6f1e7',
                '--sw': `${look.spine}px`,
                '--cw': `${COVER}px`,
                '--h': `${look.height}px`,
                '--turn': `-${OPEN_ANGLE}deg`,
                '--pull': `${PULL}px`,
                '--persp': `${PERSPECTIVE}px`,
                width: isOpen ? openWidth(look.spine) : look.spine,
              }}
              aria-expanded={isOpen}
              aria-label={`${item.title}, ${item.minutes} minute ${item.type.toLowerCase()}`}
              onClick={(e) => toggle(item, e.currentTarget)}
              onMouseEnter={() => setHover(item.id)}
              onFocus={() => setHover(item.id)}
              onBlur={() => setHover(null)}
            >
              <span className="spine-box">
                <span className="spine-face">
                  <span className="spine-text">{item.title}</span>
                  <span className="spine-min">{item.minutes}′</span>
                </span>
                <span className="spine-cover">
                  <span className="cover-kicker">Off the Shelf</span>
                  <span className="cover-motif">
                    <Motif type={item.type} />
                  </span>
                  <span className="cover-title">{item.title}</span>
                  <span className="cover-meta">
                    {item.type} · {item.estimated ? '~' : ''}
                    {item.minutes} min
                  </span>
                </span>
              </span>
              <span className="spine-shadow" aria-hidden="true" />
            </button>
          )
        })}
      </div>

      <div className="spines-caption" aria-live="polite">
        {shown && (
          <p key={shown.id}>
            <span className="cap-num">{String(shownIndex + 1).padStart(2, '0')}</span>
            <span className="cap-title">{shown.title}</span>
            <span className="cap-meta">
              {shown.minutes} min · {shown.source || shown.type}
            </span>
            {open.has(shown.id) && (
              <>
                <a className="cap-link" href={shown.url} target="_blank" rel="noreferrer">
                  Open it →
                </a>
                <button className="cap-link" onClick={() => putBack(shown.id)}>
                  Put back
                </button>
              </>
            )}
          </p>
        )}
      </div>
    </section>
  )
}
