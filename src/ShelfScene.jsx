import React, { useEffect, useState } from 'react'

/* What happens when you press "From your shelf":
   the room becomes the shelf, then a book comes off it and opens,
   with everything that fits your time written on its pages. */

export default function ShelfScene({ items, best, rest, minutesLabel, endLabel, onClose }) {
  const [phase, setPhase] = useState('shelf')

  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduce) {
      setPhase('open')
      return
    }
    const a = setTimeout(() => setPhase('opening'), 700)
    const b = setTimeout(() => setPhase('open'), 1500)
    return () => {
      clearTimeout(a)
      clearTimeout(b)
    }
  }, [])

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className={`shelf-scene is-${phase}`} role="dialog" aria-modal="true" aria-label="From your shelf">
      <div className="shelf-bg" aria-hidden="true" />

      <div className="book">
        <img className="book-art" src="/art/book-v2.webp" alt="" draggable="false" />

        <div className="book-pages">
          <div className="book-page book-page-left">
            <p className="page-kicker">From your shelf</p>
            {best ? (
              <>
                <h2 className="page-title">{best.title}</h2>
                <p className="page-meta">
                  {best.type} · {best.source} · {best.estimated ? '~' : ''}
                  {best.minutes} min
                </p>
                <p className="page-reason">
                  Fits the {minutesLabel} you have before {endLabel}, with room to spare.
                </p>
                <a className="page-link" href={best.url} target="_blank" rel="noreferrer">
                  Open it →
                </a>
              </>
            ) : (
              <>
                <h2 className="page-title">Nothing fits that window</h2>
                <p className="page-reason">
                  Everything on the shelf is longer than {minutesLabel}. Give yourself a little more
                  time, or let me suggest something shorter.
                </p>
              </>
            )}
          </div>

          <div className="book-page book-page-right">
            <p className="page-kicker">{rest.length ? 'Also fits' : 'On the shelf'}</p>
            <ul className="page-list">
              {(rest.length ? rest : items).slice(0, 5).map((item) => (
                <li key={item.id}>
                  <a href={item.url} target="_blank" rel="noreferrer">
                    <span className="page-list-title">{item.title}</span>
                    <span className="page-list-min">{item.minutes} min</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <button className="scene-close" onClick={onClose}>
        Back to the clock
      </button>
    </div>
  )
}
