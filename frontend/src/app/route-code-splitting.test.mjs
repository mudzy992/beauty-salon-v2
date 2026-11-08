import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const readSource = (relativePath) =>
  readFileSync(new URL(relativePath, import.meta.url), 'utf8')

test('public, admin, and stylist route pages are loaded through lazy imports', () => {
  const router = readSource('./router.tsx')
  const publicRoutes = readSource('./routes/public.routes.tsx')
  const adminRoutes = readSource('./routes/admin.routes.tsx')

  assert.match(router, /const Login = lazy\(\(\) => import\(/)
  assert.match(router, /import\(['"]\.\.\/features\/stylist-portal\/pages\/stylist-inbox-page['"]\)/)
  assert.match(publicRoutes, /const PublicHome = lazy\(\(\) => import\(/)
  assert.match(adminRoutes, /const Dashboard = lazy\(\(\) => import\(/)

  assert.match(router, /<Suspense fallback=\{<RouteLoadingFallback \/>\}>/)
  assert.match(publicRoutes, /lazy\(\(\) => import\(/)
  assert.match(adminRoutes, /lazy\(\(\) => import\(/)
})

test('route loading fallback announces translated loading status accessibly', () => {
  const fallback = readSource('./route-loading-fallback.tsx')
  const bosnian = JSON.parse(readSource('../i18n/locales/bs.json'))
  const english = JSON.parse(readSource('../i18n/locales/en.json'))

  assert.match(fallback, /role="status"/)
  assert.match(fallback, /aria-live="polite"/)
  assert.match(fallback, /aria-atomic="true"/)
  assert.match(fallback, /aria-busy="true"/)
  assert.match(fallback, /t\('common\.loading'\)/)
  assert.equal(bosnian.common.loading, 'Učitavanje...')
  assert.equal(english.common.loading, 'Loading…')
})
