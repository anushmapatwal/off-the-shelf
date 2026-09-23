// Everything you save stays on this device.

const KEY = 'ots.shelf.v1'

export function loadSaved() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function persist(items) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items))
  } catch {
    /* private browsing, full disk — the shelf still works for this visit */
  }
}

/* a decent guess from the link alone, until the AI step fills these in */
export function guessFromUrl(url) {
  let host = ''
  try {
    host = new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return { source: '', type: 'Article', minutes: 8 }
  }
  if (/youtube|youtu\.be|vimeo/.test(host)) return { source: host, type: 'Video', minutes: 12 }
  if (/spotify|apple\.com\/.*podcast|pocketcasts|overcast/.test(host))
    return { source: host, type: 'Podcast', minutes: 35 }
  if (/x\.com|twitter|threads|bsky/.test(host)) return { source: host, type: 'Thread', minutes: 3 }
  if (/substack/.test(host)) return { source: host, type: 'Newsletter', minutes: 7 }
  return { source: host, type: 'Article', minutes: 8 }
}

export const TYPES = ['Article', 'Video', 'Podcast', 'Book', 'Thread', 'Newsletter']

export const DEFAULT_MINUTES_BY_TYPE = {
  Article: 8,
  Video: 12,
  Podcast: 35,
  Book: 45,
  Thread: 3,
  Newsletter: 7,
}
