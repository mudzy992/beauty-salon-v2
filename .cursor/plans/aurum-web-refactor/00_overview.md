# Plan — Aurum web refaktor: javne stranice + svi dashboardi

**Status:** ✅ **PLAN ODOBREN (`approve_s0`) · S0 ZAVRŠEN (5/5 CI) · S1 ZAVRŠEN (5/5 CI `43100889990` na `ae87acf`; 203/203 lokalno, 140/140 source-only kontrast, rendered axe 252/252 na default `classic`).** S2–S11 ostaju budući segmenti i dalje traže STOP + eksplicitno odobrenje. U S0 nije diran produkcijski UI kod; S1 jeste uveo jedini novi feature (izbornik teme) u `frontend/src/`.

**Datum:** 2026-11-11
**Grana:** `arena/71be6ba3-beauty-salon-v2` · **Bazni commit:** `a82020e47c1b21a3c05113e843f853a8e64baaf0`
**Radni režim:** plan → odobrenje → **12 segmenata**, svaki: `commit` + `push` na ovu granu + sve CI provjere zelene → **STOP** za odobrenje sljedećeg.
**Autoritativni zahtjev:** korisnikov zahtjev + odluke Q1–Q11 u nastavku. Kod je izvor istine za *trenutno ponašanje*; dizajn-dokumenti nisu dokaz implementacije (`SOURCE_OF_TRUTH.md`).

---

## 1. Zahtjev (bez parafraziranja u novo značenje)

1. U `docs/design/` postoji referentni dizajn; treba ga **još dodatno unaprijediti**.
2. Na osnovu unaprijeđenog dizajna uraditi **refaktor javnih public stranica i svih dashboarda**.
3. Implementaciju raditi **segmentno, planski, detaljno, uz sve provjere na CI**.
4. **Ne izmišljati; sve nejasnoće pitati.**

---

## 2. Odluke vlasnika — obavezujuće, ne podliježu ponovnoj interpretaciji

| # | Pitanje | Odabrana odluka |
|---|---|---|
| Q1 | Unapređenje dizajna | **Puna specifikacija**: postojeći `docs/design/NEJRA – beauty salon · Referentni dokument.html` dograditi u živi dizajn-sistem + specifikacije svih javnih ekrana i svih dashboarda. |
| Q2 | Identitet | **Aurum Noir kao dodatna tema uz prekidač**; postojeći izgled ostaje **default**. |
| Q3 | Obim | **Sve web rute bez izuzetka**; `/mobile` i `/backend` **ne dirati**. |
| Q4 | Odnos prema starom redizajnu | **Novi plan od nule**: zamijeniti postojeće šablone/tokene prema poboljšanom dizajnu; source-contract testovi se ažuriraju uz obrazloženje. |
| Q5 | Baseline CI kvar | **Kreirati `referentni-prijedlog-v2.html` i `-v3.html` na ovoj grani** prema poboljšanom dizajnu; zadržati `test:design-reference` i njegov CI korak. |
| Q6 | Režim | **Plan + CHECKLIST/matrice bez koda → odobrenje → segmenti sa STOP-om**; svaki segment: `commit` + `push` + `gh run watch` do zelenih **svih 5 CI poslova** + lokalne provjere. |
| Q7 | Odnos dokumenata | **`NEJRA – …html` = jedini izvor istine (puna specifikacija)**; v2/v3 = **dva ilustrovana alternativna vizuelna koncepta**, ne specifikacije. |
| Q8 | Model teme | **Jedan izbornik s 3 opcije**: `Klasična svijetla` (default) / `Aurum svijetla` / `Aurum tamna`. Nema kombinacije classic + tamna. |
| Q9 | Precedencija boja | **Aurum fiksira paletu**: runtime `theme_primary`/`theme_accent` override se **ne primjenjuje** dok je Aurum aktivan, uz jasnu napomenu u Postavke → Izgled. |
| Q10 | Nepregovarajuće | **Strogi paritet + dozvoljeno grupisanje navigacije**: rute, API ugovori, podaci, guardovi, BS/EN paritet, bez novih npm zavisnosti; jedini novi feature = tema/skin; grupisanje uz `<Navigate replace>` i očuvanje `?tab=` deep-linkova; testovi zadržavaju istu garanciju. |
| Q11 | Ilustracije | **Generisati nove AI ilustracije** i ugraditi kao `data:image/jpeg;base64,` (≥2 po dokumentu), uz natpis „AI ilustracije". |

---

## 3. Hijerarhija dokumenata (rješava Q1/Q5/Q7)

1. **`docs/design/NEJRA – beauty salon · Referentni dokument.html`** — dograđen u S0, **jedini izvor istine** za tokene, komponente, šablone, mapu ekrana, stanja, a11y, i18n i paritet. Sve odluke u kodu moraju biti sljedive do njega.
2. **`docs/design/referentni-prijedlog-v2.html`** i **`-v3.html`** — dva samostalna, ilustrovana vizuelna koncepta. **Nisu specifikacija** i ne smiju se koristiti kao ugovor za implementaciju. Kreiraju se u S0 jer ih `frontend/scripts/design-reference.test.mjs` (CI korak na liniji 601 `ci.yml`) već očekuje.
3. `docs/refaktor/PROMPT_dashboard_redesign.md` i `docs/refaktor/dashboard-reference.html` — **historijski materijal** prethodnog redizajna (drugačija paleta, javne stranice isključene). Ne briše se, ali **ne obavezuje** ovaj plan; razlike su eksplicitno riješene odlukama Q2, Q3, Q4.
4. `.cursor/plans/dashboard-redesign/` — arhiva prethodnog rada; koristi se samo kao izvor inventara ruta i dokaza o testovima. Ne nastavlja se (Q4).
5. `SOURCE_OF_TRUTH.md`, `docs/audit/CI.md`, `docs/codebase-map/FRONTEND.md`, `docs/audit/UX_UI_ROUTE_INVENTORY.md` — ažuriraju se u S11 samo s onim što je stvarno implementirano i provjereno.

---

## 4. Baseline — izmjereno 2026-11-11, ne pretpostavljeno

| Stavka | Izmjereno stanje |
|---|---|
| `git status` | čist; jedini commit na grani `a82020e test` |
| `docs/design/` | **1 fajl**: `NEJRA – beauty salon · Referentni dokument.html` (26.070 B, 233 linija, 8 sekcija, ilustrativni podaci, interaktivni demo) |
| `docs/design/referentni-prijedlog-v2.html` / `-v3.html` | **NE POSTOJE** na ovoj grani (postoje na drugoj grani `arena/d2af28f4-beauty-salon-v2`, ~1,5 MB / ~1,2 MB). **Ne kopiraju se** (Q5). |
| `python3 scripts/check_repo_hygiene.py` | PASS (1749 tracked putanja) |
| `python3 scripts/check_ci_index.py` | PASS (379/382 `test:*` skripti ima CI korak; 3 interaktivna izuzetka) |
| `python3 scripts/check_doc_links.py` | PASS (670 linkova / 202 Markdown fajla) |
| `python3 scripts/check_i18n.py --strict` | PASS (BS 2711 / EN 2711, 0 razlika) |
| `python3 scripts/check_ui_contrast.py --strict` | PASS (80/80 parova) |
| `cd frontend && npm run build` | PASS (`tsc -b` + Vite + budžet 276,9 / 300 KiB gzip) |
| `cd frontend && npm run test:*` (svih 198) | **197 PASS / 1 FAIL** — `test:design-reference` pada s `ENOENT` na `docs/design/referentni-prijedlog-v2.html` |
| `.dark` klasa | **nikad se ne dodjeljuje u `frontend/src`** (provjereno grep-om); tamni CSS tokeni postoje, ali su uspavani. 85 fajlova koristi `dark:` klase. |
| Runtime brand override | `SettingsContext.tsx` → `buildBrandColorVariables(settings.theme_primary, settings.theme_accent)` → inline `style.setProperty('--brand-*')` na `<html>` |
| CI | 5 poslova: `repo-checks`, `backend`, `frontend`, `a11y-e2e` (rendered axe nad 32 rute, PostgreSQL + Redis + Chromium), `mobile`. Trigger: `push` na `arena/**` + `workflow_dispatch`. |

**Zaključak:** CI je na ovoj grani **već crven prije početka rada** (1 test). S0 to popravlja. Zbog toga se **ne radi nijedan push prije nego S0 bude spreman** — plan-dokumenti ostaju u working treeju bez commit/push dok se ne odobri S0.

---

## 5. Obim (Q3) — 58 deklaracija ruta, provjereno u izvoru

Iz `frontend/src/app/router.tsx`, `app/routes/public.routes.tsx`, `app/routes/admin.routes.tsx`:

| Skup | Broj | Sadržaj |
|---|---|---|
| Javne (`PublicLayout`) | 14 | `/`, `/usluge`, `/usluge/:serviceId`, `/blog`, `/blog/:slug`, `/galerija`, `/kontakt`, `/rezervacija`, `/moje-rezervacije`, `/moje-rezervacije/:id`, `/moj-termin/:token`, `/unsubscribe`, `/profil`, `/zadovoljni-klijenti` |
| Auth / onboarding / izuzeci | 8 | `/login`, `/register`, `/reset-password`, `/force-change-password`, `/onboarding/gender`, `/onboarding/email`, `/admin/reservations/calendar` (fullscreen, izvan layouta), `*` (`NotFound`) |
| Admin (`ProtectedRoute` + `DashboardLayout`) | 24 | uključuje `SettingsHub`/`AnalyticsHub` i 6 `TabRedirect` ruta (`/admin/debtors`, `/admin/settings/*`, `/admin/*-analytics`, `/admin/app-releases`, `/admin/notifications`, `/admin/email-settings`) |
| Stylist (`StylistRoute` + `StylistLayout`) | 12 | 10 ekrana + 2 redirecta (`/stylist` → `/stylist/inbox`, `/stylist/profile` → `/profil`) |

**U obimu su i dijeljeni slojevi:** `components/ui/*`, `components/brand/*`, `components/BeforeAfterSlider.tsx`, `components/media-image.tsx`, `features/shell/public/*`, `features/shell/admin/*`, `layouts/StylistLayout.tsx`, `styles/globals.css`, `styles/index.css`, `tailwind.config.js`, `app/providers.tsx`, `i18n/locales/bs.json` + `en.json`, `scripts/check_ui_contrast.py`, `frontend/package.json`, `.github/workflows/ci.yml`.

**VAN OBIMA (ne dirati):** `/mobile/**`, `/backend/**`, Prisma/migracije, API ugovori, Socket.IO događaji, tracked `.env`, `docker-compose*.yml`, bilo koja druga grana.

---

## 6. Nepregovarajući ugovor (Q10)

1. **Nijedna URL ruta ne prestaje raditi.** Grupisanje navigacije je dozvoljeno, ali svaki stari URL ostaje `<Navigate replace>` (ili već postojeći `TabRedirect`) i svi `?tab=` / query parametri i dalje rade.
2. **API ugovori netaknuti:** isti endpointi, query parametri, payload-i, `queryKeys`, socket event-i, `ProtectedRoute` / `StylistRoute` / `PublicOnlyRoute` guardovi.
3. **Podaci i formatiranje netaknuti:** svaki broj, iznos, datum, status, filter, sort, paginacija, zbir i badge prikazuje iste vrijednosti; BS/EN locale formatiranje se ne mijenja. Finansijski proračuni, FSM rezervacija, dostupnost, idempotency ključevi — netaknuti.
4. **i18n:** svaki novi string u `bs.json` **i** `en.json`; `check_i18n.py --strict` zeleno; bez hard-coded stringova (uključujući `aria-label`, `title`, `alt`, `placeholder`, toast, tooltip). Značenje postojećih ključeva se ne mijenja.
5. **Bez novih npm zavisnosti** (ni runtime ni dev). Postojeći stack: React 18, TS, Vite, Tailwind, Radix, lucide, recharts, react-big-calendar, framer-motion, sonner, TanStack Query, i18next, `node --test`, Playwright/axe (dev).
6. **Testovi se nikad ne brišu niti slabe.** Ako promjena markupa traži izmjenu source-contract testa, test se ažurira tako da **zadrži istu garanciju**, uz obrazloženje u `CHANGELOG.md`. Svaki novi `test:*` dobija CI korak (`check_ci_index.py` je tvrdi gate).
7. **Jedini novi feature** = izbornik teme (3 stanja, Q8). Nema novih ekrana, novih polja, novih akcija.
8. **Bez tvrdih boja u komponentama:** samo semantički tokeni; kontrast za svih 6 relevantnih stanja (classic light; aurum light; aurum dark) računa se i provjerava `check_ui_contrast.py --strict`.
9. **Iskrenost o verifikaciji:** legenda ✅ izmjereno / 🟡 zadovoljeno u kodu, nije provjereno u renderu / ❌ nije zadovoljeno / ➖ nije primjenjivo. Rendered/axe/screen-reader dokaz dolazi **isključivo iz CI posla `a11y-e2e`**; u sandboxu Chromium nije dostupan (`run-a11y-routes.mjs` namjerno ispisuje `SKIPPED`), pa se 🟡 nikad ne proglašava ✅ bez CI runa.
10. **Nailazak na nejasnoću → STOP + pitanje.** Ako refaktor zatraži backend/API izmjenu → STOP + pitanje. Ako se pronađe bug u postojećoj logici → ne popravlja se tiho, bilježi se u `HANDOFF.md` i pita.

---

## 7. Segmentacija — 12 segmenata, svaki sa STOP-om

| Segment | Naziv | Glavni fajlovi | Plan |
|---|---|---|---|
| **S0** | Dizajn dokumenti + popravka CI baselinea | `docs/design/*` (3), `frontend/scripts/design-spec.test.mjs` (novo), `frontend/package.json`, `ci.yml` | [01_phase-0-design-docs.md](01_phase-0-design-docs.md) |
| **S1** | Temelj: tokeni + 3-state tema + dijeljeni UI | `features/shell/theme/*`, `providers.tsx`, `globals.css`, `tailwind.config.js`, `SettingsContext.tsx`, i18n, `check_ui_contrast.py`, testovi, matrice | [02_phase-1-foundation.md](02_phase-1-foundation.md) |
| **S2** | Javni shell + Početna + Usluge + Detalj usluge | `features/shell/public/*`, `pages/public/PublicHome.tsx`, `PublicServices.tsx`, `PublicServiceDetail.tsx`, `features/public-catalog/*` | [03_phase-2-public-shell-catalog.md](03_phase-2-public-shell-catalog.md) |
| **S3** | Javni sadržaj: Blog, Galerija, Kontakt, Zadovoljni klijenti | 5 `pages/public/*` + `features/blog/*` | [04_phase-3-public-content.md](04_phase-3-public-content.md) |
| **S4** | Javni tokovi: Rezervacija, Moj termin, Moje rezervacije, Unsubscribe, Profil | 6 `pages/public/*` + `pages/Profile.tsx` | [05_phase-4-public-flows.md](05_phase-4-public-flows.md) |
| **S5** | Auth + onboarding + NotFound | `pages/Login/Register/ResetPassword/ForceChangePassword/NotFound`, `pages/onboarding/*` | [06_phase-5-auth-exceptions.md](06_phase-5-auth-exceptions.md) |
| **S6** | Admin shell + Dashboard + Rezervacije + fullscreen kalendar | `features/shell/admin/*`, `layouts/DashboardLayout.tsx`, `pages/Dashboard.tsx`, `Reservations.tsx`, `ReservationsCalendar.tsx` | [07_phase-6-admin-shell.md](07_phase-6-admin-shell.md) |
| **S7** | Admin operativa: Dnevna knjiga, Finansije, Lojalnost | `pages/DailyLog.tsx`, `Finance.tsx`, `Loyalty.tsx`, `features/finance/*` | [08_phase-7-admin-operations.md](08_phase-7-admin-operations.md) |
| **S8** | Admin analitika + korisnici + salon/usluge/frizeri | `AnalyticsHub`, `Users`, `Salon`, `Services`, `Stylists`, `ServiceWorkGallery` | [09_phase-8-admin-data.md](09_phase-8-admin-data.md) |
| **S9** | Admin sadržaj + Postavke hub | `Blog`, `Gallery`, `Reviews`, `SettingsHub` + 7 tabova | [10_phase-9-admin-content-settings.md](10_phase-9-admin-content-settings.md) |
| **S10** | Stylist portal (10 ekrana + 2 redirecta) | `layouts/StylistLayout.tsx`, `features/stylist-portal/*`, `features/stylist-workbook/*` | [11_phase-10-stylist-portal.md](11_phase-10-stylist-portal.md) |
| **S11** | Završni prolaz: rendered a11y, reflow, docs, dead code | `e2e/*`, `docs/audit/*`, `docs/codebase-map/*`, `SOURCE_OF_TRUTH.md`, sve matrice | [12_phase-11-finalization.md](12_phase-11-finalization.md) |

Kontrolna lista svih segmenata: [CHECKLIST.md](CHECKLIST.md). Evidencija: [CHANGELOG.md](CHANGELOG.md). Kontekst za nastavak: [HANDOFF.md](HANDOFF.md).

---

## 8. Kapije i režim rada (Q6)

**Kapija 0 (sada):** ovaj plan + `CHECKLIST.md` + matrice. **Bez koda.** Čeka se eksplicitno „plan odobren". Plan se ne commit-a niti pusha prije odobrenja (push bi pokrenuo trenutno crveni CI).

**Za svaki segment S0–S11, redoslijed je obavezan:**

1. Implementacija **samo** fajlova iz tog segmenta; nijedan fajl izvan popisa bez pitanja.
2. Lokalne provjere (vidi §9) — sve moraju biti zelene prije commit-a.
3. `git add` + `git commit` (poruka na bosanskom, prefiks `docs(design):`, `feat(theme):`, `refactor(public):`, `refactor(admin):`, `test:`, `ci:`).
4. `git push origin arena/71be6ba3-beauty-salon-v2` (nikad druga grana).
5. `gh run list` → uzeti `run id` → `gh run watch <id>` do završetka; **svih 5 poslova mora biti `success`**. Ako je bilo koji crven: popravka u istom segmentu, novi commit + push + novi run; segment se ne zatvara dok CI nije zelen.
6. Ažurirati `CHECKLIST.md`, `CHANGELOG.md`, `HANDOFF.md` i matrice s **tačnim** podacima (commit sha, run id, broj testova, šta je ✅ / 🟡).
7. **STOP.** Poslati sažetak: šta je urađeno, promijenjeni fajlovi, dokazi (lokalni + CI run id + 5/5), otvoreni rizici, i eksplicitno pitanje „Da li odobravaš sljedeći segment S<n>?". Ne započinjati sljedeći bez odgovora.

**Ako se u segmentu pojavi nejasnoća:** STOP usred segmenta, pitanje, bez nagađanja i bez „privremenog" rješenja.

---

## 9. CI verifikaciona matrica — „sve provjere na CI"

| # | Provjera | Lokalno prije commit-a | CI posao |
|---|---|---|---|
| 1 | `python3 scripts/check_repo_hygiene.py` | ✅ | `repo-checks` |
| 2 | `python3 scripts/check_ci_index.py` | ✅ | `repo-checks` |
| 3 | `python3 scripts/check_doc_links.py` | ✅ | `repo-checks` |
| 4 | `python3 scripts/check_i18n.py --strict` | ✅ | `repo-checks` |
| 5 | `python3 scripts/check_ui_contrast.py --strict` | ✅ | `repo-checks` |
| 6 | Sve `test:*` skripte iz `frontend/package.json` (**203 nakon S1**) | ✅ puna petlja 203/203 | `frontend` (svaka ima svoj korak) |
| 7 | `cd frontend && npm run build` (`tsc -b` + Vite + `check-bundle-budget.mjs`, ≤300 KiB gzip) | ✅ | `frontend` |
| 8 | `cd frontend && npm run typecheck:e2e` | ✅ | `frontend` |
| 9 | Frontend Docker image build (root context) | ➖ samo u CI | `frontend` |
| 10 | Backend: `npm ci`, Prisma generate/validate, migracije na disposable PostgreSQL, build, DB-backed HTTP, Jest | ➖ samo u CI | `backend` |
| 11 | Rendered axe nad 32 rute (`Chromium`, `PostgreSQL`, `Redis`) | ⚠️ `SKIPPED` u sandboxu | `a11y-e2e` |
| 12 | `cd mobile && npm run typecheck` + `test:socket-recovery` | ➖ samo u CI | `mobile` |
| 13 | `git diff --check HEAD` | ✅ | dio provjere 1 |

Napomena uz 11: `frontend/scripts/run-a11y-routes.mjs` u sandboxu **namjerno ne tvrdi prolaz** ako Chromium nije instaliran. Zelen `a11y-e2e` je ostvaren u S1 runu **`43100889990`** na `ae87acf` (**252 passed | 0 failed | 0 skipped** / 32 rute), ali isključivo na **default `classic`**; rendered tvrdnje za Aurum stanja ostaju 🟡 do S11. `140/140` kontrastnih parova je source-only dokaz, ne rendered audit.

---

## 10. Definition of Done — zajednički za svaki segment

- [ ] Svi fajlovi segmenta su u planiranom obimu; nema izmjena `/mobile`, `/backend`, `.env`, migracija.
- [ ] Nijedna ruta ne puca; stari URL-ovi i `?tab=` rade; API/queryKeys/socket/portali netaknuti.
- [ ] Nema hard-coded stringova ni boja; BS/EN paritet; `--strict` zeleno.
- [ ] Novi/ažurirani testovi zadržavaju istu garanciju; svaki novi `test:*` ima CI korak.
- [ ] Bundle budžet ≤ 300 KiB gzip; `tsc -b` i `typecheck:e2e` bez grešaka.
- [ ] Lokalna matrica §9 zelena; `git diff --check` čist.
- [ ] Push na ovu granu; `gh run watch` → **5/5 poslova success**; run id zapisan.
- [ ] `CHECKLIST.md`, `CHANGELOG.md`, `HANDOFF.md`, `MATRIX.md` ažurirani s tačnim statusima (✅/🟡/❌/➖).
- [ ] Poslat STOP-sažetak s pitanjem za odobrenje sljedećeg segmenta.

---

## 11. Rizici i pretpostavke (eksplicitno, ne skriveno)

| # | Rizik / pretpostavka | Kako se tretira |
|---|---|---|
| R1 | U sandboxu nema Chromium-a/čitača ekrana → nema rendered dokaza | Sve rendered tvrdnje 🟡 dok `a11y-e2e` ne bude zelen; S11 proširuje axe na 3 stanja teme |
| R2 | `.dark` je uspavan; `dark:` klase u 85 fajlova nikad nisu aktivirane | ✅ **Potvrđeno odlukom `dark_yes` (2026-11-11):** S1 dodjeljuje `.dark` + `data-skin="aurum"` za `Aurum tamna`; Aurum tokeni moraju imati veću specifičnost od `.dark` bloka — `check_ui_contrast.py --strict` daje **140/140** (source-only); rendered axe za Aurum stanja dolazi tek u S11 |
| R3 | Runtime brand override piše inline `--brand-*` na `<html>` i time bi pobjedio CSS | S1 gasi `setProperty` dok je `skin=aurum` i uklanja već postavljene inline varijable; `test:brand-colors` ostaje zelen; napomena u Postavke → Izgled (Q9) |
| R4 | Q4 = zamjena šablona/tokena; ~198 source-contract testova čita mark-up | Svaki pogođeni test se ažurira uz obrazloženje u `CHANGELOG.md`, nikad se ne briše; `check_ci_index.py` ostaje zelen |
| R5 | `check_ui_contrast.py` parsira samo `:root` i `.dark` jednostavnim regexom | S1 proširuje parser na nove selektore (`[data-skin="aurum"]`, `.dark[data-skin="aurum"]`) s naslijeđenim `:root` vrijednostima; bez novih zavisnosti |
| R6 | Baseline CI je crven (1 test) | ✅ S0 je popravio `test:design-reference` (199/199 lokalno) i, nakon odobrenog `ci_fallback`, dobio **5/5 na `43043182552`**; `a11y-e2e` daje 252/252 rendered axe testova. Prva dva runa su historijski 4/5 zbog `apt` DNS-a |
| R7 | AI ilustracije mogu narasti >1 MB po dokumentu | Ugrađuju se kao JPEG base64; generisani međufajlovi se **ne commit-aju**; cilj ≤ ~1,5 MB po HTML-u; `.gitignore` se ne dira |
| R8 | `docs/design` NEJRA dokument ima nelatinične znakove u imenu | Ne preimenuje se, ne briše, ne mijenja mu se ime (Q7); svi linkovi na njega su inline kod, ne Markdown link |
| R9 | Grupisanje navigacije (Q10) može dirati `?tab=` deep-linkove | Dozvoljeno samo uz `<Navigate replace>`/`TabRedirect` koji čuva query; `test:settings-hub-redirect` i `test:analytics-hub-redirect` ostaju zeleni |
| R10 | `framer-motion` animacije (`MotionConfig reducedMotion="user"` u `providers.tsx`) | Ne uklanja se; nove animacije poštuju `prefers-reduced-motion`; `test:wcag-source-contracts` ostaje zelen |

**Riješeno 2026-11-11 odlukom `dark_yes`:** `Aurum tamna` **smije** aktivirati `.dark` klasu i postojeće `dark:` varijante; Aurum tokeni moraju imati veću specifičnost. **Preostale pretpostavke koje se NE smiju pretvoriti u odluke bez pitanja:** gdje tačno stoji izbornik teme na auth ekranima i u fullscreen kalendaru, i da li se postojeći `SettingsHub`/`AnalyticsHub` grupišu dalje (Q10 dopušta, ne nalaže). Obje su u planovima S5/S6/S9 kao **eksplicitna pitanja za odobrenje u tom segmentu**.

---

## 12. Šta se ne radi u ovom planu

- Ne piše se produkcijski kod, ne mijenja se `ci.yml`, ne dodaju se testovi, ne generišu se slike, ne pravi se commit/push.
- Ne dira se `docs/refaktor/*` ni `.cursor/plans/dashboard-redesign/*` (arhiva).
- Ne preuzima se ništa s drugih grana (`arena/d2af28f4-…`, `arena/657dba19-…`).
- Ne otvara se PR, ne merge-a se, ne deploy-a se.
