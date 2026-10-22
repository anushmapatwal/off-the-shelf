import React from 'react'
import Spines from './Spines.jsx'
import { SAMPLE_SHELF } from './shelf.js'
import { loadSaved } from './storage.js'

// ?spines — the spine shelf on its own, padded out with made-up books so
// there's a full row to play with. Not linked from anywhere yet.

const DEMO = [
  ['The quiet power of boring software', 'Article', 11],
  ['How maps lie', 'Video', 18],
  ['A history of the paperclip', 'Podcast', 38],
  ['On taking long walks', 'Newsletter', 7],
  ['Why fonts look different on Windows', 'Article', 9],
  ['The last lighthouse keepers', 'Video', 24],
  ['Notes on craft', 'Thread', 3],
  ['What ants know about traffic', 'Article', 6],
  ['Slow design', 'Podcast', 52],
  ['The case for fewer meetings', 'Article', 5],
  ['Inside a piano factory', 'Video', 14],
  ['Letters to a young designer', 'Newsletter', 12],
  ['Cities without cars', 'Podcast', 45],
  ['Colour, briefly', 'Article', 4],
].map(([title, type, minutes], i) => ({ id: `demo${i}`, title, type, minutes, source: 'Demo', url: '#' }))

export default function SpinesPreview() {
  const items = [...loadSaved(), ...SAMPLE_SHELF, ...DEMO]
  return (
    <main className="spines-preview">
      <Spines items={items} />
    </main>
  )
}
