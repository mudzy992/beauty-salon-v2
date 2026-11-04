import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import path from 'node:path'

const here = path.dirname(fileURLToPath(import.meta.url))
const catalogSource = readFileSync(path.join(here, 'catalog.ts'), 'utf8')
const usersPageSource = readFileSync(path.join(here, '../pages/Users.tsx'), 'utf8')

test('admin system-admin and stylist user lists use bounded paginated requests', () => {
  assert.match(
    catalogSource,
    /const PAGE_SIZE = 50\s*[\s\S]*?const MAX_OFFSET = 1000\s*[\s\S]*?const MAX_PAGES =/,
  )
  assert.match(
    catalogSource,
    /params:\s*\{\s*\.\.\.params,\s*page,\s*pageSize:\s*PAGE_SIZE\s*\}/,
  )
  assert.match(
    catalogSource,
    /fetchAllAdminUserRoleList\s*=\s*<T>\([\s\S]*?"\/api\/users\/system-admins"\s*\|\s*"\/api\/users\/stylists"[\s\S]*?fetchAllPages<T>\(path\)/,
  )
  assert.match(
    usersPageSource,
    /fetchAllAdminUserRoleList<UserRow>\('\/api\/users\/system-admins'\)/,
  )
  assert.match(
    usersPageSource,
    /fetchAllAdminUserRoleList<UserRow>\('\/api\/users\/stylists'\)/,
  )
})
