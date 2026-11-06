import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const page = readFileSync(new URL('../../pages/onboarding/OnboardingEmail.tsx', import.meta.url), 'utf8')
const shell = readFileSync(new URL('../../components/OnboardingShell.tsx', import.meta.url), 'utf8')

test('shared onboarding shell exposes the page title as a heading and hides decoration', () => {
  assert.match(shell, /<h1 className="text-2xl md:text-3xl font-extrabold leading-tight text-slate-900">\s*\{title\}\s*<\/h1>/)
  assert.match(shell, /<HeaderIcon aria-hidden="true"/)
  assert.match(shell, /<MainDeco\s+aria-hidden="true"/)
  assert.match(shell, /<AccentDeco\s+aria-hidden="true"/)
  assert.match(shell, /<FiInfo aria-hidden="true"/)
})

test('email and verification controls use labels, native forms, and a named OTP group', () => {
  assert.match(page, /<Label htmlFor="email">[\s\S]*?<Input[\s\S]*?id="email"[\s\S]*?type="email"[\s\S]*?autoComplete="email"[\s\S]*?required/)
  assert.match(page, /<form onSubmit=\{handleSaveAndSend\} aria-busy=\{loading\}/)
  assert.match(page, /<form onSubmit=\{handleVerify\} aria-busy=\{loading\}/)
  assert.match(page, /<fieldset className="space-y-4">\s*<legend className="font-semibold text-slate-900">\s*\{t\('onboarding\.verificationCode'\)\}/)
  assert.match(page, /<OtpInput value=\{code\} onChange=\{setCode\} disabled=\{loading\} \/>/)
  assert.match(page, /<Button type="submit" disabled=\{loading\}/)
  assert.match(page, /<Button\s+type="button"\s+variant="outline"[\s\S]*?onClick=\{handleResend\}/)
})

test('email verification requests announce busy status and reject duplicate or stale completion', () => {
  assert.match(page, /aria-busy=\{loading\}/)
  assert.match(page, /role="status" aria-live="polite" className="sr-only">[\s\S]*?activeAction/)
  assert.match(page, /if \(requestInFlight\.current\) return null/)
  assert.match(page, /requestGeneration\.current \+= 1/)
  assert.match(page, /if \(!isCurrentRequest\(generation\)\) return/)
  assert.match(page, /finishRequest\(generation\)/)
})
