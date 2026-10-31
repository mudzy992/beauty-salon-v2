import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const resources = readFileSync(new URL('../../i18n/bs.ts', import.meta.url), 'utf8')

test('login public-settings recovery message is localized in Bosnian', () => {
  assert.ok(
    resources.includes(
      "loginPublicSettingsLoadError: 'Postavke izgleda prijave trenutno nisu dostupne. Prikazujemo zadani izgled.'",
    ),
  )
  assert.match(resources, /common:[\s\S]*?retry:/)
})
