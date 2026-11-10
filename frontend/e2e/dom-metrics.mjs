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
