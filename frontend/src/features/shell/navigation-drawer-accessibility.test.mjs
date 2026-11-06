import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const admin = readFileSync(new URL('./admin/admin-layout.tsx', import.meta.url), 'utf8')
const adminChrome = readFileSync(new URL('./admin/admin-chrome.tsx', import.meta.url), 'utf8')
const publicLayout = readFileSync(new URL('./public/public-layout.tsx', import.meta.url), 'utf8')

test('admin navigation drawer has a localized accessible dialog name without changing its visual layout', () => {
  assert.match(admin, /<DrawerContent id="admin-mobile-navigation" className="p-5">\s*<DialogTitle className="sr-only">\{t\('shell\.adminMenu'\)\}<\/DialogTitle>/)
  assert.match(admin, /import \{ DialogTitle \} from '\.\.\/\.\.\/\.\.\/components\/ui\/dialog'/)
})

test('public mobile navigation drawer has a localized accessible dialog name without changing its visual layout', () => {
  assert.match(publicLayout, /<DrawerContent id="public-mobile-navigation" className="p-5">\s*<DialogTitle className="sr-only">\{t\('shell\.mobileMenu'\)\}<\/DialogTitle>/)
  assert.match(publicLayout, /import \{ DialogTitle \} from '\.\.\/\.\.\/\.\.\/components\/ui\/dialog'/)
})

test('mobile navigation triggers expose their expanded state and control target', () => {
  assert.match(adminChrome, /aria-expanded=\{mobileNavOpen\}[\s\S]*?aria-controls="admin-mobile-navigation"/)
  assert.match(admin, /mobileNavOpen=\{sidebarOpen\}/)
  assert.match(publicLayout, /aria-expanded=\{mobileOpen\}[\s\S]*?aria-controls="public-mobile-navigation"/)
})
