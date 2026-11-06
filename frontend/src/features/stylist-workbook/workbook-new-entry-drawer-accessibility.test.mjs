import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('./pages/workbook-new-entry-page.tsx', import.meta.url), 'utf8')

test('stylist workbook new-entry drawer exposes its visible title and description to the dialog primitive', () => {
  assert.match(source, /<DrawerContent side="right"[\s\S]*?<DialogTitle className="text-sm font-semibold[\s\S]*?stylistWorkbook\.newEntry\.title[\s\S]*?<\/DialogTitle>/)
  assert.match(source, /<DialogDescription className="text-xs text-slate-500">[\s\S]*?stylistWorkbook\.newEntry\.drawerDescription[\s\S]*?<\/DialogDescription>/)
  assert.match(source, /import \{ Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle \}/)
})
