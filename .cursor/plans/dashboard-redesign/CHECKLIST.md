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
| 11 | Stylist portal | `[ ]` | |
| 12 | Onboarding / ForceChangePassword | `[ ]` | |
| 13 | Zaključak (globalni prolaz, sweep, docs) | `[ ]` | |

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
