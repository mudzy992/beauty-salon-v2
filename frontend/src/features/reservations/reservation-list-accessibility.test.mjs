import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('../../pages/Reservations.tsx', import.meta.url), 'utf8')

const failedRequestHandler = source.slice(
  source.indexOf('.catch(() => {'),
  source.indexOf('.finally(() => setLoading(false))'),
)

test('reservation-list fetch errors remain distinct from a valid empty result', () => {
  assert.match(source, /const \[loadError, setLoadError\] = useState\(false\)/)
  assert.match(failedRequestHandler, /setLoadError\(true\)/)
  assert.doesNotMatch(failedRequestHandler, /setItems\(\[\]\)|setTotal\(0\)/)
  assert.match(source, /items\.length === 0[\s\S]*?t\('common\.noData'\)/)
})

test('loading and error states are announced and offer a retry action', () => {
  assert.match(source, /<div role="status"[\s\S]*?t\('common\.loading'\)/)
  assert.match(source, /<p role="alert"[\s\S]*?t\('reservations\.adminList\.loadError'\)/)
  assert.match(source, /onClick=\{\(\) => loadData\(\)\}[\s\S]*?t\('common\.retry'\)/)
  assert.match(source, /!loading && !loadError \? \(/)
})
