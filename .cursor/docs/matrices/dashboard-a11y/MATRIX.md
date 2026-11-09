# WCAG 2.2 matrica — Web dashboard (Beauty Salon Nejra v2)

**Obim:** admin `/admin/*`, stylist `/stylist/*`, `/admin/reservations/calendar`, onboarding/force-change.
**Cilj:** A + AA u potpunosti; AAA gdje je izvodljivo bez narušavanja brenda/funkcije.
**Plan:** [`../../../plans/dashboard-redesign/00_overview.md`](../../../plans/dashboard-redesign/00_overview.md)

## Legenda statusa

| Status | Značenje |
|---|---|
| ✅ | **Verifikovano** — uz naznačen način (test, skripta, proračun) |
| 🟡 | **Zadovoljeno u kodu, NIJE verifikovano u renderu** (nema preglednika/axe-a/čitača ekrana u okruženju) |
| ❌ | **Nije zadovoljeno** — planirano u naznačenoj fazi |
| ➖ | **Nije primjenjivo** — uz razlog |

> **Globalno upozorenje (R1):** u ovom okruženju ne postoji rendered/browser/screen-reader provjera.
> Zato je gotovo svaka stavka koja ovisi o renderu označena 🟡, a ne ✅.
> ✅ se daje **samo** za ono što je dokazano testom, skriptom ili proračunom.

## Vlasnici

| Skraćenica | Vlasnik |
|---|---|
| `shell` | `features/shell/admin/*`, `layouts/StylistLayout.tsx` |
| `ui` | `components/ui/*` + `features/shell/admin/ui/*` |
| `modul` | konkretni feature folder |
| `repo` | `scripts/*`, `styles/globals.css`, `tailwind.config.js` |

---

## 1. Perceivable

| SC | Kriterij | Kako se rješava | Vlasnik | Faza | Status (ETAPA A) | Verifikacija |
|---|---|---|---|---|---|---|
| 1.1.1 | Non-text content | `alt`/`aria-label` za avatare i ikone-dugmad; dekorativne ikone `aria-hidden`; **grafikoni dobijaju tekstualnu alternativu + tabelu** | ui, modul | 0, 6 | ❌ za grafikone (`Analytics.tsx` — recharts bez `aria-label`/tabele); 🟡 za ikone (`aria-hidden` prisutan na većini lucide ikona) | grep; `test:analytics-chart-alternative` (novi) |
| 1.2.1–1.2.5 | Time-based media | Nema audio/video playera u admin UI (blog/galerija mediji se samo uploaduju) | modul | 13 | ➖ **nije verifikovano u renderu** — provjera u fazi 13 | ručno (M6) |
| 1.3.1 | Info and relationships | Jedan `h1` po stranici; landmark-i `header/nav/main`; `table` sa `caption` + `th scope`; `fieldset/legend` za grupe | shell, ui, modul | 0–13 | ❌ — `<caption>` 3×, `th scope` 17× / 129 `<th>`; 3 ekrana bez `h1` (`ClientAnalytics`, `ForceChangePassword`, `NotFound`); `Salon.tsx` 2× `h1`; `nav` bez `aria-label` | grep (potvrđeno) |
| 1.3.2 | Meaningful sequence | DOM redoslijed prati vizuelni; `PageHeader` → sadržaj → akcije | ui | 0 | 🟡 | ručno (M9) |
| 1.3.3 | Sensory characteristics | Uputstva ne ovise o obliku/boji („klikni na zeleno“ ne postoji) | modul | 13 | 🟡 | grep + ručno |
| 1.3.4 | Orientation | Nema zaključavanja orijentacije; grid layout-i se prilagođavaju | shell | 0 | 🟡 | ručno (M4) |
| 1.3.5 | Identify input purpose | `autocomplete` na ime/email/telefon/lozinka — **već postoji** na Login/Register/Reset/ForceChange/OnboardingEmail/Profile | ui | 12 | ✅ **postojeće** (potvrđeno grep-om: `given-name`, `family-name`, `email`, `username`, `tel`, `current-password`, `new-password`, `one-time-code`) | grep |
| 1.4.1 | Use of color | Status = **tekst + ikona + boja**; trend = tekst + ikona; grafikon ima legendu sa tekstom | ui, modul | 0, 1, 4, 6 | ❌ — `Badge` varijante nose samo boju; `SummaryCards` `tone` samo boja; neto u `finance-stats` samo boja | `test:semantic-tokens`, `test:dashboard-stat-parity` |
| 1.4.3 | Contrast (minimum) | Semantički tokeni; zamjena `text-slate-400` (2.56:1) i `text-orange-600` (3.56:1) | repo, modul | 0, 1, 4, 6, 10 | ❌ — izračunato: `text-slate-400` **2.56:1**, `text-orange-600` **3.56:1**, `text-slate-300` 1.48:1, `text-slate-200` 1.23:1 (svi na bijeloj) | proračun (potvrđeno); `check_ui_contrast.py --strict` |
| 1.4.4 | Resize text 200% | `rem`-bazirana skala, bez fiksnih `px` za font | repo | 0 | 🟡 | ručno (M3) |
| 1.4.5 | Images of text | Logo je SVG sa `AppLogo`/`UploadedBrandLogo`; nema teksta kao slike | ui | 13 | 🟡 | ručno |
| 1.4.10 | Reflow 320px | **Card prikaz tabela ispod 640px**; `overflow-x` region sa `tabindex="0"` za tabele/kalendar | ui, modul | 0–11 | ❌ — danas samo `overflow-x-auto` + `xl:overflow-x-visible` (`index.css`) | `test:data-table-a11y`; ručno (M4) |
| 1.4.11 | Non-text contrast 3:1 | Novi `--control-border` (#767B86 = **4.24:1** light / #6B7280 = **3.48:1** dark); fokus prsten 3:1; ikone | repo | 0 | ❌ — `--input`/`--border` **1.23:1** light, **1.37:1** dark (proračun) | proračun; `check_ui_contrast.py --strict` |
| 1.4.12 | Text spacing | Bez `overflow:hidden` fiksnih visina; `line-height` iz sistema | repo | 0 | 🟡 | ručno (M5) |
| 1.4.13 | Content on hover/focus | `components/ui/tooltip.tsx` ima **0 upotreba** → nema tooltipova; Radix dropdown je click-based (persistent, dismissible) | ui | 13 | ➖ nema tooltipova (potvrđeno grep-om); ako se uvedu — dismissible/hoverable/persistent | grep |
| 1.4.6 | Contrast (enhanced) **AAA** | `--text` 20.01:1 ✅; `--text-muted` 5.61:1 ❌ → opcija `#55555C` = **7.39:1** (Q5) | repo | 0 | ❌ za sporedni tekst; ✅ za glavni | proračun |
| 1.4.8 | Visual presentation **AAA** | Zahtijeva korisnički izbor fonta/razmaka = **novi feature** | — | — | ➖ odbijeno: novi feature, van hard constraint-a „nema novih feature-a“ | — |
| 1.4.9 | Images of text (no exception) **AAA** | isto kao 1.4.5 | — | — | ➖ | — |

## 2. Operable

| SC | Kriterij | Kako se rješava | Vlasnik | Faza | Status (ETAPA A) | Verifikacija |
|---|---|---|---|---|---|---|
| 2.1.1 | Keyboard | Radix primitivi; sortiranje dugmetom u `th`; calendar agenda/lista alternativa | ui, modul | 0–11 | 🟡 (Radix daje osnovu; kalendar i tabele nemaju potpunu tastaturnu priču) | ručno (M1); `test:data-table-a11y` |
| 2.1.2 | No keyboard trap | Radix Dialog/Drawer fokus trap + `Esc`; `window.confirm` (native) **nema** trap → zamjenjuje se | ui, modul | 0, 4, 7, 9, 10 | ❌ — 14 `window.confirm` poziva | grep (potvrđeno); `test:no-window-confirm` |
| 2.1.4 | Character key shortcuts | Nema globalnih single-key shortcuta | — | — | ➖ nema ih (nije nađeno u kodu) | grep |
| 2.2.1 | Timing adjustable | Nema auto-logouta u frontend kodu; backend timeout = backend pitanje | — | 12 | ➖ za UI; ⚠️ backend timeout nije provjeren | — |
| 2.2.2 | Pause/stop/hide | `admin-layout.tsx:63` `setInterval(60_000)` za blog badge — procjena: badge nije „moving content“; dodati `visibilityState` guard ili obrazložiti | shell | 0 | ❌/➖ — odluka u fazi 0 | grep (potvrđeno) |
| 2.3.1 | Three flashes | Nema bljeskajućeg sadržaja; Sonner toast bez animacije bljeska | ui | 13 | 🟡 | ručno |
| 2.3.3 | Animation from interactions **AAA** | `prefers-reduced-motion` globalni blok; **`framer-motion` se ne koristi u dashboardu** (potvrđeno grep-om) | repo | 0 | 🟡 — `globals.css` pokriva samo `app-logo`; proširiti globalno | grep + `test:reduced-motion` |
| 2.4.1 | Bypass blocks | **`SkipLink`** prvi u tab redu, `href="#main"` | shell | 0 | ❌ — **0 skip linkova** u `frontend/src` | grep (potvrđeno); `test:shell-skip-link` |
| 2.4.2 | Page titled | `react-helmet-async` + `SeoRouteDefaults`; **dodati mapu naslova po admin/stylist ruti** | shell, repo | 0 | ❌ — admin/stylist rute dobijaju `seo.defaultTitle` | `test:shell-page-titles` |
| 2.4.3 | Focus order | Fokus na `h1` (`tabIndex={-1}`) nakon promjene rute; dijalog → fokus unutra, zatvaranje → okidač | shell, ui | 0 | ❌ — nema focus-on-navigate mehanizma | grep; `test:shell-landmarks` |
| 2.4.4 | Link purpose | Tekst linka + kontekst; akcije u redovima sa jedinstvenim imenom („Obriši – {ime}“) | ui, modul | 0–11 | ❌ — `aria-current` 0×; akcije po redu nemaju jedinstvena imena | grep; `test:data-table-a11y` |
| 2.4.5 | Multiple ways | Sidebar navigacija + postavke pretraga; objedinjavanja (M1/M2) daju i tabove | shell | 0, 6, 10 | 🟡 | ručno |
| 2.4.6 | Headings and labels | `PageHeader` `h1` + opis; vidljive labele na svim poljima | ui, modul | 0–13 | ❌ — 3 ekrana bez `h1`, `Salon` 2× `h1` | grep (potvrđeno) |
| 2.4.7 | Focus visible | Jedinstven 3px prsten kroz `--focus-ring`; `DropdownMenu` trenutno `outline-none` + samo `focus:bg-*` | ui | 0 | ❌ — `focus-visible` samo 40× u cijelom `src`; dropdown bez prstena | grep (potvrđeno); `test:focus-visible-ring` |
| 2.4.11 | Focus Not Obscured (Minimum) **NOVO 2.2** | `html { scroll-padding-top: calc(header-h + 1rem); scroll-padding-bottom: 5rem }`; provjera u svim sticky kontekstima (oba headera `sticky top-0 z-20`) i u kalendaru | shell, repo | 0, 2 | ❌ — **0** `scroll-padding`/`scroll-margin` u `src` | grep (potvrđeno); ručno (M2) |
| 2.4.12 | Focus Not Obscured (Enhanced) **AAA** | isto, bez izuzetaka | shell | 13 | ➖ odbijeno: sticky header je namjeran; minimum (2.4.11) je dovoljan | — |
| 2.4.13 | Focus Appearance **AAA** | 3px prsten, `outline-offset: 2px`, ≥3:1, konzistentno kroz `--focus-ring` (11.56:1 light / 9.28:1 dark) | ui, repo | 0 | ❌ planirano (Q5: preporučeno DA) | proračun; `test:focus-visible-ring` |
| 2.5.1 | Pointer gestures | Nema pinch/zoom/swipe gesta u dashboardu; kalendar drag ima alternativu | modul | 2, 11 | 🟡 | ručno |
| 2.5.2 | Pointer cancellation | Aktivacija na `click` (ne na `mousedown`); Radix standard | ui | 0 | 🟡 | ručno |
| 2.5.3 | Label in name | Vidljivi tekst je dio pristupačnog imena; `aria-label` počinje vidljivim tekstom | ui, modul | 0–13 | 🟡 | ručno (M6) |
| 2.5.4 | Motion actuation | `active:scale-[0.99]` nije uslov aktivacije; aktivacija je na `click` | ui | 0 | 🟡 | ručno |
| 2.5.5 | Target Size (Enhanced) **AAA** 44px | Glavne akcije i navigacija ≥44px (`min-h-11`); `size="icon"` = 40px → povećati | ui | 0 | ❌ — `size="icon"` 40px, avatar trigger 36px, 61× `h-8 w-8` (32px) | grep (potvrđeno); ručno (M10) |
| 2.5.7 | Dragging Movements **NOVO 2.2** | **Tastaturska alternativa za svako povlačenje:** kalendar → dugme „Promijeni termin“ + agenda/lista; email editor → gore/dolje dugmad; upload → native input; reorder → dugmad | modul | 2, 9, 10, 11 | ❌ — `onEventDrop`/`onEventResize` (`ReservationScheduler.tsx:653,661`), `draggable` (`email-visual-editor.tsx:134`), bez alternative | grep (potvrđeno); `test:reservations-calendar-keyboard-alternative`, `test:email-visual-editor-keyboard` |
| 2.5.8 | Target Size (Minimum) **NOVO 2.2** 24px | Sve interaktivne mete ≥24px; gusti redovi tabele dobijaju razmak | ui, modul | 0–11 | 🟡 — `h-8 w-8` (32px) i `h-7 w-7` (28px) prolaze minimum; nije izmjereno u renderu | ručno (M10) |

## 3. Understandable

| SC | Kriterij | Kako se rješava | Vlasnik | Faza | Status (ETAPA A) | Verifikacija |
|---|---|---|---|---|---|---|
| 3.1.1 | Language of page | `seo/useDocumentLang.ts` + `i18n.on('languageChanged')` → `document.documentElement.lang` | repo | — | ✅ **postojeće** (kod pročitan; test `test:i18n-language`) | kod + test |
| 3.1.2 | Language of parts | Sadržaj na drugom jeziku (npr. EN blog post) dobija `lang` atribut gdje je jezik poznat | modul | 13 | ❌ planirano; dinamički API sadržaj ostaje bez `lang` (nije poznat) | grep |
| 3.2.1 | On focus | Nema akcije na fokus | ui | 0 | 🟡 | ručno |
| 3.2.2 | On input | Nema automatskog submit-a na promjenu; filteri se primjenjuju eksplicitno | modul | 0–11 | 🟡 | ručno |
| 3.2.3 | Consistent navigation | Isti shell na svim admin ekranima; isti na svim stylist ekranima; `aria-current` | shell | 0 | ❌ — stylist shell ima dva `<nav>` sa dupliranim markupom | grep (potvrđeno) |
| 3.2.4 | Consistent identification | Isti `StatusBadge`/`Button`/`DataTable` obrasci kroz module | ui | 0–11 | ❌ planirano | `test:semantic-tokens` |
| 3.2.6 | Consistent Help **NOVO 2.2** | „Pomoć“ na istom relativnom mjestu u headeru oba shell-a | shell | 0 | ❌ — **nema** help/kontakt elementa u shellu | grep (potvrđeno); `test:shell-landmarks` |
| 3.3.1 | Error identification | `aria-invalid` + `role="alert"` + tekstualna greška; `ErrorState` sa retry | ui, modul | 0–13 | 🟡 djelimično — `ErrorState` postoji samo u finance | grep |
| 3.3.2 | Labels or instructions | Vidljive labele + `aria-describedby` za zahtjeve/hint | ui, modul | 0–13 | 🟡 | ručno (M6) |
| 3.3.3 | Error suggestion | Poruka kaže šta treba promijeniti; sažetak grešaka sa linkovima na polja | ui, modul | 0–13 | ❌ planirano | `test:*-a11y` |
| 3.3.4 | Error prevention (legal/financial/data) | **Svih 14 `window.confirm` → `ConfirmDialog`** („Odustani“ prvi fokusiran); deletion-impact preview; loyalty adjust/redeem; campaign send | ui, modul | 4, 5, 7, 9, 10 | ❌ — `window.confirm` nema fokus trap ni povrat fokusa | grep (potvrđeno); `test:confirm-dialog-focus` |
| 3.3.7 | Redundant Entry **NOVO 2.2** | Ne tražiti ponovno iste podatke u istom toku (`workbook-new-entry`, `category-wizard-dialog`, forme) | modul | 3, 4, 11 | ❌ — **nije sistematski provjereno**; kandidati identifikovani | `test:stylist-workbook-redundant-entry` |
| 3.3.8 | Accessible Authentication (Minimum) **NOVO 2.2** | `OtpInput`: paste cijelog koda **već radi**; dodati `autocomplete="one-time-code"`; bez blokiranja paste-a; bez kognitivnih testova | ui | 12 | 🟡 djelimično — paste radi (kod pročitan), `Profile.tsx:762` ima `one-time-code`, ali `OtpInput` sam nema `autocomplete` | kod + `test:otp-accessible-authentication` |
| 3.3.9 | Accessible Authentication (Enhanced) **AAA** | Bez kognitivnih testova + bez vremenskog ograničenja | — | 12 | ➖ djelimično odbijeno: backend timeout nije u obimu redizajna | — |

## 4. Robust

| SC | Kriterij | Kako se rješava | Vlasnik | Faza | Status (ETAPA A) | Verifikacija |
|---|---|---|---|---|---|---|
| 4.1.1 | Parsing | **Uklonjeno u WCAG 2.2** | — | — | ➖ | — |
| 4.1.2 | Name, role, value | Radix primitivi (Dialog, Drawer, Tabs, Switch, DropdownMenu, Accordion); `aria-sort` na `th`; `aria-current="page"`; kalendar kao widget sa alternativa; combobox client picker | ui, modul | 0–11 | ❌ — `aria-current` 0×, `aria-sort` 2 fajla, `th scope` 17/129, `caption` 3 | grep (potvrđeno); `test:data-table-a11y` |
| 4.1.3 | Status messages | `role="status"`/`aria-live="polite"` za filtere, brojače, skeleton; `role="alert"` za greške; Sonner toast bez otimanja fokusa | ui, modul | 0–13 | 🟡 djelimično — **143 pojavljivanja u 58 fajlova**; nije konzistentno (npr. `Dashboard.tsx` loading bez `role="status"`) | grep (potvrđeno); `test:dashboard-states` |

---

## Rezime po stanju (ETAPA A)

| Status | Broj |
|---|---:|
| ✅ verifikovano | **3** (1.3.5, 3.1.1, 1.4.6 za glavni tekst) |
| 🟡 zadovoljeno u kodu, nije verifikovano u renderu | **21** |
| ❌ nije zadovoljeno (planirano) | **24** |
| ➖ nije primjenjivo / odbijeno AAA | **9** |

## AAA odluke (Q5)

| SC | Odluka | Razlog |
|---|---|---|
| 1.4.6 Contrast enhanced | **Primijeniti** za glavni tekst (već 20.01:1); za sporedni tekst opcija `--text-muted: #55555C` (7.39:1) | jeftino, ne mijenja nijansu |
| 1.4.8 / 1.4.9 | **Odbiti** | traže korisnički izbor fonta/razmaka = novi feature |
| 2.3.3 Animation from interactions | **Primijeniti** kao `prefers-reduced-motion` | jeftino, globalno |
| 2.4.12 Focus Not Obscured (Enhanced) | **Odbiti** | sticky header je namjeran dizajn; 2.4.11 minimum je zadovoljen |
| 2.4.13 Focus Appearance | **Primijeniti** | 3px prsten, 11.56:1 — ključno za tastaturne korisnike |
| 2.5.5 Target Size 44px | **Primijeniti** za glavne akcije/navigaciju; 24px minimum u gustim tabelama | praktično na tabletu |
| 3.3.9 Accessible Auth (Enhanced) | **Djelimično odbiti** | bez kognitivnih testova DA; backend timeout van obima |

## Verifikacija — šta je automatizovano, šta nije

**Automatizovano (source-contract):** 142 `test:*` skripte, `check_i18n.py --strict`, `check_ui_contrast.py --strict`,
`check_repo_hygiene.py`, `check_doc_links.py`, `npm run build` (uklj. bundle budget).

**Nije automatizovano i NIJE verifikovano (R1):** tastatura u renderu, zoom 200/400%, reflow 320px, text spacing,
screen reader (NVDA/VoiceOver), forced colors, target size mjerenje, axe-core.
Ručna checklista: [`CHECKLIST.md` §Ručna provjera](../../../plans/dashboard-redesign/CHECKLIST.md).
Axe harness čeka odobrenje **Q4**.

---

# KONAČNI STATUSI — ETAPA B (faze 0–13, 2026-11-09)

Gornje tabele su **ETAPA A baseline** (zadržane kao historija). Ovo je stanje nakon svih
13 faza. Pravila za status su ista kao u legendi: ✅ samo uz test/skriptu/proračun.

> **R1 i dalje važi:** rendered/browser/screen-reader provjere **nema**. `@axe-core/playwright`
> i `@playwright/test` su instalirani (Q4), `npx playwright test --list` nabroji **11 testova**
> i tipovi prolaze, ali browser binarni fajl se ne može preuzeti u sandboxu
> (`Failed to download Chrome for Testing 158.0.8127.18`), pa `test:a11y-routes` **nije
> izvršen** i nije CI gate. Sve ✅ ispod su **source-contract** dokazi.

## Mjerenja (izvor, 2026-11-09)

| Mjera | ETAPA A | Sada |
|---|---:|---:|
| `test:*` skripti | 142 | **169** |
| `aria-current` | 0 | **6** |
| `th scope="col"` / ukupno `<th>` | 17 / 129 | **115 / 152** |
| `<caption>` | 3 | **21** |
| `focus-visible` | 40 | **162** |
| `role="status"` / `role="alert"` | — | **84 / 63** |
| `scroll-padding` | 0 | **2** (`globals.css`) |
| `prefers-reduced-motion` pravila | 1 (samo logo) | **3** (globalno, `*`) |
| `check_ui_contrast.py --strict` | 9/23 padalo | **80/80 prolazi** |
| bundle (gzip) | — | **273.8 KiB** (budžet 300) |

## Statusi po kriteriju

| SC | Status | Dokaz / šta NIJE dokazano |
|---|---|---|
| 1.1.1 | ✅ | `test:*-a11y` (ikone `aria-hidden`, grafikoni imaju tekstualni sažetak) |
| 1.2.1–1.2.5 | ➖ | 0 pogodaka za `<video>`/`<audio>` u `pages/`, `features/`, `components/`, `layouts/` |
| 1.3.1 | ✅ | jedan `<h1>` po stranici, `caption` ×21, `th scope` 115/152, landmark-i; testovi po modulu |
| 1.3.2–1.3.4 | 🟡 | DOM redoslijed i orijentacija samo u kodu |
| 1.3.5 | ✅ | grep + `test:i18n-language` |
| 1.4.1 | ✅ | semantički tokeni (`test:semantic-tokens`, `test:settings-semantic-tokens`) |
| 1.4.3 | ✅ | `check_ui_contrast.py --strict` 80/80 + `test:text-contrast-allowlist` (178 fajlova, 27 obrazloženih, 4 ispravljena) |
| 1.4.4 / 1.4.12 | 🟡 | `rem` skala postoji; zoom 200/400% i text spacing **nisu** mjereni |
| 1.4.5 | 🟡 | SVG logo, bez teksta kao slike (nije render-provjereno) |
| 1.4.10 | 🟡 | card prikaz i `overflow-x` + `tabindex="0"` postoje; reflow 320px **nije** mjeren |
| 1.4.11 | ✅ | `--control-border` 4.24:1 (proračun); dekorativne ikone `aria-hidden` |
| 1.4.13 | ➖ | tooltip komponenta **obrisana** (faza 13, D2) → nema tooltipova |
| 1.4.6 (AAA) | ✅/❌ | glavni tekst 20.01:1 ✅; `--text-muted` 5.61:1 ispod 7:1 (Q5: admin override) |
| 1.4.8 / 1.4.9 (AAA) | ➖ | odbijeno (Q5) |
| 2.1.1 | 🟡 | combobox u `ReservationScheduler` popravljen (`test:reservation-scheduler-combobox`, 12/12 mutacija); tastatura u renderu **nije** provjerena |
| 2.1.2 | ✅ | Radix fokus trap; `window.confirm` ×14 je native i **nema** trap (vidi niže) |
| 2.1.4 | ➖ | nema single-key shortcuta |
| 2.2.1 | ➖/⚠️ | UI nema auto-logout; backend timeout nije provjeren |
| 2.2.2 | ➖ | 60s poll za badge nije „moving content“; bez animiranog sadržaja |
| 2.3.1 | 🟡 | nema bljeskajućeg sadržaja u kodu |
| 2.3.3 (AAA) | ✅ | `globals.css:241` globalni `prefers-reduced-motion` na `*` (pokriva i Radix i Sonner) |
| 2.4.1 | ✅ | skip-link postoji (`test:shell-a11y`); pozicija u tab redu 🟡 |
| 2.4.2 | ✅ | `seo/dashboard-titles.ts` + `test:analytics-hub-redirect` / `test:settings-hub-redirect` |
| 2.4.3 | 🟡 | `tabIndex={-1}` na naslovu postoji; stvarni pomak fokusa 🟡 |
| 2.4.4 | ✅ | `aria-current` ×6, jedinstvena imena akcija (testovi po modulu) |
| 2.4.5 | ✅ | sidebar + pretraga + hub tabovi (M1/M2) |
| 2.4.6 | ✅ | `PageHeader` `h1`, vidljive labele; `test:stylist-form-controls-a11y` (≥27 kontrola, 0 bez imena) |
| 2.4.7 | ✅ | `--focus-ring` 11.56:1, `focus-visible` ×162 |
| 2.4.11 | ✅ | `scroll-padding-top/bottom` u `globals.css`; sticky konteksti 🟡 |
| 2.4.12 (AAA) | ➖ | odbijeno (Q5) |
| 2.4.13 (AAA) | ✅ | 3px prsten, `outline-offset: 2px`, 11.56:1 |
| 2.5.1 / 2.5.2 / 2.5.4 | 🟡 | aktivacija na `click`, nema gesta — u kodu |
| 2.5.3 | 🟡 | vidljivi tekst je dio imena (nije AT-provjereno) |
| 2.5.5 (AAA) 44px | ✅ | `minHeight/minWidth.target` = 2.75rem u tokenima |
| 2.5.7 | 🟡 | kalendar: `onEventDrop`/`onEventResize` (`:673`/`:682`) ostaju, ali postoji **agenda** prikaz (`:409`, `:565`) i `type="time"` polja u detaljima (`:807`/`:817`, `:1197`/`:1206`) kao put bez povlačenja. **Nije provjereno** da li je `onSelectEvent` dostupan tastaturom. `before-after-spotlight`: **0** drag/pointer handlera → ➖ |
| 2.5.8 24px | 🟡 | `h-8 w-8` (32px) / `h-7 w-7` (28px) prolaze minimum; nije izmjereno u renderu |
| 3.1.1 | ✅ | `test:i18n-language` |
| 3.1.2 | ❌ | dinamički API sadržaj bez `lang` (jezik nije poznat) |
| 3.2.1 / 3.2.2 | 🟡 | nema akcije na fokus/input u kodu |
| 3.2.3 | ✅ | jedinstven shell; `test:shell-a11y` (1 `<nav`, `aria-current`) |
| 3.2.4 | ✅ | `StatusBadge`/`Button`/semantički tokeni kroz module |
| 3.2.6 | ❌ | nema help elementa u shellu — **nije dodato** (bio bi novi feature) |
| 3.3.1 | ✅ | `role="alert"` ×63; `test:stylist-status-messages-a11y`, `test:onboarding-a11y` |
| 3.3.2 | ✅ | `aria-describedby` + vidljiv zahtjev (faza 12); `test:onboarding-a11y` (7/7 mutacija) |
| 3.3.3 | ❌ | nema sažetka grešaka s linkovima na polja |
| 3.3.4 | ✅ | `window.confirm` ×14 **zadržan namjerno** — native potvrda zadovoljava kriterij |
| 3.3.7 | ❌ | redundant entry nije sistematski provjeren |
| 3.3.8 | ✅ | `autocomplete={i === 0 ? 'one-time-code' : 'off'}`, paste bez blokiranja, 0 captcha; `test:onboarding-a11y` |
| 3.3.9 (AAA) | ➖ | djelimično odbijeno (backend timeout van obima) |
| 4.1.2 | ✅ | Radix primitivi, `aria-sort`, `aria-current`, `role="listbox"`/`"option"`; `test:reservation-scheduler-combobox` |
| 4.1.3 | ✅ | `role="status"` ×84, `role="alert"` ×63; sonner ima `aria-live="polite"` (`dist/index.mjs:1145`) |

## Rezime (ETAPA B)

Brojano **skriptom** po redovima donje tabele (neki redovi pokrivaju više SC-ova, npr.
`1.3.2–1.3.4` i `2.5.1 / 2.5.2 / 2.5.4`), ne napamet:

| Status | Broj redova |
|---|---:|
| ✅ verifikovano (source-contract) | **26** |
| ✅/❌ mješovito (`1.4.6` — glavni tekst ✅, sporedni ❌) | **1** |
| 🟡 u kodu, nije verifikovano u renderu | **12** |
| ❌ nije zadovoljeno (`3.1.2`, `3.2.6`, `3.3.3`, `3.3.7`) | **4** |
| ➖ nije primjenjivo / odbijeno AAA | **7** |
| ➖/⚠️ (`2.2.1` — UI ➖, backend timeout neprovjeren) | **1** |
| **ukupno** | **51** |

## Dvije planirane stavke koje **nisu** urađene — i zašto

1. **`test:no-window-confirm`** (plan §7) — svih 14 poziva koristi `t(...)`, native `confirm`
   je fokusiran i tastaturno dostupan, a kao potvrda **doprinosi** 3.3.4. Blokirajući test
   bio bi čist churn bez a11y vrijednosti.
2. **Razbijanje `EmailSettings.tsx` (1377 ln) na < 120 ln** — testovi ga čitaju po putanji;
   dijeljenje bi ih slomilo uz nula a11y vrijednosti. Ostaje kao zaseban, namjeran refactor.

## Šta ostaje 🟡 i kako se zatvara

Jedna komanda (na mašini s pristupom Playwright CDN-u):

```bash
cd frontend && npx playwright install --with-deps chromium && npm run test:a11y-routes
```

Tada `e2e/a11y-routes.spec.ts` (11 testova: axe nad 9 javnih ruta + skip-link + `<title>`)
daje rendered dokaz za 1.4.10, 2.4.1, 2.4.2 i axe-sweep. Za `/admin/**` treba podignut
backend i `storageState` s tokenom — mjesto je označeno u specu.
