/**
 * Inicijali za avatar dugmad — UVIJEK DVA alfanumerička znaka.
 *
 * Zašto postoji: WCAG 2.5.3 — axe `label-content-name-mismatch` vraća „incomplete"
 * („Unable to determine if the visible text is part of the accessible name") kada je
 * vidljivi tekst JEDAN znak: `isNonDigitCharacter` (str.length === 1 && /\D/) + `isSymbolicText`
 * ('aa', 'abc') + `isUnicodeOrPunctuation` u axe-u tada vraćaju 0 → tekst nije
 * human-interpretable → odlučivanje nije moguće, bez obzira na to šta aria-label sadrži.
 *
 * Jedan-char fallback (npr. `username[0].toUpperCase()`) stoga nikada ne može proći
 * 2.5.3 provjeru na nekom dijelu ekrana. Admin, stylist i javni omotač su zbog toga
 * svaki zasebno implementirali sličan (jednako kvaran) jedan-char/whitespace-only algoritam —
 * ovdje se spaja na JEDAN izvor, uz istovremenu ispravku.
 *
 * Algoritam:
 *  1. username podijeli po svemu što NIJE slovo/broj (uključuje `_`, `-`, `.`, razmake);
 *  2. uzmi prvi znak prve dvije neprazne grupe;
 *  3. ako postoji samo jedna grupa — uzmi njena prva dva alfanumerička znaka;
 *  4. ako i dalje nema 2 znaka — dopuni fallbackom (isti filter/trim); desno-padding 'A';
 *  5. sve u uppercase, najviše 2 znaka.
 *
 * Napomena: 'aa' i 'abc' (case-insensitive) axe broji kao symbolic text — dvostruki 'AA'
 * padding za degenerisane ulazne podatke namjerno ne postoji kao pogođeni put; fallback
 * ide prvo kroz parametar pa tek onda kroz 'A'-padding.
 */

/**
 * @param {string | null | undefined} username
 * @param {string} [fallback] koristi se tek kad username nema nijedan slovo/broj
 * @returns {string} tačno 2 znaka
 */
export function userInitials(username, fallback = 'AA') {
  const parts = String(username ?? '')
    .trim()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)

  let initials = ''
  if (parts.length >= 2) {
    initials = `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`
  } else if (parts.length === 1) {
    initials = parts[0].replace(/[^\p{L}\p{N}]/gu, '').slice(0, 2)
  }

  initials = initials.toUpperCase()
  if (initials.length >= 2) return initials.slice(0, 2)

  const fallbackClean = String(fallback ?? '')
    .toUpperCase()
    .replace(/[^\p{L}\p{N}]/gu, '')
  const padded = `${initials}${fallbackClean || 'AA'}`
  return padded.slice(0, 2).padEnd(2, 'A')
}
