import { test as setup } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'

import {
  ADMIN_STATE,
  ADMIN_STATUS,
  AUTH_DIR,
  EMPTY_STATE,
  STYLIST_STATE,
  STYLIST_STATUS,
  type AdminStatus,
} from './auth-paths'

/**
 * Prijava za `/admin/**` i `/stylist/**` axe testove.
 *
 * Zašto setup projekt, a ne prijava u svakom testu: `storageState` se snimi **jednom** po
 * ulozi, pa testovi kreću s već prijavljenim kontekstom (brže i bez uzastopnih logina).
 *
 * 🔑 **Kredencijali se nikad ne hardkoduju.** Čitaju se isključivo iz okruženja:
 *   E2E_ADMIN_USER=...   E2E_ADMIN_PASS=...
 *   E2E_STYLIST_USER=... E2E_STYLIST_PASS=...
 *
 * 🟡 **Ako backend ne radi ili kredencijali fale, testovi se PRESKAČU, ne padaju.**
 * To je namjerno i u skladu s `scripts/run-a11y-routes.mjs`: bolje glasno preskočiti nego
 * dati lažno crveno u CI. Razlog se upiše u status fajl i ispiše u konzolu.
 *
 * Zašto DVJE uloge: guard-ovi su različiti.
 *  - `/admin/**`  → `ProtectedRoute` (samo token)      → bez sesije redirekt na `/login`
 *  - `/stylist/**`→ `StylistRoute` (token + uloga STYLIST, `StylistRoute.tsx:24-27`)
 *                  → bez uloge redirekt na `/`, NE na `/login`
 * Admin token stoga NIJE dovoljan za stilističke rute.
 *
 * Token se čuva u `localStorage` pod ključem `token` — provjereno u
 * `src/stores/auth.store.ts:33` (`const TOKEN_KEY = 'token'`), a čita ga
 * `src/api/client.ts:12`. Login endpoint je `POST /auth/login` s tijelom
 * `{ login, password }` → `{ access_token }` (`src/stores/auth.store.ts:127-131`).
 */

const BASE = 'http://127.0.0.1:10000'

const PERSONAS = [
  {
    key: 'admin',
    statePath: ADMIN_STATE,
    statusPath: ADMIN_STATUS,
    userVar: 'E2E_ADMIN_USER',
    passVar: 'E2E_ADMIN_PASS',
    label: '/admin/**',
  },
  {
    key: 'stylist',
    statePath: STYLIST_STATE,
    statusPath: STYLIST_STATUS,
    userVar: 'E2E_STYLIST_USER',
    passVar: 'E2E_STYLIST_PASS',
    label: '/stylist/**',
  },
] as const

for (const persona of PERSONAS) {
  setup(`auth: prijava ${persona.key} i snimanje storageState`, async ({ request }) => {
    mkdirSync(AUTH_DIR, { recursive: true })

    const writeStatus = (status: AdminStatus) => {
      writeFileSync(persona.statusPath, JSON.stringify(status, null, 2))
      if (!status.ok) {
        // Glasno, jer tiho preskakanje izgleda isto kao lažni prolaz.
        console.log('')
        console.log(`⚠️  ${persona.label} axe testovi će biti PRESKOČENI: ${status.reason}`)
        console.log('   Pokrenite backend i zadajte kredencijale, pa ponovite:')
        console.log('     cd backend && npm run start:dev   (ili docker compose up)')
        console.log(`     cd frontend && ${persona.userVar}=... ${persona.passVar}=... npm run test:a11y-routes`)
        console.log('')
      }
    }

    const skipWith = (reason: string) => {
      writeFileSync(persona.statePath, JSON.stringify(EMPTY_STATE, null, 2))
      writeStatus({ ok: false, reason })
    }

    const user = process.env[persona.userVar]
    const pass = process.env[persona.passVar]

    if (!user || !pass) {
      skipWith(`nedostaju ${persona.userVar} / ${persona.passVar} u okruženju`)
      return
    }

    let accessToken = ''
    try {
      // `vite preview` NASLJEĐUJE `server.proxy` iz `vite.config.ts` (izmjereno 2026-11-09:
      // bez podignutog backend-a vraća HTTP 500 uz „[vite] http proxy error: /api/..."),
      // pa relativna putanja prolazi kroz isti proxy koji koristi i aplikacija.
      const res = await request.post('/auth/login', { data: { login: user, password: pass } })
      if (!res.ok()) {
        skipWith(`POST /auth/login vratio ${res.status()} ${res.statusText()}`)
        return
      }
      const body = (await res.json()) as { access_token?: string }
      accessToken = body.access_token ?? ''
      if (!accessToken) {
        skipWith('odgovor ne sadrži access_token')
        return
      }
    } catch (err) {
      skipWith(`login nije uspio (backend vjerovatno ne radi): ${(err as Error).message}`)
      return
    }

    // `storageState` format: origin + localStorage parovi. Aplikacija čita token iz
    // localStorage pri inicijalizaciji store-a, pa je ovo dovoljno za prijavu.
    const state = {
      cookies: [],
      origins: [{ origin: BASE, localStorage: [{ name: 'token', value: accessToken }] }],
    }
    writeFileSync(persona.statePath, JSON.stringify(state, null, 2))
    writeStatus({ ok: true, reason: `prijavljen kao ${user}` })
  })
}
