// The shelf. For now these are the first real saves; session 3 replaces this
// with saving from the app, kept on your own device.

export const SAMPLE_SHELF = [
  {
    id: 's1',
    title: 'Design tokens need more than semantics',
    source: 'Nate Baldwin',
    type: 'Article',
    minutes: 8,
    url: 'https://medium.com/@NateBaldwin/design-tokens-need-more-than-semantics-0e5a85df0d33',
  },
  {
    id: 's2',
    title: '10 websites better than another hour of doomscrolling',
    source: 'Rafia Naseem',
    type: 'Article',
    minutes: 6,
    url: 'https://medium.com/the-sunday-journal/10-websites-better-than-another-hour-of-doomscrolling-828832e25439',
  },
  {
    id: 's3',
    title: 'Why Bloody Mary Hated Queen Elizabeth I | Two Sisters',
    source: 'Absolute History',
    type: 'Video',
    minutes: 43,
    url: 'https://youtu.be/IFm4AE1Hm4Y?si=6AOdFT-Q9H0EllVW',
  },
]

export function thatFit(minutes, items = SAMPLE_SHELF) {
  return items.filter((item) => item.minutes <= minutes)
}

export function countThatFit(minutes, items = SAMPLE_SHELF) {
  return thatFit(minutes, items).length
}

export function bestFit(minutes, items = SAMPLE_SHELF) {
  const fits = thatFit(minutes, items)
  if (!fits.length) return null
  // the closest fit: the longest thing that still fits the window
  return fits.reduce((a, b) => (b.minutes > a.minutes ? b : a))
}
