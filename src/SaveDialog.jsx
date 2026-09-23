import React, { useEffect, useRef, useState } from 'react'
import { guessFromUrl, TYPES, DEFAULT_MINUTES_BY_TYPE } from './storage.js'

/* Save to shelf: paste a link, check the details, and it goes on your shelf.
   Nothing leaves this device. */

export default function SaveDialog({ onSave, onClose }) {
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [source, setSource] = useState('')
  const [type, setType] = useState('Article')
  const [minutes, setMinutes] = useState(8)
  const [touchedMinutes, setTouchedMinutes] = useState(false)
  const firstField = useRef(null)

  useEffect(() => {
    firstField.current?.focus()
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const handleUrl = (value) => {
    setUrl(value)
    if (!value.trim()) return
    const guess = guessFromUrl(value.trim())
    setSource((s) => s || guess.source)
    setType(guess.type)
    if (!touchedMinutes) setMinutes(guess.minutes)
  }

  const handleType = (value) => {
    setType(value)
    if (!touchedMinutes) setMinutes(DEFAULT_MINUTES_BY_TYPE[value] ?? 8)
  }

  const submit = (e) => {
    e.preventDefault()
    if (!title.trim()) return
    onSave({
      id: `u${Date.now()}`,
      title: title.trim(),
      source: source.trim(),
      type,
      minutes: Math.max(1, Math.round(Number(minutes) || 1)),
      url: url.trim(),
    })
  }

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Save to shelf"
        onClick={(e) => e.stopPropagation()}
      >
        <form className="dialog-content" onSubmit={submit}>
          <p className="dialog-kicker">Save to shelf</p>

          <label className="field">
            <span>Link</span>
            <input
              ref={firstField}
              type="url"
              inputMode="url"
              placeholder="Paste a link"
              value={url}
              onChange={(e) => handleUrl(e.target.value)}
            />
          </label>

          <label className="field">
            <span>Title</span>
            <input
              type="text"
              placeholder="What is it called?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </label>

          <div className="field-row">
            <label className="field">
              <span>Type</span>
              <select value={type} onChange={(e) => handleType(e.target.value)}>
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>

            <label className="field field-short">
              <span>Minutes</span>
              <input
                type="number"
                min="1"
                max="600"
                value={minutes}
                onChange={(e) => {
                  setTouchedMinutes(true)
                  setMinutes(e.target.value)
                }}
              />
            </label>
          </div>

          <label className="field">
            <span>Source</span>
            <input
              type="text"
              placeholder="Author or publication"
              value={source}
              onChange={(e) => setSource(e.target.value)}
            />
          </label>

          <div className="dialog-actions">
            <button type="submit" className="btn-solid">
              Put it on the shelf
            </button>
            <button type="button" className="btn-outline" onClick={onClose}>
              Cancel
            </button>
          </div>

          <p className="dialog-note">Saved on this device only.</p>
        </form>
      </div>
    </div>
  )
}
