import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { resolve } from 'node:path'
const root = resolve(import.meta.dirname, '..')
// Keep the release archive explicit: review notes and source-only documents never ship.
const files = ['theme.json', 'dist', 'LICENSE', 'LICENSE.komari-next', 'LICENSE.three', 'NOTICE.md']
if (existsSync(resolve(root, 'preview.png'))) files.push('preview.png')
// The current hub installer reads theme.json directly from the archive root.
execFileSync('tar', ['-czf', 'theme.tar.gz', ...files], { cwd: root, stdio: 'inherit' })
const hash = createHash('sha256').update(readFileSync(resolve(root, 'theme.tar.gz'))).digest('hex')
writeFileSync(resolve(root, 'theme.tar.gz.sha256'), `${hash}  theme.tar.gz\n`)
console.log('Created theme.tar.gz and SHA-256 checksum')
