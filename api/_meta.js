/* Read a link and work out what it is: the title, who made it, what kind of
   thing it is, and roughly how long it takes. Used by the Vercel function in
   production and by the dev server, so both behave the same way. */

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'

const WORDS_PER_MINUTE = 220
const MAX_BYTES = 2_000_000
const TIMEOUT_MS = 6000
const AI_TIMEOUT_MS = 3500 // the whole function has to answer inside Vercel's 10s

const DEFAULT_MINUTES = { Article: 8, Video: 12, Podcast: 35, Book: 45, Thread: 3, Newsletter: 7 }

export async function metaFromUrl(input) {
  const url = normalize(input)
  if (!url) return { ok: false, reason: "That doesn't look like a link." }

  const host = new URL(url).hostname.replace(/^www\./, '').replace(/^m\./, '')

  try {
    if (/^(youtube\.com|youtu\.be|youtube-nocookie\.com)$/.test(host)) return await youtube(url)
    if (host === 'vimeo.com') return await vimeo(url)
    return await generic(url, host)
  } catch (err) {
    return { ok: false, reason: "Couldn't read that link.", detail: String(err?.message || err) }
  }
}

/* ---------- the sites worth special-casing ---------- */

async function youtube(url) {
  const id = youtubeId(url)
  const notes = []
  let title = ''
  let source = ''
  let seconds = null

  /* The watch page carries everything, when YouTube feels like serving it to a
     server. The embed page is smaller and often answers when the watch page
     doesn't. oEmbed always answers but never says how long the video is. */
  for (const page of [
    id && `https://www.youtube.com/watch?v=${id}&hl=en`,
    id && `https://www.youtube.com/embed/${id}?hl=en`,
  ].filter(Boolean)) {
    if (title && seconds) break
    try {
      const html = await fetchText(page)
      const found = fromYoutubeHtml(html)
      title = title || found.title
      source = source || found.source
      seconds = seconds || found.seconds
      notes.push(`${page.includes('/embed/') ? 'embed' : 'watch'}: ${found.title ? 'title ' : ''}${found.seconds ? 'length ' : ''}${found.source ? 'channel' : ''}`.trim())
    } catch (err) {
      notes.push(`${page.includes('/embed/') ? 'embed' : 'watch'} refused: ${err.message}`)
    }
  }

  if (!title || !source) {
    try {
      const j = await fetchJson(
        `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`
      )
      title = title || clean(j.title)
      source = source || clean(j.author_name)
      notes.push('oembed: title, channel')
    } catch (err) {
      notes.push(`oembed refused: ${err.message}`)
    }
  }

  if (!title) return { ok: false, reason: "Couldn't read that video.", notes }

  return finish({
    title: tidyTitle(title),
    source: source || 'YouTube',
    type: 'Video',
    minutes: seconds ? Math.max(1, Math.round(seconds / 60)) : null,
    fallbackMinutes: DEFAULT_MINUTES.Video,
    notes,
  })
}

/* Pull the three facts out of a YouTube page, from the narrowest source first.
   The loose hunt for any "title" in the page is deliberately not done here —
   a watch page has dozens of them and most belong to something else. */
export function fromYoutubeHtml(html) {
  const details =
    html.match(/"videoDetails"\s*:\s*\{[\s\S]{0,8000}?"isLiveContent"\s*:\s*(?:true|false)/)?.[0] || ''

  const seconds =
    numberOrNull(first(details, /"lengthSeconds"\s*:\s*"?(\d+)"?/)) ??
    numberOrNull(first(html, /"lengthSeconds"\s*:\s*"?(\d+)"?/)) ??
    isoDuration(meta(html, 'duration', 'itemprop')) ??
    milliseconds(first(html, /"approxDurationMs"\s*:\s*"?(\d{4,})"?/))

  const title =
    clean(jsonString(details, 'title')) ||
    clean(meta(html, 'og:title')) ||
    clean(meta(html, 'title', 'name'))

  const source =
    clean(jsonString(details, 'author')) ||
    clean(first(html, /"ownerChannelName"\s*:\s*"((?:[^"\\]|\\.)*)"/)) ||
    clean(first(html, /<link[^>]+itemprop=["\']name["\'][^>]+content=["\']([^"\']+)["\']/i))

  return { title, source, seconds }
}

/* a JSON string value, with escaped quotes inside it left intact */
function jsonString(source, key) {
  const m = source.match(new RegExp(`"${key}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`))
  return m?.[1] || ''
}

function numberOrNull(value) {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : null
}

async function vimeo(url) {
  const j = await fetchJson(`https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`)
  return finish({
    title: clean(j.title),
    source: clean(j.author_name) || 'Vimeo',
    type: 'Video',
    minutes: j.duration ? Math.max(1, Math.round(j.duration / 60)) : null,
    fallbackMinutes: DEFAULT_MINUTES.Video,
  })
}

/* ---------- everything else: read the page ---------- */

async function generic(url, host) {
  const html = await fetchText(url)

  const ogType = meta(html, 'og:type')
  const type = pickType(host, ogType)

  const title = tidyTitle(
    clean(meta(html, 'og:title')) ||
      clean(meta(html, 'twitter:title')) ||
      clean(first(html, /<title[^>]*>([\s\S]{1,300}?)<\/title>/i))
  )

  const source =
    showName(html) ||
    clean(meta(html, 'author', 'name')) ||
    clean(meta(html, 'article:author')) ||
    clean(meta(html, 'og:site_name')) ||
    host

  // a stated duration beats counting words
  const stated = statedSeconds(html)

  let minutes = stated ? Math.max(1, Math.round(stated / 60)) : null

  if (!minutes && (type === 'Article' || type === 'Newsletter')) {
    const words = wordCount(html)
    // a page that renders its text in JavaScript gives us almost nothing to count
    if (words > 200) minutes = Math.min(180, Math.max(1, Math.round(words / WORDS_PER_MINUTE)))
  }

  if (!title) return { ok: false, reason: "Couldn't read that page." }

  const notes = [stated ? 'length stated by the page' : minutes ? 'length from the word count' : 'page gave no length']
  return finish({ title, source, type, minutes, fallbackMinutes: DEFAULT_MINUTES[type] ?? 8, notes })
}

/* ---------- when the page won't say how long it is ---------- */

async function finish({ title, source, type, minutes, fallbackMinutes, notes = [] }) {
  if (minutes) return { ok: true, title, source, type, minutes, estimated: false, notes }

  const guess = await minutesFromClaude({ title, source, type })
  notes.push(guess ? 'length estimated by Claude' : 'length fell back to a default for the type')
  return {
    ok: true,
    title,
    source,
    type,
    minutes: guess ?? fallbackMinutes,
    estimated: true,
    notes,
  }
}

async function minutesFromClaude({ title, source, type }) {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) return null
  try {
    const res = await withTimeout((signal) =>
      fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        signal,
        headers: {
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 8,
          messages: [
            {
              role: 'user',
              content: `Roughly how many minutes does this take to read or watch? Answer with a number and nothing else.\n\nType: ${type}\nTitle: ${title}\nSource: ${source}`,
            },
          ],
        }),
      }), AI_TIMEOUT_MS
    )
    if (!res.ok) return null
    const j = await res.json()
    const n = Number(String(j?.content?.[0]?.text ?? '').match(/\d+/)?.[0])
    return Number.isFinite(n) && n > 0 && n <= 600 ? Math.round(n) : null
  } catch {
    return null
  }
}

/* ---------- small helpers ---------- */

function normalize(input) {
  const raw = String(input || '').trim()
  if (!raw) return null
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
  try {
    const u = new URL(withScheme)
    if (!/^https?:$/.test(u.protocol)) return null
    if (!u.hostname.includes('.')) return null
    return u.toString()
  } catch {
    return null
  }
}

function youtubeId(url) {
  const u = new URL(url)
  if (u.hostname.endsWith('youtu.be')) return u.pathname.slice(1).split('/')[0]
  return u.searchParams.get('v') || u.pathname.split('/').filter(Boolean).pop()
}

function pickType(host, ogType) {
  if (/youtube|youtu\.be|vimeo|tiktok/.test(host)) return 'Video'
  if (/spotify|podcasts\.apple|pocketcasts|overcast|podbean|anchor\.fm|castro/.test(host))
    return 'Podcast'
  if (/^(x\.com|twitter\.com|threads\.net|bsky\.app)$/.test(host)) return 'Thread'
  if (/substack\.com$/.test(host) || /beehiiv|buttondown|ghost\.io/.test(host)) return 'Newsletter'
  if (ogType?.startsWith('video')) return 'Video'
  if (ogType?.startsWith('music')) return 'Podcast'
  if (ogType?.startsWith('book')) return 'Book'
  return 'Article'
}

function meta(html, key, attr = 'property') {
  const esc = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const patterns = [
    new RegExp(`<meta[^>]+${attr}=["']${esc}["'][^>]*content=["']([^"']*)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*${attr}=["']${esc}["']`, 'i'),
    new RegExp(`<meta[^>]+(?:property|name|itemprop)=["']${esc}["'][^>]*content=["']([^"']*)["']`, 'i'),
  ]
  for (const re of patterns) {
    const m = html.match(re)
    if (m?.[1]) return m[1]
  }
  return ''
}

function first(html, re) {
  return html.match(re)?.[1] || ''
}

/* Podcast pages rarely use the OpenGraph duration tag; they bury the number in
   the JSON they ship to their own player. Apple counts in milliseconds under
   durationInMilliseconds, Spotify under duration_ms. */

function statedSeconds(html) {
  return (
    seconds(meta(html, 'video:duration')) ??
    seconds(meta(html, 'music:duration')) ??
    seconds(meta(html, 'duration', 'itemprop')) ??
    isoDuration(first(html, /"duration"\s*:\s*"(PT[^"]+)"/)) ??
    isoDuration(first(html, /"timeRequired"\s*:\s*"(PT[^"]+)"/)) ??
    milliseconds(first(html, /"durationInMilliseconds"\s*:\s*"?(\d{4,})"?/)) ??
    milliseconds(first(html, /"duration_?[mM]s"\s*:\s*"?(\d{4,})"?/)) ??
    seconds(first(html, /"durationSeconds"\s*:\s*"?(\d{2,})"?/))
  )
}

/* the show a podcast episode belongs to, however that page names it */
function showName(html) {
  const found =
    first(html, /"collectionName"\s*:\s*"([^"]{2,120})"/) ||
    first(html, /"podcastName"\s*:\s*"([^"]{2,120})"/) ||
    first(html, /"show"\s*:\s*\{[^{}]*"name"\s*:\s*"([^"]{2,120})"/) ||
    first(html, /"publisher"\s*:\s*"([^"]{2,120})"/) ||
    first(html, /"partOfSeries"\s*:\s*\{[^{}]*"name"\s*:\s*"([^"]{2,120})"/)
  return clean(found)
}

/* "Episode 12 - Slow media - Apple Podcasts" is the page's title, not the thing's */
function tidyTitle(title) {
  return title
    .replace(/\s*[|\u2013\u2014-]\s*(Apple Podcasts|Spotify|Podcast on Spotify|YouTube|Vimeo|Medium|Substack)\s*$/i, '')
    .replace(/^Listen to\s+/i, '')
    .trim()
}

function milliseconds(value) {
  const n = Number(value)
  return Number.isFinite(n) && n > 1000 ? n / 1000 : null
}

function seconds(value) {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : null
}

function isoDuration(value) {
  if (!value) return null
  const m = value.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/)
  if (!m) return null
  const s = (Number(m[1]) || 0) * 3600 + (Number(m[2]) || 0) * 60 + (Number(m[3]) || 0)
  return s > 0 ? s : null
}

function wordCount(html) {
  const body = html.match(/<article[\s\S]*?<\/article>/i)?.[0] || html
  const text = body
    .replace(/<(script|style|noscript|svg|nav|footer|header|form)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return text ? text.split(' ').length : 0
}

function clean(value) {
  if (!value) return ''
  return decode(String(value))
    .replace(/\\u([0-9a-f]{4})/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/\\n|\\r/g, ' ')
    .replace(/\\"/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 160)
}

function decode(s) {
  const named = {
    amp: '&',
    lt: '<',
    gt: '>',
    quot: '"',
    apos: "'",
    nbsp: ' ',
    rsquo: '’',
    lsquo: '‘',
    ldquo: '“',
    rdquo: '”',
    mdash: '—',
    ndash: '–',
    hellip: '…',
  }
  return s
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&([a-z]+);/gi, (m, name) => named[name.toLowerCase()] ?? m)
}

function withTimeout(run, ms = TIMEOUT_MS) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  return Promise.resolve(run(controller.signal)).finally(() => clearTimeout(timer))
}

async function fetchText(url) {
  const res = await withTimeout((signal) =>
    fetch(url, {
      signal,
      redirect: 'follow',
      headers: {
        'user-agent': UA,
        accept: 'text/html,application/xhtml+xml',
        'accept-language': 'en-US,en;q=0.9',
        // skips the consent interstitial some Google properties serve to servers
        cookie: 'CONSENT=YES+1; SOCS=CAI',
      },
    })
  )
  if (!res.ok) throw new Error(`the page answered ${res.status}`)

  // read at most MAX_BYTES so one enormous page can't hold the function open
  const reader = res.body?.getReader?.()
  if (!reader) return (await res.text()).slice(0, MAX_BYTES)
  const decoder = new TextDecoder()
  let out = ''
  let size = 0
  while (size < MAX_BYTES) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.length
    out += decoder.decode(value, { stream: true })
  }
  try {
    await reader.cancel()
  } catch {
    /* already finished */
  }
  return out
}

async function fetchJson(url) {
  const res = await withTimeout((signal) =>
    fetch(url, { signal, headers: { 'user-agent': UA, accept: 'application/json' } })
  )
  if (!res.ok) throw new Error(`the service answered ${res.status}`)
  return res.json()
}
