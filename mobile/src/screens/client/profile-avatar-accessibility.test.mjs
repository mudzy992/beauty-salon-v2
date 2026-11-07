import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const resource = readFileSync(new URL('../../i18n/bs.ts', import.meta.url), 'utf8')
const profile = readFileSync(new URL('./ProfileScreen.tsx', import.meta.url), 'utf8')
const editProfile = readFileSync(new URL('./EditProfileScreen.tsx', import.meta.url), 'utf8')
const profileTranslations = resource.match(/profile:\s*\{([\s\S]*?)\n\s*\},\n\s*onboarding:/)?.[1]

test('profile avatar entry action exposes a localized button name and destination hint', () => {
  assert.ok(profileTranslations, 'Missing mobile profile resources')
  assert.ok(profileTranslations.includes("avatarEditAction: 'Uredi sliku profila'"))
  assert.ok(profileTranslations.includes("avatarEditHint: 'Otvara obrazac za uređivanje profila.'"))
  assert.match(
    profile,
    /<TouchableOpacity\s+onPress=\{\(\) => navigation\.navigate\('EditProfile'\)\}\s+accessibilityRole="button"\s+accessibilityLabel=\{t\('profile\.avatarEditAction'\)\}\s+accessibilityHint=\{t\('profile\.avatarEditHint'\)\}/,
  )
})

test('edit-profile avatar picker exposes a localized action name and gallery hint', () => {
  assert.ok(profileTranslations.includes("avatarChange: 'Promijeni sliku profila'"))
  assert.ok(profileTranslations.includes("avatarChangeHint: 'Otvara galeriju za odabir nove slike.'"))
  assert.match(
    editProfile,
    /<TouchableOpacity\s+onPress=\{pickAndUploadAvatar\}\s+accessibilityRole="button"\s+accessibilityLabel=\{t\('profile\.avatarChange'\)\}\s+accessibilityHint=\{t\('profile\.avatarChangeHint'\)\}\s+disabled=\{avatarLoading\}/,
  )
  assert.match(editProfile, /<Text style=\{\[styles\.avatarHint[\s\S]*?t\('profile\.avatarChange'\)/)
})
