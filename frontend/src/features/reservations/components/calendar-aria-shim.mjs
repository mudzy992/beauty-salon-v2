/**
 * Popravka ARIA markupa koji generiše `react-big-calendar@1.20.0` — zadnja objavljena verzija
 * (npm registry `dist-tags.latest`, provjereno 2026-11-08), dakle nadogradnja ne rješava ništa.
 *
 * Logika je u `.mjs` (ne u `.ts`) da je `calendar-aria-shim.test.mjs` može **stvarno izvršiti**
 * nad jsdom DOM-om, umjesto da je ponovo napiše u testu i time testira svoju kopiju.
 *
 * Rješavaju se samo dva prekršaja koja se NE daju zamijeniti propovima:
 *
 * 1. `aria-required-children` (critical) — `addons/dragAndDrop/WeekWrapper.js:249` ubacuje
 *    `<div class="rbc-addons-dnd-row-body">` kao DIREKTNO dijete `<div class="rbc-row-content"
 *    role="row">` (`DateContentRow.js:176-178`). Uloga `row` zahtijeva djecu s ulogom ćelije i
 *    NE dopušta presentational djecu, pa je struktura nevažeća onako kako je biblioteka gradi,
 *    a za `WeekWrapper` nema override-a u `components`. Skidamo nevažeću ulogu: sedmični pogled
 *    nema tabelarnu semantiku ni na jednom nivou, pa se ne gubi ništa što je važilo.
 *
 * 2. `scrollable-region-focusable` (serious) — `TimeGrid.js:339` renderuje `.rbc-time-content`
 *    kao skrolabilnu regiju bez `tabindex`, pa se ne može dohvatiti tastaturom (WCAG 2.1.1).
 *
 * 3. `aria-required-parent` (critical) — `DateContentRow.js:159` postavlja `role="rowgroup"` na
 *    omotač koji iz `TimeGridHeader.js:63` nosi `className: "rbc-allday-cell"`. Uloga `rowgroup`
 *    traži pretka s ulogom `grid`, `table` ili `treegrid`, a sedmični pogled ih nema nigdje u
 *    lancu (`.rbc-time-header` → `.rbc-time-grid` → `.rbc-time-view`). Skidamo ulogu SAMO kad
 *    takav predak stvarno ne postoji, da se ne diraju ispravne tabele.
 *
 * Broj `aria-required-parent` u CI anotaciji bio je **8**, ne 7: sedam `<span role="columnheader">`
 * (riješeno propom `components.header`) **plus** ovaj `rowgroup`. Anotacija prikazuje samo prva
 * 3 čvora, pa se osmi vidio tek kad su ostali zatvoreni.
 *
 * Uloga `columnheader` se NE rješava ovdje: za nju postoji podržana zamjena `components.header`
 * (`TimeGridHeader.js:91-92`), pa je riješena u `SchedulerColumnHeader`.
 */

/** Jedan prolaz popravke nad datim korijenom. */
export function applyCalendarAriaShim(root) {
  if (!root) return
  for (const el of root.querySelectorAll('.rbc-row-content[role="row"]')) {
    el.removeAttribute('role')
  }
  for (const el of root.querySelectorAll('.rbc-time-content:not([tabindex])')) {
    el.setAttribute('tabindex', '0')
  }
  for (const el of root.querySelectorAll('[role="rowgroup"]')) {
    if (!hasRequiredAncestor(el, ROWGROUP_PARENTS)) el.removeAttribute('role')
  }
}

/** Uloge koje axe dopušta kao pretka za `rowgroup`. */
const ROWGROUP_PARENTS = new Set(['grid', 'table', 'treegrid'])

/** Ima li ijedan predak jednu od traženih uloga? */
function hasRequiredAncestor(el, allowed) {
  for (let node = el.parentElement; node; node = node.parentElement) {
    if (allowed.has(node.getAttribute('role') ?? '')) return true
  }
  return false
}

/**
 * Popravka + `MutationObserver` koji je ponavlja, jer rbc re-renderuje pri svakoj promjeni
 * datuma ili pogleda i vrati svoje atribute. Petlje nema: poslije naše izmjene oba uslova su
 * zadovoljena, pa sljedeći prolaz ne dira DOM. Vraća funkciju za prekid.
 */
export function observeCalendarAriaShim(root) {
  if (!root) return () => {}
  applyCalendarAriaShim(root)
  const observer = new MutationObserver(() => applyCalendarAriaShim(root))
  observer.observe(root, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['role', 'tabindex'],
  })
  return () => observer.disconnect()
}
