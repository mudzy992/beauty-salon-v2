/**
 * WCAG 2.5.3 Label in Name — vidljivi tekst mora biti dio pristupačnog imena.
 *
 * Zašto postoji: axe je na 22 admin/stylist rute javio `label-content-name-mismatch` kao
 * **incomplete** („Unable to determine if the visible text is part of the accessible
 * name", run `42893779087`). Ispostavilo se da to nije samo axe-ova nesigurnost nego
 * stvarni prekršaj: dugme meni-ja nosi `aria-label="Admin meni"`, a vidljivo prikazuje
 * inicijale iz `AvatarFallback`. Glasovni korisnik koji izgovori ono što vidi („NJ")
 * ne pogađa dugme.
 *
 * Namjerno SE NE rješava sa `aria-hidden` nad inicijalima: to bi sakrilo tekst od čitača
 * ekrana, ali ne i od oka — glasovni korisnik i dalje vidi „NJ", pa bi prekršaj ostao,
 * samo nevidljiv alatima.
 */

/**
 * Vraća pristupačno ime koje sadrži vidljivi tekst.
 *
 * @param {string} label namjeravano ime (npr. „Admin meni")
 * @param {string} visibleText tekst koji se stvarno vidi (npr. inicijali „NJ")
 * @returns {string}
 */
export function labelWithVisibleText(label, visibleText) {
  const name = String(label ?? '').trim().replace(/\s+/g, ' ')
  const visible = String(visibleText ?? '').trim().replace(/\s+/g, ' ')
  if (!visible) return name
  if (!name) return visible
  // axe upoređuje bez obzira na veličinu slova i nakon sažimanja razmaka, pa i ovdje tako:
  // ime koje već sadrži vidljivi tekst ne treba dodatak.
  if (name.toLowerCase().includes(visible.toLowerCase())) return name
  return `${name}, ${visible}`
}
