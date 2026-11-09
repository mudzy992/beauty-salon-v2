/**
 * Faza 12 — Onboarding / ForceChangePassword: 3.3.1, 3.3.2 i audit plana
 *
 * Stvarni nalaz: zahtjev „najmanje 6 znakova" bio je samo `minLength={6}` (programski) i
 * toast **nakon** neuspjeha (`onboarding.passwordTooShort`). Korisnik zahtjev nije mogao
 * vidjeti prije unosa → **3.3.1 / 3.3.2**. Dodato `aria-describedby` + vidljiv `<p>`.
 *
 * Plan faze 12 je auditovan iz izvora i **uglavnom opovrgnut** (detalji u CHANGELOG-u):
 *  - D1 `<h1>` nedostaje — **opovrgnuto**: `components/OnboardingShell.tsx:140` bezuvjetno
 *    renderuje `<h1>{title}</h1>`, pa ga sve tri stranice dobijaju od shell-a.
 *  - D2 `autocomplete="one-time-code"` — **opovrgnuto**: `otp-input.tsx` ga već ima.
 *  - D3 paste nije blokiran — **zadovoljeno** (3.3.8 traži da paste radi; `handlePaste` ga
 *    podržava, nijedan `onPaste` ne vraća `preventDefault`).
 *  - D4 bez kognitivnih testova — **zadovoljeno** (0 pogodaka za captcha/reCAPTCHA/hCaptcha).
 *  - D7 `role="alert"` za greške — **opovrgnuto**: greške idu preko `sonner`, a
 *    `sonner/dist/index.mjs:1145` već postavlja `"aria-live": "polite"`.
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

const PAGE = 'pages/ForceChangePassword.tsx'
const SHELL = 'components/OnboardingShell.tsx'
const OTP = 'components/ui/otp-input.tsx'

test('3.3.1 / 3.3.2: zahtjev za lozinku je vidljiv i programski povezan PRIJE unosa', () => {
  const src = at(PAGE)
  const i = src.indexOf('id="newPassword"')
  assert.ok(i > 0, 'newPassword polje nije nadeno')
  const field = src.slice(i, i + 700)

  assert.match(field, /aria-describedby="newPasswordRequirements"/)
  assert.match(field, /<p id="newPasswordRequirements"[^>]*>\s*\{t\('onboarding\.passwordRequirements'\)\}/)
  assert.match(field, /minLength=\{6\}/)
  // uputa ne smije biti skrivena od AT-a
  const hint = src.slice(src.indexOf('<p id="newPasswordRequirements"'), src.indexOf('</p>', src.indexOf('<p id="newPasswordRequirements"')))
  assert.doesNotMatch(hint, /aria-hidden|sr-only/)

  // ključ postoji u oba jezika
  for (const lang of ['bs', 'en']) {
    const o = JSON.parse(at(`i18n/locales/${lang}.json`))
    const v = o.onboarding.passwordRequirements
    assert.ok(typeof v === 'string' && v.length > 3, `${lang}: onboarding.passwordRequirements`)
  }
})

test('audit: D1 opovrgnut — OnboardingShell bezuvjetno renderuje <h1>', () => {
  const shell = at(SHELL)
  const i = shell.indexOf('<h1')
  assert.ok(i > 0, 'OnboardingShell nema <h1>')
  // naslov nije iza uslova — provjera da `{title}` slijedi odmah
  const block = shell.slice(i, i + 220)
  assert.match(block, /\{title\}/)
  assert.doesNotMatch(shell.slice(Math.max(0, i - 120), i), /\?\s*\(/, '<h1> je uslovan')

  // sve tri stranice koriste shell
  for (const p of ['pages/ForceChangePassword.tsx', 'pages/onboarding/OnboardingEmail.tsx', 'pages/onboarding/OnboardingGender.tsx']) {
    assert.match(at(p), /<OnboardingShell/, `${p} ne koristi OnboardingShell`)
  }
})

test('audit: D2/D3 — OTP polja imaju one-time-code i ne blokiraju paste (3.3.8)', () => {
  const otp = at(OTP)
  // samo prvo polje dobija one-time-code (preporuceno), ostala 'off' — izraz, ne literal
  assert.match(otp, /autoComplete=\{i === 0 \? 'one-time-code' : 'off'\}/)
  assert.match(otp, /inputMode="numeric"/)
  // paste mora raditi: handlePaste postoji i ne smije samo sprijeciti
  assert.match(otp, /onPaste=\{handlePaste\}/)
  const hpStart = otp.indexOf('const handlePaste')
  assert.ok(hpStart > 0, 'handlePaste nije naden')
  const hp = otp.slice(hpStart, hpStart + 600)
  assert.match(hp, /clipboardData/, 'handlePaste ne cita clipboard')
  // nijedan onPaste ne blokira
  assert.doesNotMatch(otp, /onPaste=\{[^}]*preventDefault/)
  // 3.3.8: bez kognitivnih testova
  for (const p of [PAGE, 'pages/onboarding/OnboardingEmail.tsx', 'pages/onboarding/OnboardingGender.tsx', OTP, SHELL]) {
    assert.doesNotMatch(at(p), /captcha|reCAPTCHA|hCaptcha/i, `${p} ima captcha`)
  }
})

test('audit: D7 opovrgnut — greske idu preko sonner koji vec ima aria-live', () => {
  assert.match(at(PAGE), /toast\.warning\(t\('onboarding\.passwordTooShort'\)\)/)
  const sonner = readFileSync(
    join(root, '..', 'node_modules', 'sonner', 'dist', 'index.mjs'),
    'utf8',
  )
  assert.match(sonner, /"aria-live":\s*"polite"/, 'sonner nema aria-live — D7 bi bio stvaran')
})
