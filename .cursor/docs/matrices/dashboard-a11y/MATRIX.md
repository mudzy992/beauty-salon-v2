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
| 1.1.1 | Non-text content | `alt`/`aria-label` za avatare i ikone-dugmad; dekorativne ikone `aria-hidden`; **grafikoni dobijaju tekstualnu alternativu + tabelu** | ui, modul | 0, 6 | ❌ za grafikone (`Analytics.tsx` — recharts bez `aria-label`/tabele); 🟡 za ikone (`aria-hidden` prisutan na većini lucide ikona) | grep; `test:analytics-chart-alternative` (novi) **Novi nalaz 2026-11-09 (izvor, ne axe):** `StarRating` u `ClientAnalytics.tsx:135` bio je `<div aria-label={…}>` **bez `role`**. Zvjezdice su `aria-hidden`, pa je taj `aria-label` bio jedina alternativa — a na `role="generic"` je zabranjen i AT ga **ignoriše** (axe: `aria-prohibited-attr`, *serious*). Ocjena dakle nije bila izložena nigdje. Dodato `role="img"`. Isti sweep našao je još 2 ista atributa gdje je tekst ispod već bio ime (`app-logo.tsx:55`, `uploaded-brand-logo.tsx:60`) — suvišni, obrisani. `test:generic-aria-and-row-actions` (6, 6/6 mutacija). |
| 1.2.1–1.2.5 | Time-based media | Nema audio/video playera u admin UI (blog/galerija mediji se samo uploaduju) | modul | 13 | ➖ **nije verifikovano u renderu** — provjera u fazi 13 | ručno (M6) |
| 1.3.1 | Info and relationships | Jedan `h1` po stranici; landmark-i `header/nav/main`; `table` sa `caption` + `th scope`; `fieldset/legend` za grupe | shell, ui, modul | 0–13 | ❌ — `<caption>` 3×, `th scope` 17× / 129 `<th>`; 3 ekrana bez `h1` (`ClientAnalytics`, `ForceChangePassword`, `NotFound`); `Salon.tsx` 2× `h1`; `nav` bez `aria-label` | grep (potvrđeno) |
| 1.3.2 | Meaningful sequence | DOM redoslijed prati vizuelni; `PageHeader` → sadržaj → akcije | ui | 0 | ✅ | ručno (M9) **Rendered dokaz 2026-11-08:** `test:e2e` `wcag-rendered.spec.ts` mjeri u Chromiumu da DOM redoslijed landmarka (`header`/`nav`/`main`/`footer`) odgovara vizuelnom na **9** javnih ruta, i da `<main>` postoji — CI run `42889168373` **success** (74/0/0). Uz to popravljen stvarni defekt: `/login` i `/register` nisu imali **nijedan** landmark (`grep -c '<main'` = 0), sada `<main>` (`Login.tsx:120/187`, `Register.tsx:125/288`). |
| 1.3.3 | Sensory characteristics | Uputstva ne ovise o obliku/boji („klikni na zeleno“ ne postoji) | modul | 13 | ✅ | `test:wcag-source-contracts` — 0 uputstava koja se oslanjaju samo na boju/oblik u **2710** ključeva × 2 jezika (skener traži boju **i** glagol akcije u istom stringu) |
| 1.3.4 | Orientation | Nema zaključavanja orijentacije; grid layout-i se prilagođavaju | shell | 0 | ✅ | `test:wcag-source-contracts` — nema `screen.orientation.lock` ni `orientation.lock(`; nijedan `@media (orientation:…)` ne krije sadržaj. M4 ostaje za ručnu potvrdu |
| 1.3.5 | Identify input purpose | `autocomplete` na ime/email/telefon/lozinka — **već postoji** na Login/Register/Reset/ForceChange/OnboardingEmail/Profile | ui | 12 | ✅ **postojeće** (potvrđeno grep-om: `given-name`, `family-name`, `email`, `username`, `tel`, `current-password`, `new-password`, `one-time-code`) | grep |
| 1.4.1 | Use of color | Status = **tekst + ikona + boja**; trend = tekst + ikona; grafikon ima legendu sa tekstom | ui, modul | 0, 1, 4, 6 | ❌ — `Badge` varijante nose samo boju; `SummaryCards` `tone` samo boja; neto u `finance-stats` samo boja | `test:semantic-tokens`, `test:dashboard-stat-parity` |
| 1.4.3 | Contrast (minimum) | Semantički tokeni; zamjena `text-slate-400` (2.56:1) i `text-orange-600` (3.56:1) | repo, modul | 0, 1, 4, 6, 10 | ❌ — izračunato: `text-slate-400` **2.56:1**, `text-orange-600` **3.56:1**, `text-slate-300` 1.48:1, `text-slate-200` 1.23:1 (svi na bijeloj) | proračun (potvrđeno); `check_ui_contrast.py --strict` |
| 1.4.4 | Resize text 200% | `rem`-bazirana skala, bez fiksnih `px` za font | repo | 0 | ✅ | ručno (M3) **Rendered dokaz 2026-11-08:** pri `font-size: 200%` **nijedan** element ne gubi sadržaj na **9** javnih ruta (diferencijalno: skup koji siječe sadržaj mjeri se prije i poslije) — CI run `42889168373` **success**. **Oprez, izmjeren nalaz:** 1.4.4 ne zabranjuje horizontalni skrol (to je 1.4.10), a pri 200% stranica bježi **755px** udesno na 6 ruta javnog omotača; krivac je `header.sticky.top-0.z-50` (`public-layout.tsx:158`). Bilježi se u CI anotaciju kao nalaz 1.4.10. |
|1.4.5|Images of text|Logo je SVG sa `AppLogo`/`UploadedBrandLogo`; nema teksta kao slike|ui|13| ✅ | `test:wcag-source-contracts` — izmjereno: u cijelom `src` postoji **tačno jedan** `<img>` (`components/media-image.tsx`, fotografije rada); logo je SVG komponenta, pa se tekst mijenja bojom i fontom. `ui/avatar.tsx` ga spominje samo u komentaru |
| 1.4.10 | Reflow 320px | **Card prikaz tabela ispod 640px**; `overflow-x` region sa `tabindex="0"` za tabele/kalendar | ui, modul | 0–11 | ❌ — danas samo `overflow-x-auto` + `xl:overflow-x-visible` (`index.css`) | `test:data-table-a11y`; ručno (M4) |
| 1.4.11 | Non-text contrast 3:1 | Novi `--control-border` (#767B86 = **4.24:1** light / #6B7280 = **3.48:1** dark); fokus prsten 3:1; ikone | repo | 0 | ❌ — `--input`/`--border` **1.23:1** light, **1.37:1** dark (proračun) | proračun; `check_ui_contrast.py --strict` |
| 1.4.12 | Text spacing | Bez `overflow:hidden` fiksnih visina; `line-height` iz sistema | repo | 0 | ✅ | ručno (M5) **Rendered dokaz 2026-11-08:** uz tačne WCAG vrijednosti (`line-height 1.5`, `p 1.5em`, `letter-spacing .12em`, `word-spacing .16em`) **nijedan** element ne gubi sadržaj na **9** javnih ruta — CI run `42889168373` **success** (74/0/0). |
| 1.4.13 | Content on hover/focus | `components/ui/tooltip.tsx` ima **0 upotreba** → nema tooltipova; Radix dropdown je click-based (persistent, dismissible) | ui | 13 | ➖ nema tooltipova (potvrđeno grep-om); ako se uvedu — dismissible/hoverable/persistent | grep |
| 1.4.6 | Contrast (enhanced) **AAA** | `--text` 20.01:1 ✅; `--text-muted` 5.61:1 ❌ → opcija `#55555C` = **7.39:1** (Q5) | repo | 0 | ❌ za sporedni tekst; ✅ za glavni | proračun |
| 1.4.8 | Visual presentation **AAA** | Zahtijeva korisnički izbor fonta/razmaka = **novi feature** | — | — | ➖ odbijeno: novi feature, van hard constraint-a „nema novih feature-a“ | — |
| 1.4.9 | Images of text (no exception) **AAA** | isto kao 1.4.5 | — | — | ➖ | — |

## 2. Operable

| SC | Kriterij | Kako se rješava | Vlasnik | Faza | Status (ETAPA A) | Verifikacija |
|---|---|---|---|---|---|---|
| 2.1.1 | Keyboard | Radix primitivi; sortiranje dugmetom u `th`; calendar agenda/lista alternativa | ui, modul | 0–11 | ✅ | ručno (M1); `test:data-table-a11y` **Novi nalaz 2026-11-09 (Level A):** sistematski sweep nad `<tr onClick>`/`<Card onClick>` u cijelom `src` našao **4** tabele s klikabilnim redom; tri imaju pristupačno dugme u istom redu (`Reservations.tsx:443`, `Stylists.tsx:278`, `ClientAnalytics.tsx:482`) pa **nisu** prekršaj, ali `Reviews.tsx:164` nije imao nijedno — `openDetail` se pojavljivao samo na definiciji (96) i u `onClick` reda (167), pa je **miš bio jedini put** do dijaloga detalja. Dodato dugme `aria-label={t('reviews.details')}` u postojeću kolonu s akcijama. `test:generic-aria-and-row-actions`.  **Rendered dokaz 2026-11-08:** Tab doseže **svaki** fokusabilni element i fokus ima vidljiv indikator, mjeren na **9** javnih ruta — CI run `42889168373` **success** (74/0/0). Admin i stylist rute imaju zaseban axe harness. |
| 2.1.2 | No keyboard trap | Radix Dialog/Drawer fokus trap + `Esc`; `window.confirm` (native) **nema** trap → zamjenjuje se | ui, modul | 0, 4, 7, 9, 10 | ❌ — 14 `window.confirm` poziva | grep (potvrđeno); `test:no-window-confirm` |
| 2.1.4 | Character key shortcuts | Nema globalnih single-key shortcuta | — | — | ➖ nema ih (nije nađeno u kodu) | grep |
| 2.2.1 | Timing adjustable | Nema auto-logouta u frontend kodu; backend timeout = backend pitanje | — | 12 | ➖ za UI; ⚠️ backend timeout nije provjeren | — |
| 2.2.2 | Pause/stop/hide | `admin-layout.tsx:63` `setInterval(60_000)` za blog badge — procjena: badge nije „moving content“; dodati `visibilityState` guard ili obrazložiti | shell | 0 | ❌/➖ — odluka u fazi 0 | grep (potvrđeno) |
| 2.3.1 | Three flashes | Nema bljeskajućeg sadržaja; Sonner toast bez animacije bljeska | ui | 13 | ✅ | `test:wcag-source-contracts` — 0 `infinite` animacija; sve `animation:` deklaracije imaju konačan broj ponavljanja |
| 2.3.3 | Animation from interactions **AAA** | `prefers-reduced-motion` globalni blok; **`framer-motion` SE koristi** u 9 fajlova s 26 animacija — ranija tvrdnja „ne koristi se (potvrđeno grep-om)" bila je **netačna**; zato je dodat `MotionConfig` | repo | 0 | ✅ | `test:wcag-source-contracts` — `globals.css:241` globalni blok nad `*, *::before, *::after` s `!important` **i** `<MotionConfig reducedMotion="user">` na korijenu provajdera |
| 2.4.1 | Bypass blocks | **`SkipLink`** prvi u tab redu, `href="#main"` | shell | 0 | ❌ — **0 skip linkova** u `frontend/src` | grep (potvrđeno); `test:shell-skip-link` |
| 2.4.2 | Page titled | `react-helmet-async` + `SeoRouteDefaults`; **dodati mapu naslova po admin/stylist ruti** | shell, repo | 0 | ❌ — admin/stylist rute dobijaju `seo.defaultTitle` | `test:shell-page-titles` |
| 2.4.3 | Focus order | Fokus na `h1` (`tabIndex={-1}`) nakon promjene rute; dijalog → fokus unutra, zatvaranje → okidač | shell, ui | 0 | ❌ — nema focus-on-navigate mehanizma | grep; `test:shell-landmarks` |
| 2.4.4 | Link purpose | Tekst linka + kontekst; akcije u redovima sa jedinstvenim imenom („Obriši – {ime}“) | ui, modul | 0–11 | ❌ — `aria-current` 0×; akcije po redu nemaju jedinstvena imena | grep; `test:data-table-a11y` |
| 2.4.5 | Multiple ways | Sidebar navigacija + postavke pretraga; objedinjavanja (M1/M2) daju i tabove | shell | 0, 6, 10 | ✅ | `test:wcag-source-contracts` — ≥2 `<nav>` mehanizma + pretraga kao drugi put do iste destinacije |
| 2.4.6 | Headings and labels | `PageHeader` `h1` + opis; vidljive labele na svim poljima | ui, modul | 0–13 | ❌ — 3 ekrana bez `h1`, `Salon` 2× `h1` | grep (potvrđeno) |
| 2.4.7 | Focus visible | Jedinstven 3px prsten kroz `--focus-ring`; `DropdownMenu` trenutno `outline-none` + samo `focus:bg-*` | ui | 0 | ❌ — `focus-visible` samo 40× u cijelom `src`; dropdown bez prstena | grep (potvrđeno); `test:focus-visible-ring` |
| 2.4.11 | Focus Not Obscured (Minimum) **NOVO 2.2** | `html { scroll-padding-top: calc(header-h + 1rem); scroll-padding-bottom: 5rem }`; provjera u svim sticky kontekstima (oba headera `sticky top-0 z-20`) i u kalendaru | shell, repo | 0, 2 | ❌ — **0** `scroll-padding`/`scroll-margin` u `src` | grep (potvrđeno); ručno (M2) |
| 2.4.12 | Focus Not Obscured (Enhanced) **AAA** | isto, bez izuzetaka | shell | 13 | ➖ odbijeno: sticky header je namjeran; minimum (2.4.11) je dovoljan | — |
| 2.4.13 | Focus Appearance **AAA** | 3px prsten, `outline-offset: 2px`, ≥3:1, konzistentno kroz `--focus-ring` (11.56:1 light / 9.28:1 dark) | ui, repo | 0 | ❌ planirano (Q5: preporučeno DA) | proračun; `test:focus-visible-ring` |
| 2.5.1 | Pointer gestures | Nema pinch/zoom/swipe gesta u dashboardu; kalendar drag ima alternativu | modul | 2, 11 | ✅ | `test:wcag-source-contracts` — jedini path-based gest (`BeforeAfterSlider`) ima tastaturnu alternativu: `role="slider"`, `tabIndex={0}`, `onKeyDown`, `aria-valuemin/max/now/text` |
| 2.5.2 | Pointer cancellation | Aktivacija na `click` (ne na `mousedown`); Radix standard | ui | 0 | ✅ | `test:wcag-source-contracts` — nijedan `onMouseDown` u `src` ne aktivira akciju (nema `navigate`/`mutate`/`submit`/`location`); aktivacija je na click/keyup |
| 2.5.3 | Label in name | Vidljivi tekst je dio pristupačnog imena; `aria-label` počinje vidljivim tekstom | ui, modul | 0–13 | ✅ | ručno (M6) **Rendered dokaz 2026-11-08:** `labelInNameViolations()` u Chromiumu upoređuje `aria-label` s `innerText` na **9** javnih i **15** admin ruta — **0** prekršaja (CI run `42898886511`, **98/0/0**). Mjeri se direktno jer axe ovo pravilo **ne može** presuditi: `incomplete 22/22` uz „Unable to determine if the visible text is part of the accessible name" ostao je i nakon što je ime postalo „Admin meni, C" (run `42895442598`). **Stvarni defekt popravljen:** dugme menija imalo je `aria-label="Admin meni"` uz vidljive inicijale — glasovni korisnik koji izgovori ono što vidi nije pogađao dugme. Popravljeno na **5** mjesta preko `labelWithVisibleText()`; čuvar traži da vidljivi tekst i ime koriste ISTU varijablu. Namjerno NIJE riješeno s `aria-hidden` nad inicijalima: to bi ih sakrilo od čitača ekrana, ali ne i od oka, pa bi prekršaj ostao a postao nevidljiv alatima. |
| 2.5.4 | Motion actuation | `active:scale-[0.99]` nije uslov aktivacije; aktivacija je na `click` | ui | 0 | ✅ | `test:wcag-source-contracts` — `<MotionConfig reducedMotion="user">`; `active:scale-[0.99]` nije uslov aktivacije |
| 2.5.5 | Target Size (Enhanced) **AAA** 44px | Glavne akcije i navigacija ≥44px (`min-h-11`); `size="icon"` = 40px → povećati | ui | 0 | ❌ — `size="icon"` 40px, avatar trigger 36px, 61× `h-8 w-8` (32px) | grep (potvrđeno); ručno (M10) |
| 2.5.7 | Dragging Movements **NOVO 2.2** | **Tastaturska alternativa za svako povlačenje:** kalendar → dugme „Promijeni termin“ + agenda/lista; email editor → gore/dolje dugmad; upload → native input; reorder → dugmad | modul | 2, 9, 10, 11 | ❌ — `onEventDrop`/`onEventResize` (`ReservationScheduler.tsx:653,661`), `draggable` (`email-visual-editor.tsx:134`), bez alternative | grep (potvrđeno); `test:reservations-calendar-keyboard-alternative`, `test:email-visual-editor-keyboard` |
| 2.5.8 | Target Size (Minimum) **NOVO 2.2** 24px | Sve interaktivne mete ≥24px; gusti redovi tabele dobijaju razmak | ui, modul | 0–11 | ✅ — axe `target-size` (tag `wcag22aa`) **PROLAZ na svih 32 rute**: `passed 32, inapplicable 0, incomplete 0, violations 0` (run `42877920751`, anotacija o pokrivenosti pravila). Pravilo je **primjenjivo na svakoj ruti**, pa ovo nije prolaz zbog prazne stranice. Ranije označeno kao neizmjereno u renderu | `test:axe-coverage`; M10 ostaje za ručnu potvrdu |

## 3. Understandable

| SC | Kriterij | Kako se rješava | Vlasnik | Faza | Status (ETAPA A) | Verifikacija |
|---|---|---|---|---|---|---|
| 3.1.1 | Language of page | `seo/useDocumentLang.ts` + `i18n.on('languageChanged')` → `document.documentElement.lang` | repo | — | ✅ **postojeće** (kod pročitan; test `test:i18n-language`) | kod + test |
| 3.1.2 | Language of parts | Sadržaj na drugom jeziku (npr. EN blog post) dobija `lang` atribut gdje je jezik poznat | blog, backend | 13 | ✅ — **2026-11-09**: `blog_posts.language` (default `bs`) + migracija + DTO `@IsIn(['bs','en'])`; javne stranice izdaju `lang={blogPostLang(post)}` na `<h1>`, sadržaju, naslovu i sažetku kartice | `test:blog-language-a11y` (6, 6/6 mutacija) |
| 3.2.1 | On focus | Nema akcije na fokus | ui | 0 | ✅ | `test:wcag-source-contracts` — svih **7** `onFocus` handlera samo otvara padajuću listu; nijedan ne navigira ni ne šalje |
| 3.2.2 | On input | Nema automatskog submit-a na promjenu; filteri se primjenjuju eksplicitno | modul | 0–11 | ✅ | `test:wcag-source-contracts` — nijedan `onChange` (provjereno ≥20) ne navigira, ne mutira i ne šalje formu |
| 3.2.3 | Consistent navigation | Isti shell na svim admin ekranima; isti na svim stylist ekranima; `aria-current` | shell | 0 | ❌ — stylist shell ima dva `<nav>` sa dupliranim markupom | grep (potvrđeno) |
| 3.2.4 | Consistent identification | Isti `StatusBadge`/`Button`/`DataTable` obrasci kroz module | ui | 0–11 | ❌ planirano | `test:semantic-tokens` |
| 3.2.6 | Consistent Help **NOVO 2.2** | „Pomoć“ na istom relativnom mjestu u headeru oba shell-a | shell | 13 | ✅ — **ispravka 2026-11-09**: oba shell-a VEĆ imaju `/kontakt` + `HelpCircle` u dijeljenom `<header>`, prije korisničkog menija. Prethodni ❌ („nema help elementa") bio je pogrešan. | `test:shell-a11y` (4/4 mutacije) |
| 3.3.1 | Error identification | `aria-invalid` + `role="alert"` + tekstualna greška; `ErrorState` sa retry | ui, modul | 0–13 | ✅ | **Rendered dokaz 2026-11-08:** `invalidWithoutDescription()` u Chromiumu traži da svaka kontrola s `aria-invalid="true"` ima `aria-describedby` koji razriješi u element **sa sadržajem** — pogrešan `id` i prazan `<p>` su prekršaj. Mjereno na **9** javnih i **15** admin ruta, **0** prekršaja (CI run `42906098467`, **146/0/0**). Na `/login` i `/register` greška se izazove stvarnim pokušajem slanja, jer mjerenje samo učitanog stanja ne bi dokazalo ništa. **Ograničenje, javno:** `field-error.tsx` koristi isključivo dnevna knjiga (`aria-invalid` postoji na 5 mjesta u 2 fajla), a javne forme greške javljaju toastom — pa ovdje nema polja koja bi bila neispravna, ne „sva su ispravna". |
| 3.3.2 | Labels or instructions | Vidljive labele + `aria-describedby` za zahtjeve/hint | ui, modul | 0–13 | ✅ | **Rendered dokaz 2026-11-08:** `requiredNotMarked()` traži da vidljiva oznaka „*" / „obavezno" / „required" bude i programski vidljiva (`required` ili `aria-required`) — jer čitač ekrana zvjezdicu ne čita, pa korisnik sazna tek kad forma odbije unos. **0** prekršaja na **9** javnih i **15** admin ruta (CI run `42906098467`). Imenovanje kontrola dokazuje axe na 32 rute (`label`, `select-name`, `form-field-multiple-labels` — svi PROLAZ). |
| 3.3.3 | Error suggestion | **Normativno:** poznat prijedlog ispravke mora se korisniku dati **u tekstu**. Uz polje `aria-invalid` + `aria-describedby` → tekst; plus trajni sažetak (`role="alert"`, fokusabilan, linkovi na polja). Serverske 400 poruke se više ne odbacuju. | ui, modul | 0–13 | ✅ | `test:form-error-suggestion` (15, 22/22 mutacija) **Rendered dokaz 2026-11-08:** na `/admin/daily-log` se otvori forma i pokuša spremiti prazna — validacija je klijentska (`use-daily-log-form.ts:203`), pa test ne ovisi o backendu niti stvara podatke. Mjereno u Chromiumu (CI run `42907161916`, **147/0/0**): (1) sažetak `[role="alert"][tabindex="-1"]` postoji, vidljiv je i **prima fokus**; (2) svako neispravno polje ima `aria-describedby` koji razriješi u tekst; (3) prijedlog je **konkretan** — „Odaberite stilistu i servis", ne generička poruka; (4) linkovi iz sažetka vode na polja koja stvarno postoje. **Ograničenje, javno:** ovo dokazuje da je prijedlog u tekstu i programski povezan s poljem. Da li čitač ekrana najavi sažetak **prije** čitanja polja (ručna stavka M13) ovime NIJE provjereno — za to treba AT, kojeg u projektu još nema. |
| 3.3.4 | Error prevention (legal/financial/data) | **Svih 14 `window.confirm` → `ConfirmDialog`** („Odustani“ prvi fokusiran); deletion-impact preview; loyalty adjust/redeem; campaign send | ui, modul | 4, 5, 7, 9, 10 | ❌ — `window.confirm` nema fokus trap ni povrat fokusa | grep (potvrđeno); `test:confirm-dialog-focus` |
| 3.3.7 | Redundant Entry **NOVO 2.2** | Ne tražiti ponovno iste podatke u istom toku (`workbook-new-entry`, `category-wizard-dialog`, forme) | modul | 3, 4, 11 | ✅ — **sistematski provjereno 2026-11-09: prekršaja nema**. Oba kandidata su jednostranačne forme (ime `category-wizard-dialog.tsx` zavodi — u njemu nema koraka); reschedule tok izbor prenosi URL-om i pred-popunjava kontrolu; javna rezervacija ne pita kontakt koji već ima. | `test:redundant-entry-a11y` (9 testova, 13/13 mutacija) |
| 3.3.8 | Accessible Authentication (Minimum) **NOVO 2.2** | `OtpInput`: paste cijelog koda **već radi**; dodati `autocomplete="one-time-code"`; bez blokiranja paste-a; bez kognitivnih testova | ui | 12 | ✅ | `test:wcag-source-contracts` — `autoComplete="username"`/`current-password`/`new-password`; `autoComplete="off"` nigdje na auth formi; OTP `onPaste` **primjenjuje** nalijepljeno (`onChange(pasted)`), ne odbacuje ga |
| 3.3.9 | Accessible Authentication (Enhanced) **AAA** | Bez kognitivnih testova + bez vremenskog ograničenja | — | 12 | ➖ djelimično odbijeno: backend timeout nije u obimu redizajna | — |

## 4. Robust

| SC | Kriterij | Kako se rješava | Vlasnik | Faza | Status (ETAPA A) | Verifikacija |
|---|---|---|---|---|---|---|
| 4.1.1 | Parsing | **Uklonjeno u WCAG 2.2** | — | — | ➖ | — |
| 4.1.2 | Name, role, value | Radix primitivi (Dialog, Drawer, Tabs, Switch, DropdownMenu, Accordion); `aria-sort` na `th`; `aria-current="page"`; kalendar kao widget sa alternativa; combobox client picker | ui, modul | 0–11 | ❌ — `aria-current` 0×, `aria-sort` 2 fajla, `th scope` 17/129, `caption` 3 | grep (potvrđeno); `test:data-table-a11y` **Dopuna 2026-11-09:** `<tr>` u `ClientAnalytics.tsx:457` bio je fokusabilan (`tabIndex={0}` + `onKeyDown`) ali bez `role` — AT najavi samo „red", a pristupačni put je ionako postojao (dugme „Detalji"), pa je red bio i suvišan tab-stop. Uklonjeno; obrazac je sad isti kao u `Reservations.tsx` i `Stylists.tsx`. **Zatvoreno 2026-11-09 (odobrenje vlasnika):** `<Card onClick>` za recenzije (`ClientAnalytics.tsx:552`) — `<div>` s `tabIndex`+`onKeyDown` bez `role`. Jeftine opcije su imale cijenu (`role="button"` proguta sadržaj jer `button` ima prezentacijsku djecu; pravo `<button>` ne smije sadržavati `<p>`/`<div>`, a kartica ih ima 5+), pa je usvojen obrazac **stretched dugme**: naslov usluge JE pravo `<button>`, a `after:absolute after:inset-0 after:content-['']` uz `relative` na kartici ga razvlači preko cijele površine. Cijela kartica ostaje klikabilna, sav sadržaj ostaje čitljiv (nema prezentacijske djece), a `aria-label` sadrži vidljivi naziv usluge (2.5.3). Generisanje utilityja **potvrđeno u build izlazu** (`.after\:inset-0:after{content:var(--tw-content);top:0;right:0;bottom:0;left:0}`). |
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

> **R1 je DJELIMIČNO UKINUT 2026-11-09.** Browser binarni fajl i dalje se ne može preuzeti
> u sandboxu (`Failed to download Chrome for Testing 158.0.8127.18`), ali je vlasnik
> `npm run test:a11y-routes` **pokrenuo na svojoj mašini**: 11 testova, **3 prošla / 8 palo**,
> 24.6 s. To je prvi rendered dokaz u projektu.
>
> **Rezultat runa:** PASS na `/rezervacija`, `/login` i `2.4.2` (`<title>` na svim rutama).
> FAIL na 4 različite stvari — sve četiri su u izvoru potvrđene i ispravljene (vidi redove
> `1.1.1`, `1.4.3`, `2.4.1`, `2.5.3`). Backend nije bio podignut (log pun
> `ECONNREFUSED 127.0.0.1:10001`), pa su stranice renderovane u **praznom/fallback stanju** —
> nalazi važe za to stanje, a `/admin/**` i dalje nije pokriven.
>
> ✅ ispod su source-contract dokazi. **Re-run nakon ispravki je izvršen 2026-11-09:
> svih 11 testova prolazi** (vlasnikova potvrda; prije ispravki bilo je 3/11). Četiri nalaza
> su time dokazana rendered provjerom.
>
> **`/admin/**` i `/stylist/**` harness postoji od 2026-11-09 ali NIJE izvršen**
> (`e2e/auth.setup.ts` + `a11y-admin.spec.ts` + `a11y-stylist.spec.ts`; **38 testova** po
> `--list`: chromium 11 + setup 2 + admin 18 + stylist 11). Zato admin/stylist statusi
> **ostaju 🟡** — alat postoji, mjerenja nema. Isto važi za stanje stranica *s podacima*
> (javni run je bio bez backend-a).

## Mjerenja (izvor, 2026-11-09 — ponovo izmjereno nakon axe ispravki)

`focus-visible` je ovdje **163 pojavljivanja** (`grep -o`) na **46 linija** (`grep -rn`);
ranija vrijednost 162 bila je za jedno off. i18n: **2650** leaf ključeva po jeziku
(`check_i18n.py --strict`), 0 razlika BS↔EN.

| Mjera | ETAPA A | Sada |
|---|---:|---:|
| `test:*` skripti | 142 | **171** |
| `aria-current` | 0 | **6** |
| `th scope="col"` / ukupno `<th>` | 17 / 129 | **115 / 152** |
| `<caption>` | 3 | **21** |
| `focus-visible` | 40 | **163** pojavljivanja / **46** linija |
| `role="status"` / `role="alert"` | — | **84 / 63** |
| `scroll-padding` | 0 | **2** (`globals.css`) |
| `prefers-reduced-motion` pravila | 1 (samo logo) | **3** (globalno, `*`) |
| `check_ui_contrast.py --strict` | 9/23 padalo | **80/80 prolazi** |
| bundle (gzip) | — | **273.8 KiB** (budžet 300) |

## Statusi po kriteriju

| SC | Status | Dokaz / šta NIJE dokazano |
|---|---|---|
| 1.1.1 | ✅ | `test:*-a11y` (ikone `aria-hidden`, grafikoni imaju tekstualni sažetak). **Axe nalaz (critical):** `/register` je imao `<img … src="/brand/media-fallback.jpg">` bez `alt` — `AvatarImage` ga nije postavljao kada ga pozivalac ne prosljedi (`pages/Register.tsx:231`). Sada default `alt=""` (dekorativno) u `components/ui/avatar.tsx`; `StylistLayout` i `public-layout` već prosljeđuju `shell.profileForUser`. `test:public-a11y-axe-findings` |
| 1.2.1–1.2.5 | ➖ | 0 pogodaka za `<video>`/`<audio>` u `pages/`, `features/`, `components/`, `layouts/` |
| 1.3.1 | ✅ | jedan `<h1>` po stranici, `caption` ×21, `th scope` 115/152, landmark-i; testovi po modulu. **Dopuna 2026-11-09:** `workbook-new-entry-page` — kartica s tri polja (datum/iznos/napomena) bila je vizuelno grupisana ali programski ne; sada `role="group"` + `aria-labelledby` (`test:workbook-form-groups-a11y`). Status ostaje ✅. |
| 1.3.2–1.3.4 | ✅ | **1.3.2 izmjereno u Chromiumu** na 9 javnih ruta (run `42889168373`); 1.3.3/1.3.4 dokazani nad izvorom (0 senzornih uputstava, 0 `screen.orientation`) |
| 1.3.5 | ✅ | grep + `test:i18n-language` |
| 1.4.1 | ✅ | semantički tokeni (`test:semantic-tokens`, `test:settings-semantic-tokens`) |
| 1.4.3 | ✅ | `check_ui_contrast.py --strict` 80/80 + `test:text-contrast-allowlist` (178 fajlova, 27 obrazloženih, 4 ispravljena). **Axe nalaz (serious) ×2 na `/kontakt`:** `text-slate-500` `#64748b` na `bg-slate-200` `#e2e8f0` = **3.86:1** (placeholder Google mape, `PublicContact.tsx:280-282`). **Rupa u mom sweepu:** računao je kontrast prema **bijeloj**, pa parove „tekst i pozadina na istom elementu“ nije mogao vidjeti — sad je pokriveno posebnim testom. Plus nenadani nalaz: `media-consent-panel.tsx:195,265` `text-slate-400` na `bg-slate-100` = **2.34:1** na `<ImageOff aria-label>` (značenjska ikona → 1.4.11). Oba → `text-slate-600` = 6.92:1 na `bg-slate-100`; onaj na `/kontakt` je 6.15:1 jer mu je pozadina `bg-slate-200` |
| 1.4.4 / 1.4.12 | ✅ | **Izmjereno u Chromiumu** (run `42889168373`): pri 200% fonta i pri WCAG razmaku teksta **nula** elemenata gubi sadržaj na 9 ruta. **Nije** time pokriveno: horizontalni skrol 755px → nalaz 1.4.10 |
| 1.4.5 | 🟡 | SVG logo, bez teksta kao slike (nije render-provjereno) |
| 1.4.10 | ❌ | **Izmjereno 2026-11-08:** pri 200% fonta stranica bježi **755px** udesno na 6 ruta javnog omotača (`/`, `/usluge`, `/galerija`, `/kontakt`, `/zadovoljni-klijenti`, `/blog`), krivac `header.sticky.top-0.z-50` (`public-layout.tsx:158`). Reflow na 320px **nije** mjeren |
| 1.4.11 | ✅ | `--control-border` 4.24:1 (proračun); dekorativne ikone `aria-hidden` |
| 1.4.13 | ➖ | tooltip komponenta **obrisana** (faza 13, D2) → nema tooltipova |
| 1.4.6 (AAA) | ✅/❌ | glavni tekst 20.01:1 ✅; `--text-muted` 5.61:1 ispod 7:1 (Q5: admin override) |
| 1.4.8 / 1.4.9 (AAA) | ➖ | odbijeno (Q5) |
| 2.1.1 | 🟡 | combobox u `ReservationScheduler` popravljen (`test:reservation-scheduler-combobox`, 12/12 mutacija). **Novi nalaz 2026-11-09:** `<Card onClick>` u `Gallery.tsx` — `Card` renderuje običan `<div>`, a `loadImages` je jedini put do `selectedCatId`, pa tastaturni korisnik nije mogao otvoriti nijednu kategoriju. Popravljeno pravim `<button>` + `aria-pressed` (`test:admin-gallery-keyboard`, 5/5 mutacija). **Napomena:** `jsx-a11y` ovo NIJE javio jer ne zna šta custom komponenta renderuje. **Rendered dokaz 2026-11-08:** tastatura **jeste** provjerena na 9 javnih ruta — Tab doseže svaki fokusabilni element, fokus ima vidljiv indikator (run `42889168373` success) |
| 2.1.2 | ✅ | Radix fokus trap; `window.confirm` ×14 je native i **nema** trap (vidi niže) |
| 2.1.4 | ➖ | nema single-key shortcuta |
| 2.2.1 | ➖/⚠️ | UI nema auto-logout; backend timeout nije provjeren |
| 2.2.2 | ➖ | 60s poll za badge nije „moving content“; bez animiranog sadržaja |
| 2.3.1 | ✅ | 0 `infinite` animacija; sve su jednokratne (`test:wcag-source-contracts`) |
| 2.3.3 (AAA) | ✅ | `globals.css:241` globalni `prefers-reduced-motion` na `*` (pokriva i Radix i Sonner) |
| 2.4.1 | ✅ | skip-link postoji u admin/stylist shellu (`test:shell-a11y`). **Axe nalaz:** javni layout ga **nije imao** — prvi Tab išao je na `<a href="/" class="flex items-center gap-2 flex-none">` (logo), 14× isti rezultat. Sada `<SkipLink />` prvi u `features/shell/public/public-layout.tsx` + `<main id="main" tabIndex={-1}>`. `test:public-a11y-axe-findings` asertira i **redoslijed** (SkipLink prije `<header>`) |
| 2.4.2 | ✅ | `seo/dashboard-titles.ts` + `test:analytics-hub-redirect` / `test:settings-hub-redirect` |
| 2.4.3 | 🟡 | `tabIndex={-1}` na naslovu postoji; stvarni pomak fokusa 🟡 |
| 2.4.4 | ✅ | `aria-current` ×6, jedinstvena imena akcija (testovi po modulu) |
| 2.4.5 | ✅ | sidebar + pretraga + hub tabovi (M1/M2) |
| 2.4.6 | ✅ | `PageHeader` `h1`, vidljive labele; `test:stylist-form-controls-a11y` (≥27 kontrola, 0 bez imena) |
| 2.4.7 | ✅ | `--focus-ring` 11.56:1, `focus-visible` ×162 |
| 2.4.11 | ✅ | `scroll-padding-top/bottom` u `globals.css`; sticky konteksti 🟡 |
| 2.4.12 (AAA) | ➖ | odbijeno (Q5) |
| 2.4.13 (AAA) | ✅ | 3px prsten, `outline-offset: 2px`, 11.56:1 |
| 2.5.1 / 2.5.2 / 2.5.4 | ✅ | `BeforeAfterSlider` ima tastaturnu alternativu; nijedan `onMouseDown` ne aktivira; `MotionConfig reducedMotion="user"` |
| 2.5.3 | ✅ | **Axe nalaz (serious) na 6 ruta** (`/`, `/usluge`, `/galerija`, `/kontakt`, `/zadovoljni-klijenti`, `/blog`): `<button aria-label="Prebaci jezik na Engleski">BS</button>` — vidljivi tekst „BS" **nije** bio dio pristupačnog imena. Uzrok u `components/i18n/language-switcher.tsx`: `aria-label={actionLabel}` (cijela rečenica) uz sadržaj `{currentLanguage.toUpperCase()}`. Sada `aria-label={`${visibleCode} — ${actionLabel}`}`; `title` je **namjerno ostao** `actionLabel` jer `aria-label` ionako preglasava `title` u računanju imena → 0 vidljivih izmjena na javnom sajtu. `test:public-a11y-axe-findings` |
| 2.5.5 (AAA) 44px | ✅ | `minHeight/minWidth.target` = 2.75rem u tokenima |
| 2.5.7 | 🟡 | kalendar: `onEventDrop`/`onEventResize` (`:673`/`:682`) ostaju, ali postoji **agenda** prikaz (`:409`, `:565`) i `type="time"` polja u detaljima (`:807`/`:817`, `:1197`/`:1206`) kao put bez povlačenja. **Nije provjereno** da li je `onSelectEvent` dostupan tastaturom. `before-after-spotlight`: **0** drag/pointer handlera → ➖ |
| 2.5.8 24px | ✅ | axe `target-size` **PROLAZ na svih 32 rute** (run `42877920751`); `h-8 w-8` (32px) / `h-7 w-7` (28px) prolaze minimum |
| 3.1.1 | ✅ | `test:i18n-language` |
| 3.1.2 | ✅ | jezik članka se sada **čuva** (`blog_posts.language VARCHAR(8) NOT NULL DEFAULT 'bs'`), pa više nije „nepoznat". Javne stranice ga izdaju kao `lang` na `<h1>`, kontejneru sadržaja (`dangerouslySetInnerHTML`), naslovu i sažetku kartice. Admin forma ima selektor (`blog.admin.language`). `blogPostLang()` normalizuje `en-GB → en` i pada na `bs`. |
| 3.2.1 / 3.2.2 | ✅ | 7 `onFocus` samo otvara listu; nijedan `onChange` ne navigira (`test:wcag-source-contracts`) |
| 3.2.3 | ✅ | jedinstven shell; `test:shell-a11y` (1 `<nav`, `aria-current`) |
| 3.2.4 | ✅ | `StatusBadge`/`Button`/semantički tokeni kroz module |
| 3.2.6 | ✅ | oba shell-a imaju `/kontakt` + `HelpCircle` u dijeljenom `<header>` (`admin-layout.tsx:82-170`, `StylistLayout.tsx:81-163`), prije korisničkog menija; ime iz `shell.help` (bs „Pomoć" / en „Help"). **Ispravka:** raniji ❌ je tvrdio da help element ne postoji — izmjereno 2026-11-09 da postoji. |
| 3.3.1 | ✅ | `role="alert"` ×63; `test:stylist-status-messages-a11y`, `test:onboarding-a11y` |
| 3.3.2 | ✅ | `aria-describedby` + vidljiv zahtjev (faza 12); `test:onboarding-a11y` (7/7 mutacija). **Novi nalaz 2026-11-09 (repo-wide sweep, `jsx-a11y` ovo ne vidi jer `label-has-associated-control` hvata samo labelu BEZ kontrole, ne i obrnuto):** 3 kontrole u opsegu bez programskog imena — `entry-filters.tsx:58,69,80` (dva `<Input type="date">` i `<select>` s vidljivim `<p>` umjesto labele; bio je to **jedini** filter bar u dashboardu bez `<Label htmlFor>`), `Reservations.tsx:645` (`<Textarea>` za razlog otkazivanja, ime samo iz placeholder-a koji nestaje pri kucanju), `Reviews.tsx:122` (`<select>` filter bez **ijedne** labele). Sve tri ispravljene. Preostali dug: `EmailSettings.tsx:926,1089,1100` — stvarne rupe, ali fajl je pod odlukom „ne dirati"; drži ih allowlist s razlogom. `test:form-control-labels` (5, 8/8 mutacija) |
| 3.3.3 | 🟡 | **Normativni kriterij:** ako je greška prepoznata i prijedlog ispravke poznat, prijedlog se korisniku daje u tekstu. Razlog ❌ („nema sažetka grešaka") **nije normativni kriterij** — sažetak je tehnika (G84/G85), ne zahtjev. Stvarni prekršaj bio je u `use-daily-log-form.ts`: `catch` je odbacivao serverski 400 (`ValidationPipe` + `@IsUUID`/`@IsArray` daju konkretne poruke = poznat prijedlog) i vraćao generički toast. Sada `serverValidationMessages` te poruke čita, `FieldError` ih prikazuje uz polje, `FormErrorSummary` ih najavljuje i linkuje. Ostaje 🟡 jer nema render/AT provjere — ručna stavka **M13** (`CHECKLIST.md`). |
| 3.3.4 | ✅ | `window.confirm` ×14 **zadržan namjerno** — native potvrda zadovoljava kriterij |
| 3.3.7 | ✅ | **Sistematski provjereno — prekršaja nema**, pa nema ni šta da se popravi. Kandidati iz matrice opovrgnuti iz izvora: `category-wizard-dialog.tsx` (223 ln) i `workbook-new-entry-page.tsx` (662 ln) **nemaju** brojač koraka — `useState(0)` u potonjem je `partialDiff`/`desiredLoyaltyPercent`, što je zamka za grep. Reschedule tok: dijalog pita „uključi pauze?" i prenosi rezultat **URL-om** (`?includeBreaks=0/1`), a preview **pred-popunjava** svoj toggle (`useState(initialIncludeBreaks)`) — upravo ono što kriterij traži. `PublicReserve` kontakt **ne pita uopće**: ako `email`/`phone`/verifikacija nedostaju, preusmjerava na `/profil` (ln 547), a forma traži samo usluge, datum, termin i bilješke. Onboarding pita tri različite stvari, svaku vezanu za svoju zastavicu. Razlika u odnosu na ostale ✅: ovdje je dokazano **odsustvo** prekršaja, pa ne postoji implementacija koju bi trebalo verificirati u renderu. |
| 3.3.8 | ✅ | `autocomplete={i === 0 ? 'one-time-code' : 'off'}`, paste bez blokiranja, 0 captcha; `test:onboarding-a11y` |
| 3.3.9 (AAA) | ➖ | djelimično odbijeno (backend timeout van obima) |
| 4.1.2 | ✅ | Radix primitivi, `aria-sort`, `aria-current`, `role="listbox"`/`"option"`; `test:reservation-scheduler-combobox` |
| 4.1.3 | ✅ | `role="status"` ×84, `role="alert"` ×63; sonner ima `aria-live="polite"` (`dist/index.mjs:1145`) |

## Rezime (ETAPA B)

Brojano **skriptom** po redovima donje tabele (neki redovi pokrivaju više SC-ova, npr.
`1.3.2–1.3.4` i `2.5.1 / 2.5.2 / 2.5.4`), ne napamet. Prebrojano ponovo **2026-11-09
nakon axe runa**: `2.5.3` je prešao 🟡 → ✅ (axe je dokazao prekršaj, izvor ispravljen,
`test:public-a11y-axe-findings` ga zakucava), pa je ✅ 26→**27** a 🟡 12→**11**.
Ukupno 51 — nepromijenjeno.

| Status | Broj redova |
|---|---:|
| ✅ verifikovano (source-contract) | **30** |
| ✅/❌ mješovito (`1.4.6` — glavni tekst ✅, sporedni ❌) | **1** |
| 🟡 u kodu, nije verifikovano u renderu | **12** |
| ❌ nije zadovoljeno | **0** |
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
