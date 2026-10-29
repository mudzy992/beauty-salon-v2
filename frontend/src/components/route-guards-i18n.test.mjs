import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const locale = (language) =>
  JSON.parse(
    readFileSync(
      new URL(`../i18n/locales/${language}.json`, import.meta.url),
      'utf8',
    ),
  )
const bs = locale('bs')
const en = locale('en')
const guardFiles = ['PublicOnlyRoute.tsx', 'ProtectedRoute.tsx', 'StylistRoute.tsx']
const sources = Object.fromEntries(
  guardFiles.map((file) => [
    file,
    readFileSync(new URL(`./${file}`, import.meta.url), 'utf8'),
  ]),
)

test('shared route-guard loading copy uses the common BS/EN translation', () => {
  assert.equal(bs.common.loading, 'Učitavanje...')
  assert.equal(en.common.loading, 'Loading…')

  for (const [file, source] of Object.entries(sources)) {
    assert.match(source, /useTranslation/)
    assert.match(source, /t\('common\.loading'\)/, `${file} should translate its loading state`)
    assert.doesNotMatch(source, /Učitavanje…/)
  }

  assert.equal((sources['PublicOnlyRoute.tsx'].match(/t\('common\.loading'\)/g) ?? []).length, 2)
})

test('localized route loading states preserve their authentication and readiness guards', () => {
  const publicOnly = sources['PublicOnlyRoute.tsx']
  const protectedRoute = sources['ProtectedRoute.tsx']
  const stylistRoute = sources['StylistRoute.tsx']

  assert.match(publicOnly, /if \(!isReady\) \{/)
  assert.match(publicOnly, /if \(token && user\)/)
  assert.match(publicOnly, /if \(token && !user\)/)
  assert.match(publicOnly, /navigate\(fallbackRedirect, \{ replace: true \}\)/)

  assert.match(protectedRoute, /if \(!isReady\) \{/)
  assert.match(protectedRoute, /if \(!token\)/)
  assert.match(protectedRoute, /getClientMandatoryOnboardingPath\(user\)/)
  assert.match(protectedRoute, /isExemptFromForcedPasswordChange\(user\)/)

  assert.match(stylistRoute, /if \(!isReady\) \{/)
  assert.match(stylistRoute, /if \(!token\)/)
  assert.match(stylistRoute, /roles\.includes\('STYLIST'\)/)
})
