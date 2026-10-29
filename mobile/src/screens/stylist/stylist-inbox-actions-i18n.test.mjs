import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const resource = readFileSync(new URL('../../i18n/bs.ts', import.meta.url), 'utf8')
const screen = readFileSync(new URL('./StylistInboxScreen.tsx', import.meta.url), 'utf8')
const inboxTranslations = resource.match(/inbox:\s*\{([\s\S]*?)\n\s*\},\n\s*profile:/)?.[1]

test('stylist inbox action labels use Bosnian resources', () => {
  assert.ok(inboxTranslations, 'Missing stylist inbox resources')
  for (const [key, copy] of [
    ['lock', 'Zaključaj'],
    ['accept', 'Prihvati'],
    ['unlock', 'Oslobodi'],
    ['reject', 'Odbij'],
  ]) {
    assert.ok(inboxTranslations.includes(`${key}: '${copy}'`), `Missing inbox action resource: ${key}`)
    assert.ok(screen.includes(`t('stylist.inbox.${key}')`), `Inbox action missing key: ${key}`)
  }
  assert.doesNotMatch(screen, /title="Zaključaj"|title="Prihvati"|title="Oslobodi"|title="Odbij"/)
})

test('inbox action visibility and callbacks remain unchanged', () => {
  assert.match(screen, /canLock && \([\s\S]*?onPress=\{\(\) => handleLock\(item\.id\)\}/)
  assert.match(screen, /canAccept && \([\s\S]*?onPress=\{\(\) => handleAccept\(item\)\}/)
  assert.match(screen, /isLockedByMe && \([\s\S]*?onPress=\{\(\) => handleUnlock\(item\.id\)\}/)
  assert.match(screen, /\(isLockedByMe \|\| canAccept\) && \([\s\S]*?onPress=\{\(\) => handleReject\(item\.id\)\}/)
  assert.match(screen, /loading=\{acting\}/)
})
