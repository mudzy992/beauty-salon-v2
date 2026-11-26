import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

/**
 * S10 — dostupnost forme za novi unos u radnoj knjizi.
 *
 * Od 2026-11-18 stranica je **tanka kompozicija**: logika je u
 * `hooks/useWorkbookNewEntryForm.ts`, a kartice (klijent / usluge / naplata /
 * lojalnost) su u `components/new-entry-*.tsx`. Ugovori su isti — ali se sada
 * provjeravaju **na fajlu gdje se nalaze**, ne na fajlu stranice.
 *
 * Ovaj test je namjerno ostao „source contract" (bez browsera): provjerava
 * vezu `<Label htmlFor>` → `<Input id>` i tastaturnu operabilnost prijedloga.
 */
const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')

const page = read('./pages/workbook-new-entry-page.tsx')
const clientCard = read('./components/new-entry-client-card.tsx')
const serviceCard = read('./components/new-entry-service-card.tsx')
const paymentCard = read('./components/new-entry-payment-card.tsx')
const loyaltyCard = read('./components/new-entry-loyalty-card.tsx')
const form = read('./hooks/useWorkbookNewEntryForm.ts')
// 2026-11-18 (S10): hook je podijeljen na katalog (usluge/klijenti/pretrage),
// lojalnost i glavni tok — provjere idu na fajl gdje se nalaze.
const catalog = read('./hooks/useWorkbookNewEntryCatalog.ts')

test('new-entry form labels are connected to the client and service search inputs', () => {
  assert.match(page, /import \{ useId \} from 'react'/)
  assert.match(clientCard, /<Label htmlFor=\{clientSearchId\}>[\s\S]*?stylistWorkbook\.newEntry\.client[\s\S]*?<\/Label>[\s\S]*?<Input\s+id=\{clientSearchId\}/)
  assert.match(serviceCard, /<Label htmlFor=\{serviceSearchId\}>[\s\S]*?stylistWorkbook\.newEntry\.service[\s\S]*?<\/Label>[\s\S]*?<Input\s+id=\{serviceSearchId\}/)
})

test('date, amount, notes, and discount labels target their controls', () => {
  for (const [label, id, control, source] of [
    ['date', 'dateId', 'Input', paymentCard],
    ['paidAmount', 'paidAmountId', 'Input', paymentCard],
    ['notesOptional', 'notesId', 'Textarea', paymentCard],
    ['discountPercent', 'discountPercentId', 'Input', loyaltyCard],
  ]) {
    const expression = new RegExp(
      `<Label htmlFor=\\{${id}\\}>[\\s\\S]*?stylistWorkbook\\.newEntry\\.${label}[\\s\\S]*?<\\/Label>[\\s\\S]*?<${control}\\s+id=\\{${id}\\}`,
    )
    assert.match(source, expression, `${label} should label its ${control}`)
  }
})

test('client and service suggestions are keyboard-operable buttons', () => {
  assert.match(clientCard, /filteredClients\.map\(\(c\) => \([\s\S]*?<li key=\{c\.id\}>\s*<button\s+type="button"[\s\S]*?onClick=\{\(\) => onSelectClient\(c\)\}/)
  assert.match(serviceCard, /filteredServices\.map\(\(svc\) => \([\s\S]*?<li key=\{svc\.id\}>\s*<button\s+type="button"[\s\S]*?onClick=\{\(\) => onToggleService\(svc\)\}[\s\S]*?aria-pressed=\{serviceIds\.includes\(svc\.id\)\}/)
  assert.match(serviceCard, /aria-label=\{`\$\{t\('common\.delete'\)\}: \$\{s\.name\}`\}/)
})

test('selected client is retained independently from changing search results', () => {
  assert.match(form, /const \[selectedClient, setSelectedClient\] = useState<ClientOption \| null>\(null\)/)
  // Učitavanje liste klijenata staje dok je klijent odabran — stvarni objekat
  // je dependency, pa i promjena selekcije između istoimenih klijenata se čuva.
  assert.match(catalog, /if \(selectedClient\) return/)
  assert.match(catalog, /\[clientSearch, selectedClient\]/)
  assert.match(form, /setSelectedClient\(c\)/)
  assert.match(form, /setSelectedClient\(null\)[\s\S]*?setServiceIds\(\[\]\)/)
  assert.doesNotMatch(form, /clients\.find\(\(c\) => c\.id === clientId\)/)
})
