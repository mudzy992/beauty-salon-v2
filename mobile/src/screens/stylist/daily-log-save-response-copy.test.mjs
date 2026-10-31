import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const bosnian = readFileSync(new URL('../../i18n/bs.ts', import.meta.url), 'utf8')

test('ambiguous daily-log save responses warn clients to check before retrying', () => {
  assert.match(
    bosnian,
    /saveResponseFallback: 'Unos je možda sačuvan, ali server nije vratio njegov ID\. Provjerite dnevnik prije ponovnog slanja\.'/,
  )
})
