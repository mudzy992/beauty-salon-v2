import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('./manual-entry-dialog.tsx', import.meta.url), 'utf8')

test('client search label only targets the input while that input is rendered', () => {
  assert.match(
    source,
    /\{f\.selectedClient \? \([\s\S]*?\) : \([\s\S]*?<Label htmlFor="manual-client">[\s\S]*?<Input\s+id="manual-client"/,
  )
})

test('selected client has a named group and a separately labelled remove action', () => {
  assert.match(source, /<span\s+id="manual-client-selected-label"[\s\S]*?finance\.manualEntry\.client/)
  assert.match(source, /<div\s+role="group"\s+aria-labelledby="manual-client-selected-label"/)
  assert.match(source, /aria-label=\{t\('finance\.manualEntry\.removeClient'\)\}/)
})
