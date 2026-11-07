import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const shell = readFileSync(new URL('./OnboardingShell.tsx', import.meta.url), 'utf8')
const resources = readFileSync(new URL('../../i18n/bs.ts', import.meta.url), 'utf8')

test('onboarding progress dots are a localized progressbar with a numeric and spoken step value', () => {
  assert.ok(resources.includes("progressLabel: 'Napredak postavljanja profila'"))
  assert.ok(resources.includes("stepProgress: 'Korak {{step}} od {{total}}'"))
  assert.match(
    shell,
    /<View\s+style=\{styles\.progressRow\}\s+accessible\s+accessibilityRole="progressbar"\s+accessibilityLabel=\{t\('onboarding\.progressLabel'\)\}\s+accessibilityValue=\{\{\s*min: 1,\s*max: totalSteps,\s*now: step,\s*text: t\('onboarding\.stepProgress', \{ step, total: totalSteps \}\),\s*\}\}/,
  )
  assert.match(shell, /<Text style=\{\[styles\.stepLabel, \{ color: colors\.textSecondary \}\]\}>\s*\{step\}\/\{totalSteps\}/)
})
