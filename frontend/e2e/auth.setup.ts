import { expect, test as setup } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'

import { ADMIN_STATE, ADMIN_STATUS, AUTH_DIR, EMPTY_STATE, type AdminStatus } from './auth-paths'

/**
 * Prijava za `/admin/**` axe testove.
 *
 * Zašto setup projekt, a ne prijava u svakom testu: `storageState` se snimi **jednom**, pa
 * admin testovi kreću s već prijavljenim kontekstom (brže i bez 14 uzastopnih logina).
 *
 * 🔑 **Kredencijali se nikad ne hardkoduju.** Čitaju se isključivo iz okruženja:
 *   E2E_ADMIN_USER=... E2E_ADMIN_PASS=... npm run test:a11y-routes
 *
 * 🟡 **Ako backend ne radi ili kredencijali fale, testovi se PRESKAČU, ne padaju.**
 * To je namjerno i u skladu s `scripts/run-a11y-routes.mjs`: bolje glasno preskočiti nego
 * dati lažno crveno u CI. Razlog se upiše u `admin-status.json` i ispiše u konzolu.
 *
 * Token se čuva u `localStorage` pod ključem `token` — provjereno u
 * `src/stores/auth.store.ts:33` (`const TOKEN_KEY = 'token'`), a čita ga
 * `src/api/client.ts:12`. Login endpoint je `POST /auth/login` s tijelom
 * `{ login, password }` → `{ access_token }` (`src/stores/auth.store.ts:127-131`).
 */

const BASE = 'http://127.0.0.1:10000'

setup('auth: prijava admin korisnika i snimanje storageState', async ({ request }) => {
  mkdirSync(AUTH_DIR, { recursive: true })

  const writeStatus = (status: AdminStatus) => {
    writeFileSync(ADMIN_STATUS, JSON.stringify(status, null, 2))
    if (!status.ok) {
      // Glasno, jer tiho preskakanje je isto što i lažni prolaz.
      console.log('')
      console.log(`⚠️  /admin/** axe testovi će biti PRESKOČENI: ${status.reason}`)
      console.log('   Pokrenite backend i zadajte kredencijale, pa ponovite:')
      console.log('     cd backend && npm run start:dev   (ili docker compose up)')
      console.log('     cd frontend && E2E_ADMIN_USER=admin E2E_ADMIN_PASS=*** npm run test:a11y-routes')
      console.log('')
    }
  }

  const user = process.env.E2E_ADMIN_USER
  const pass = process.env.E2E_ADMIN_PASS

  if (!user || !pass) {
    writeFileSync(ADMIN_STATE, JSON.stringify(EMPTY_STATE, null, 2))
    writeStatus({
      ok: false,
      reason: 'nedostaju E2E_ADMIN_USER / E2E_ADMIN_PASS u okruženju',
    })
    return
  }

  let accessToken: string
  try {
    // `vite preview` proxy-uje `/auth` na backend (izmjereno 2026-11-09: preview bez
    // podignutog backend-a vraća HTTP 500 uz "[vite] http proxy error: /api/..."),
    // pa relativna putanja prolazi kroz isti proxy koji koristi i aplikacija.
    const res = await request.post('/auth/login', { data: { login: user, password: pass } })
    if (!res.ok()) {
      writeFileSync(ADMIN_STATE, JSON.stringify(EMPTY_STATE, null, 2))
      writeStatus({
        ok: false,
        reason: `POST /auth/login vratio ${res.status()} ${res.statusText()}`,
      })
      return
    }
    const body = (await res.json()) as { access_token?: string }
    accessToken = body.access_token ?? ''
    if (!accessToken) {
      writeFileSync(ADMIN_STATE, JSON.stringify(EMPTY_STATE, null, 2))
      writeStatus({ ok: false, reason: 'odgovor ne sadrži access_token' })
      return
    }
  } catch (err) {
    writeFileSync(ADMIN_STATE, JSON.stringify(EMPTY_STATE, null, 2))
    writeStatus({
      ok: false,
      reason: `login nije uspio (backend vjerovatno ne radi): ${(err as Error).message}`,
    })
    return
  }

  // `storageState` format: origin + localStorage parovi. Aplikacija čita token iz
  // localStorage pri inicijalizaciji store-a, pa je ovo dovoljno za prijavu.
  const state = {
    cookies: [],
    origins: [{ origin: BASE, localStorage: [{ name: 'token', value: accessToken }] }],
  }
  writeFileSync(ADMIN_STATE, JSON.stringify(state, null, 2))
  writeStatus({ ok: true, reason: `prijavljen kao ${user}` })

  // Sanity: token mora biti zapisan, inače bi admin testovi tiho testirali /login.
  expect(state.origins[0].localStorage[0].value.length).toBeGreaterThan(0)
})
