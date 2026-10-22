import React, { useEffect } from 'react'
import Spines from './Spines.jsx'

/* What happens when you press "From your shelf":
   the clock gives way to your shelf, showing only what fits your time.
   The closest fit comes off the shelf on its own; the rest stay there to browse.

   Three shelves can come up:
   - something fits          → what fits, longest first, the pick pulled out
   - nothing fits            → how short you are, plus the shelf shortest-first
   - the shelf is empty      → an empty shelf with room for the first thing */

const byShortest = (a, b) => a.minutes - b.minutes
const byLongest = (a, b) => b.minutes - a.minutes

function plural(n, word) {
  return `${n} ${word}${n === 1 ? '' : 's'}`
}

export default function ShelfScene({ items, all, best, minutes, minutesLabel, endLabel, onAdd, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const shelf = all ?? items
  const isEmpty = shelf.length === 0
  const shortest = isEmpty ? null : [...shelf].sort(byShortest)[0]

  let books, kicker, title, note
  if (isEmpty) {
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

  return (
    <div className="shelf-scene" role="dialog" aria-modal="true" aria-label="From your shelf">
      <div className="shelf-bar">
        <button className="shelf-back" onClick={onClose}>
          ← Back to the clock
        </button>
        {!isEmpty && (
          <button className="shelf-add" onClick={onAdd}>
            Save to shelf
          </button>
        )}
      </div>

      <div className={`shelf-body${best ? '' : ' is-quiet'}`}>
        <Spines items={books} pick={best?.id} onAdd={onAdd}>
          <p className="shelf-kicker">{kicker}</p>
          <h2 className="shelf-title">{title}</h2>
          <p className="shelf-note">{note}</p>
        </Spines>
      </div>
    </div>
  )
}
