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

test('only the latest reservation-list request can publish data or end loading', () => {
  const loadData = source.slice(source.indexOf('const loadData = useCallback'), source.indexOf('const openDetail'))
  assert.match(loadData, /const requestSequence = \+\+requestSequenceRef\.current/)
  assert.match(loadData, /if \(requestSequence !== requestSequenceRef\.current\) return/)
  assert.match(loadData, /if \(requestSequence === requestSequenceRef\.current\) setLoading\(false\)/)
  assert.match(source, /return \(\) => \{\s*requestSequenceRef\.current \+= 1/)
})

test('desktop reservation table has a caption and scoped column headers', () => {
  const tableStart = source.indexOf('<table className="app-table w-full border-collapse">')
  const tableEnd = source.indexOf('</table>', tableStart)
  assert.notEqual(tableStart, -1)
  assert.notEqual(tableEnd, -1)
  const table = source.slice(tableStart, tableEnd)
  assert.match(table, /<caption className="sr-only">\{t\('nav\.reservations'\)\}<\/caption>/)
  assert.equal([...table.matchAll(/<th\b[^>]*\bscope="col"/g)].length, 8)
})

test('loading and error states are announced and offer a retry action', () => {
  assert.match(source, /<div role="status"[\s\S]*?t\('common\.loading'\)/)
  assert.match(source, /<p role="alert"[\s\S]*?t\('reservations\.adminList\.loadError'\)/)
  assert.match(source, /onClick=\{\(\) => loadData\(\)\}[\s\S]*?t\('common\.retry'\)/)
  assert.match(source, /!loading && !loadError \? \(/)
})
