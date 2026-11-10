/**
 * DOM mjere koje WCAG kriteriji 1.4.4, 1.4.12 i 2.1.1 traže, a koje axe ne pokriva.
 *
 * ── Zašto `.mjs` i zašto samostalne funkcije ─────────────────────────────────
 * Playwright **serializira izvor** funkcije koju dobije u `page.evaluate`, pa funkcija mora
 * biti samostalna (bez zatvorenja nad vanjskim opsegom). Zato svaka ovdje nosi svoju kopiju
 * `describeElement`.
 *
 * Isti razlog zašto je logika u `.mjs`, ne u `.ts`: `dom-metrics.test.mjs` je stvarno
 * **izvršava** nad jsdom-om. Da je ostala kao string u specu, jedina provjera bi bio CI —
 * a sintaksna greška u stringu srušila bi svih 36 testova odjednom.
 */

/** Kratki, čitljiv opis elementa za poruke grešaka. */
export function describeElement(el) {
  const tag = el.tagName.toLowerCase()
  const id = el.id ? `#${el.id}` : ''
  const cls = (typeof el.className === 'string' ? el.className : '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((c) => `.${c}`)
    .join('')
  const text = (el.textContent || '').trim().slice(0, 40)
  return `${tag}${id}${cls}${text ? ` "${text}"` : ''}`
}

/**
 * Elementi koji **stvarno** sijeku svoj sadržaj.
 *
 * Uzima u obzir samo one koji imaju tekst i eksplicitno `overflow: hidden|clip` — `auto` i
 * `scroll` su legitimni skrol kontejneri, ne gubitak sadržaja.
 */
export function clippedSnapshot() {
  const describe = (el) => {
    const tag = el.tagName.toLowerCase()
    const id = el.id ? `#${el.id}` : ''
    const cls = (typeof el.className === 'string' ? el.className : '')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((c) => `.${c}`)
      .join('')
    const text = (el.textContent || '').trim().slice(0, 40)
    return `${tag}${id}${cls}${text ? ` "${text}"` : ''}`
  }

  const out = {}
  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el)
    if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) === 0) continue
    const clipsX = cs.overflowX === 'hidden' || cs.overflowX === 'clip'
    const clipsY = cs.overflowY === 'hidden' || cs.overflowY === 'clip'
    if (!clipsX && !clipsY) continue
    if (!(el.textContent || '').trim()) continue
    const dx = el.scrollWidth - el.clientWidth
    const dy = el.scrollHeight - el.clientHeight
    if ((clipsX && dx > 2) || (clipsY && dy > 2)) out[describe(el)] = { dx, dy }
  }
  return out
}

/** Interaktivni elementi koje Tab mora obići (2.1.1). */
export function focusableSnapshot() {
  const describe = (el) => {
    const tag = el.tagName.toLowerCase()
    const id = el.id ? `#${el.id}` : ''
    const cls = (typeof el.className === 'string' ? el.className : '')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((c) => `.${c}`)
      .join('')
    const text = (el.textContent || '').trim().slice(0, 40)
    return `${tag}${id}${cls}${text ? ` "${text}"` : ''}`
  }

  const selector =
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), ' +
    'textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  const out = []
  for (const el of document.querySelectorAll(selector)) {
    const rect = el.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) continue
    const cs = getComputedStyle(el)
    if (cs.visibility === 'hidden' || cs.display === 'none') continue
    // Elementi koje AT ionako preskače nisu dio zahtjeva 2.1.1.
    if (el.closest('[aria-hidden="true"]')) continue
    out.push(describe(el))
  }
  return out
}

/** Da li fokusirani element ima vidljiv indikator (2.4.7 uz 2.1.1). */
export function hasVisibleFocusIndicator() {
  const el = document.activeElement
  if (!el || el === document.body) return false
  const cs = getComputedStyle(el)
  const hasOutline = cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0
  return hasOutline || cs.boxShadow !== 'none'
}

/** Landmarki u DOM redoslijedu, s vizuelnom pozicijom (1.3.2). */
export function landmarkSnapshot() {
  const found = []
  const nodes = document.querySelectorAll('header, nav, main, footer')
  nodes.forEach((el, dom) => {
    const rect = el.getBoundingClientRect()
    if (rect.height === 0 && rect.width === 0) return
    found.push({
      tag: el.tagName.toLowerCase(),
      dom,
      top: Math.round(rect.top + window.scrollY),
    })
  })
  return found
}

/** Oznaka trenutno fokusiranog elementa, ili `null` ako fokus nije na elementu. */
export function activeElementLabel() {
  const el = document.activeElement
  if (!el || el === document.body) return null
  const tag = el.tagName.toLowerCase()
  const id = el.id ? `#${el.id}` : ''
  const cls = (typeof el.className === 'string' ? el.className : '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((c) => `.${c}`)
    .join('')
  const text = (el.textContent || '').trim().slice(0, 40)
  return `${tag}${id}${cls}${text ? ` "${text}"` : ''}`
}

/**
 * 1.4.4 / koji element gura stranicu u stranu.
 *
 * Izmjereno na CI runu 42887204875: overflow je IDENTICNIH 755px na svih sest javnih ruta
 * (/, /usluge, /galerija, /kontakt, /zadovoljni-klijenti, /blog) i nula na /rezervacija,
 * /login i /register. Isti broj na svim javnim rutama znaci JEDAN element u javnom omotacu,
 * ne sest nezavisnih defekata — pa se trazi po elementu, a ne nagađa iz ukupnog broja.
 *
 * @param {number} tolerance
 */
export function overflowingElements(tolerance = 2) {
  const describe = (el) => {
    const tag = el.tagName.toLowerCase()
    const id = el.id ? `#${el.id}` : ''
    const cls = typeof el.className === 'string' && el.className.trim()
      ? `.${el.className.trim().split(/\s+/).slice(0, 3).join('.')}` : ''
    return `${tag}${id}${cls}`
  }
  const out = []
  for (const el of document.querySelectorAll('body *')) {
    const excess = el.scrollWidth - el.clientWidth
    if (excess > tolerance) {
      out.push({
        element: describe(el),
        scrollWidth: el.scrollWidth,
        clientWidth: el.clientWidth,
        excess,
        overflowX: getComputedStyle(el).overflowX,
      })
    }
  }
  return out.sort((a, b) => b.excess - a.excess)
}

/**
 * 2.5.3 Label in Name — izmjereno direktno, jer axe to NE MOŽE presuditi.
 *
 * Izmjereno na runu `42895442598`: nakon popravke ime je postalo „Admin meni, C" (vidljivi
 * inicijal ušao je u ime), a axe je i dalje javljao `incomplete 22/22` uz poruku „Unable to
 * determine if the visible text is part of the accessible name". To je ograničenje alata,
 * ne nalaz — pa se zahtijev provjerava ovdje, u stvarnom rasporedu.
 *
 * Uzima se `innerText`, ne `textContent`: `innerText` prati ono što je stvarno iscrtano,
 * pa skriveni sadržaj ne ulazi u „vidljivi tekst".
 *
 * @returns {{element: string, name: string, visible: string}[]}
 */
export function labelInNameViolations() {
  const describe = (el) => {
    const tag = el.tagName.toLowerCase()
    const id = el.id ? `#${el.id}` : ''
    const cls = typeof el.className === 'string' && el.className.trim()
      ? `.${el.className.trim().split(/\s+/).slice(0, 2).join('.')}` : ''
    return `${tag}${id}${cls}`
  }
  // axe i WCAG upoređuju bez obzira na veličinu slova i nakon sažimanja razmaka.
  const norm = (t) => String(t ?? '').replace(/\s+/g, ' ').trim().toLowerCase()

  const out = []
  // `[aria-label]` se mora dodati SVAKOM dijelu, ne cijeloj listi: selektor
  // `button, a, [role="button"][aria-label]` znači „svaki button ILI svaki a ILI
  // [role=button] s aria-label". Izmjereno na runu `42896831615`: svi linkovi i dugmad
  // su ušli u provjeru, `getAttribute('aria-label')` je vratio `null`, pa je anotacija
  // nosila besmisleno „nije u „null"" na svih 10 ruta.
  // Opseg je namjerno UŽI od „svi interaktivni elementi": 2.5.3 govori o komponentama čija
  // je VIDLJIVA LABETA njihov naziv — dugmad i linkovi. Kod `<select>` je innerText spojen
  // tekst SVIH opcija (izmjereno na runu `42897798720`: „sve recenzije na čekanju odobreno"
  // za filter čije je ime „Filtriraj recenzije po statusu"), a kod tekstualnih polja ono što
  // korisnik vidi je vrijednost, ne labeta. axe isto tako ne primjenjuje ovo pravilo na njih.
  const interactive = [
    'button',
    'a[href]',
    '[role="button"]',
    '[role="link"]',
    '[role="menuitem"]',
    '[role="tab"]',
    'input[type="button"]',
    'input[type="submit"]',
    'input[type="reset"]',
  ]
  const selector = interactive.map((part) => `${part}[aria-label]`).join(', ')
  for (const el of document.querySelectorAll(selector)) {
    if (el.getAttribute('aria-hidden') === 'true') continue
    // Nula na BILO KOJOJ dimenziji znači da se ništa ne iscrtava, pa nema ni vidljivog
    // teksta. Namjerno `||`, ne `&&` kao u `landmarkSnapshot`: tamo se traži landmark koji
    // postoji, ovdje tekst koji se vidi — a element širine 0 ne pokazuje ništa.
    const rect = el.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) continue
    const visible = norm(el.innerText ?? el.textContent)
    if (!visible) continue
    const name = norm(el.getAttribute('aria-label'))
    if (name.includes(visible)) continue
    out.push({
      element: describe(el),
      name: String(el.getAttribute('aria-label')).slice(0, 60),
      visible: visible.slice(0, 40),
    })
  }
  return out
}
