import assert from 'node:assert/strict'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { isAbsolute, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const output = resolve(process.argv[2] ?? fileURLToPath(new URL('../dist/', import.meta.url)))
const base = process.env.PAGES_BASE_PATH ?? '/'
assert.match(base, /^\/(?:[A-Za-z0-9._~-]+\/)*$/, 'PAGES_BASE_PATH must be an absolute directory path ending in /.')
const origin = new URL('https://pages.invalid')
assert.equal(new URL(base, origin).pathname, base, 'PAGES_BASE_PATH must not contain parent-directory segments.')
let checked = 0
for (const entry of ['index.html', 'admin/index.html']) {
  const document = readFileSync(join(output, ...entry.split('/')), 'utf8')
  const references = [...document.matchAll(/\b(?:src|href)="([^"]+)"/g)]
  assert.ok(references.length >= 2, `Missing build assets in ${entry}`)
  assert.match(document, /<script[^>]+type="module"[^>]+src=/, `Missing entry script in ${entry}`)
  for (const [, value] of references) {
    const url = new URL(value, new URL(`${base}${entry}`, origin))
    assert.equal(url.origin, origin.origin, `Unexpected external asset: ${value}`)
    assert.ok(url.pathname.startsWith(base), `Asset leaves the Pages base path: ${value}`)
    const asset = resolve(output, decodeURIComponent(url.pathname.slice(base.length)))
    const suffix = relative(output, asset)
    assert.ok(!isAbsolute(suffix) && suffix !== '..' && !suffix.startsWith(`..${sep}`), `Asset leaves dist: ${value}`)
    assert.ok(existsSync(asset) && statSync(asset).isFile() && statSync(asset).size > 0, `Missing build asset: ${value}`)
    checked++
  }
}
console.log(`PASS: both HTML entries and ${checked} asset references are valid under ${base}`)
