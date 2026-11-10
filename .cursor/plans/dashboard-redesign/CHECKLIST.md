# CHECKLIST — Dashboard redesign

Legenda: `[ ]` nije počelo · `[~]` u toku · `[x]` završeno · `[!]` blokirano/čeka odluku

## ETAPA A — Plan

- [x] Pročitani dokumenti iz §0 (`SOURCE_OF_TRUTH.md`, `.cursorrules`, `.cursor/rules/*.mdc`, `docs/audit/FINDINGS.md` A11Y-01 + I18N-01, `docs/codebase-map/FRONTEND.md`, raniji planovi)
- [x] Otvorena i analizirana `docs/refaktor/dashboard-reference.html`
- [x] A1 — audit trenutnog stanja → [`01_phase-audit.md`](01_phase-audit.md)
- [x] A2 — dizajn sistem → [`02_design-system.md`](02_design-system.md)
- [x] A3 — plan po modulima → `03`–`16_phase-*.md`
- [x] WCAG 2.2 matrica → [`../../docs/matrices/dashboard-a11y/MATRIX.md`](../../docs/matrices/dashboard-a11y/MATRIX.md)
- [x] A4 — izlazi: `00_overview`, faze, `CHECKLIST`, `CHANGELOG`, `HANDOFF`
- [x] Baseline izmjeren (build, 142 test skripte, i18n, contrast, hygiene, doc-links)
- [x] **Odobrenje plana + odgovori na Q1–Q7** — odobreno 2026-11-08, Q1–Q7 po preporuci agenta

## ETAPA B — Implementacija (ne počinje bez odobrenja)

| Faza | Modul | Status | Kapija |
|---|---|---|---|
| 0 | Temelj (tokeni, shell, primitivi, šabloni) | `[x]` 4 commita | **STOP poslije — čeka review** |
| 1 | Dashboard (pilot) | `[x]` 2 commita | **STOP poslije — čeka review** |
| 2 | Rezervacije (lista + kalendar) | `[x]` 4 commita (`9a154c6`, `a9d21a8`, `13d976c`, `1d2bfef`) | prošla |
| 3 | Dnevna knjiga | `[x]` 3 commita (`fdaa029`, `5bf5518`, `7eb3d61`) | prošla |
| 4 | Finansije | `[x]` 4 commita (`d801dbb`, `2ba25dd`, `f1f7658`, `55c577d`) | prošla |
| 5 | Lojalnost | `[x]` 1 commit | prošla |
| 6 | Analitika (+ M1 ako odobren) | `[x]` 2 commita (`e81bdd2` a11y, `9e4bdbc` **M1**) | prošla |
| 7 | Korisnici | `[x]` 1 commit | prošla |
| 8 | Salon / Usluge / Frizeri | `[x]` 1 commit | prošla |
| 9 | Sadržaj (Blog, Galerija, Recenzije) | `[x]` 1 commit | prošla |
| 10 | Postavke (+ M2 ako odobren) | `[x]` 3 commita (`ba59834`, `44b0eed`, `56cee86` **M2**) — DoD „`EmailSettings.tsx` < 120 ln" odgođen na fazu 13 | prošla |
| 11 | Stylist portal | `[x]` 4 commita + `a44354a` — 7 stavki plana opovrgnuto/bespredmetno/već zadovoljeno; stvarni nalazi: 4.1.3, 3.3.1, 1.4.3 ×33. **4.1.2 zatvoren 2026-11-09** (`a44354a`) — nalaz o `progressbar` **opovrgnut**, stvarni defekt bio je 5 ikona bez `aria-hidden` + goli brojevi u traci. **DoD verificiran** (mobilna 0 fajlova, API netaknut) | prošla |
| 12 | Onboarding / ForceChangePassword | `[x]` 1 commit — D1/D2/D7 opovrgnuti, D3/D4 zadovoljeni, D9 nije prekršaj; stvarno: **3.3.1/3.3.2** (zahtjev za lozinku) | prošla |
| 13 | Zaključak (globalni prolaz, sweep, docs) | `[x]` 4 commita — **2.1.1+4.1.2** combobox · **1.4.3 ×4** · **D2** dead-code · **D7/D8/D9** docs; Q4 axe instaliran ali **neizvršen** | prošla |

> **`019e58a`** (`fix(dashboard): D9 error stanja + test:daily-log-amount-parity`) nije
> uračunat ni u jednu fazu iznad jer je preduslov koji je dotakao **dvije** faze: D9 u
> `pages/Dashboard.tsx` (faza 1) i `daily-log-amount-parity.test.mjs` (faza 3).

### Napomene uz fazu 4

- **Razbijanje fajlova NIJE rađeno** — `income-book-detail.tsx` (409 ln),
  `expense-book-detail.tsx` (369 ln) i `category-fields-editor.tsx` (298 ln) ostaju cijeli.
  Odgođeno na **fazu 13** uz Playwright/axe, jer testovi čitaju te fajlove po putanji
  (`income-book-detail-i18n.test.mjs`, `expense-book-detail-i18n.test.mjs`,
  `category-fields-a11y.test.mjs`), a čisto strukturna izmjena nema a11y vrijednosti.
- **`MATRIX.md` (finance, client-debts) netaknut** — sve izmjene su prezentacijske
  (tokeni, `scope`, `caption`, `data-label`, semantika liste), a `MATRIX.md` dokumentuje
  poslovnu logiku (statusi, prelazi, dozvole).
- **Javni sajt nije diran** — nijedan od 16 izmijenjenih finance fajlova nije importovan
  izvan `features/finance`, `features/shell`, `features/debtors` ili `pages/Debtors`.

> **Faza 5 — napomene.** Planirane stavke **D2** (ConfirmDialog za adjust/redeem) i **D3**
> (Stat kartice → StatGrid) su **opovrgnute** iz izvora: dijalozi već imaju eksplicitni
> confirm korak + idempotency ključ (3.3.4 zadovoljen), a stat kartica u modulu nema.
> **D5** nije prekršaj — sve `slate-*` vrijednosti prolaze kontrast, a oba `border-slate-200`
> su dekorativna (nije 1.4.11). Stvarni nalaz koji plan nije naveo: **4 `<Label>` bez
> `htmlFor`**. Migracija na `DataTable` **nije** rađena (rizik za paritet podataka); umjesto
> toga `data-table` klasa + `data-label`. Novi test `test:loyalty-a11y` (5 testova,
> mutacijski verificirano).

> **Faza 6 — napomene.** **M1 je prvobitno preskočen pogrešno** (zapisano „Q3 nije odobren"),
> a naknadno **urađen** u `9e4bdbc` — vidi ispravku u napomenama faze 10.
> `/admin/analytics?tab=overview|clients|stylists`; stare rute redirectuju i čuvaju
> `userId` / `stylistId` / `fromDate` / `toDate`. Planirana stavka **D6** (Filteri → FilterBar)
> **opovrgnuta**: date inputi već imaju `<Label htmlFor>`. `text-amber-400` (1.67:1) i
> `text-slate-200` (1.23:1) **nisu prekršaji** — oba su na `<Star aria-hidden="true">` uz
> brojčani ekvivalent. Stvarni nalaz koji plan nije naveo: **1.4.11 progress bar**
> `bg-emerald-500` 2.32:1. Novi test `test:analytics-a11y` (6 testova, mutacijski verificirano).

> **Faza 7 — napomene.** Tri planirane stavke **opovrgnute**: **D4** (`text-slate-400` je na
> `<Search aria-hidden="true">`, dekorativna ikona), **D5** (role badge renderuje
> `getRoleLabel` — tekst postoji, nije samo boja), **D3** djelimično (`role="alert"` postoji,
> pa 3.3.1 nije prekršaj). **D2** (3× `window.confirm`) **nije WCAG prekršaj** — nativni
> dijalog je pristupačan i jeste korak potvrde iz 3.3.4; modul već koristi `ConfirmDialog`
> (ln 1471), pa je to konzistentnost, ne usklađenost. Stvarni prekršaji: **2.4.4/4.1.2**
> generička imena akcija po redu i **1.3.1/1.4.10** tabela bez semantike. Novi test
> `test:users-a11y` (5 testova) uključuje **dva regresiona čuvara za opovrgnute stavke**.

> **Faza 8 — napomene.** Četiri planirane stavke **opovrgnute** iz izvora: **D1** (`Salon.tsx`
> ima 2 `<h1>` u izvoru, ali su u **međusobno isključivim granama** — jedan u ranom return-u
> `if (noSalonExists || !salon)`, drugi u konačnom, pa se renderuje tačno jedan), **D2**
> (3× `window.confirm` — nativni dijalog je pristupačan i jeste korak potvrde iz 3.3.4),
> **D6** (upload već ima native `<input type="file">` + dugme koje ga okida, pa 2.5.7 nije
> prekršaj), a **D9** i **1.4.11** (nijedan od 4 fajla nema rizičnu klasu; oba kandidata su
> dekorativni kontejneri). Stvarni prekršaji: **4.1.2** — 8 `<Switch>` bez ijednog imena
> (Radix `Switch` = `<button role="switch">`, a susjedni `<Label>` nema `htmlFor`), **1.3.1**
> i **1.4.10** — 5 tabela / 27 `<th>` / 0 `scope` / 0 `<caption>` / 0 `data-label`.
> Nalaz koji plan nije naveo: **4 `<Input type="time">` bez imena** u tabelama radnog vremena
> (Salon 2, Stylists 2) — 14 renderovanih kontrola (7 redova × 2) koje bi u card-mode imale
> generičko ime. Novi test `test:salon-services-stylists-a11y` (7 testova) uključuje
> **dva regresona čuvara za opovrgnute D1/D6**; **7/7 mutacija palo**.

> **Faza 9 — napomene.** Pet planiranih stavki **opovrgnuto** iz izvora: **D1** (`Gallery.tsx`
> uopšte **nema tabelu** — grid je, pa `DataTable` neprimjenjiv; blog tabela je u zasebnom
> fajlu), **D2** (5× `window.confirm` je pristupačan i jeste korak potvrde iz 3.3.4),
> **D4** (u modulu **nema nijednog `onDrop`** — oba uploada su već native `<input type="file">`,
> pa 2.5.7 nije prekršaj), **D5** (sve 3 slike već imaju `alt`), **D7** (status badge već nosi
> tekst). **D8/kontrast opovrgnut**: svih 5 kandidata su `<Star>`/`<Check>`/`<MessageSquareText>`
> s `aria-hidden="true"`. **D3 djelimično ispravan** — SEO sekcija jeste vizuelno izdvojena
> (okvir + naslov), pa je migrirana na `FormSection` (`fieldset`/`legend`); `fieldset` za
> ostatak forme nije potreban jer tamo nema vizuelnih sekcija. Stvarni prekršaji: **4.1.2**
> (2 `<Switch>` bez imena), **1.3.1** (6 `<Label>` bez `htmlFor` u Gallery + orphan `<Label>`
> u `ImageUpload`), **1.3.1/1.4.10** (2 tabele / 15 `<th>` / 0 `scope`). Nalaz koji plan nije
> naveo: **1.1.1 `Stars`** — 5 `aria-hidden` ikona, a u **tabeli** nije bilo brojčanog
> ekvivalenta (detaljni panel ga je imao), pa su ćelije ocjena za čitač ekrana bile prazne.
> Novi test `test:admin-content-a11y` (10 testova); **14/14 mutacija palo**.

> **🔴 REGRESIJA iz faze 6 — React #310 na `/admin/analytics` (ispravljeno).** U `87eeabc`
> sam dodao `const chartSummary = useMemo(…)` **ispod** postojećih `if (loading) return` /
> `if (!data) return`, pa je broj hookova rastao između rendera i React je bacao #310
> („Rendered more hooks than during the previous render"). Rušilo se pri svakom učitavanju.
> Prošlo je jer svi testovi čitaju **izvor**, `tsc` ne provjerava pravila hookova, a ESLint
> (`react-hooks/rules-of-hooks`) **nije konfigurisan**. Novi čuvar `test:hooks-order`
> pokriva **cijeli `src/`** (54 komponente, 0 prekršaja nakon ispravke, 3/3 mutacije padaju).

> **Faza 13 — napomene (u toku).** Jedini **tvrd** prekršaj nađen u fazi 13: izbor usluge u
> `ReservationScheduler` bio je dostupan samo mišem (`<li onClick>` bez `tabIndex`/`onKeyDown`/
> `role`) → tastaturni korisnik je mogao kucati ali **ne i izabrati**; alternativni put ne
> postoji (`:1116` uklanja već izabranu uslugu). Ispravljeno po `daily-log` obrascu.
> **`window.confirm` ×14 NIJE prekršaj** (svih 14 koristi `t(...)`, a to je potvrda = 3.3.4),
> pa `test:no-window-confirm` iz plana §7 **nije** uveden — bio bi čist churn.

> **🔴 Popravka nakon povratne informacije vlasnika.** `npm run test:a11y-routes` pao je s
> `Timed out waiting 180000ms from config.webServer`. Uzrok **izmjeren**: `vite preview` se
> bez `--host` veže na IPv6 `::1`, a Playwright `localhost` razriješi na IPv4 `127.0.0.1`
> (curl: `127.0.0.1` → **000**, `localhost` → 200). Ispravljeno na `--host 127.0.0.1` +
> `url: 'http://127.0.0.1:10000'`; poslije toga „Timed out waiting" = **0** i run traje ~8 s
> umjesto 180. Drugi uzrok istog simptoma (nedostaje `dist/`) sada staje odmah s jasnom
> porukom umjesto da čeka 180 s.

> **Faza 13 — ZATVORENA, ali bez rendered dokaza.** Q4 (`@axe-core/playwright` +
> `@playwright/test`) je **instaliran** i `npx playwright test --list` nabroji 11 testova uz
> čiste tipove, ali browser binarni fajl se **ne može preuzeti** u sandboxu, pa
> `test:a11y-routes` **nije izvršen** i **nije** CI gate — sve što ovisi o renderu ostaje 🟡.
> Konačna matrica: **51 red** = 26 ✅ · 1 ✅/❌ · 12 🟡 · 4 ❌ · 7 ➖ · 1 ➖/⚠️ (brojeve je
> izbrojala skripta; prva verzija rezimea tvrdila je 28/14/3/11 i bila je **pogrešna**).
> **Nije urađeno namjerno:** `test:no-window-confirm` (native `confirm` nije prekršaj, a
> doprinosi 3.3.4) i razbijanje `EmailSettings.tsx` (testovi ga čitaju po putanji).
> **Novi nalaz u `HANDOFF.md` (D10, bez tihog popravljanja):** 15 mjesta koristi
> `toFixed(2) + ' KM'` umjesto `formatLocalizedAmount` → miješani format i `"NaN KM"`.

> **🔴 Iznad stoji „ZATVORENA, ali bez rendered dokaza" — to više NE važi (2026-11-09).**
> Vlasnik je instalirao browser i `npm run test:a11y-routes` se **stvarno izvršio**:
> 11 testova, **3 prošla / 8 palo** (24.6 s). Prvi rendered dokaz u projektu, i odmah je
> našao 4 stvarne stvari koje source-contract **nije** vidio:
> `label-content-name-mismatch` (2.5.3, **6 ruta**), `image-alt` (**critical**, 1.1.1,
> `/register`), `color-contrast` ×2 (1.4.3, `/kontakt`) i `2.4.1` skip-link (prvi Tab na
> logo). Sve četiri su ispravljene u izvoru i zakucane novim testom
> `test:public-a11y-axe-findings` (4 testa, **9/9** mutacija pada).
>
> **Brojevi u gornjoj napomeni su zastarjeli.** Matrica je sada
> **27 ✅ · 1 ✅/❌ · 11 🟡 · 4 ❌ · 7 ➖ · 1 ➖/⚠️ = 51** (2.5.3 prešao 🟡 → ✅).
> Prebrojano **skriptom** po redovima, ne napamet.
>
> **Ispravljene dvije moje pogrešne bilješke o brojevima** (izmjereno 2026-11-09):
> i18n ima **2650** leaf ključeva po jeziku (`check_i18n.py --strict`, a ne 2634 kako sam
> bilježio; locale fajlovi nisu dirani od `3624e72`), a `focus-visible` ima **163**
> pojavljivanja na **46** linija (bilježio sam 162).
>
> **Najvažnija lekcija faze 13:** moj D3 sweep kontrasta računao je prema **bijeloj**
> pozadini, pa `text-slate-500` na `bg-slate-200` (3.86:1) **nije mogao** uhvatiti. Sweep
> je proširen parovima „tekst i pozadina na istom elementu" (49 parova, granica 40), što je
> otkrilo i prekršaj van axe izvještaja: `media-consent-panel.tsx:195,265`
> `text-slate-400` na `bg-slate-100` = **2.34:1** na ikoni s `aria-label` (1.4.11).
> **Source-level sweep nije zamjena za rendered provjeru.**
>
> **DoD t. 64 („javni sajt bez diff-a") je u sukobu s ovim nalazima** → odluke vlasnika
> **Q8** (zadržati `text-slate-600` na `/kontakt`, jedina vidljiva izmjena boje) i
> **Q9** (zadržati `<SkipLink />` u `features/shell/public/`, 0 vidljivih izmjena),
> zabilježene u `00_overview.md` §7b. `features/blog/` i `mobile/` = **0 diff** (provjereno
> `git diff --stat`).
>
> **✅ Re-run potvrđen (2026-11-09, kasnije istog dana): svih 11 testova prolazi** (prije
> ispravki 3/11). Sve četiri ispravke su sada dokazane **rendered** provjerom, ne samo
> source-contract ugovorom. *(Vlasnikova opservacija na njegovoj mašini; agent nema browser
> i nije je mogao nezavisno ponoviti u sandboxu.)*
>
> **A11Y-01 ostaje otvoren** zbog onoga što axe **nije** vidio: backend nije bio podignut
> (stranice u praznom stanju, `ECONNREFUSED 127.0.0.1:10001`), a `/admin/**` — najveći dio
> redizajna — nije bio pokriven.
>
> **`/admin/**` harness je napisan 2026-11-09, ali NIJE izvršen.** Dodati `e2e/auth.setup.ts`
> (login → `storageState`) i `e2e/a11y-admin.spec.ts` (axe nad 14 ruta + `2.4.1`), ukupno
> **38 testova** po `npx playwright test --list` (chromium 11 + setup 2 + admin 18 +
> stylist 11). Naknadno su nađene **dvije rupe u prvoj verziji harnessa**: `/stylist/**`
> (8 ruta) uopšte nije bio pokriven, a `/admin/reservations/calendar` je propušten jer je
> definisan u `app/router.tsx:133`, ne u `admin.routes.tsx`. `/stylist/**` treba **zaseban
> storageState i zasebnu asertiju**: `StylistRoute` bez uloge redirektuje na `/`, NE na
> `/login`, pa kopirana admin asertija ne bi uhvatila neuspjeh (axe bi izmjerio naslovnu
> i javio lažni prolaz).
> Bez backend-a/kredencijala se glasno
> preskaču. Agent nema ni browser ni backend, pa admin statusi ostaju 🟡 do prvog runa.
>
> **🔴 Usput nađene dvije stvarne greške:** (1) `chromium` projekt nije imao `testIgnore`, pa
> je pokretao admin testove **bez** `storageState` — izmjereno 26 testova umjesto 11;
> (2) `frontend/tsconfig.json` ima `include:['src']`, pa `e2e/` **nije bio pokriven nijednom
> provjerom tipova** (`tsc --listFiles | grep -c e2e/` = **0**) — moji raniji „tsc exit: 0"
> za e2e fajlove nisu provjerili ništa. Dodato `tsconfig.e2e.json` + `typecheck:e2e` + CI
> korak, s negativnom kontrolom (mutacija daje 2 greške, exit 2).

> **Faza 13, D3 — napomene.** Plan je tražio „grep sirovih boja → allowlist", ali sirova
> klasa **nije** prekršaj ako kontrast prolazi (883 svjetle upotrebe), pa je to zamijenjeno
> **mjerenjem kontrasta**: od 883 samo **4** su stvarni prekršaji (`amber-600` 3.19:1 ×1,
> `emerald-600` 3.77:1 ×3 na `bg-white`), a 27 je obrazloženo (ikone s pragom 3:1,
> zvjezdice, tekst na tamnoj pozadini). Novi test `test:text-contrast-allowlist` mjeri
> **bijelu** površinu — test iz faze 11 mjerio je tamnu, koja se ne prikazuje, pa ova
> četiri prekršaja **nije** mogao uhvatiti.

> **Faza 13, D2 — napomene.** `ui/tooltip.tsx` zaista ima **0** importova (moj prvi grep je
> našao 1 pogodak, ali to je **recharts** `<Tooltip>`, ne shadcn) → obrisan, a s njim i
> `@radix-ui/react-tooltip`. Od 42 „nekorištena" i18n ključa **samo 16** je sigurno mrtvo:
> 18 su plurale, 8 se gradi dinamički. **Ključna zamka:** `emailSettings.campaigns.addTitle`
> /`addText`/`addButton`/`addSpacer` su **živi** (`email-visual-editor.tsx:122` gradi ključ
> iz `type`), pa bi ih naivni detektor obrisao i slomio email editor.

> **Faza 12 — napomene.** Plan je i ovdje bio većinom netačan: **D1** (`<h1>` „nedostaje")
> opovrgnut jer `OnboardingShell:140` bezuvjetno renderuje `<h1>{title}</h1>` — **isti
> obrazac** kao moja pogrešna tvrdnja iz faze 11, ovaj put uhvaćen jer je komponenta
> provjerena prije tvrdnje. **D2** (`one-time-code`) i **D7** (`role="alert"`) opovrgnuti
> (sonner već ima `aria-live="polite"`); **D3/D4** zadovoljeni (paste radi, nema captche);
> **D9** nije prekršaj (svi `slate-*` prolaze na svjetloj, a tamna tema se ne aktivira).
> Stvarno: **3.3.1/3.3.2** — zahtjev „6 znakova" bio je samo `minLength` + toast nakon
> greške; dodat `aria-describedby` + vidljiv `<p>`.

> **Faza 11 — napomene (u toku).** Plan je ovdje bio **najmanje tačan** do sada: od 10
> stavki **5 je opovrgnuto** (D1 već urađen u fazi 0; D3 dijalozi već imaju `DialogTitle` +
> `DialogDescription`; D4 klijent/usluga se traže jednom; D6 search ikone su `aria-hidden`;
> D7 `AccessibleCalendar` **ne postoji**, a schedule ni ne koristi kalendar), **D10 je već
> zadovoljen** (`size="sm"` = `h-9` = 36 px ≥ 24 px), a **D5 je stvaran samo na 1 od 4
> mjesta i to kao 4.1.3**, ne 1.4.3. Stvarni nalazi koje plan nije naveo: **4.1.3** upload
> status i dva errora bez `role="alert"`, te **1.4.3** `text-rose-600` (3.80:1 u tamnoj temi).
> Sweep od 12 `type="file"` inputa (5 s `display:none`) **nije** dao 2.1.1 prekršaj — za
> svih 5 postoji fokusabilno dugme koje ih aktivira.
> **D2 je bespredmetan** — u stylist portalu nema nijedne `<table>` ni stat kartica.
> **Sweep imena kontrola (4.1.2):** 27 `<Input>`/`<Textarea>`, **1** bez imena
> (`workbook-reschedule-preview-page:212` orphan `<Label>` + `<Input>` bez `id`) — ispravljeno.
> **🔴 ISPRAVKA — „1.4.3 u tamnoj temi" je bila pogrešna kvalifikacija.** `text-slate-500`
> ×32 sam zamijenio s `text-content-muted` tvrdeći da je to 1.4.3 prekršaj u tamnoj temi.
> **Tamna tema se u ovoj aplikaciji ne može aktivirati**: `darkMode: ['class']`, a `.dark`
> klasu **niko ne postavlja** (nema je u `index.html`, nema `classList`/`ThemeProvider`/
> `setTheme` u `src/`). Na svjetloj je `slate-500` = 4.76:1 → **PASS**. Zamjena ostaje
> valjana kao **konzistentnost** (5.61:1, semantički token), ne kao ispravka prekršaja.
> **Odgođeno na fazu 13:** `FormSection`/`<fieldset>` (mijenja vizuelni izgled, treba nove
> i18n ključeve za `<legend>`) i D10 reflow — bez browsera se ne mogu verificirati.
>
> **Ažurirano 2026-11-09 — `FormSection`/`<fieldset>` RIJEŠENO, D10 i dalje otvoren.**
> Obje zamjerke su zaobiđene, ne ignorisane: `FormSection` **nije** upotrijebljen jer
> renderuje vidljiv okvir + `<legend>`, a stranica već ima `Card` kutije. Semantika grupe
> (`role="group"` + `aria-labelledby`) je ono što 1.3.1 traži — `fieldset` je samo jedna od
> tehnika. Naziv grupe za plaćanje je u `<span className="sr-only">` (`sr-only` je potvrđen
> u buildovanom CSS-u, `dist/assets/index-*.css`), a loyalty grupa je vezana na **postojeći
> vidljivi naslov**, pa nije dodan nijedan novi vidljivi element. Novi i18n ključ je jedan
> (`stylistWorkbook.newEntry.paymentSection`, u oba locale-a).
> `test:workbook-form-groups-a11y` (8 testova, 10/10 mutacija).

> **Faza 10 — napomene.** A11y dio završen u 2 commita; **M2 (D11) urađen** u `56cee86`
> (`/admin/settings?tab=site|operations|appearance|seo|email|notifications|releases`,
> 6 starih ruta → `TabRedirect`) — vidi ispravku ispod. Pet planiranih stavki **opovrgnuto**: **D4**
> (pretraga postavki već ima `role="status" aria-live="polite"` na ln 75/85/102 i
> `aria-controls`), **D5** (`window.confirm` nije prekršaj), **D6** (vizuelni email editor
> **već ima** moveUp/moveDown dugmad s `aria-label` pored `draggable` blokova → 2.5.7
> zadovoljen), **D10** (APK upload je već native input s `<Label htmlFor="apk">`, 0 `onDrop`),
> a **D1/D2 NISU prekršaji** — izmjereni parovi prolaze (`text-#49332d`/`bg-#fffaf6` = 11.29:1,
> `ring-#9b735f` = 4.19:1 ≥ 3.0 za 1.4.11); razlog zamjene je konzistentnost identiteta.
> **D3 jeste stvaran** (2.56:1 → 5.61:1). Nalaz koji plan nije naveo: **`<Label>` uz `<pre>`**
> (`htmlPreviewSource`) — `<pre>` nije labelabilan element, pa label nije imenovao ništa.
> `<h1>` u `settings-shell.tsx` **namjerno netaknut** (ima test ugovor i nije smeđi, 17:1).
>
> **🔴 ISPRAVKA — M1 je preskočen pogrešno.** U fazi 6 sam zapisao „M1 nije odobren,
> preskočen". To je **netačno**: `00_overview.md` §7 kaže „ODLUČENO 2026-11-08, vlasnik:
> postupi po svojoj preporuci", a **Q3 glasi „M1 i M2 ODOBRENI"**, dok **Q7** izričito nalaže
> da `client-analytics`/`stylist-analytics` „postaju tabovi unutar `/admin/analytics`, stare
> rute redirectuju". Dakle **M1 (faza 6) i M2 (faza 10) su oba odobrena i oba neurađena**.
>
> **RIJEŠENO 2026-11-08** — M2 u `56cee86`, M1 u `9e4bdbc`. Oba čuvaju stare URL-ove preko
> `<Navigate replace>` i postojeće query parametre (`userId`, `stylistId`, `fromDate`,
> `toDate`, `tab`). Moduli **ostaju** u `pages/` jer ih 13 testova čita po putanji; hub-ovi
> su **novi** fajlovi (`SettingsHub.tsx`, `AnalyticsHub.tsx`). Nuspojava uhvaćena i
> ispravljena: `dashboardTitleKey` je gledao samo `pathname`, pa bi svi tabovi dijelili
> generički naslov dokumenta (regresija **2.4.2**, ispravljeno u `9e4bdbc`).

> **`jsx-a11y` s `warn` na `error` — odgođena stavka ZATVORENA (2026-11-09).**
> Precizno stanje prije izmjene (izmjereno, ne pretpostavljeno): `plugin:jsx-a11y/recommended`
> drži **31 od 34** pravila na `error`, a `.eslintrc.cjs` je **13** lokalno snizio na `warn`.
> Dakle 21 pravilo je već bilo blokirajuće i davalo 0 nalaza — „prebacivanje na error" znači
> uklanjanje tih 13 sniženja, a ne uključivanje plugina. Rezultat: **0 errors / 7 warnings**
> (svih 7 je `react-hooks/exhaustive-deps`, namjerno warn).
> Dva lažno pozitivna obrasca riješena su **bez** gašenja ijednog pravila:
> `label-has-associated-control` je dobila `depth: 4` (default 2 ne doseže tekst u dva nivoa
> `<span>`), a 4 combobox/`stopPropagation` nalaza idu preko scoped disable-a s dokazom — jer
> schema plugina v6.10.2 za `click-events-have-key-events` **nema nijednu opciju**, pa se
> `role="option"` ne može allowlist-ati. Čuva ih guard `test:eslint-a11y-severity`
> (7 testova, **7/7** mutacija pada).
>
> **🔴 Tri greške uhvaćene u vlastitom radu tokom ove izmjene:**
> (1) `//` komentar ubačen u **JSX children** nije komentar nego **vidljivi tekst** —
> `Services.tsx` bi iscrtavao 4 linije obrazloženja. Dokazano esbuild transformacijom: `//`
> linija ostaje string u izlazu, `{/* … */}` se uklanja. Popravljeno, pa AST provjerom kroz
> **10.228** `JsxText` čvorova u cijelom `src/` potvrđeno da nijedan više ne sadrži `//`.
> (2) Prva verzija guard testa **vakuumski je prolazila**: `calculateConfigForFile` vraća nivoe
> kao string `'error'`, pa je `nivo !== OFF` bilo istinito za svaki string i `continue` tiho
> preskakao asertaciju. Normalizator sada **baca** na nepoznatom nivou.
> (3) Upravo je to bacanje otkrilo treću grešku — u listu pravila upisao sam nepostojeće
> `img-redundant-roles` (spojeno od `img-redundant-alt` i `no-redundant-roles`). Test sada
> provjerava i da svako ime postoji u pluginu.

### Napomene uz WCAG 3.3.3 (2026-11-09)

- [x] Normativni kriterij pročitan **prije** implementacije: 3.3.3 traži da se *poznat
      prijedlog ispravke* dostavi **u tekstu**. Razlog ❌ u matrici („nema sažetka grešaka")
      **nije normativni kriterij** — sažetak je tehnika G84/G85.
- [x] Prekršaj dokazan iz izvora: `use-daily-log-form.ts` `catch` je odbacivao serverski 400
      (`ValidationPipe` + `@IsUUID`/`@IsArray` → konkretne poruke po polju).
- [x] Implementacija: `field-error.tsx`, `server-error-messages.ts`, `field-ids.ts` +
      4 postojeća fajla. **Nove boje nisu uvodene** (samo etablirane `rose` klase).
- [x] Test `test:form-error-suggestion` (15) registrovan u `frontend/package.json` **i**
      `.github/workflows/ci.yml` (posao `frontend`, ne `a11y-e2e`).
- [x] Mutacijska provjera **22/22**.
- [x] Kapije: 174/174 testova, `tsc` exit 0, `typecheck:e2e` exit 0, build 273.9 KiB,
      lint 0 errors, `check_i18n --strict`, `check_ui_contrast --strict` (80 parova),
      `check_repo_hygiene`, `check_doc_links`, `git diff --check` — sve PASS.
- [ ] **M13 (ručno)** — bez ovoga 3.3.3 ostaje 🟡. Automatizovani alati ne mogu procijeniti
      da li tekst zaista predlaže ispravku.
- [ ] **Nije rađeno:** ostale forme s toast-only greškama. `Register.tsx` (ln 60, 93) ima isti
      obrazac, ali je Q2 stavio Login/Register/ResetPassword/Profile **van** redizajna.
- [ ] **Nije rađeno:** usklađivanje tri međusobno nekonzistentne tabele/brojača u
      `dashboard-a11y/MATRIX.md` (vidi CHANGELOG od 2026-11-09). Zaseban posao.

### Napomene uz WCAG 3.3.7 (2026-11-09)

- [x] **Sistematska provjera izvršena — prekršaja nema.** Kandidati iz matrice opovrgnuti:
      `category-wizard-dialog.tsx` i `workbook-new-entry-page.tsx` su jednostranačne forme.
- [x] Reschedule tok pred-popunjava preko URL-a (`?includeBreaks=`), javna rezervacija ne pita
      kontakt koji već ima (`PublicReserve.tsx:547`), onboarding pita tri različite stvari.
- [x] Test `test:redundant-entry-a11y` (9) registrovan u `frontend/package.json` **i** `ci.yml`.
- [x] Mutacijska provjera **13/13** (dvije mutacije su prvo promašene i otkrile rupe u testu).
- [ ] **Otvoreno, nije 3.3.7:** `PublicReserve.tsx:804-826` — `role="progressbar"` najavljuje
      „korak X od 4" nad formom koja je jedna skrolajuća stranica. Kandidat za **4.1.2**.
      Nije dirano jer je u `src/pages/public/` (javni sajt se ne mijenja bez odobrenja).
- [ ] **Ograničenje:** provjera je iz izvora; ne pokriva putanje koje grep ne vidi
      (navigacija naprijed-nazad, keš, back dugme).

### Napomene uz `DataTable` migraciju i `EmailSettings` (2026-11-09)

- [x] **`EmailSettings.tsx` ostaje 1381 ln — odluka vlasnika.** Sukob s politikom koju
      repo **sam testira** (`settings-hub-redirect.test.mjs`: „moduli ostaju u svojim
      fajlovima jer ih testovi čita po putanji"). Uz to `admin-settings-controls-a11y`
      asertuje tačno 29 `<Label>`, a `email-visual-editor` tačno 2 `<EmailVisualEditor`.
      Performansijski razlog je već riješen (`SettingsHub.tsx:26` → `lazy()`).
- [x] **Migracija tabela na `DataTable` — mjerenje pa odluka vlasnika.** Izmjereno: 14 od 17
      fajlova s `<table>` već ima `<caption>` + `scope="col"`, pa je a11y dobitak nula; cilj je
      **održavanje i konzistentnost**. Vlasnik je masovnu migraciju **odobrio**
      („možeš krenuti sa masovnom implementacijom DataTable") uz direktivu da je konzistentnost
      na dashboardima obavezna. Migrirano **7/7** čistih kandidata: `Loyalty`, `expense-table`,
      `income-entries-table`, `Notifications`, `Salon` (×2), `Services`, `Users`.
      **8 fajlova se ne može migrirati** (`colSpan`/`rowSpan`/`<tfoot>` — `DataTable` ih ne
      podržava): `blog-posts-table`, `daily-log/entry-table`, `Reservations`, `Reviews`,
      `Stylists`, `ClientAnalytics`, `Analytics`, `expense-invoice-preview`.
- [x] **Jedina stvarna rupa popravljena:** `pages/StylistAnalytics.tsx` — 7 `<th>` bez
      `scope`, 2 tabele bez imena, uz vidljive `<h2>` odmah iznad. Dodato `scope="col"` +
      `aria-labelledby` na postojeće naslove. **Nula vidljivih promjena**, `DataTable` nije
      upotrijebljen jer bi promijenio izgled. `test:stylist-analytics-tables-a11y`
      (5 testova, 8/8 mutacija).
- [x] **Napomena o mjerenju (ispravljeno 2026-11-09):** `grep -c '<th'` vraća 9 za taj fajl jer
      pogodi i `<thead>`. Stvarno je 7 `<th>`. **Ni `grep -o '<th[^>]*>'` nije ispravno** — i ono
      hvata `<thead>` (`<th` + `ead>`), pa lažno uvećava za broj tabela. Ova greška je dala pogrešne
      brojeve za `font-medium` (Loyalty 8/7 umjesto 7/7) prije nego je uhvaćena. Ispravan obrazac:
      `<th(?=[\s>])[^>]*>` ili `re.compile(r'<th(?=[\s>])[^>]*>')` u pythonu.

### Ispravka: `font-medium` na `<th>` (2026-11-09)

- [x] **Tvrdnja „migracija skida `font-medium` s `<th>`" bila je NETAČNA.** `src/index.css:16-18`
      ima `table.app-table th { @apply font-medium text-slate-500; }`, specifičnost **(0,1,2)**,
      što pobjeđuje svaku utility klasu **(0,1,0)** — bez obzira na redoslijed Tailwind slojeva.
      `DataTable` uvijek renderuje `app-table`, pa je `font-medium` na `<th>` neizbježan.
      Suvišni `cn()` default je uklonjen; test sada asertuje CSS pravilo.
      **Pouka:** prisustvo klase u markupu nije dokaz da je potrebna — provjeriti i CSS slojeve
      i specifičnost prije nego se proglasi regresija.
- [x] **Regresija u `Loyalty` (`text-xs uppercase text-slate-500`) bila je STVARNA** — ta klasa
      je stajala na `<thead><tr>` i nasljeđivala se, a **nema je nigdje u CSS-u** za `app-table`
      (`grep -n "uppercase\|text-xs" src/index.css src/styles/globals.css` → 0 rezultata).

### Serija zatvaranja ❌ stavki (2026-11-09)

Poslije faze 13 matrica je imala **4 ❌**. Sva četiri su zatvorena; broj ❌ je sada **0**,
✅ je **30**, 🟡 **12**, ukupno **51** (`MATRIX.md` §Rezime). Redoslijed je birao vlasnik.

| SC | Commit | Ishod | Test (izmjereno) |
|---|---|---|---|
| 3.3.3 | `78f2003` | Razlog ❌ („nema sažetka grešaka") **nije normativni kriterij**. Stvarni prekršaj: `use-daily-log-form.ts` je odbacivao serverski 400. Ostaje **🟡** — ručna stavka **M13** | `test:form-error-suggestion` **15/15** |
| 3.3.7 | `d0e80d7` | **Nalaz opovrgnut** — oba matricina kandidata su jednostranačne forme; `useState(0)` u `workbook-new-entry-page` je `partialDiff`. Pred-popunjavanje **nije** prekršaj | `test:redundant-entry-a11y` **9/9** |
| 1.3.1 | `877d324`, `6b733c0` | Grupisanje riješeno **bez** `FormSection` (vidljiva regresija): `role="group"` + `aria-labelledby` na postojećem `Card`. Plus 7 `scope="col"` u `StylistAnalytics` | `test:workbook-form-groups-a11y` **8/8** · `test:stylist-analytics-tables-a11y` **5/5** |
| 3.2.6 | — | **Nalaz opovrgnut**: oba shell-a već imaju `/kontakt` na istom mjestu (`admin-layout.tsx:154`, `layouts/StylistLayout.tsx:101`) | `test:shell-a11y` **7/7** |
| 3.1.2 | `3ad3a5b` | Šema + migracija + DTO + servis + `blogPostLang()` + `<select>` u admin formi. 🔴 **migracija nije izvršena nad bazom** — prolaz mora potvrditi CI | `test:blog-language-a11y` **6/6** · backend `jest src/blog/` **20/20** |
| D10 | `213ffe3` | `formatLocalizedAmount` na 8 mjesta; preostalih 9 `toFixed(2)` je namjerno (6 CSV, 2 input, 1 komentar) | `test:amount-format-consistency` **4/4** |
| 4.1.2 | `a44354a` | **Nalaz opovrgnut** (`step` se postavlja uz iste uslove koji otkrivaju sadržaj; `selectedServiceIds` je izveden iz `selectedServices`). Stvarno: 5 ikona bez `aria-hidden` + goli brojevi `1 2 3 4` u traci | `test:public-reservation-accessibility` **9/9** |

**Metodološka pouka koja se ponovila 4×** (3.3.7, 3.2.6, 4.1.2, D10): matrica i `HANDOFF.md`
nisu mjerenje. Svaki defekt se izvede iz izvora i asertuje **prije** nego se prihvati kao
prekršaj — tri od četiri nalaza iz ove serije nisu stajala.

### Kapije na kraju serije (izmjereno, ne prepisano)

`test:*` **180/180** skripti (**682** pojedinačna testa) · `tsc --noEmit` exit **0** ·
lint **0 errors / 7 warnings** · build **274.1 KiB**/300 · `check_ui_contrast --strict`
**80/80** · `check_i18n --strict` **2654** leaf ključeva po jeziku, 0 razlika ·
`check_repo_hygiene` **1709** putanja · `check_doc_links` **670/202** ·
`check_ci_index` **360/363** · `mobile/` **0** dirnutih fajlova.

**Neizvršeno i zašto:** rendered axe (`test:a11y-routes`, `a11y-admin.spec.ts`) i sve ručne
stavke M1–M13 — nema preglednika, baze ni čitača ekrana. `continue-on-error` na axe koraku
u poslu `a11y-e2e` **ostaje** dok CI ne da potvrđen zeleni run.

### i18n guard proširen: mape i predlošci (2026-11-10)

Vlasnikova kapija „svaki ključ korišten u kodu mora postojati u oba jezika" (`2c7d4ce`)
vidjela je ključeve samo tamo gdje stoje kao `t('literal')`. Izmjereno su postojala **još
dva** načina prijenosa koja nijedan test nije pokrivao.

- [x] **Pretpostavka „ima hardkodiranih vidljivih stringova" — provjerena i opovrgnuta.**
      Regex sken je dao 158 „pogodaka", gotovo svi lažni (`>` u genericima `.ts` fajlova;
      `//` unutar `"https://…"` desinhronizuje štitač za komentare). Prepisano na
      **TypeScript AST**. Stvarno: **46** hardkodiranih bosanskih stringova, i **nijedan nije
      živ defekt** — `reservations/status.ts` je samo `defaultValue` uz `t()`; `groups-*.ts`
      prevede sve četiri stranice prije renderovanja (**0 praznina**, 16 grupa / 107 polja);
      `EXISTING_TEMPLATE_TYPES[].label` je mrtav podatak (`EmailSettings.tsx:1038` renderuje
      `t(…)`, ne `item.label`).
- [x] **Rupa 1 — ključevi u mapama.** Dokazano mutacijom: `seo_default_title` u
      `SettingsSeo.tsx:18` → nepostojeći ključ prošao je kroz **svih 13** settings-testova
      **i** kroz sva 4 postojeća testa (`exit 0` svugdje). Uzrok: sakupljač
      `/\bt\('([^']+)'/g` (`admin-settings-seo-i18n.test.mjs:18`) ne vidi vrijednost u mapi.
- [x] **Rupa 2 — dinamički ključevi iz predloška** (`` t(`a.b.${x}`) ``): 34 poziva, 20
      različitih roditelja, 0 propusta — ali ništa ih nije asertovalo.
- [x] **Rješenje: test 5 i test 6 u postojećem `i18n-key-resolution.test.mjs`** (nije dodan
      novi skript, pa registracija u `package.json` i `ci.yml` već važi; `check_ci_index`
      ostaje **363/366**). Test 5 pokriva **2449** literala s imenskim prostorom; jedini
      nerasriješeni je `salon.timezone` (identifikator backend postavke) u allowlist-u
      `NOT_I18N_LITERALS` koji **mora ostati tačno taj skup**. Test 6 asertuje roditelja
      svakog dinamičkog ključa.
- [x] **Mutacije 6/6** (M1 pokvaren ključ u mapi · M2 allowlist ispraznjen · M3 allowlist
      preširok · M4 pokvaren prefiks · M5 pohlepni umjesto lijenog regexa · M6 nova
      nerasriješena vrijednost). Backup u `/tmp/mbk/`, vraćeno, `filecmp.cmp` potvrđuje.
- [x] **Usaglašeno uz odobrenje vlasnika (2026-11-10):** štit nad mapom kopirnih ključeva
      sada je identičan u sve četiri stranice — `Settings.tsx:143`,
      `SettingsOperations.tsx:39`, `SettingsAppearance.tsx:33`, `SettingsSeo.tsx:44`.
      **Ispravka vlastite formulacije:** `TypeError` vrijedi samo za putanju *grupe*
      (`t(copyKeys.label)` na `undefined`); za putanju *polja* izmjereno je da
      `t(undefined)` **ne baca** nego vraća **`''`** → prazna labeta, što je tiše i gore za AT.
      Tu rupu je imao i `Settings.tsx`, pa je zatvorena u sve četiri
      (`…(fieldKey ? { label: t(fieldKey) } : {})`, pada na `def.label ?? def.desc`).
      Novo: **test 7** u `i18n-key-resolution.test.mjs` (oblik štita na jednom mjestu,
      **7/7**), **7 asertacija pojačano** u 6 postojećih skripti, mutacije **6/6**.
      Kapije: **183/183** skripti, **703** testa, `tsc` 0, build 274.3 KiB.
- [ ] **Ograničenje:** provjera je iz izvora — dokazuje da ključ postoji u oba jezika, ne da
      ga i18next zaista ispiše u pregledniku.

### Rendered axe bez preglednika — `test:axe-render-a11y` (2026-11-10, odobrio vlasnik)

- [x] **`jsdom@^31.0.0` dodan kao devDependency** (vlasnik: „Da — dodaj jsdom + trajni test").
      Q4 je odobravao tri paketa; `jsdom` nije bio među njima, pa je odluka tražena, ne
      donesena tiho.
- [x] **Izdvojen `render-harness.mjs`** iz `render-smoke.test.mjs` (510 → 90 linija) jer dva
      testa trebaju isti esbuild bundle. Sigurnost izdvajanja izmjerena **prije** izmjene:
      fajl nijedan test ne čita po putanji. `test:admin-render-smoke` i dalje **42/42**.
- [x] **Novi test (5 testova)** pokreće pravi `axe-core@4.14.0` nad `renderToStaticMarkup`
      markupom: **35 scenarija, 0 prekršaja**, uz kontrole da axe nije radio prazno.
- [x] **Fixture popravljen, nalaz nije sakriven** — `<FormSection><input /></FormSection>` je
      davao `label [critical]`; umjesto allowlist-a fixture je dobio `<label htmlFor>` +
      `<input id>`, pa je asertacija „0 prekršaja" bez izuzetaka.
- [x] **Vlastita netačna tvrdnja ispravljena mjerenjem:** komentari su tvrdili da omotač
      `<html lang="bs">` čini da `html-has-lang`/`landmark-one-main` prolaze. Izmjereno: uz
      scope `body` ta pravila su **inapplicable** — ne evaluiraju se uopšte. Test 4 tu granicu
      sada asertuje. `<main>` u omotaču **je** nužan (bez njega `region` pada na svakoj
      komponenti — izmjereno).
- [x] **Mutacije 6/6**, uključujući A2 koja je stvarna produktna regresija
      (`aria-sort="asc"` umjesto `"ascending"` u `data-table.tsx`).
- [ ] **Ne pokriva:** kontrast, 2.5.3, 2.5.8, 1.4.10, 1.4.12, 2.4.3 (treba raspored),
      dokument-nivo pravila, `/admin/**` rute i stanje s podacima. `@axe-core/playwright`
      i dalje neizvršen.

### API-greška → i18n: ugovor „tačna bosanska poruka" zaključan (2026-11-10)

`frontend/src/app/api-error-keys-i18n.test.mjs` — skripta `test:api-error-keys-i18n`,
korak u `ci.yml` odmah poslije `test:i18n-key-resolution`.

- [x] **Izmjereno prije izmjena:** backend **0** pogodaka za `nestjs-i18n` / `I18nService` /
      `Accept-Language` / `errorCode`; `backend/src/i18n/constants.ts` postoji ali je **mrtav
      kod** (0 uvoznika, samo BS). **429** `…Exception(...)` poziva s literalnom porukom,
      **413** bosanskih, **191** različitih.
- [x] **Rupa dokazana, ne pretpostavljena:** u 5 postojećih testova tih modula **0** pogodaka
      za `locales/bs.json`; dva modula vraćaju **kratke** ključeve bez imenskog prostora
      (`errorSlotUnavailable`), pa ih `test:i18n-key-resolution` ne vidi.
- [x] **Test 1 — drift:** svih **64** poruke postoji doslovno u `backend/src` (314 fajlova);
      pozitivna kontrola da korpus > 500 000 znakova (prazan korpus bi „prošao").
- [x] **Test 2 — ključ postoji:** za svaki par stvarno se pozove `resolve*()`, ključ s
      prefiksom pozivatelja mora biti leaf/plural u **oba** jezika; pokriva i hardkodirani
      fallback `auth.registrationError`.
- [x] **Test 3 — dinamičke grane:** regex grane (`Rola <ime> nije pronađena.` →
      `users.errors.roleNotFound`) i poklapanje `{{placeholder}}` s `values` koje kod šalje.
- [x] **Test 4 — pozitivne kontrole:** broj parova 30/3/14/10/7, nepoznata poruka **mora**
      pasti na fallback/`null` (5 asertova), stvarno preslikavanje radi (2 asertova).
- [x] **Mutacije 6/6**, uključujući B3 koja dokazuje da je rupa stvarna (obrisan EN ključ →
      `test:i18n-key-resolution` **prolazi**, novi test pada) i B1 koja je stvarna
      produktna regresija (backend poruka promijenjena za jedan znak).
- [ ] **Ne rješava:** **151** nemapirana poruka (od 191 izmjerenih) i dalje pada na generički
      fallback. Trajna popravka traži odluku vlasnika — kodovi grešaka ili backend i18n sloj
      (`I18N-01`, `docs/audit/FINDINGS.md`; `docs/audit/HANDOFF.md` §4 stavka 8).

### Inventar izloženosti sirovim serverskim porukama (2026-11-10)

`frontend/src/app/raw-api-error-exposure.test.mjs` — skripta `test:raw-api-error-exposure`.

- [x] **Zatvoren rizik iz prethodnog commita:** nijedna kapija ne provjerava YAML validnost
      (`check_ci_index.py` namjerno parsira po uvlačenju). Provjereno `js-yaml@4.3.2`
      (transitivna zavisnost): workflow parsira, 5 poslova, 413 koraka. Parser **nije**
      dodan kao zavisnost.
- [x] **Izmjeren inventar** nad 298 izvornih fajlova: **8** mapirano · **16** sirovih naslova ·
      **1** predikat · **37** `toastApiError` (naslov preveden, **opis sirov**).
- [x] **Render-put potvrđen, ne pretpostavljen:** sonner ubacuje `description` u
      `<div data-description>` kao vidljiv tekst. Za EN korisnika = WCAG **3.1.2**.
- [x] **Vlastito mjerenje ispravljeno prije tvrdnje:** prvi parser je gledao jednu liniju pa
      je tvrdio da 1 poziv prikazuje hardkodirano „Greška". Ponovljeno preko više linija:
      **svih 37** prosljeđuje naslov → default **nije** živ defekt i nije „popravljan".
- [x] **5 testova**, inventar po **fajlu** (ne po brojevima linija), uz pozitivnu kontrolu
      opsega (> 250 skeniranih fajlova, izmjereno 298).
- [x] **Mutacije 6/6**; `restore()` ovog puta vraća i sâm test fajl, restauracija potvrđena
      `filecmp.cmp(shallow=False)` za sva 4 fajla.
- [x] **Odluka vlasnika donesena 2026-11-10: opcija (a)** — provući 16 sirovih naslova kroz
      postojeće resolvere. **Urađeno** (vidi CHANGELOG od istog datuma).
- [x] **Isti princip primijenjen i na 37 opisa** (`test:api-error-description`, 5 testova):
      prevedeno kad je poruka mapirana, sirovo **samo** na bosanskom, izostavljeno na
      engleskom. Čist modul `lib/toast/api-error-description.mjs` + bihevioralni test s
      pravim `i18next`. Mutacije 6/6.
- [x] **Opcija (c) odobrena i urađena 2026-11-08** — backend registar
      `common/errors/api-error-codes.ts` (**101** kod, 1:1 s porukom) + `apiError(KOD)`;
      `HttpExceptionFilter` propušta `code` u tijelu (prije ga je **odbacivao**); **260**
      poziva u **44** fajla prebačeno. Frontend prevodi po kodu
      (`api-error-code-map.mjs` + `getErrorCode(err)`), kod ima prednost nad tekstom u svih
      5 resolvera i u omotaču; mapiranje po tekstu ostaje kao fallback.
- [x] **Tri nove kapije:** `test:api-error-code-parity` (5), `test:api-error-code-resolution`
      (6), backend `test:api-error-codes` (7, bihevioralno nad pravim filterom). Registrovane
      u `package.json` i `ci.yml`. **Mutacije 10/10** + 1 ciljana koja je uhvatila **stvarnu
      rupu**: omotač `resolveAdminApiErrorKey` tiho je odbacivao treći argument na 6 mjesta.
- [x] **24 od 27** pozivnih mjesta spojeno na `getErrorCode`. Preostala **3** su na trajnoj
      listi „ne dirati" (`features/blog/blog-post-form-dialog.tsx`,
      `pages/public/MyReservations.tsx`, `pages/public/PublicReserve.tsx`) — javno naznačeno,
      ne tiho odlučeno.
- [ ] **Šta (c) NE pokriva, izmjereno:** u `backend/src` i dalje **439** hardkodiranih poruka
      bez koda (277 u migriranih 44 fajla, 162 van njih). Migrirano je onih **101** koje je
      frontend već prevodio. Brava `<= 439` u `test:api-error-codes` sprječava tiho dodavanje
      novih literala; smanjenje je dozvoljeno.
- [ ] **Opcija (b) — backend i18n sloj — i dalje NIJE odobrena.** Nije verificirano preko
      žice: da `code` zaista stiže u stvarni HTTP odgovor dokazano je na nivou filtera, ne od
      kraja do kraja.

### Prvi izvršeni axe nad `/admin/**` i `/stylist/**` — 6 runova (2026-11-08)

Suite je postojao, ali nikad nije izvršen nad prijavljenim rutama. Svaki run je otkrio po jedan
sloj; svi uzroci su izmjereni iz CI anotacija, ne pretpostavljeni.

- [x] `NODE_ENV=test` s nivoa posla → Vite veže React-ov razvojni build → 341.9 KiB > budžet
      300 → `env: NODE_ENV: production` na tom koraku (`190b634`).
- [x] login **503**: auth rute su fail-closed (AUTH-01), a posao nema Redis →
      `incrementWindow` vraća `null` → `redis:7` service + `HTTP_RATE_LIMIT_REDIS_URL` (`b95bd91`).
- [x] `test.skip(!status.ok)` **na nivou fajla** čita status pri sakupljanju testova, prije nego
      `setup` upiše fajl → 25 skipped uz `ok:true`. Odluka prebačena u `test.beforeEach`
      (`0031803`). **`0 failed` ne znači da je prijava uspjela.**
- [x] grep je hvatao samo `critical` pa je brojao 33/5 umjesto stvarnih → proširen na
      `(critical|serious)` (`babd711`).
- [x] **61 form kontrola bez programskog imena** + rupa u guardu `test:form-control-labels`
      koja ih je krila: `if (hasBareLabel) continue` je jednim bare `<Label>` u fajlu
      „opravdavao" **sve** kontrole tog fajla, iako je u praksi *sibling*. Izmjereno: 79
      „opravdanih", **61 stvaran prekršaj**. Guard sada uparuje po rasponu (`wrapSpans`) i
      broji zagrade za template-literal id-ove (`attrValue`). (`09a275e`)

| Run | Commit | Ishod |
|---|---|---|
| `42853163996` | `3a20ef3` | 13 passed / 0 failed / **25 skipped** |
| `42854014729` | `ac93c4b` | isto + login **503** ×2 |
| `42855048776` | `b95bd91` | `ok:true`, i dalje **25 skipped** |
| `42857076298` | `babd711` | **33 passed / 5 failed** — admin/stylist prvi put izvršeni |
| `42858137587` | `11b1b26` | **34 passed / 4 failed** |
| `42865252124` | `09a275e` | **36 passed / 2 failed** |

`/stylist/profile` je javljao „sesija nema ulogu STYLIST", ali to **nije** greška aplikacije:
`src/app/router.tsx:126-129` definiše rutu kao `<Navigate to="/profil" replace />`. Greška je
bila u specu — ruta sada nosi `expectPrefix: '/profil'` (`11b1b26`).

### Zadnja 2 pada: settings i kalendar rezervacija (2026-11-08)

- [x] **Preduslov — dijagnostika (`72acaa0`):** poruka asertacije nosila je samo id pravila i
      broj čvorova, a log i artefakt su na blob storageu koji nije dostižan. Sada nosi `target`
      selektor i HTML prva 3 čvora — tek tako su uzroci postali čitljivi.
- [x] **WCAG 2.5.3** ×11 na `/admin/settings`: `aria-label` grupnog prekidača i dugmeta za
      uređivanje **nije sadržavao vidljivi tekst**. Prekidač: `aria-label` uklonjen (stanje
      nosi `aria-expanded`, ime daje sadržaj). Dugme: glagol uzet iz iste grane kao vidljivi
      tekst, pa „Postavi" više nije u sukobu s „Uredi: X".
- [x] **WCAG 1.4.3** ×1: `text-slate-500` → `text-slate-600` u `settings-tab-nav.tsx`.
- [x] Mrtvi ključevi `adminSettings.sections.expand` / `.collapse` uklonjeni iz oba jezika
      (leaf **2712 → 2710**, paritet 0/0).
- [x] **WCAG 4.1.2** ×8 na kalendaru — **dva uzroka, ne jedan** (anotacija prikazuje samo prva
      3 čvora, pa se drugi vidio tek kad je prvi zatvoren):
      - **×7** — `Header.js:12-15` postavlja `role="columnheader"` na `<span>`, a
        `TimeGridHeader.js:109-115` ga omota u `<button class="rbc-button-link">` jer
        `Calendar.js:347` ima default `drilldownView: views.DAY`. Riješeno **podržanom
        zamjenom** `components.header` → `SchedulerColumnHeader` bez uloge.
      - **×1** — `DateContentRow.js:159` postavlja `role="rowgroup"` na `.rbc-allday-cell`
        (`TimeGridHeader.js:63`), a nijedan predak nije `grid`/`table`/`treegrid`. Šim skida
        ulogu **samo** kad takav predak stvarno ne postoji, da se ne diraju ispravne tabele.
- [x] **WCAG 4.1.2** ×1 i **2.1.1** ×1: `WeekWrapper.js:249` ubacuje
      `<div class="rbc-addons-dnd-row-body">` kao direktno dijete
      `<div class="rbc-row-content" role="row">` (`DateContentRow.js:176-178`); `TimeGrid.js:339`
      renderuje `.rbc-time-content` bez `tabindex`. Za oba **nema** `components` override-a, a
      `1.20.0` je **već** zadnja objavljena verzija (`dist-tags.latest`, npm registry,
      2026-11-08) → `calendar-aria-shim.mjs` + `useCalendarAriaShim` (MutationObserver, jer rbc
      re-renderuje pri promjeni datuma/pogleda).
- [x] **`test:calendar-aria-shim` 8/8** — jsdom fiksura **doslovnim HTML-om iz CI anotacije**,
      **ugniježđena** kao stvarni DOM (`.rbc-row-content` unutar `.rbc-allday-cell`), pravi
      `axe-core` prije i poslije, izvršava isporučeni `.mjs`. **Mutacije 6/6** uhvaćene
      (3/2/1/2/1/2 pada); vraćeni fajl bajt-identičan. Registrovan u `package.json` i `ci.yml`.

> **Ispravka ranije tvrdnje.** Prva verzija ovog unosa je tvrdila da je svih ×8 bio
> `columnheader`, i da fiksura daje `aria-required-parent` ×2 „jer i `.rbc-row-content[role=row]`
> traži roditelja". **Oba su netačna:** ×8 = 7 `columnheader` + 1 `rowgroup`, a u stvarnom DOM-u
> `row` **ima** valjanog roditelja (`.rbc-allday-cell[role=rowgroup]`). Greška je bila artefakt
> **plitke** fiksure bez `rowgroup` pretka, ne ponašanje stranice.

- [x] **Run `42871476988` (commit `cd6e14b`): 36 passed / 2 failed.** `/admin/settings` **zelen**;
      na kalendaru `aria-required-children` i `scrollable-region-focusable` **nestali**,
      `aria-required-parent` **8 → 1** (preostali `.rbc-allday-cell[role="rowgroup"]`).
- [ ] **Novi pad na `/`:** `color-contrast` (serious) ×1 — nije postojao u runu `42866264214`, a
      nijedna izmjena ne dira javni sajt. Uzrok **nije utvrđen**; u istom logu su dva
      `[WebServer] Error: read ECONNRESET`, pa je nestabilnost moguća, ali to je pretpostavka.
      `a11y-routes.spec.ts` je nosio **staru** poruku asertacije (samo broj, bez čvora) — moj
      propust, sada ispravljen u **sva tri** speka.
- [ ] **Šta test NE dokazuje:** `scrollable-region-focusable` se u jsdomu **uopšte ne
      primjenjuje** (nema rasporeda → regija nije skrolabilna), pa je `tabindex="0"` provjeren
      samo atributski; test to eksplicitno asertira. Isti razlog objašnjava zašto `color-contrast`
      i `label-content-name-mismatch` **nisu** mogli biti uhvaćeni lokalno — `test:axe-render-a11y`
      ih vraća kao **INCOMPLETE**.
- [x] **Zeleni run `42872969550` (commit `6a48167`): 38 passed | 0 failed | 0 skipped.**
      `rowgroup` zatvoren popravkom šima; `/` prošao **sam od sebe**, bez ijedne izmjene javnog
      sajta — dakle flake, ne defekt.
- [x] **`continue-on-error` SKINUT** s axe koraka (stavka 4, `HANDOFF.md` §4) — uvjet je bio
      potvrđen zeleni run. Uklonjen i korak „Annotate axe outcome". **Dodano `exit "$code"`**
      na kraj koraka: bez toga bi `set +e` ostavio izlaz 0 i korak bi prošao i kad axe padne.
- [ ] **Rizik od flakea ostaje otvoren, izmjeren:** `/` je pao na `color-contrast` u
      `42871476988` a prošao u `42872969550` bez promjene koda — **1 pad u ~5 runova**. Sada
      takav flake **ruši CI**. Ako se ponovi: retry koraka ili stvarna popravka kontrasta,
      **ne** vraćanje `continue-on-error`.

### Kapije na kraju ovog poteza (izmjereno, ne prepisano)

`test:*` **190/190** skripti · `tsc --noEmit` exit **0** · `typecheck:e2e` exit **0** ·
lint **0 errors / 7 warnings** · build **276.1 KiB**/300 · `check_i18n --strict` **2710** leaf
ključeva po jeziku, 0 razlika · `check_doc_links` **670/202** · `check_ci_index` **371/374** ·
`git diff --check` čist · CJK sken **0** · `mobile/` **0** dirnutih fajlova.

### Migracija je već bila izvršena u CI + mjerenje axe pokrivenosti (2026-11-08)

- [x] **Stavka 1 (`HANDOFF §4`) zatvorena:** posao `a11y-e2e` diže svjež `postgres:16` i korakom 7
      pokreće `prisma migrate deploy` (`backend/package.json:29`). Run `42874094557`, job
      `130032694947`: **korak 7 `success`**, bez `continue-on-error`. Nizvodno zeleni: `Seed
      roles`, `Create disposable a11y test accounts` (upsert nad šemom — pao bi na lošoj koloni),
      `Build backend`, `Start backend`, `/health`, axe **38 passed**.
      *Zaključeno, ne izmjereno:* svjež kontejner = prazna baza = sve migracije idu; ispis
      „N migrations found" nije pročitan jer logovi nisu dostupni.
- [x] **Stavka 2 zatvorena, ali djelimično:** backend se diže u CI (koraci 10–12) i axe radi nad
      njim. ⚠️ Baza ima uloge i testne naloge, **ne** i poslovne podatke — admin stranice su
      mjerene u **praznom stanju**.
- [x] **Izmjereno: `MATRIX.md` ima 23 🟡 kriterija**, ne 12 kako je stajalo u bilješkama.
- [x] **`test:axe-coverage` 10/10** + `frontend/e2e/axe-coverage.mjs`/`.d.mts` +
      `coverage-teardown.ts` (`globalTeardown`). 17 praćenih pravila mapiranih na kriterije,
      **s opisom šta svako NE dokazuje**. Presude `PROLAZ`/`NEPOTPUNO`/`NIJE_SE_PRIMJENIO`/`PAD`;
      samo `PROLAZ` smije pomjeriti kriterij na ✅. **Mutacije 5/5** (3/1/3/1/7 pada).
      Registrovan u `package.json` i `ci.yml`.
- [x] **Greška uhvaćena pri pisanju:** čitan `results.passed` umjesto axe-ovog **`passes`** —
      tiho bi učinilo **svako** pravilo `absent` na svakoj ruti.
- [ ] **16 kriterija nema axe pravilo** (1.3.2, 1.3.3, 1.3.4, 1.4.5, 1.4.12, 2.3.1, 2.3.3, 2.4.5,
      2.5.1, 2.5.2, 2.5.4, 3.2.1, 3.2.2, 3.3.1, 3.3.3, 3.3.8) — ostaju 🟡; treba čitač ekrana ili
      M1–M13.
- [x] **Druga greška, uhvaćena tek u CI (run `42876931983`):** anotacija je stigla kao jedan red
      jer GitHub workflow komanda **završava na sirovom novom redu**. `\n` → `%0A`, `%` → `%25`
      (**prvi**). Dodato `encodeWorkflowMessage()` + 3 testa; **mutacije 2/2**. Ukupno na modulu
      **7/7**.
- [x] **Izmjereno iz istog runa: 32 zapisa** = 9 javnih + 15 admin + 8 stylist ruta. Suite javlja
      38 jer uključuje nerutne testove — 32 je ispravno.
- [x] **Prvi potpuni izvještaj (run `42877920751`, commit `b801bad`): 32 rute.**
      **2.5.8 Target Size → ✅** (`target-size`: `passed 32, inapplicable 0, incomplete 0,
      violations 0` — primijenilo se na svakoj ruti). Matrica: **5 ✅ / 22 🟡 → 6 ✅ / 21 🟡**.
- [x] **Ispravka ranijeg broja:** stajalo je „23 🟡". Parser je tražio emoji bilo gdje u polju, pa
      je brojao i 1.1.1 (`❌ za grafikone … 🟡 za ikone`) i `🟡 djelimično`. Tačno je **22**.
- [ ] **2.5.3 NE ide na ✅** — `label-content-name-mismatch` je `passed 6, **incomplete 22**,
      inapplicable 4`. Axe ne može dovršiti provjeru na 22 od 32 rute. Ovo pobija pretpostavku
      da je kriterij dokazan time što suite ne pada.
- [ ] **1.4.3 NE ide na ✅** — `color-contrast`: `passed 24, **incomplete 8**`.
- [ ] **3.3.2, 1.4.4, 2.1.1, 1.1.1 ostaju 🟡/❌** iako su im pravila PROLAZ: axe vidi prisustvo
      labele a ne uputstva (3.3.2); `meta-viewport` ne mjeri stvarno zumiranje (1.4.4);
      `scrollable-region-focusable` se primijenio na 1/32 rute (2.1.1); grafikoni u
      `Analytics.tsx` su i dalje ❌ (1.1.1).

### Kapije na kraju ovog poteza (izmjereno, ne prepisano)

`test:*` **191/191** skripti · `tsc --noEmit` exit **0** · `typecheck:e2e` exit **0** ·
lint **0 errors / 7 warnings** · build **276.1 KiB**/300 · `check_ci_index` **372/375** ·
`check_doc_links` **670/202** · `check_i18n --strict` paritet **0/0** · `git diff --check`
čist · CJK sken **0** · `mobile/` **0** dirnutih fajlova.

### 12 od 21 🟡 zatvoreno izvorom (2026-11-08)

Zahtjev je bio „kompletiraj svih 20 🟡". **Tačan broj je bio 21** (prethodni sažetak je rekao 20 —
pogrešno). **Nisu svi zatvoreni** — za **9** nema dokaza koji se ovdje može proizvesti.

- [x] **`test:wcag-source-contracts` 13/13** — mjerilo: može li se prekršaj vidjeti **iz izvora**?
      Zatvoreno: **1.3.3, 1.3.4, 1.4.5, 2.3.1, 2.3.3, 2.4.5, 2.5.1, 2.5.2, 2.5.4, 3.2.1, 3.2.2,
      3.3.8**. Matrica: **6 ✅ / 21 🟡 → 18 ✅ / 9 🟡**. Registrovan u `package.json` i `ci.yml`.
      **Mutacije 6/6.**
- [x] ⚠️ Svi ovi dokazi su **provjere odsustva nad izvorom**, NE rendered dokaz — naznačeno uz
      svaki red u `MATRIX.md`.
- [x] **STVARNI DEFDEKT: `framer-motion` je ignorisao reduced-motion.** `MATRIX.md` je tvrdio
      „ne koristi se u dashboardu (potvrđeno grep-om)" — **netačno**: 9 fajlova, 26 animacijskih
      propova, nijedan bez `useReducedMotion`/`MotionConfig`. Globalni CSS blok ih nije dosezao
      (framer-motion animira preko JS-a). Pogađa **2.5.4 (AA)**, ne samo 2.3.3 (AAA).
      Popravka: `<MotionConfig reducedMotion="user">` u `app/providers.tsx`.
- [x] **Dva lažna dokaza u `MATRIX.md`:** red 2.3.3 je navodio **`test:reduced-motion`** koji
      **nikad nije postojao**; i tvrdio da `globals.css` pokriva samo `app-logo`, a globalni blok
      postoji od ranije.
- [x] **Slabost uhvaćena mutacijom:** prve dvije verzije testa za 1.4.5 brojale su **fajlove** s
      `<img>`, ne **pojavljivanja** — mutacija s drugim `<img>` u istom fajlu prolazila je
      neuhvaćena. Prag je sada `assert.equal(total, 1)` na izmjerenu vrijednost.
- [ ] **Preostalo 9 🟡** — 1.3.2 (raspored+AT) · 1.4.4 (stvarno zumiranje) · 1.4.12 (text-spacing)
      · 2.1.1 (stvarni prolaz tastaturom) · 2.5.3 (axe `incomplete` 22/32) · 3.3.1 (interakcija+AT)
      · 3.3.2 (axe ne vidi uputstva) · 3.3.3 (ručno M13) · 4.1.3 (sonner 2.0.8 ima **jedan**
      `aria-live`, u `src` je 95 live regiona — nije dokazano da svaka poruka prolazi kroz njih).

### Kapije na kraju ovog poteza (izmjereno, ne prepisano)

`test:*` **192/192** — harness je verificiran namjernim ubacivanjem nepostojeće skripte (javi
`FAIL`), pa je prazan ishod stvaran prolaz, ne prazna petlja · `tsc --noEmit` exit **0** ·
`typecheck:e2e` exit **0** · lint **0 errors / 7 warnings** · build **276.7 KiB**/300 ·
`check_doc_links` **670/202** · `git diff --check` čist · CJK sken **0**.

## Ručna (rendered) provjera — **nije automatizovana u ovom okruženju**

Ovo je lista za čovjeka. Agent je **ne može** izvršiti (nema preglednika, axe-a ni čitača ekrana)
i **neće** tvrditi da je obavljena.

| # | Provjera | Alat | Status |
|---|---|---|---|
| M1 | Tastatura: cijeli CRUD tok bez miša po modulu | Chrome/Firefox | `[ ]` |
| M2 | Fokus vidljiv i **neprekriven** (sticky header, toast, drawer) — 2.4.7 / 2.4.11 | vizuelno | `[ ]` |
| M3 | Zoom 200% i 400% bez gubitka sadržaja — 1.4.4 | browser zoom | `[ ]` |
| M4 | Reflow na 320 CSS px bez 2D skrola — 1.4.10 | DevTools | `[ ]` |
| M5 | Text spacing override (1.4.12 bookmarklet) | browser | `[ ]` |
| M6 | Screen reader: NVDA (Windows) i VoiceOver (macOS/iOS) | NVDA / VoiceOver | `[ ]` |
| M7 | Forced colors / high contrast — Windows High Contrast + `forced-colors` | Windows postavke | `[ ]` |
| M8 | `prefers-reduced-motion` — OS postavka „Reduce motion“ | OS | `[ ]` |
| M9 | Landmark/heading navigacija (NVDA `D`/`H` tasteri) | NVDA | `[ ]` |
| M10 | Target size mjerenje (≥24px, cilj 44px) | DevTools inspect | `[ ]` |
| M11 | Uporedni prikaz podataka prije/poslije (iznosi, zbirovi, statusi) | 2 browser prozora | `[ ]` |
| M12 | axe-core smoke po rutama | `@axe-core/playwright` | `[~]` Q4 odobren |
| M13 | **3.3.3 u dnevnoj knjizi:** otvoriti formu, poslati praznu, pa potvrditi da čitač ekrana najavi sažetak, da fokus ode na sažetak i da link vodi na polje. Zatim namjerno poslati loš UUID i potvrditi da se prikaže **serverska** poruka, ne generička | NVDA / VoiceOver | `[ ]` |

## Kapije po fazi (B1 radni ciklus)

Za **svaku** fazu:

- [ ] Baseline zabilježen prije izmjena
- [ ] Testovi napisani/ažurirani **prije** implementacije gdje je moguće
- [ ] Implementacija + razbijanje fajlova + brisanje mrtvog koda
- [ ] Modulska WCAG lista prošla
- [ ] `npm run build` + svi testovi + `check_i18n.py --strict` + `check_ui_contrast.py --strict` + `check_repo_hygiene.py` + `check_doc_links.py` + `git diff --check`
- [ ] Dokaz pariteta podataka upisan u `CHANGELOG.md`
- [ ] Provjera javnog sajta (grep + diff) za svaku diranu dijeljenu komponentu
- [ ] `MATRIX.md` + `CHANGELOG.md` modula, `CHECKLIST.md`, `HANDOFF.md` ažurirani
- [ ] Novi test skriptovi registrovani u `frontend/package.json` **i** `.github/workflows/ci.yml`
- [ ] Commit granica: jedan modul = jedan ili više malih commit-ova, bez miješanja modula
