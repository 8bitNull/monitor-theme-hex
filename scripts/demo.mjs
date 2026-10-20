// A separate local-only fixture server. Never included in dist or theme.tar.gz.
import http from 'node:http'
import {gzipSync} from 'node:zlib'
import { readFile } from 'node:fs/promises'
import { resolve, extname } from 'node:path'
import { nodes, metrics } from './fixtures.mjs'
import {refinedNodes,refinedMetrics} from './refinement-fixtures.mjs'
const root = resolve(process.env.THEME_DEMO_ROOT || resolve(import.meta.dirname, '../dist'))
const adminDemo=process.env.THEME_DEMO_ADMIN==='1'
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' }
http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost')
  const reply = value => { res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(value)) }
  if (url.pathname === '/api/me') return reply({ authed: adminDemo, github: false, site_name: adminDemo?'HEX · 管理员演示':'HEX · 演示', public_page: true })
  if (url.pathname === '/api/version' && adminDemo) return reply({hub:'1.0.0',hub_latest:'1.1.0',agent_latest:'1.1.0',notice:true})
  if (url.pathname === '/api/nodes') return reply({ nodes: process.env.THEME_DEMO_REFINED==='1'?refinedNodes():nodes().map((node, i) => process.env.THEME_DEMO_GROUPS === '1' ? { ...node, group: ['网站', '网站', '流量', '流量', '', ''][i] } : node) })
  if (/^\/api\/nodes\/\d+\/metrics$/.test(url.pathname)) return reply(process.env.THEME_DEMO_REFINED==='1'?refinedMetrics():metrics())
  if (url.pathname.startsWith('/api/')) { res.writeHead(404); return res.end() }
  try {
    const name = url.pathname === '/' || /^\/node\//.test(url.pathname) ? '/index.html' : decodeURIComponent(url.pathname)
    const file = resolve(root, '.' + name)
    if (!file.startsWith(root + '/') && !file.startsWith(root + '\\')) { res.writeHead(403); return res.end() }
    const data = await readFile(file)
    res.setHeader('content-type', types[extname(file)] || 'application/octet-stream')
    // Optional production-like delivery for cache/transfer acceptance only.
    if(process.env.THEME_DEMO_HTTP_CACHE==='1') {
      res.setHeader('cache-control',/^\/assets\/.+-[^/]+\.(js|css)$/.test(url.pathname)?'public, max-age=31536000, immutable':'no-cache')
      if(['.js','.css','.svg','.json','.html'].includes(extname(file)) && /\bgzip\b/.test(req.headers['accept-encoding']||'')) {res.setHeader('content-encoding','gzip');res.setHeader('vary','Accept-Encoding');return res.end(gzipSync(data))}
    }
    res.end(data)
  } catch { res.writeHead(404); res.end('Not found') }
}).listen(Number(process.env.THEME_DEMO_PORT || 4173), process.env.THEME_DEMO_HOST || '0.0.0.0', () => console.log(`Demo (sample data only): http://127.0.0.1:${process.env.THEME_DEMO_PORT || 4173}`))
