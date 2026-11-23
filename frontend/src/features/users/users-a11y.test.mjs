import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const page = readFileSync(new URL('../../pages/Users.tsx', import.meta.url), 'utf8')
const list = readFileSync(new URL('./users-list.tsx', import.meta.url), 'utf8')
// UsersList is rendered by the page; inspect both files so moving its markup
// does not drop the caption, loading status, and table-style guarantees.
assert.match(page, /import \{ UsersList \} from '\.\.\/features\/users\/users-list'/)
assert.match(page, /<UsersList\b/)
const rowPresentation = readFileSync(new URL('./use-user-row-presentation.tsx', import.meta.url), 'utf8')
const card = readFileSync(new URL('./user-card.tsx', import.meta.url), 'utf8')
const roleActions = readFileSync(new URL('./user-role-actions.tsx', import.meta.url), 'utf8')
const pagination = readFileSync(new URL('./users-pagination.tsx', import.meta.url), 'utf8')
const listHook = readFileSync(new URL('./use-users-list.ts', import.meta.url), 'utf8')
// Keep the entire rendering chain covered, not just the extracted sources.
assert.match(page, /useUserRowPresentation\(/)
assert.match(page, /useUsersList\(/)
assert.match(page, /useStylistRemoval\(\{ admins, stylists, clients, loadData, showApiError \}\)/)
assert.match(page, /<StylistRemovalDialog\b/)
assert.match(page, /<UsersPagination\b/)
assert.match(pagination, /aria-current=\{p === page \? 'page' : undefined\}/)
assert.match(page, /columns=\{userColumns\} renderCard=\{renderUserCard\}/)
assert.match(rowPresentation, /<UserCard\b/)
assert.match(rowPresentation, /<UserRoleActions\b/)
assert.match(card, /\{renderRoles\(u\)\}/)
const source = [page, list, rowPresentation, card, roleActions, listHook].join('\n')
const dataTable = readFileSync(
  new URL('../shell/admin/ui/data-table.tsx', import.meta.url),
  'utf8',
)

// ---------------------------------------------------------------------------
// Faza 7 — Korisnici
//
// 2.4.4 / 4.1.2: akcijska dugmad po redu imala su GENERICKA pristupna imena
//   (users.aria.edit / .deactivate / .analytics), pa je svaki red tabele imao
//   isto ime — "Uredi korisnika" x N.
// 1.3.1: 8 <th> bez scope, 0 <caption>.
// 1.4.10: tabela bez data-table klase i bez data-label.
//
// 2026-11-09 — `Users.tsx` je prešao na dijeljenu `DataTable` komponentu, pa markup
// (`<caption>`, `scope="col"`, `data-label`, zajedničke klase) više ne živi u ovom
// fajlu. Garancije se asertuju JEDNOM nad komponentom, a nad potrošačem samo
// korištenje, caption prop i redoslijed kolona.
// ---------------------------------------------------------------------------

test('akcije po redu imaju jedinstvena pristupna imena (2.4.4 / 4.1.2)', () => {
  for (const key of ['analytics', 'edit', 'deactivate']) {
    assert.match(
      source,
      // JSX je `aria-label={t(...)}` — zatvara ga `)}` , ne `))`.
      new RegExp(`aria-label=\\{t\\('users\\.aria\\.${key}', \\{ username: u\\.username \\}\\)\\}`),
      `users.aria.${key} mora nositi username da ime bude jedinstveno po redu`,
    )
  }
  assert.match(
    source,
    /aria-label=\{t\('users\.aria\.resetLink', \{ username: u\.username \}\)\}/,
    'reset-link akcija takodje mora biti jedinstvena po korisniku',
  )
  // nijedna od ovih akcija ne smije ostati genericka
  for (const key of ['analytics', 'edit', 'deactivate']) {
    assert.equal(
      source.includes(`aria-label={t('users.aria.${key}')}`),
      false,
      `users.aria.${key} ne smije ostati bez username`,
    )
  }
})

test('tabela korisnika ima scope i caption preko DataTable (1.3.1)', () => {
  // Garancije u komponenti (jednom, za sve potrošače).
  assert.match(dataTable, /<caption className="sr-only">\{caption\}<\/caption>/)
  assert.match(dataTable, /scope="col"/)

  // Potrošač: koristi komponentu i daje joj pristupačno ime.
  assert.equal((source.match(/<DataTable\b/g) || []).length, 1, 'tacno jedan <DataTable>')
  assert.match(source, /caption=\{t\('users\.caption'\)\}/)
  assert.equal(
    (source.match(/<table\b/g) || []).length,
    0,
    'Users.tsx ne smije vise imati rucno pisan <table>',
  )
  assert.equal((source.match(/<th\b(?!ead)/g) || []).length, 0, 'nema rucnih <th>')
})

test('tabela korisnika opt-in u card mode preko headerKey (1.4.10)', () => {
  // `data-label` i `data-table` klasu generise komponenta; potrosac daje samo kljuceve.
  assert.match(dataTable, /data-label=\{t\(column\.headerKey\)\}/)
  assert.match(dataTable, /app-table data-table w-full/)

  const keys = [...source.matchAll(/headerKey: '([^']+)'/g)].map((m) => m[1])
  assert.deepEqual(
    keys,
    [
      'users.table.avatar',
      'users.username',
      'users.email',
      'users.table.fullName',
      'users.phone',
      'users.roles',
      'common.status',
      'common.actions',
    ],
    'redoslijed kolona mora ostati isti kao prije migracije',
  )
})

test('Users.tsx ne donosi sopstveni stil tabele (konzistentnost dashboarda)', () => {
  for (const prop of ['tableClassName', 'headRowClassName', 'rowClassName', 'unsortedIndicator']) {
    assert.equal(
      (source.match(new RegExp(`${prop}=`, 'g')) || []).length,
      0,
      `${prop} je lokalno odstupanje; zajednicke klase zive u DataTable`,
    )
  }
  // Pozitivna kontrola: obrazac zaista hvata hardkodovanje.
  assert.match(
    '<DataTable tableClassName="border-collapse" />',
    /tableClassName=/,
    'kontrola: obrazac hvata tableClassName',
  )
})

test('D4 iz plana NIJE prekršaj — Search ikona je dekorativna', () => {
  // Plan je tvrdio da je text-slate-400 na Users.tsx prekršaj 1.4.3.
  // Nije: ikona je aria-hidden i ima tekstualni ekvivalent (placeholder + labela).
  // 2026-11-17 (Faza C (9/)): text-slate-400 -> text-content-strong (AAA token,
  // >=7:1); garancija (ikona ostaje aria-hidden dekoracija) je nepromijenjena.
  assert.match(
    source,
    /<Search className="[^"]*text-content-strong" aria-hidden="true" \/>/,
    'Search ikona mora ostati aria-hidden (dekorativna, ne tekst)',
  )
})

test('D5 iz plana NIJE prekršaj — role badge nosi tekst, ne samo boju', () => {
  // Plan je tvrdio da su badge-evi samo boja (1.4.1). Nisu: renderuju label.
  assert.match(
    source,
    /<Badge variant=\{getRoleBadgeVariant\(roleName\)\}[^>]*>\s*\{getRoleLabel\(roleName\)\}/,
    'role badge mora renderovati tekstualni label, ne samo boju',
  )
})

test('failed user-list loads show retry instead of an empty list and ignore stale responses', () => {
  assert.match(source, /const requestSequence = \+\+requestSequenceRef\.current/)
  assert.match(source, /if \(requestSequence !== requestSequenceRef\.current\) return/)
  assert.match(source, /if \(requestSequence === requestSequenceRef\.current\) setLoading\(false\)/)
  assert.match(source, /loadError && !loading[\s\S]*?<ErrorState description=\{t\('users\.errors\.loadFailed'\)\} onRetry=\{loadData\}/)
  assert.match(source, /role="status" aria-live="polite"[\s\S]*?t\('common\.loading'\)/)
})
