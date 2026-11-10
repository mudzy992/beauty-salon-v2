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
- [ ] **Ostatak, svjesno nepromijenjen:** `Settings.tsx:140` ima `if (!copyKeys) return group`,
      a `SettingsOperations.tsx:38`, `SettingsAppearance.tsx:32` i `SettingsSeo.tsx:43` nemaju
      taj štit (tamo bi nova grupa bez kopirnog ključa bacila `TypeError`). Usaglašavanje
      znači izmjenu 4 stranice + do 10 testova koji asertuju doslovan izvor; test 5
      CI-garanuje da do tog stanja ne može doći. **Čeka odobrenje kao zasebna stavka.**
- [ ] **Ograničenje:** provjera je iz izvora — dokazuje da ključ postoji u oba jezika, ne da
      ga i18next zaista ispiše u pregledniku.

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
