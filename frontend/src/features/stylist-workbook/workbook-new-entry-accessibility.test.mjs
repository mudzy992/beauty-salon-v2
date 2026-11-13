import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('./pages/workbook-new-entry-page.tsx', import.meta.url), 'utf8')

test('new-entry form labels are connected to the client and service search inputs', () => {
  assert.match(source, /import \{[^}]*\buseId\b[^}]*\} from 'react'/)
  assert.match(source, /<Label htmlFor=\{clientSearchId\}>[\s\S]*?stylistWorkbook\.newEntry\.client[\s\S]*?<\/Label>[\s\S]*?<Input\s+id=\{clientSearchId\}/)
  assert.match(source, /<Label htmlFor=\{serviceSearchId\}>[\s\S]*?stylistWorkbook\.newEntry\.service[\s\S]*?<\/Label>[\s\S]*?<Input\s+id=\{serviceSearchId\}/)
})

test('date, amount, notes, and discount labels target their controls', () => {
  for (const [label, id, control] of [
    ['date', 'dateId', 'Input'],
    ['paidAmount', 'paidAmountId', 'Input'],
    ['notesOptional', 'notesId', 'Textarea'],
    ['discountPercent', 'discountPercentId', 'Input'],
  ]) {
    const expression = new RegExp(
      `<Label htmlFor=\\{${id}\\}>[\\s\\S]*?stylistWorkbook\\.newEntry\\.${label}[\\s\\S]*?<\\/Label>[\\s\\S]*?<${control}\\s+id=\\{${id}\\}`,
    )
    assert.match(source, expression, `${label} should label its ${control}`)
  }
})

test('client and service suggestions are keyboard-operable buttons', () => {
  assert.match(source, /filteredClients\.map\(\(c\) => \([\s\S]*?<li key=\{c\.id\}>\s*<button\s+type="button"[\s\S]*?onClick=\{\(\) => handleSelectClient\(c\)\}/)
  assert.match(source, /filteredServices\.map\(\(svc\) => \([\s\S]*?<li key=\{svc\.id\}>\s*<button\s+type="button"[\s\S]*?onClick=\{\(\) => toggleService\(svc\)\}[\s\S]*?aria-pressed=\{serviceIds\.includes\(svc\.id\)\}/)
  assert.match(source, /aria-label=\{`\$\{t\('common\.delete'\)\}: \$\{s\.name\}`\}/)
})

test('selected client is retained independently from changing search results', () => {
  assert.match(source, /const \[selectedClient, setSelectedClient\] = useState<ClientOption \| null>\(null\)/)
  assert.match(source, /if \(selectedClient\) return/)
  assert.match(source, /setSelectedClient\(c\)/)
  assert.match(source, /setSelectedClient\(null\)[\s\S]*?setServiceIds\(\[\]\)/)
  assert.doesNotMatch(source, /clients\.find\(\(c\) => c\.id === clientId\)/)
})
