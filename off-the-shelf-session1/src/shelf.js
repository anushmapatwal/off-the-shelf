// Placeholder shelf so the clock can say something true about what fits.
// Session 2 replaces this with real saved items in local storage.

export const SAMPLE_SHELF = [
  { id: 's1', title: 'The tyranny of the marginal user', type: 'article', minutes: 8 },
  { id: 's2', title: 'A thread on pricing for solo designers', type: 'thread', minutes: 3 },
  { id: 's3', title: 'How Figma builds product', type: 'podcast', minutes: 42 },
  { id: 's4', title: 'Motion design for interfaces', type: 'video', minutes: 12 },
  { id: 's5', title: 'Shape Up, chapter 2', type: 'book', minutes: 28 },
  { id: 's6', title: 'Why your onboarding leaks', type: 'article', minutes: 6 },
  { id: 's7', title: 'Notes on taste', type: 'article', minutes: 15 },
]

export function countThatFit(minutes) {
  return SAMPLE_SHELF.filter((item) => item.minutes <= minutes).length
}

export function bestFit(minutes) {
  const fits = SAMPLE_SHELF.filter((item) => item.minutes <= minutes)
  if (!fits.length) return null
  return fits.reduce((a, b) => (b.minutes > a.minutes ? b : a))
}
