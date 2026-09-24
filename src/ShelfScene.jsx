import React, { useEffect, useState } from 'react'

/* What happens when you press "From your shelf":
   the room becomes the shelf, then a book comes off it and opens,
   with everything that fits your time written on its pages.

   Three things can be written on those pages:
   - something fits          → the pick, plus what else fits
   - nothing fits            → how short you are, plus the shelf shortest-first
   - the shelf is empty      → an invitation to put the first thing on it */

const byShortest = (a, b) => a.minutes - b.minutes

export default function ShelfScene({ items, all, best, rest, minutes, minutesLabel, endLabel, onAdd, onClose }) {
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

  const shelf = all ?? items
  const isEmpty = shelf.length === 0
  const shortest = isEmpty ? null : [...shelf].sort(byShortest)[0]

  // the right page: what else fits, or — when nothing does — the shelf, shortest first
  const others = rest.length ? rest : [...shelf].filter((i) => i.id !== best?.id).sort(byShortest)
  const othersKicker = rest.length ? 'Also fits' : 'On the shelf'

  return (
    <div className={`shelf-scene is-${phase}`} role="dialog" aria-modal="true" aria-label="From your shelf">
      <div className="shelf-bg" aria-hidden="true" />

      <div className="book">
        <img className="book-art" src="/art/book-v2.webp" alt="" draggable="false" />

        <div className="book-pages">
          <div className="book-page book-page-left">
            {isEmpty ? (
              <>
                <p className="page-kicker">Your shelf is empty</p>
                <h2 className="page-title">Nothing here yet</h2>
                <p className="page-reason">
                  Save something now and it&rsquo;ll be waiting the next time you have some spare
                  time.
                </p>
                <button className="page-action" onClick={onAdd}>
                  Add to this shelf
                </button>
              </>
            ) : best ? (
              <>
                <p className="page-kicker">From your shelf</p>
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
                <p className="page-kicker">From your shelf</p>
                <h2 className="page-title">Not quite enough time</h2>
                <p className="page-reason">
                  The shortest thing here is {shortest.minutes} min and you have{' '}
                  {Math.floor(minutes)}. Nudge the clock a little, or save something quick for
                  moments like this.
                </p>
              </>
            )}
          </div>

          <div className="book-page book-page-right">
            {!isEmpty && others.length > 0 && (
              <>
                <p className="page-kicker">{othersKicker}</p>
                <ul className="page-list">
                  {others.slice(0, 5).map((item) => (
                    <li key={item.id}>
                      <a href={item.url} target="_blank" rel="noreferrer">
                        <span className="page-list-title">{item.title}</span>
                        <span className="page-list-min">{item.minutes} min</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      </div>

      <button className="scene-close" onClick={onClose}>
        Back to the clock
      </button>
    </div>
  )
}
