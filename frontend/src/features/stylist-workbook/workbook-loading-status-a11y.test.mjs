/**
 * Faza 11 — WCAG 4.1.3 (Status Messages) u stylist workbook-u
 *
 * Nalaz iz izvora (nije bio u planu, i plan ga je pogrešno kvalifikovao kao 1.4.3/1.4.11):
 * `workbook-new-entry-page.tsx:290` je renderovao SAMO spinner — bez `role="status"`, bez
 * `aria-live` i bez ikakvog teksta. Za čitača ekrana učitavanje nije postojalo.
 *
 * Ostali loaderi NISU prekršaj i ovaj test to čuva eksplicitno:
 *  - `workbook-detail-page:137` i `workbook-reschedule-preview-page:127` već imaju
 *    `role="status" aria-live="polite"` + vidljiv tekst
 *  - `workbook-new-entry-page:478` uz spinner ima `t('common.loading')` u `<p>`
 *  - 7 submit spinnera je unutar `<Button disabled=…>` i mijenja **naziv dugmeta**
 *    (`finishing` / `creating` / `sending` / `uploadInProgress`) → AT to vidi
 *
 * `text-slate-400` na tim ikonama je 2.56:1 na `surface`, ali pošto su sve `aria-hidden`
 * (dekorativne), 1.4.3/1.4.11 se ne primjenjuju — zamjena na `text-content-muted` je
 * konzistentnost identiteta, ne ispravka prekršaja.
 *
 * Bez browsera: izvorni ugovor.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const at = (p) => readFileSync(join(root, p), 'utf8')

const PAGES = [
  'features/stylist-workbook/pages/workbook-detail-page.tsx',
  'features/stylist-workbook/pages/workbook-list-page.tsx',
  'features/stylist-workbook/pages/workbook-new-entry-page.tsx',
  'features/stylist-workbook/pages/workbook-reschedule-preview-page.tsx',
]

/**
 * Kontekst oko svake `<Loader2 … className=…>` instance: 12 linija iznad i 4 ispod.
 * Ispod je obavezno — kod submit spinnera tekst koji mijenja naziv dugmeta
 * (`creating` / `sending` / `finishing`) stoji **nakon** `<Loader2>`.
 */
const CONTEXT_BELOW = 4
const loaderContexts = (file) => {
  const lines = at(file).split('\n')
  const out = []
  lines.forEach((line, i) => {
    if (line.includes('Loader2') && line.includes('className')) {
      out.push({
        file,
        line: i + 1,
        ctx: lines.slice(Math.max(0, i - CONTEXT_LINES), i + 1 + CONTEXT_BELOW).join('\n'),
      })
    }
  })
  return out
}

const CONTEXT_LINES = 12

test('svaki samostalni loader ima status ili tekst (4.1.3), submit spinneri mijenjaju naziv dugmeta', () => {
  const all = PAGES.flatMap(loaderContexts)
  assert.ok(all.length >= 11, `ocekivano >=11 loadera, nadeno ${all.length}`)

  const SUBMIT_LABELS = [
    'stylistWorkbook.detail.finishing',
    'stylistWorkbook.detail.uploadInProgress',
    'stylistWorkbook.newEntry.creating',
    'stylistWorkbook.reschedule.sending',
  ]

  let standalone = 0
  const submit = []
  for (const { file, line, ctx } of all) {
    const named = SUBMIT_LABELS.filter((k) => ctx.includes(`t('${k}')`))
    // Submit spinner: u kontekstu je `disabled={…}` i TAČAN naziv koji mijenja ime dugmeta.
    // Samo `t('stylist…)` nije dovoljno — susjedni tekst bi takodje matchovao.
    if (/disabled=\{/.test(ctx) && named.length > 0) {
      submit.push(named[0])
      continue
    }
    standalone += 1
    // 4.1.3: tekst bez `role="status"`/`aria-live` se NE najavljuje, pa nije dovoljan.
    assert.ok(
      ctx.includes('role="status"'),
      `${file.split('/').pop()}:${line} — samostalni loader bez role="status" (4.1.3)`,
    )
  }
  assert.equal(standalone, 4, 'broj samostalnih loadera (svaki mora imati role="status")')
  assert.equal(submit.length, 7, 'broj submit spinnera')
  assert.deepEqual(
    submit.slice().sort(),
    [
      'stylistWorkbook.detail.finishing',
      'stylistWorkbook.detail.finishing',
      'stylistWorkbook.detail.uploadInProgress',
      'stylistWorkbook.newEntry.creating',
      'stylistWorkbook.reschedule.sending',
      'stylistWorkbook.reschedule.sending',
      'stylistWorkbook.reschedule.sending',
    ],
    'svaki submit spinner mora mijenjati naziv dugmeta',
  )
})

test('prvi loader u new-entry ima role="status" + aria-live + tekst', () => {
  const src = at('features/stylist-workbook/pages/workbook-new-entry-page.tsx')
  assert.match(
    src,
    /<div role="status" aria-live="polite" className="flex items-center justify-center gap-2 py-20">/,
  )
  const i = src.indexOf('role="status" aria-live="polite"')
  const block = src.slice(i, i + 400)
  assert.match(block, /<Loader2[^>]*aria-hidden="true" \/>/)
  assert.match(block, /<span className="text-sm text-content-muted">\{t\('common\.loading'\)\}<\/span>/)
  // loyalty status poruka (sadrzaj se mijenja: loading -> summary/unavailable)
  assert.match(src, /<p role="status" aria-live="polite" className="mt-1 text-sm text-slate-600 dark:text-slate-300">/)
  // status kontejner ne smije biti skriven od AT-a (aria-hidden smije biti samo na ikoni)
  const container = src.slice(src.lastIndexOf('<div', i), i)
  assert.doesNotMatch(container, /aria-hidden/)
})

test('decorativne ikone vise ne koriste text-slate-400 (2.56:1 na surface)', () => {
  let total = 0
  for (const f of PAGES) {
    const src = at(f)
    const iconHits = [...src.matchAll(/<(Loader2|Search)\b[^>]*text-slate-400/g)]
    total += iconHits.length
    assert.deepEqual(
      iconHits.map((m) => `${f.split('/').pop()}:${m[0].slice(0, 24)}`),
      [],
      `${f} i dalje ima slate-400 na dekorativnoj ikoni`,
    )
  }
  assert.equal(total, 0)
  // a semanticki token je stvarno prisutan na ikonama
  for (const f of ['workbook-detail-page.tsx', 'workbook-new-entry-page.tsx', 'workbook-reschedule-preview-page.tsx']) {
    const src = at(join('features/stylist-workbook/pages', f))
    assert.ok(/<(Loader2|Search)\b[^>]*text-content-muted/.test(src), `${f}: nema content-muted na ikoni`)
  }
})

test('CONTEXT_LINES ostaje uskladjen sa stvarnim kodom (čuvar ne smije oslabiti)', () => {
  // Ako se loader pomjeri dalje od 12 linija od svog status kontejnera, test bi
  // lažno prošao/pao — zato je prag izmjeren, ne odabran napamet.
  const src = at('features/stylist-workbook/pages/workbook-detail-page.tsx')
  const i = src.indexOf('role="status" aria-live="polite"')
  const linesBetween = src.slice(i, src.indexOf('Loader2', i)).split('\n').length - 1
  assert.ok(linesBetween <= CONTEXT_LINES, `loader je ${linesBetween} linija od statusa`)
})
