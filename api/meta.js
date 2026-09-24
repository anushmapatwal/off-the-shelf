import { metaFromUrl } from './_meta.js'

/* GET /api/meta?url=… → what that link is.
   Runs on Vercel; the dev server serves the same thing from vite.config.js. */

export default async function handler(req, res) {
  const url = new URL(req.url, 'http://localhost').searchParams.get('url')

  if (!url) {
    res.status(400).json({ ok: false, reason: 'No link given.' })
    return
  }

  const result = await metaFromUrl(url)

  res.setHeader('cache-control', 's-maxage=86400, stale-while-revalidate')
  res.status(result.ok ? 200 : 422).json(result)
}
