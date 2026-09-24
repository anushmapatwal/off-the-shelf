import { metaFromUrl, probeYoutube } from './_meta.js'

/* GET /api/meta?url=… → what that link is.
   Add &debug=1 on a YouTube link to see what YouTube served back.
   Runs on Vercel; the dev server serves the same thing from vite.config.js. */

export default async function handler(req, res) {
  const params = new URL(req.url, 'http://localhost').searchParams
  const url = params.get('url')

  if (!url) {
    res.status(400).json({ ok: false, reason: 'No link given.' })
    return
  }

  if (params.get('debug') && /youtu/.test(url)) {
    res.status(200).json({ debug: await probeYoutube(url) })
    return
  }

  const result = await metaFromUrl(url)

  res.setHeader('cache-control', 's-maxage=86400, stale-while-revalidate')
  res.status(result.ok ? 200 : 422).json(result)
}
