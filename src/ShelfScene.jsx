import React, { useEffect } from 'react'
import Spines from './Spines.jsx'

/* What happens when you press "From your shelf":
   the clock gives way to your shelf, showing only what fits your time.
   The closest fit comes off the shelf on its own; the rest stay there to browse.

   Three shelves can come up:
   - something fits          → what fits, longest first, the pick pulled out
   - nothing fits            → how short you are, plus the shelf shortest-first
   - the shelf is empty      → an empty shelf with room for the first thing

   "Suggest Me" opens the same scene with `picks`: Anushma's recommendations,
   all of them, in her order, with whichever fits your time best pulled out. */

const byShortest = (a, b) => a.minutes - b.minutes
const byLongest = (a, b) => b.minutes - a.minutes

function plural(n, word) {
  return `${n} ${word}${n === 1 ? '' : 's'}`
}

export default function ShelfScene({ items, all, best, picks, minutes, minutesLabel, endLabel, onAdd, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const shelf = all ?? items
  const isEmpty = shelf.length === 0
  const shortest = isEmpty ? null : [...shelf].sort(byShortest)[0]

  let books, kicker, title, note, pickId
  if (picks) {
    const fitting = picks.filter((i) => i.minutes <= minutes)
    books = picks
    pickId = fitting.length ? fitting.reduce((a, b) => (b.minutes > a.minutes ? b : a)).id : null
    kicker = `${minutesLabel} · until ${endLabel}`
    title = 'Suggested by Anushma'
    note = !fitting.length
      ? `None of these fit your ${minutes} min, but they’re worth coming back to.`
      : fitting.length === picks.length
        ? 'Everything here fits your time. The closest fit is out.'
        : `${fitting.length} of these fit your time. The closest fit is out.`
  } else if (isEmpty) {
    books = []
    kicker = 'Your shelf is empty'
    title = 'Nothing here yet'
    note = 'Save something now and it’ll be waiting the next time you have some spare time.'
  } else if (best) {
    books = [...items].sort(byLongest)
    kicker = `${minutesLabel} · until ${endLabel}`
    title = `${plural(items.length, 'thing')} fit${items.length === 1 ? 's' : ''} your time`
    note =
      items.length === 1
        ? 'Here it is.'
        : 'The closest fit is out. Thicker books take longer.'
  } else {
    books = [...shelf].sort(byShortest)
    kicker = `${minutesLabel} · until ${endLabel}`
    title = 'Not quite enough time'
    note = `The shortest thing here is ${shortest.minutes} min and you have ${minutes}. Nudge the clock a little, or save something quick for moments like this.`
  }
  if (!picks) pickId = best?.id

  return (
    <div className="shelf-scene" role="dialog" aria-modal="true" aria-label={picks ? 'Suggested by Anushma' : 'From your shelf'}>
      <header className="shelf-bar">
        <div className="shelf-bar-side">
          <button className="shelf-back" onClick={onClose} aria-label="Back to the clock">
            {/* Material "chevron_backward" */}
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
            </svg>
            <span>Back to the clock</span>
          </button>
        </div>
        <img className="shelf-bar-logo" src="/art/logo-shelf-green.svg" alt="Off the Shelf" />
        <div className="shelf-bar-side">
          <button className="shelf-add" onClick={onAdd} aria-label="Save to shelf">
            <span>Save to Shelf</span>
            {/* Material "add" */}
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6z" />
            </svg>
          </button>
        </div>
      </header>

      <div className="shelf-body">
        <Spines key={picks ? 'picks' : 'shelf'} items={books} pick={pickId} onAdd={onAdd}>
          <p className="shelf-kicker">{kicker}</p>
          <h2 className="shelf-title">{title}</h2>
          <p className="shelf-note">{note}</p>
        </Spines>
      </div>
    </div>
  )
}
