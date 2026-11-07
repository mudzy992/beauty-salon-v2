import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const screen = readFileSync(new URL('../../../app/onboarding/gender.tsx', import.meta.url), 'utf8')

test('gender onboarding choices expose radio roles and checked state', () => {
  const options = [...screen.matchAll(/<Pressable\b[\s\S]*?<\/Pressable>/g)].map(([option]) => option)
  assert.equal(options.length, 2)
  for (const [option, value, key] of [
    [options[0], 'MALE', 'genderMale'],
    [options[1], 'FEMALE', 'genderFemale'],
  ]) {
    assert.match(option, new RegExp(`onPress=\\{\\(\\) => setGender\\('${value}'\\)\\}`))
    assert.match(option, /accessibilityRole="radio"/)
    assert.match(option, new RegExp(`accessibilityState=\\{\\{ checked: gender === '${value}' \\}\\}`))
    assert.ok(option.includes(`t('onboarding.${key}')`), `Missing visible localized label for ${value}`)
  }
})

test('gender onboarding still requires a selection and preserves selected visual styling', () => {
  assert.match(screen, /if \(!gender\) \{\s*Alert\.alert\(t\('common\.error'\), t\('onboarding\.genderPickError'\)\)/)
  assert.match(screen, /backgroundColor: gender === 'MALE' \? colors\.accent : colors\.inputBg/)
  assert.match(screen, /backgroundColor: gender === 'FEMALE' \? colors\.accent : colors\.inputBg/)
  assert.match(screen, /<Button\s+title=\{t\('onboarding\.genderContinue'\)\}\s+onPress=\{handleContinue\}\s+loading=\{loading\}/)
})
