import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const detail = readFileSync(new URL('./entry-detail-dialog.tsx', import.meta.url), 'utf8')
const form = readFileSync(new URL('./entry-form-dialog.tsx', import.meta.url), 'utf8')

test('mobile daily-log detail drawer exposes its visible heading as the Radix dialog title', () => {
  assert.match(detail, /import \{\s*Dialog,[\s\S]*?DialogTitle,[\s\S]*?\} from '\.\.\/\.\.\/components\/ui\/dialog'/)
  assert.match(detail, /if \(isMobile\) \{[\s\S]*?<DrawerContent[\s\S]*?<DialogTitle className="mb-4 text-lg font-semibold">\{title\}<\/DialogTitle>/)
  assert.match(detail, /<DialogHeader>[\s\S]*?<DialogTitle>\{title\}<\/DialogTitle>/)
})

test('mobile daily-log entry form drawer exposes its dynamic visible heading as the dialog title', () => {
  assert.match(form, /if \(isMobile\) \{[\s\S]*?<DrawerContent[\s\S]*?<DialogTitle className="mb-4 text-lg font-semibold">[\s\S]*?editEntry[\s\S]*?newEntry[\s\S]*?<\/DialogTitle>/)
  assert.match(form, /<DialogHeader>[\s\S]*?<DialogTitle>\{editId \? t\('dailyLog\.editEntry'\) : t\('dailyLog\.newEntry'\)\}<\/DialogTitle>/)
})
