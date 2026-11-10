import { resolveAdminApiError } from '../../features/admin/admin-api-error.mjs'

/**
 * Odlučuje hoće li se uz prevedeni naslov prikazati i **opis** serverske greške.
 *
 * Serverske poruke su bosanske (izmjereno 2026-11-10: 413 bosanskih poruka u
 * `…Exception(...)` pozivima, a backend nema i18n sloj). Zato:
 *
 * 1. Ako je poruka **mapirana** → vraća se preveden tekst (i interpolacijske
 *    vrijednosti, jer dvije poruke nose podatke).
 * 2. Ako **nije** mapirana, a aktivni jezik je **bosanski** → vraća se sirova poruka.
 *    Na jeziku je korisnika i nosi konkretan razlog, pa je gubitak bio bi korak nazad.
 * 3. Ako **nije** mapirana, a jezik je **engleski** → `undefined`. Preveden naslov bez
 *    opisa je bolji od naslova plus rečenice koju korisnik ne čita (WCAG 3.1.2).
 *
 * `normalizeAppLanguage` (`i18n/language.mjs`) garantuje da je jezik tačno `'bs'` ili
 * `'en'`, pa poređenje ne treba dodatnu normalizaciju.
 *
 * @param {unknown} raw sirova serverska poruka (može biti prazna ili nepostojeća)
 * @param {string} language aktivni jezik aplikacije
 * @param {(key: string, values?: Record<string, string>) => string} translate `t()`
 * @returns {string | undefined}
 */
export const resolveApiErrorDescription = (raw, language, translate) => {
  const resolved = resolveAdminApiError(raw, '')
  if (resolved.key) return translate(resolved.key, resolved.values)
  return language === 'bs' && typeof raw === 'string' && raw ? raw : undefined
}
