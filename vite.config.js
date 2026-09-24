import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { metaFromUrl } from './api/_meta.js'

/* On Vercel, /api/meta is a serverless function. In `npm run dev` there is no
   Vercel, so the dev server answers the same route with the same code. */
function metaRoute() {
  return {
    name: 'ots-meta-route',
    configureServer(server) {
      server.middlewares.use('/api/meta', async (req, res) => {
        const url = new URL(req.url, 'http://localhost').searchParams.get('url')
        const result = url ? await metaFromUrl(url) : { ok: false, reason: 'No link given.' }
        res.statusCode = result.ok ? 200 : url ? 422 : 400
        res.setHeader('content-type', 'application/json')
        res.end(JSON.stringify(result))
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), metaRoute()],
})
