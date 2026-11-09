/**
 * WCAG 1.3.1 (Info and Relationships) — grupisanje povezanih polja u stilističkoj
 * radnoj knjižici (`/stylist/workbook/new`).
 *
 * Šta je bio problem (dokazano iz izvora, ne pretpostavljeno)
 * ────────────────────────────────────────────────────────────
 * `workbook-new-entry-page.tsx` je imao karticu `<Card className="p-4 space-y-3">` koja
 * sadrži **tri** polja — datum, naplaćeni iznos i napomenu. `Card` je običan `<div>`
 * (`components/ui/card.tsx:5-18`), pa je ta vizuelna kutija bila **jedina** naznaka da polja
 * pripadaju zajedno. Čitač ekrana je čitao tri zasebna polja bez ikakve veze među njima:
 * informacija koja je postojala vizuelno nije bila programski odrediva → 1.3.1.
 *
 * Rješenje
 * ────────
 * `role="group"` + `aria-labelledby` na postojećem `Card`-u (props se prosljeđuju kroz
 * `{...props}`), uz naziv grupe. **Nula vidljivih promjena**, i to namjerno:
 *  - za plaćanje je naziv u `<span className="sr-only">` — `sr-only` je potvrđen u
 *    buildovanom CSS-u (`dist/assets/index-*.css`),
 *  - za loyalty je `aria-labelledby` usmjeren na **postojeći vidljivi naslov**
 *    (`stylistWorkbook.newEntry.loyalty`), pa nije dodan nijedan novi element.
 *
 * Zašto nije `FormSection`: `features/shell/admin/ui/form-section.tsx` renderuje
 * `<fieldset className="rounded-lg border border-line bg-surface p-4">` s vidljivim
 * `<legend>`. Unutar stranice koja već ima `Card` kutije to bi bio **vidljiv** dvostruki
 * okvir i novi naslov. Semantika (`role="group"`) je ono što kriterij traži, ne `fieldset`.
 *
 * 🔴 Ograničenje: source-contract. Ne dokazuje da čitač ekrana stvarno najavi naziv grupe.
 */
import { strict as assert } from 'node:assert'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const SRC = resolve(HERE, '../..')
const read = (rel) => readFileSync(resolve(SRC, rel), 'utf8')

const page = read('features/stylist-workbook/pages/workbook-new-entry-page.tsx')
const card = read('components/ui/card.tsx')
const bs = JSON.parse(read('i18n/locales/bs.json'))
const en = JSON.parse(read('i18n/locales/en.json'))

// ── Preduslov: Card zaista prosljeđuje props ──────────────────────────────────────

test('Card (a ne CardHeader/CardContent) prosljeđuje props na DOM', () => {
  // `{...props}` postoji u SVAKOJ od šest komponenti u card.tsx, pa provjera nad cijelim
  // fajlom ne dokazuje ništa — mutacija koja skine props samo s `Card` bi prolazila.
  const start = card.indexOf('const Card = React.forwardRef')
  const kraj = card.indexOf("Card.displayName = 'Card'")
  assert.ok(start > -1 && kraj > start, 'Card komponenta nije nađena u card.tsx')
  const blok = card.slice(start, kraj)
  assert.ok(blok.includes('{...props}'), 'Card ne prosljeđuje props — cijela izmjena bi bila mrtva')
  assert.ok(blok.includes('React.HTMLAttributes<HTMLDivElement>'))
})

// ── Grupa „podaci o naplati": tri polja, programski povezana ──────────────────────

test('kartica s datumom, iznosom i napomenom je group s nazivom', () => {
  assert.ok(
    page.includes('<Card className="p-4 space-y-3" role="group" aria-labelledby={paymentGroupLabelId}>'),
    'kartica za plaćanje nije group',
  )
  assert.ok(
    page.includes('const paymentGroupLabelId = `${formId}-payment-group-label`'),
    'paymentGroupLabelId nije izveden iz useId() — rizik od sudara id-ova',
  )
  assert.ok(page.includes('const formId = useId()'), 'stranica ne koristi useId()')
})

test('naziv grupe za plaćanje je nevidljiv (sr-only) i ima i18n ključ', () => {
  assert.ok(
    page.includes('<span id={paymentGroupLabelId} className="sr-only">{t(\'stylistWorkbook.newEntry.paymentSection\')}</span>'),
    'nedostaje sr-only naziv grupe',
  )
  for (const [ime, d] of [['bs', bs], ['en', en]]) {
    const v = d.stylistWorkbook?.newEntry?.paymentSection
    assert.ok(typeof v === 'string' && v.trim().length > 0, `${ime}: nema paymentSection`)
  }
  assert.notEqual(
    bs.stylistWorkbook.newEntry.paymentSection,
    en.stylistWorkbook.newEntry.paymentSection,
    'bs i en imaju isti tekst — jedan od prevoda nije stvaran',
  )
})

test('sva tri polja grupe za plaćanje su stvarno unutar te kartice', () => {
  const start = page.indexOf('aria-labelledby={paymentGroupLabelId}')
  assert.ok(start > -1)
  const kraj = page.indexOf('</Card>', start)
  const blok = page.slice(start, kraj)
  for (const id of ['id={dateId}', 'id={paidAmountId}', 'id={notesId}']) {
    assert.ok(blok.includes(id), `${id} nije unutar grupe za plaćanje`)
  }
})

// ── Loyalty grupa: prekorišten POSTOJEĆI vidljivi naslov ──────────────────────────

test('loyalty kartica je group vezan na postojeći vidljivi naslov', () => {
  assert.ok(
    page.includes('<Card className="p-4" role="group" aria-labelledby={loyaltyLabelId}>'),
    'loyalty kartica nije group',
  )
  assert.ok(
    page.includes('const loyaltyLabelId = `${formId}-loyalty-label`'),
    'loyaltyLabelId nije izveden iz useId()',
  )
  assert.ok(
    page.includes('<p id={loyaltyLabelId} className="text-sm font-semibold'),
    'id nije stavljen na postojeći vidljivi naslov',
  )
  // Naziv mora biti postojeći ključ — nije dodan novi vidljivi element.
  assert.ok(page.includes("{t('stylistWorkbook.newEntry.loyalty')}"))
})

test('discount polje je unutar loyalty grupe (inače bi grupa bila prazna)', () => {
  const start = page.indexOf('aria-labelledby={loyaltyLabelId}')
  const kraj = page.indexOf('</Card>', start)
  assert.ok(start > -1 && kraj > start, 'loyalty kartica nije nađena')
  assert.ok(page.slice(start, kraj).includes('id={discountPercentId}'), 'discountPercent nije u grupi')
})

// ── Nema vidljivih regresija ──────────────────────────────────────────────────────

test('nije uveden fieldset/legend ni FormSection (to bi bilo vidljivo)', () => {
  assert.ok(!page.includes('<fieldset'), 'fieldset bi dodao vidljiv okvir unutar Card-a')
  assert.ok(!page.includes('<legend'), 'legend bi dodao vidljiv naslov')
  assert.ok(!page.includes('FormSection'), 'FormSection renderuje vidljiv border + legend')
})

test('postoji barem jedan vidljivi naslov po grupi ILI sr-only — nema praznog aria-labelledby', () => {
  const labelledby = [...page.matchAll(/aria-labelledby=\{([A-Za-z0-9_]+)\}/g)].map((m) => m[1])
  assert.ok(labelledby.length >= 2, 'očekivane barem dvije grupe')
  for (const varijabla of labelledby) {
    assert.ok(page.includes(`id={${varijabla}}`), `${varijabla} ne pokazuje ni na jedan element`)
  }
})
