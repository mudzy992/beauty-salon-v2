import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const bosnian = readFileSync(new URL('../i18n/bs.ts', import.meta.url), 'utf8')
const stylist = bosnian.split('  stylist: {')[1]?.split('\n  },')[0] ?? ''
const profile = stylist.split('    profile: {')[1]?.split('\n    },')[0] ?? ''

test('stylist profile lookup recovery has localized Bosnian error and retry copy', () => {
  assert.match(profile, /profileLoadError: 'Profil stilista nije moguće učitati\./)
  assert.match(profile, /retryProfileLoad: 'Pokušaj ponovo'/)
})
