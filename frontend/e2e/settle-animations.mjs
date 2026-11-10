/**
 * Zašto ovo postoji: axe `color-contrast` povremeno pada na `/` bez stvarne regresije
 * (izmjereno: run `42907958179` — `violations 1`, a ponavljanje istog posla dalo je
 * `violations 0`).
 *
 * Uzrok je nađen u izvoru, ne nagađen: `globals.css` ima `@keyframes app-logo-reveal` koji
 * ide od `opacity: 0.01` do `1` kroz 700ms (uz 40ms kašnjenja), i `app-logo-enter` od
 * `opacity: 0.1`. Ako axe analizira dok animacija traje, izračuna kontrast teksta koji je
 * tog trena gotovo nevidljiv — i prijavi prekršaj. Ustaljeno stanje ima ispravan kontrast
 * (24 rute prolaze dosljedno).
 *
 * Čekanje NIJE zaobilaženje: 1.4.3 govori o čitljivosti teksta kakav jeste, a ne o
 * prolaznom stanju od 700ms tokom pojavljivanja. Svaki sajt s fade-in animacijom bi inače
 * padao. Ali se ne čeka „na slepo" fiksnim `waitForTimeout` — čeka se stvarni završetak
 * animacija, s gornjom granicom samo kao zaštitom od vješanja.
 */

/** Gornja granica čekanja. Nije procjena trajanja nego zaštita od vješanja. */
export const ANIMATION_SETTLE_TIMEOUT_MS = 3000

/**
 * Rješava kad se sve pokrenute animacije završe.
 *
 * Samostalna funkcija: Playwright šalje u preglednik samo `fn.toString()`, bez opsega
 * modula. Vraća broj viđenih animacija da se u testu može dokazati da ih je stvarno našla —
 * „riješeno" bez toga ne znači ništa.
 *
 * @returns {Promise<number>}
 */
export function animationSettler() {
  const collect = () =>
    typeof document.getAnimations === 'function' ? document.getAnimations() : []
  const animations = collect()
  return Promise.all(
    animations.map((a) => (a && a.finished ? a.finished.catch(() => undefined) : Promise.resolve())),
  ).then(() => {
    // `fill: both` znači da ZAVRŠENA animacija ostaje u `getAnimations()` — pa se broje samo
    // one koje se još vrte. Bez toga bi provjera bila besmislena (uvijek > 0).
    const stillRunning = collect().filter(
      (a) => a && (a.playState === 'running' || a.playState === 'pending'),
    ).length
    return { seen: animations.length, stillRunning }
  })
}
