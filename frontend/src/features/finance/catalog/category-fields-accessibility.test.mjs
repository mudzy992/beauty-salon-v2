import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

// 2026-11-17 (Faza C (7/) follow-up): raw `<select>` -> djeljena `<Select>` komponenta
// (components/ui/select.tsx). Garancija je ZADRŽANA: `Select` renderuje native `<select>`
// i prosljeđuje `id` direktno na njega, pa `htmlFor`/`id` veza koju ovaj test asertuje
// i dalje postoji u renderovanom DOM-u. Samo je asertirani tag kapitalizovan.
const source = readFileSync(new URL('./category-fields-editor.tsx', import.meta.url), 'utf8')

test('category field editor uses a semantic heading for the field-list section', () => {
  assert.match(source, /<h3 className="text-sm font-medium">[\s\S]*?finance\.expenseCategories\.fixedFieldsList/)
  assert.doesNotMatch(source, /<Label className="text-sm">/)
})

test('new field name and type controls are explicitly labelled', () => {
  assert.match(source, /const fieldNameId = `\$\{id\}-new-field`/)
  assert.match(source, /<Label htmlFor=\{fieldNameId\}[^>]*>[\s\S]*?finance\.expenseCategories\.newField[\s\S]*?<\/Label>[\s\S]*?<Input\s+id=\{fieldNameId\}/)
  assert.match(source, /const fieldTypeId = `\$\{id\}-field-type`/)
  assert.match(source, /<Label htmlFor=\{fieldTypeId\}[^>]*>[\s\S]*?finance\.expenseCategories\.fieldType[\s\S]*?<\/Label>[\s\S]*?<Select\s+id=\{fieldTypeId\}/)
})

test('conditional line-role and default-value controls are explicitly labelled', () => {
  assert.match(source, /const lineRoleId = `\$\{id\}-line-role`/)
  assert.match(source, /<Label htmlFor=\{lineRoleId\}[^>]*>[\s\S]*?finance\.expenseCategories\.lineRole[\s\S]*?<\/Label>[\s\S]*?<Select\s+id=\{lineRoleId\}/)
  assert.match(source, /const defaultValueId = `\$\{id\}-default-value`/)
  assert.match(source, /<Label htmlFor=\{defaultValueId\}[^>]*>[\s\S]*?finance\.expenseCategories\.defaultValue[\s\S]*?<\/Label>[\s\S]*?<Input\s+id=\{defaultValueId\}/)
})
