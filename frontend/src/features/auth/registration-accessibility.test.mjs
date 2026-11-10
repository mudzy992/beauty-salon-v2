import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('../../pages/Register.tsx', import.meta.url), 'utf8')

test('registration page exposes one primary heading and labels required credentials', () => {
  assert.equal([...source.matchAll(/<h1\b/g)].length, 1)
  assert.match(source, /<h1 className="text-2xl font-semibold text-slate-900">\s*\{t\('auth\.registerTitle'\)\}\s*<\/h1>/)
  for (const id of ['firstName', 'lastName', 'email', 'username', 'password']) {
    assert.match(source, new RegExp(`<Label htmlFor="${id}">[\\s\\S]*?<Input[\\s\\S]*?id="${id}"[\\s\\S]*?required`))
  }
  assert.match(source, /id="password"[\s\S]*?minLength=\{8\}[\s\S]*?autoComplete="new-password"/)
})

test('registration form announces and disables during submission', () => {
  assert.match(source, /<form\s+onSubmit=\{handleSubmit\}[\s\S]*?className="space-y-5"[\s\S]*?aria-busy=\{loading\}\s*>/)
  assert.match(source, /type="submit"[\s\S]*?disabled=\{loading\}[\s\S]*?aria-busy=\{loading\}/)
  assert.match(source, /role="status" aria-live="polite" className="sr-only">\s*\{t\('common\.loading'\)\}/)
})

test('registration blocks duplicate submission and ignores stale or unmounted results', () => {
  assert.match(source, /if \(registrationRequestInFlight\.current\) return/)
  assert.match(source, /const generation = \+\+registrationRequestGeneration\.current/)
  assert.match(source, /if \(generation !== registrationRequestGeneration\.current\) return/)
  assert.match(source, /registrationRequestGeneration\.current \+= 1/)
})

test('avatar selection has a group name and revokes replaced and unmounted preview URLs', () => {
  assert.match(source, /<fieldset className="space-y-2">\s*<legend[^>]*>\s*\{t\('auth\.avatarOptional'\)\}/)
  // 2.5.3 Label in Name: vidljivi inicijali moraju biti dio pristupačnog imena. Ključna
  // tvrdnja je da VIDLJIVI tekst i ime koriste ISTU varijablu — dva odvojena izraza bi se
  // razišla i prekršaj bi se vratio tiho.
  assert.match(source, /aria-label=\{labelWithVisibleText\(t\('auth\.chooseAvatar'\), avatarInitials\)\}/)
  assert.match(source, /<AvatarFallback>\{avatarInitials\}<\/AvatarFallback>/)
  assert.doesNotMatch(source, /aria-label=\{t\('auth\.chooseAvatar'\)\}/, 'gola labeta bez vidljivog teksta')
  assert.match(source, /URL\.revokeObjectURL\(avatarPreviewUrl\.current\)/)
  assert.match(source, /const previewUrl = URL\.createObjectURL\(file\)/)
})

test('home navigation uses a single styled link control', () => {
  assert.match(source, /<Button asChild variant="ghost" className="mb-6">\s*<Link to="\/">\{t\('auth\.backHome'\)\}<\/Link>\s*<\/Button>/)
  assert.doesNotMatch(source, /<Link[^>]*>\s*<Button/)
})
