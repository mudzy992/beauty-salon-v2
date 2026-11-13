import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const admin = readFileSync(new URL('./admin/admin-layout.tsx', import.meta.url), 'utf8')
const adminChrome = readFileSync(new URL('./admin/admin-chrome.tsx', import.meta.url), 'utf8')
const publicLayout = readFileSync(new URL('./public/public-layout.tsx', import.meta.url), 'utf8')

test('admin navigation drawer has a localized accessible dialog name without changing its visual layout', () => {
  assert.match(admin, /<DrawerContent id="admin-mobile-navigation" className="p-5" onCloseAutoFocus=\{[\s\S]*?\}\}>\s*<DialogTitle className="sr-only">\{t\('shell\.adminMenu'\)\}<\/DialogTitle>/)
  assert.match(admin, /import \{ DialogTitle \} from '\.\.\/\.\.\/\.\.\/components\/ui\/dialog'/)
})

test('public mobile navigation drawer has a localized accessible dialog name without changing its visual layout', () => {
  assert.match(publicLayout, /<DrawerContent id="public-mobile-navigation" className="p-5"[^>]*>[\s\S]*?<DialogTitle className="sr-only">\{t\('shell\.mobileMenu'\)\}<\/DialogTitle>/)
  assert.match(publicLayout, /import \{ DialogTitle \} from '\.\.\/\.\.\/\.\.\/components\/ui\/dialog'/)
})

test('mobile navigation triggers expose their expanded state and control target', () => {
  assert.match(adminChrome, /aria-expanded=\{mobileNavOpen\}[\s\S]*?aria-controls="admin-mobile-navigation"/)
  assert.match(admin, /mobileNavOpen=\{sidebarOpen\}/)
  assert.match(publicLayout, /aria-expanded=\{mobileOpen\}[\s\S]*?aria-controls="public-mobile-navigation"/)
})

test('public menu restores focus and links do not contain nested buttons', () => {
  assert.match(publicLayout, /ref=\{mobileMenuTrigger\}/)
  assert.match(publicLayout, /onCloseAutoFocus=\{\(event\) => \{[\s\S]*?mobileMenuTrigger\.current\?\.focus\(\)/)
  assert.doesNotMatch(publicLayout, /<Link\b[^>]*>\s*<Button\b/)
  assert.match(publicLayout, /<Button asChild[^>]*>\s*<Link to="\/login"/)
})

test('admin site links use a single interactive element in both menus', () => {
  for (const source of [adminChrome, readFileSync(new URL('./admin/admin-layout.tsx', import.meta.url), 'utf8')]) {
    assert.doesNotMatch(source, /<Link[^>]*>\s*<Button/)
    assert.match(source, /<Button asChild[^>]*>[\s\S]*?<Link to="\/"/)
  }
})

test('admin drawer restores focus on dismiss without overriding route navigation', () => {
  assert.match(admin, /onCloseAutoFocus=\{[\s\S]*?event\.preventDefault\(\)[\s\S]*?if \(!navigationClosing\.current\) mobileNavTrigger\.current\?\.focus\(\)/)
  assert.match(admin, /onNavigate=\{closeForNavigation\}/)
  assert.match(adminChrome, /ref=\{mobileNavTriggerRef\}/)
})
