import React, { useEffect, useRef, useState } from 'react'
import { guessFromUrl, TYPES, DEFAULT_MINUTES_BY_TYPE } from './storage.js'

/* Save to shelf: paste a link and the app reads it — title, who made it, what
   kind of thing it is and how long it takes — so there is usually nothing left
   to type. Anything it gets wrong you can overwrite; it never overwrites you.
   The item itself stays on this device. */

function looksLikeLink(value) {
  if (!value || value.length < 5) return false
  try {
    const u = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`)
    return u.hostname.includes('.')
  } catch {
    return false
  }
}

export default function SaveDialog({ onSave, onClose }) {
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [source, setSource] = useState('')
  const [type, setType] = useState('Article')
  const [minutes, setMinutes] = useState(8)
  const [estimated, setEstimated] = useState(false)
  const [status, setStatus] = useState(null) // 'reading' | 'read' | 'failed'
  const [note, setNote] = useState('')

  const touched = useRef({ title: false, source: false, type: false, minutes: false })
  const request = useRef(0)
  const lastLookup = useRef('')
  const firstField = useRef(null)

  useEffect(() => {
    firstField.current?.focus()
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  /* read the link a moment after typing stops */
  useEffect(() => {
    const link = url.trim()
    if (!looksLikeLink(link)) return
    const t = setTimeout(() => lookup(link), 650)
    return () => clearTimeout(t)
  }, [url])

  const handleUrl = (value) => {
    setUrl(value)
    const link = value.trim()
    if (!link) {
      setStatus(null)
      setNote('')
      return
    }
    // a first guess from the address alone, so the form is never empty
    const guess = guessFromUrl(link)
    if (!touched.current.source) setSource(guess.source)
    if (!touched.current.type) setType(guess.type)
    if (!touched.current.minutes) setMinutes(guess.minutes)
  }

  const lookup = async (link) => {
    if (link === lastLookup.current) return
    lastLookup.current = link
    const id = ++request.current
    setStatus('reading')
    setNote('')

    try {
      const res = await fetch(`/api/meta?url=${encodeURIComponent(link)}`)
      const data = await res.json()
      if (id !== request.current) return // a newer link is already being read

      if (!data.ok) {
        setStatus('failed')
        setNote(data.reason || "Couldn't read that link.")
        return
      }

      if (!touched.current.title) setTitle(data.title)
      if (!touched.current.source) setSource(data.source)
      if (!touched.current.type) setType(data.type)
      if (!touched.current.minutes) {
        setMinutes(data.minutes)
        setEstimated(Boolean(data.estimated))
      }
      setStatus('read')
      setNote(
        !data.estimated
          ? ''
          : data.type === 'Video' || data.type === 'Podcast'
            ? "Filled in, but the length didn't come through — set the minutes yourself."
            : 'The length is an estimate — change it if you know better.'
      )
    } catch {
      if (id !== request.current) return
      setStatus('failed')
      setNote('Could not reach the link reader.')
    }
  }

  const handleType = (value) => {
    touched.current.type = true
    setType(value)
    if (!touched.current.minutes) {
      setMinutes(DEFAULT_MINUTES_BY_TYPE[value] ?? 8)
      setEstimated(true)
    }
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
      estimated: estimated && !touched.current.minutes,
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
              onBlur={() => looksLikeLink(url.trim()) && lookup(url.trim())}
            />
          </label>

          <p className={`dialog-status is-${status || 'idle'}`} aria-live="polite">
            {status === 'reading' && (
              <>
                <span className="dot" aria-hidden="true" /> Reading the link…
              </>
            )}
            {status === 'read' && (note || 'Filled in from the link — change anything that looks off.')}
            {status === 'failed' && `${note} Fill it in yourself.`}
            {!status && 'Paste a link and the rest fills itself in.'}
          </p>

          <label className="field">
            <span>Title</span>
            <input
              type="text"
              placeholder="What is it called?"
              value={title}
              onChange={(e) => {
                touched.current.title = true
                setTitle(e.target.value)
              }}
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
                className={estimated ? 'is-estimate' : undefined}
                type="number"
                min="1"
                max="600"
                value={minutes}
                onChange={(e) => {
                  touched.current.minutes = true
                  setEstimated(false)
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
              onChange={(e) => {
                touched.current.source = true
                setSource(e.target.value)
              }}
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
