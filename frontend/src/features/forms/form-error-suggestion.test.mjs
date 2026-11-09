/**
 * WCAG 3.3.3 (Error Suggestion) + 3.3.1 (Error Identification) — forme s prijedlogom
 * ispravke uz polje i sažetkom grešaka.
 *
 * Šta se ovdje dokazuje
 * ─────────────────────
 * Prije ovoga greške u dnevnoj knjizi išle su **samo kroz toast**, a `catch` grana je
 * bacala cijeli serverski odgovor: backend koristi `ValidationPipe`
 * (`backend/src/main.ts:75-78`) s DTO dekoratorima (`@IsUUID`, `@IsArray`, …), pa 400 vraća
 * popis poruka po polju. Prijedlozi za ispravku su dakle **poznati** — a 3.3.3 traži da se
 * daju korisniku. Zato je ovo prekršaj, a ne samo nelagodnost.
 *
 * Dvije vrste provjera, namjerno:
 *  1. `serverValidationMessages` se testira **funkcionalno** (esbuild transformira TS u
 *     memoriji, pa se stvarni modul importuje) — to je čist modul bez React-a, pa se može
 *     izvršiti, a ne samo čitati.
 *  2. Žičenje po komponentama je source-contract, kao i ostatak testova u ovom repozitoriju
 *     (Node ne može importovati `.tsx`, a `tsx`/`ts-node` nisu frontend dependencije).
 *
 * 🔴 Šta ovaj test NE dokazuje: da čitač ekrana stvarno najavi sažetak prije čitanja polja.
 * Za to treba AT test, kojeg u projektu još nema.
 */
import { strict as assert } from 'node:assert'
import { transformSync } from 'esbuild'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const SRC = resolve(HERE, '../..')

const read = (rel) => readFileSync(resolve(SRC, rel), 'utf8')

const fieldError = read('features/forms/field-error.tsx')
const serverErr = read('features/forms/server-error-messages.ts')
const fieldIds = read('features/daily-log/field-ids.ts')
const hook = read('features/daily-log/use-daily-log-form.ts')
const fields = read('features/daily-log/entry-form-fields.tsx')
const pricing = read('features/daily-log/pricing-panel.tsx')
const dialog = read('features/daily-log/entry-form-dialog.tsx')
const settingsForm = read('features/settings/setting-editor-form.tsx')

// Stvarni modul, izvršen — ne regex nad izvorom.
const js = transformSync(serverErr, { loader: 'ts', format: 'esm' }).code
const { serverValidationMessages } = await import(
  `data:text/javascript;base64,${Buffer.from(js).toString('base64')}`
)

// ── 1. Funkcionalno: serverske poruke se više ne odbacuju ─────────────────────────

test('serverValidationMessages čita NestJS ValidationPipe odgovor (niz poruka)', () => {
  const err = {
    response: { data: { statusCode: 400, message: ['stylistProfileId must be a UUID', ''], error: 'Bad Request' } },
  }
  assert.deepEqual(serverValidationMessages(err), ['stylistProfileId must be a UUID'])
})

test('serverValidationMessages čita i poruku kao string, i prazno vraća kao prazno', () => {
  assert.deepEqual(
    serverValidationMessages({ response: { data: { message: '  Neispravan iznos  ' } } }),
    ['Neispravan iznos'],
  )
  assert.deepEqual(serverValidationMessages({ response: { data: { message: '   ' } } }), [])
  assert.deepEqual(serverValidationMessages({ response: { data: { message: '' } } }), [])
})

test('serverValidationMessages ne puca na odgovoru bez poruke (mreža, 500, undefined)', () => {
  for (const err of [undefined, null, 'tekst', 42, {}, { response: null }, { response: {} }, { response: { data: null } }, { response: { data: { message: 7 } } }]) {
    assert.deepEqual(serverValidationMessages(err), [], `neočekivano za ${JSON.stringify(err)}`)
  }
})

// ── 2. Konvencija id-ova ──────────────────────────────────────────────────────────

test('fieldErrorId koristi istu konvenciju kao postojeći ispravan obrazac', () => {
  // `setting-editor-form.tsx:32` je jedino mjesto koje je ovo već radilo ispravno.
  assert.match(settingsForm, /const errorId = `\$\{inputId\}-error`/)
  assert.match(fieldError, /export function fieldErrorId\(fieldId: string\): string \{\s*return `\$\{fieldId\}-error`/)
})

test('fieldErrorProps daje aria-invalid i aria-describedby samo kad greška postoji', () => {
  assert.match(fieldError, /if \(!message\) return \{\}/)
  assert.match(fieldError, /'aria-invalid': true as const/)
  assert.match(fieldError, /'aria-describedby': fieldErrorId\(fieldId\)/)
})

// ── 3. Primitiv: sažetak i tekst uz polje ─────────────────────────────────────────

/** Tijelo jedne funkcije, do početka sljedeće — da se asertacije ne preliju jedna u drugu. */
const tijelo = (ime) => {
  const start = fieldError.indexOf(`export function ${ime}(`)
  assert.ok(start > -1, `export function ${ime} nije nađen`)
  const kraj = fieldError.indexOf('\n/**', start)
  return kraj > -1 ? fieldError.slice(start, kraj) : fieldError.slice(start)
}

test('FieldError je najavljen čitaču ekrana i ima id za aria-describedby', () => {
  const blok = tijelo('FieldError')
  assert.ok(blok.includes('id={fieldErrorId(fieldId)}'), 'nedostaje id')
  assert.ok(blok.includes('role="alert"'), 'FieldError nije najavljen čitaču ekrana')
  assert.ok(blok.includes('if (!message) return null'), 'prazan tekst ne smije renderovati prazan <p>')
})

test('FormErrorSummary je najavljen, fokusabilan i linkuje na polja', () => {
  const blok = tijelo('FormErrorSummary')
  assert.ok(blok.includes('<div'), 'nedostaje kontejner sažetka')
  const div = blok.slice(blok.indexOf('<div'), blok.indexOf('<div') + 120)
  assert.ok(div.includes('role="alert"'), 'sažetak mora biti najavljen')
  assert.ok(div.includes('tabIndex={-1}'), 'sažetak mora primiti fokus')
  assert.ok(blok.includes('ref.current?.focus()'), 'fokus se mora pomjeriti na sažetak')
  assert.ok(blok.includes('href={`#${targetId}`}'), 'link mora voditi na polje')
  assert.ok(blok.includes('document.getElementById(targetId)?.focus()'), 'klik mora fokusirati polje')
  assert.ok(blok.includes('if (count === 0) return null'), 'bez grešaka sažetak se ne renderuje')
})

test('hookovi u FormErrorSummary su IZNAD early return-a (rules-of-hooks je error)', () => {
  const blok = tijelo('FormErrorSummary')
  const earlyReturn = blok.indexOf('if (count === 0) return null')
  assert.ok(earlyReturn > 0, 'early return nije nađen')
  for (const hookCall of ['useRef<', 'useEffect(']) {
    const at = blok.indexOf(hookCall)
    assert.ok(at > -1, `${hookCall} nije nađen`)
    assert.ok(at < earlyReturn, `${hookCall} je POSLIJE early return-a — krši rules-of-hooks`)
  }
})

// ── 4. Id-ovi se poklapaju između hook-a i JSX-a ──────────────────────────────────

test('DAILY_LOG_FIELD vrijednosti odgovaraju literalima u JSX-u', () => {
  const ocekivano = {
    stylist: 'dailylog-stylist',
    client: 'dailylog-client',
    services: 'dailylog-services',
    paid: 'dailylog-amount-paid',
  }
  for (const [kljuc, id] of Object.entries(ocekivano)) {
    assert.match(fieldIds, new RegExp(`${kljuc}: '${id}'`), `field-ids nema ${kljuc}: '${id}'`)
    const izvor = kljuc === 'paid' ? pricing : fields
    assert.ok(izvor.includes(`id="${id}"`), `JSX nema id="${id}"`)
  }
})

// ── 5. Žičenje: svako polje s greškom dobija atribute i tekst ─────────────────────

test('sva četiri validirana polja imaju aria žičenje i tekst greške', () => {
  const polja = [
    { kljuc: 'stylist', izvor: fields },
    { kljuc: 'client', izvor: fields },
    { kljuc: 'services', izvor: fields },
    { kljuc: 'paid', izvor: pricing },
  ]
  for (const { kljuc, izvor } of polja) {
    assert.ok(
      izvor.includes('{...fieldErrorProps(DAILY_LOG_FIELD.' + kljuc + ','),
      `${kljuc}: nedostaje fieldErrorProps spread`,
    )
    assert.ok(
      izvor.includes('<FieldError fieldId={DAILY_LOG_FIELD.' + kljuc + '}'),
      `${kljuc}: nedostaje <FieldError>`,
    )
  }
})

test('hook više NE koristi toast za validacijske greške', () => {
  assert.ok(!/warning\(/.test(hook), 'validacijske greške i dalje idu kroz toast')
  // `error(...)` toast je zamijenjen sažetkom; `success(...)` ostaje.
  assert.ok(!/\berror\(/.test(hook), 'serverska greška i dalje ide kroz toast')
  assert.match(hook, /const \{ success \} = toast/)
})

test('svaki validacijski guard postavlja grešku na tačno određeno polje', () => {
  const parovi = [
    ['stylistAndServiceRequired', ['stylist', 'services']],
    ['paidAmountInvalid', ['paid']],
    ['debtsAmountInsufficient', ['paid']],
    ['clientRequiredForDebt', ['client']],
  ]
  for (const [kljuc, polja] of parovi) {
    // Poruka i njena guard grana moraju biti u istom bloku.
    const at = hook.indexOf(`dailyLog.form.validation.${kljuc}`)
    assert.ok(at > -1, `nedostaje poruka ${kljuc}`)
    // Prozor OKO ključa: u jednom guard-u polje stoji IZA poruke
    // (`[DAILY_LOG_FIELD.paid]: t('…')`), a u drugom ispred (`const message = t('…')`).
    const blok = hook.slice(Math.max(0, at - 200), at + 220)
    for (const polje of polja) {
      assert.ok(blok.includes('DAILY_LOG_FIELD.' + polje + ']'), `${kljuc} ne postavlja grešku na ${polje}`)
    }
    assert.match(blok, /setFieldErrors\(/, `${kljuc} ne poziva setFieldErrors`)
  }
})

test('catch grana koristi serverske poruke, a generička je samo fallback', () => {
  const at = hook.indexOf('} catch (err) {')
  assert.ok(at > -1, 'catch ne prima err — serverske poruke se ne mogu pročitati')
  const blok = hook.slice(at, at + 480)
  assert.match(blok, /serverValidationMessages\(err\)/)
  assert.match(blok, /messages\.length > 0 \? messages : \[t\('dailyLog\.form\.feedback\.saveFailed'\)\]/)
})

// ── 6. Sažetak je prikazan i na mobilu i na desktopu ──────────────────────────────

test('sažetak je unutar `fields`, pa ga dijele i Drawer i Dialog', () => {
  assert.equal(dialog.match(/<FormErrorSummary/g)?.length, 1, 'očekivan tačno jedan sažetak')
  assert.equal(dialog.match(/\{fields\}/g)?.length, 2, 'očekivano {fields} u obje grane (mobil + desktop)')
  const sazetakAt = dialog.indexOf('<FormErrorSummary')
  const fieldsAt = dialog.indexOf('const fields = (')
  assert.ok(fieldsAt > -1 && sazetakAt > fieldsAt, 'sažetak mora biti unutar `fields`')
  assert.match(dialog, /title=\{t\('dailyLog\.form\.errorSummaryTitle'\)\}/)
})

test('zatvaranje dijaloga čisti greške, da se ne naslijede u sljedeće otvaranje', () => {
  const dailyLog = read('pages/DailyLog.tsx')
  assert.match(dailyLog, /if \(!next\) form\.clearFieldErrors\(\)/)
})
