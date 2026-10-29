import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const resource = readFileSync(new URL('../../i18n/bs.ts', import.meta.url), 'utf8')
const screen = readFileSync(new URL('./StylistInboxScreen.tsx', import.meta.url), 'utf8')
const inboxTranslations = resource.match(/inbox:\s*\{([\s\S]*?)\n\s*\},\n\s*profile:/)?.[1]

test('stylist inbox empty-state copy uses Bosnian resources', () => {
  assert.ok(inboxTranslations, 'Missing stylist inbox resources')
  for (const key of ['noProfileTitle', 'noProfileMessage', 'emptyTitle', 'emptyMessage']) {
    assert.match(inboxTranslations, new RegExp(`\\b${key}:`), `Missing inbox translation: ${key}`)
    assert.ok(screen.includes(`t('stylist.inbox.${key}')`), `Inbox screen missing key: ${key}`)
  }
  assert.doesNotMatch(
    screen,
    /Nema profila stilista|Vaš profil stilista nije pronađen\.|Nema novih zahtjeva|Rezervacije koje trebaju vaš odgovor/,
  )
})

test('inbox profile and no-pending empty-state conditions remain unchanged', () => {
  assert.match(screen, /if \(!profileId\) \{/)
  assert.match(screen, /<FlatList[\s\S]*?data=\{pending\}/)
  assert.match(screen, /pending\.length === 0 && styles\.emptyList/)
  assert.match(screen, /ListEmptyComponent=\{\s*<EmptyState/)
  assert.match(screen, /refreshControl=\{/)
  assert.match(screen, /r\.status === 'PENDING' \|\| r\.status === 'STYLIST_REVIEW'/)
})
