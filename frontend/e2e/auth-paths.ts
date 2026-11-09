import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Zajedničke putanje za prijavljene e2e testove.
 *
 * Izdvojeno u zaseban fajl jer `auth.setup.ts` i `a11y-admin.spec.ts` moraju dijeliti
 * iste putanje, a nijedan od njih ne smije importovati drugi (Playwright bi tada pokušao
 * izvršiti setup fajl kao dio spec-a).
 */
const HERE = dirname(fileURLToPath(import.meta.url))

export const AUTH_DIR = resolve(HERE, '.auth')
export const ADMIN_STATE = resolve(AUTH_DIR, 'admin.json')
export const ADMIN_STATUS = resolve(AUTH_DIR, 'admin-status.json')

export type AdminStatus = { ok: boolean; reason: string }

export const EMPTY_STATE = { cookies: [], origins: [] }
