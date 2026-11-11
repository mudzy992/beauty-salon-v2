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

  // `tabindex="-1"` se provjerava u JS-u, NE u CSS alternativama. Prijašnji oblik je bio
  // `button:not([disabled]), …, [tabindex]:not([tabindex="-1"])` — a `:not([tabindex="-1"])`
  // je važilo SAMO za posljednju alternativu, pa je `<button tabindex="-1">` upadao u spisak
  // preko `button:not([disabled])`. Takav element NIJE u tab nizu po definiciji.
  // Izmjereno na runu 42966480987: `/admin/finance` i `/admin/users` javili su „Tab ne
  // doseže" upravo na neaktivnim Radix tabovima, koji imaju `tabindex="-1"` jer se po
  // ARIA APG između tabova ide strelicama, a tablista je jedan tab-stop.
  const selector = 'a[href], button, input, select, textarea, [tabindex]'
  const out = []
  for (const el of document.querySelectorAll(selector)) {
    if (el.hasAttribute('disabled')) continue
    if (el.getAttribute('tabindex') === '-1') continue
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

/**
 * Da li elementi koje `focusableSnapshot` smatra fokusabilnim to ZAISTA jesu.
 *
 * ── Zašto ovo postoji ──────────────────────────────────────────────────────
 * Snapshot zaključuje fokusabilnost iz atributa i stilova. To nije isto što i pitati DOM:
 * `el.focus()` pa provjeriti `document.activeElement === el`. Razlika nije teorijska —
 * nakon runa `42969095988` ostala su 2 nalaza 2.1.1 na kontejneru Radix tabliste koji Tab
 * nikad ne dohvati, i iz snapshot-a se ne može vidjeti je li to
 *   (a) element koji uopće nije fokusabilan, pa je nalaz artefakt instrumenta, ili
 *   (b) element koji jeste fokusabilan a Tab ga preskače, što je stvarni prekršaj 2.1.1.
 * Bez ove sonde se to dvoje ne može razlikovati, a nagađanje je već jednom dalo pogrešno
 * objašnjenje koje je run opovrgnuo.
 *
 * Zato ovo NE mijenja presudu: samo prijavljuje činjenice uz nalaz, pa se odluka donosi na
 * osnovu izmjerenog.
 *
 * Namjerno je samodostatna (logika za oznaku je prepisana, ne pozvana): Playwright u
 * preglednik šalje samo `fn.toString()`, bez opsega modula, pa bi poziv pomoćne funkcije
 * bio `ReferenceError` na svakoj ruti.
 *
 * @param {string[]} labels oznake koje treba ispitati (iz `unvisited`)
 */
export function probeFocusability(labels) {
  const wanted = new Set(Array.isArray(labels) ? labels : [])
  if (wanted.size === 0) return []

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

  const selector = 'a[href], button, input, select, textarea, [tabindex]'
  const out = []
  for (const el of document.querySelectorAll(selector)) {
    const label = describe(el)
    if (!wanted.has(label)) continue

    let took = false
    try {
      el.focus()
      took = document.activeElement === el
    } catch {
      took = false
    }
    out.push({
      label,
      took,
      tabindex: el.getAttribute('tabindex'),
      role: el.getAttribute('role'),
      // `closest()` matchuje i sâm element: kontejner s `role="tablist"` jeste uključen.
      inTablist: el.closest('[role="tablist"]') !== null,
    })
  }
  return out
}

/**
 * Da li je fokusirani element native input s internim segmentima.
 *
 * Chromiumov `<input type="date">` ima segmente dan/mjesec/godina unutar **zatvorenog**
 * shadow DOM-a. Tab prebacuje segment, a `document.activeElement` ostaje isti `<input>` —
 * pa izvana to izgleda identično kao zaglavljen fokus. Nije: fokus se pomjerio, samo se to
 * ne vidi. Bez ove provjere bi 2.1.2 prijavio zamku na svakoj formi s datumom
 * (izmjereno na runu 42966480987: 4 rute, sve na `input` s datumom).
 */
export function activeElementIsSegmentedInput() {
  const el = document.activeElement
  if (!el || el.tagName !== 'INPUT') return false
  return ['date', 'time', 'month', 'week', 'datetime-local'].includes(el.type)
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
    // Samo `overflow-x: visible` gura stranicu. Element koji svoj sadržaj reže
    // (`hidden`/`auto`/`scroll`) ne prenosi višak na viewport — pa bi `h2.sr-only` (+153px)
    // i `section.overflow-hidden` (+64px) bili šum u nalazu. Izmjereno na runu
    // `42911788727`: oba su se pojavila kao „krivci" iako stranica bježi samo 53px.
    if (getComputedStyle(el).overflowX !== 'visible') continue
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

/**
 * 3.3.1 Error identification — svaka kontrola označena kao neispravna mora imati tekst.
 *
 * Mjeri se VEZA, ne postojanje teksta negdje na stranici: `aria-describedby` mora razriješiti
 * u element koji stvarno ima sadržaj. Pogrešan `id` i prazan `<p>` su prekršaj, i nalaz ih
 * imenuje — inače bi korisnik čitača ekrana šutio o tome zašto je polje neispravno.
 *
 * 🔴 Sve je namjerno UNUTAR funkcije. Playwright šalje u preglednik samo `fn.toString()`,
 * bez opsega modula, pa bi poziv pomoćnika izvana bio `ReferenceError` na svakoj ruti.
 * Izmjereno na runu `42904859111`: 3.3.1 i 3.3.2 pali su na SVIM rutama odjednom — potpis
 * ove greške — a jsdom testovi to nisu mogli uhvatiti jer tamo modul stvarno postoji.
 *
 * @returns {{element: string, describedby: string}[]}
 */
export function invalidWithoutDescription() {
  // 🔴 Niz, ne jedan string s zarezima: sufiks nadovezan na cijelu listu važi samo za
  // posljednji dio (`input, select, textarea[aria-invalid="true"]`).
  const selector = [
    'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"])',
    'select',
    'textarea',
  ]
    .map((part) => `${part}[aria-invalid="true"]`)
    .join(', ')

  const out = []
  for (const el of document.querySelectorAll(selector)) {
    const text = String(el.getAttribute('aria-describedby') ?? '')
      .split(/\s+/)
      .filter(Boolean)
      .map((id) => (document.getElementById(id)?.textContent ?? '').replace(/\s+/g, ' ').trim())
      .filter(Boolean)
      .join(' ')
    if (text) continue
    out.push({
      element: `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}${
        el.getAttribute('name') ? `[name=${el.getAttribute('name')}]` : ''
      }`,
      describedby: String(el.getAttribute('aria-describedby') ?? '(nema)'),
    })
  }
  return out
}

/**
 * 3.3.2 Labels or instructions — vidljiva oznaka „obavezno" mora biti i programski vidljiva.
 *
 * Ako labeta nosi `*` ili riječ „obavezno"/„required", a kontrola nema `required` ni
 * `aria-required`, čitač ekrana to NEĆE najaviti: korisnik sazna tek kad forma odbije unos.
 * Obrnut smjer (označeno u kodu, bez vidljive oznake) nije prekršaj — AT to čuje.
 *
 * @returns {{element: string, label: string}[]}
 */
export function requiredNotMarked() {
  const selector = [
    'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"])',
    'select',
    'textarea',
  ].join(', ')
  const REQUIRED_HINT = /\*|\bobavezno\b|\brequired\b/i

  const out = []
  for (const el of document.querySelectorAll(selector)) {
    const labelEl = (el.id && document.querySelector(`label[for="${el.id}"]`)) || el.closest('label')
    const label = (labelEl?.textContent ?? '').replace(/\s+/g, ' ').trim()
    if (!label || !REQUIRED_HINT.test(label)) continue
    if (el.required || el.getAttribute('aria-required') === 'true') continue
    out.push({ element: `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}`, label: label.slice(0, 60) })
  }
  return out
}

/**
 * Popis svih mjesta gdje bi tekst mogao biti renderovan kao slika — 1.4.5.
 *
 * ── Zašto ovo postoji ──────────────────────────────────────────────────────
 * 1.4.5 je bio jedini kriterij u matrici za koji se tvrdilo da „mjerni aparat ne postoji“.
 * To je bilo pola tačno: da li neka **raster slika** sadrži tekst ne može se znati bez OCR-a
 * ili čovjeka. Ali popis mjesta gdje bi tekst mogao biti slika **može** se izmjeriti, i bez
 * njega se ne zna ni koliko je toga za procijeniti. Mjera dakle ne dokazuje usaglašenost —
 * ona pretvara „nije provjereno“ u konačan, imenovan skup.
 *
 * ── Šta broji ──────────────────────────────────────────────────────────────
 * `<img>` i `[role="img"]` (raster/SVG koji može nositi tekst), `svg text` (tekst koji
 * jeste renderovan kao grafika), `<canvas>` (tekst u njemu je nevidljiv za AT i za to
 * 1.4.5 nema izuzetak) i `background-image` s URL-om (gradijenti se ne broje — u njima
 * nema teksta).
 *
 * Namjerno je samodostatna: Playwright u preglednik šalje samo `fn.toString()`, bez opsega
 * modula.
 */
export function imageBearingInventory(limit = 4) {
  const clip = (value, max) => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max)
  const describe = (el) => {
    const tag = el.tagName.toLowerCase()
    const id = el.id ? `#${el.id}` : ''
    const cls = (typeof el.className === 'string' ? el.className : '')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((c) => `.${c}`)
      .join('')
    return `${tag}${id}${cls}`
  }

  const img = []
  for (const el of document.querySelectorAll('img')) {
    img.push({ where: describe(el), src: clip(el.getAttribute('src'), 60), alt: clip(el.getAttribute('alt'), 40) })
  }

  const roleImg = []
  for (const el of document.querySelectorAll('[role="img"]')) {
    roleImg.push({ where: describe(el), name: clip(el.getAttribute('aria-label') ?? el.textContent, 40) })
  }

  const svgText = []
  for (const el of document.querySelectorAll('svg text')) {
    svgText.push({ where: describe(el.closest('svg') ?? el), text: clip(el.textContent, 30) })
  }

  const canvas = []
  for (const el of document.querySelectorAll('canvas')) {
    canvas.push({ where: describe(el), width: el.width, height: el.height })
  }

  const bgImage = []
  for (const el of document.querySelectorAll('*')) {
    const value = getComputedStyle(el).backgroundImage
    if (!value || value === 'none') continue
    // Gradijent nije slika s tekstom; zanimaju nas samo stvarne slike (`url(...)`).
    if (!value.includes('url(')) continue
    bgImage.push({ where: describe(el), value: clip(value, 60) })
  }

  return {
    counts: {
      img: img.length,
      roleImg: roleImg.length,
      svgText: svgText.length,
      canvas: canvas.length,
      bgImage: bgImage.length,
    },
    samples: {
      img: img.slice(0, limit),
      roleImg: roleImg.slice(0, limit),
      svgText: svgText.slice(0, limit),
      canvas: canvas.slice(0, limit),
      bgImage: bgImage.slice(0, limit),
    },
  }
}

/**
 * Čitljiv opis inventara za CI anotaciju — 1.4.5.
 *
 * ── Zašto postoji kao poseban korak ────────────────────────────────────────
 * Prva verzija je u anotaciju ispisala `svg text 18` za `/admin/analytics`. To se čita kao
 * 18 nalaza, a **nije nijedan**: `<text>` unutar SVG-a je pravi tekst u DOM-u, čitač ekrana
 * ga dobija, pa 1.4.5 (slike teksta) tu nije ni dotaknut. Mjera koja imenuje elemente koji
 * nisu uzrok je šum, i to se ovdje ispravlja u samoj poruci.
 *
 * Redoslijed je po težini: prvo ono što je **odlučivo** (`<canvas>` — tekst u platnu je
 * nevidljiv za AT, a 1.4.5 za to nema izuzetak), zatim ono što **traži ljudsku procjenu**
 * (raster slike, jer sadržaj piksela ne čita nijedan alat u ovom repu), i na kraju ono što
 * **nije prekršaj** ali vrijedi znati (SVG tekst — tekst jeste grafika, ali jeste i tekst).
 */
export function describeImageInventory(inventory) {
  const { counts, samples } = inventory
  const list = (items, render) => items.map(render).join(' | ')
  const parts = []

  if (counts.canvas > 0) {
    parts.push(
      `PREKRŠAJ ${counts.canvas} <canvas>: ${list(samples.canvas, (s) => `${s.where} ${s.width}×${s.height}`)} — tekst u platnu je nevidljiv za AT, a 1.4.5 za to nema izuzetak`,
    )
  } else {
    parts.push('canvas 0 — odlučivo prolazi (tekst u platnu bi bio nevidljiv za AT)')
  }

  if (counts.bgImage > 0) {
    parts.push(
      `TRAŽI LJUDSKU PROCJENU ${counts.bgImage} background-image s URL-om: ${list(samples.bgImage, (s) => `${s.where} ${s.value}`)} — sadrži li raster tekst ne zna nijedan alat ovdje`,
    )
  }

  if (counts.svgText > 0) {
    parts.push(
      `NIJE PREKRŠAJ ${counts.svgText} svg <text>: ${list(samples.svgText, (s) => `${s.where} „${s.text}“`)} — pravi tekst u DOM-u, čitač ekrana ga dobija; navedeno samo da se vidi gdje je tekst grafika`,
    )
  }

  return parts.join(' · ')
}

/**
 * Vidljivi tekst koji NIJE dio pristupačnog imena — 2.5.3 Label in Name.
 *
 * ── Zašto ovo postoji pored axe-a ──────────────────────────────────────────
 * Axe pravilo `label-content-name-mismatch` na 22 admin/stylist rute vraća
 * **incomplete** s porukom „Unable to determine if the visible text is part of the
 * accessible name" — to nije nalaz nego nesigurnost, pa se ne može ni potvrditi ni
 * opovrgnuti. U jsdom-u je još gore: izmjereno 2026-11-08 nad pet varijanti markupa,
 * axe tu vraća `INCOMPLETE: Axe encountered an error`, dakle pada, pa se ponašanje iz
 * Chromiuma ne može reproducirati lokalno. Isti eksperiment je pokazao da je pravilo
 * `INAPPLICABLE` kad dugme nema vidljivog teksta (samo `<img>`), kad je prazno i kad je
 * skriveno — što znači da su na rutama inicijali stvarno vidljivi.
 *
 * Zato ova mjera računa oba teksta sama: vidljivi tekst elementa (bez `aria-hidden`,
 * bez `sr-only`, bez `alt` na slici — oko ga ne vidi) i `aria-label`. Ako ime ne sadrži
 * vidljivi tekst, glasovni korisnik koji izgovori ono što vidi ne pogađa kontrolu.
 *
 * Namjerno je samodostatna: Playwright u preglednik šalje samo `fn.toString()`.
 */
export function visibleTextNotInName() {
  const norm = (value) => String(value ?? '').replace(/\s+/g, ' ').trim().toLowerCase()

  const isScreenOnly = (el) => {
    const cs = getComputedStyle(el)
    // `sr-only` u ovom repu: apsolutno pozicioniran, 1px, odsječen.
    return (
      cs.position === 'absolute' &&
      (cs.width === '1px' || cs.height === '1px' || (cs.clip && cs.clip !== 'auto'))
    )
  }

  // Samo **kontrole**, ne bilo koji element s `aria-label`. 2.5.3 govori o kontrolama, a
  // `<nav aria-label="Glavna navigacija">` sadrži sav tekst navigacije — da je i on u
  // opsegu, mjera bi prijavila sedam landmarka iz `src/` koji nisu nikakav prekršaj.
  // 🔴 Sufiks se dodaje PO DIJELU: `a, b[aria-label]` znači „a ILI b s aria-label", pa bi
  // `button, a[href][aria-label]` tražio atribut samo na linkovima.
  const controls = [
    'button',
    'a[href]',
    'input',
    'select',
    'textarea',
    'summary',
    '[role="button"]',
    '[role="link"]',
    '[role="tab"]',
    '[role="menuitem"]',
    '[role="menuitemcheckbox"]',
    '[role="menuitemradio"]',
    '[role="checkbox"]',
    '[role="radio"]',
    '[role="option"]',
    '[role="switch"]',
    '[role="combobox"]',
  ]
    .map((part) => `${part}[aria-label]`)
    .join(', ')

  const out = []
  for (const el of document.querySelectorAll(controls)) {
    if (el.getAttribute('aria-hidden') === 'true') continue

    let visible = ''
    const walk = (node) => {
      for (const child of node.childNodes) {
        if (child.nodeType === 3) {
          visible += child.textContent
          continue
        }
        if (child.nodeType !== 1) continue
        if (child.getAttribute('aria-hidden') === 'true') continue
        // `<img>` ne treba izuzetak: `alt` je atribut, a ne tekstualni čvor, pa ga obilazak
        // ionako ne čita. Mutacijska provjera M38 je to dokazala — uklanjanje izuzetka nije
        // srušilo nijedan test, jer grana nikad nije ništa mijenjala.
        if (isScreenOnly(child)) continue
        walk(child)
      }
    }
    walk(el)

    const text = norm(visible)
    if (!text) continue
    const name = norm(el.getAttribute('aria-label'))
    if (name.includes(text)) continue

    out.push({
      element: `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}`,
      visible: text.slice(0, 40),
      name: name.slice(0, 60),
    })
  }
  return out
}
