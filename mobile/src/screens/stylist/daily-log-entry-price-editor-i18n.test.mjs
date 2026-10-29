import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const resource = readFileSync(new URL('../../i18n/bs.ts', import.meta.url), 'utf8')
const block = readFileSync(new URL('./DailyLogEntryPricingBlock.tsx', import.meta.url), 'utf8')
const dailyLogTranslations = resource.match(/dailyLogDetail:\s*\{([\s\S]*?)\n\s*\},\n\s*profile:/)?.[1]

const messages = [
  ['editPriceAccessibilityLabel', 'Uredi cijenu'],
  ['removeServiceAccessibilityLabel', 'Ukloni servis'],
  ['priceEditTitle', 'Uredi cijenu'],
  ['priceEditDescription', 'Cijena vrijedi samo za ovaj unos (snapshot). Katalog ostaje nepromijenjen.'],
  ['priceEditServiceFallback', 'Servis'],
  ['priceLabel', 'Cijena (KM)'],
]

test('daily-log service price editor and row action labels use Bosnian resources', () => {
  assert.ok(dailyLogTranslations, 'Missing mobile daily-log detail resources')
  for (const [key, copy] of messages) {
    assert.ok(dailyLogTranslations.includes(`${key}: '${copy}'`), `Missing price editor resource: ${key}`)
    assert.ok(block.includes(`t('stylist.dailyLogDetail.${key}')`), `Price editor does not use ${key}`)
    assert.ok(!block.includes(`'${copy}'`) && !block.includes(`"${copy}"`), `Price editor copy remains hard-coded: ${copy}`)
  }
  assert.ok(block.includes("title={t('common.cancel')}"))
  assert.ok(block.includes("title={t('common.save')}"))
})

test('price editor still uses the same edit/save/remove callbacks and amount normalization', () => {
  assert.match(block, /const openEditPrice = \(serviceId: string\) => \{\s*setEditServiceId\(serviceId\);\s*setEditPriceDraft\(String\(unitPrices\[serviceId\] \?\? 0\)\);/)
  assert.match(block, /const saveEditPrice = \(\) => \{\s*if \(!editServiceId\) return;\s*const n = parseFloat\(editPriceDraft\.replace\(',', '\.'\)\);\s*onUnitPriceChange\(editServiceId, Number\.isFinite\(n\) && n >= 0 \? n : 0\);\s*setEditServiceId\(null\);/)
  assert.ok(block.includes('onPress={() => openEditPrice(s.id)}'))
  assert.ok(block.includes('onPress={() => onRemoveService(s.id)}'))
  assert.ok(block.includes("onPress={() => setEditServiceId(null)}"))
  assert.ok(block.includes('onPress={saveEditPrice}'))
})
