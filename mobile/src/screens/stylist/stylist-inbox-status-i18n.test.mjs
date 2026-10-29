import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const resource = readFileSync(new URL('../../i18n/bs.ts', import.meta.url), 'utf8')
const screen = readFileSync(new URL('./StylistInboxScreen.tsx', import.meta.url), 'utf8')
const inboxTranslations = resource.match(/inbox:\s*\{([\s\S]*?)\n\s*\},\n\s*profile:/)?.[1]

test('stylist inbox reservation-status badges use Bosnian resources', () => {
  assert.ok(inboxTranslations, 'Missing stylist inbox resources')
  for (const [key, copy] of [
    ['statusReviewSelf', 'Na pregledu (vi)'],
    ['statusReview', 'Na pregledu'],
    ['statusPending', 'Na čekanju'],
  ]) {
    assert.ok(inboxTranslations.includes(`${key}: '${copy}'`), `Missing inbox status resource: ${key}`)
    assert.ok(screen.includes(`t('stylist.inbox.${key}')`), `Inbox badge missing key: ${key}`)
  }
  assert.doesNotMatch(screen, /'Na pregledu \(vi\)'|'Na pregledu'|'Na čekanju'/)
})

test('reservation-status branches and badge variants remain unchanged', () => {
  assert.match(screen, /item\.status === 'STYLIST_REVIEW'\s*\? isLockedByMe\s*\? t\('stylist\.inbox\.statusReviewSelf'\)\s*:\s*t\('stylist\.inbox\.statusReview'\)\s*:\s*t\('stylist\.inbox\.statusPending'\)/)
  assert.match(screen, /variant=\{item\.status === 'STYLIST_REVIEW' \? 'info' : 'warning'\}/)
  assert.match(screen, /status=\{item\.status\}/)
})
