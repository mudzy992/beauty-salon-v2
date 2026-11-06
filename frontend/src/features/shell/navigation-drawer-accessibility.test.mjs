import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const admin = readFileSync(new URL('./admin/admin-layout.tsx', import.meta.url), 'utf8')
const publicLayout = readFileSync(new URL('./public/public-layout.tsx', import.meta.url), 'utf8')

test('admin navigation drawer has a localized accessible dialog name without changing its visual layout', () => {
  assert.match(admin, /<DrawerContent className="p-5">\s*<DialogTitle className="sr-only">\{t\('shell\.adminMenu'\)\}<\/DialogTitle>/)
  assert.match(admin, /import \{ DialogTitle \} from '\.\.\/\.\.\/\.\.\/components\/ui\/dialog'/)
})

test('public mobile navigation drawer has a localized accessible dialog name without changing its visual layout', () => {
  assert.match(publicLayout, /<DrawerContent className="p-5">\s*<DialogTitle className="sr-only">\{t\('shell\.mobileMenu'\)\}<\/DialogTitle>/)
  assert.match(publicLayout, /import \{ DialogTitle \} from '\.\.\/\.\.\/\.\.\/components\/ui\/dialog'/)
})
