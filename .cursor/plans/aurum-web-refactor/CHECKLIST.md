# CHECKLIST — Aurum web refaktor

> **M2 završen na osnovu korisnikove potvrde i fiksura:** korisnik je prijavio Brave i Edge na Windowsu, sve rute, uloge, jezike i teme, bez preklapanja, odsijecanja ili nedostupnih kontrola, te izričito potvrdio 200% i 400% browser zoom, text-spacing override i verziju `718fbe0`. Viewport, verzije browsera i pojedinačna stanja nisu navedeni; nije nezavisan audit. Za `718fbe0` [CI 44940081950](https://github.com/mudzy992/beauty-salon-v2/actions/runs/44940081950) **5/5, rendered 1505/0/0**. 320px je pokriveno automatizovanim fiksurama; M1/M3/M4/M5/M6 i nepotpuni axe nalazi ne zatvaraju se ovim. Detalji: `15_rucni-pregled.md` i `CHANGELOG.md`. Stariji statusi u nastavku su historijski.

> **Prethodni M2 dokaz:** `39ee738` / [CI 44938406334](https://github.com/mudzy992/beauty-salon-v2/actions/runs/44938406334) **5/5, rendered 1503/0/0**; osam lokalnih scoped axe skenova popunjenog bookinga nije prijavilo violations ni incomplete. Naknadna popravka fokusa pod sticky headerom prošla je 200/200 ciljanih lokalnih testova i CI naveden u aktuelnom statusu iznad. Fiksure, root-font simulacija i viewport 320px nisu zamjena za korisnikov stvarni pregled. Detalji u `16_ciljani-vizuelni-pregled.md`.

> **Najnoviji M2 dokaz:** `2c98530` / CI `44920510427` **5/5, rendered 1343 prošlo / 0 palo / 0 preskočeno**. 48 fiksurnih token-proposal stanja (BS/EN, oba Aurum režima, 320 CSS px/200% root/text-spacing), uključujući nepotpun odgovor, retry i gost/prijavljeni prikaz; 320px + spacing i automatizovani Tab/Enter uz forced-colors emulaciju. Ispravljen razlomljeni tekst oznaka. Vizuelno su pregledani ciljani statični snimci i šest uzoraka legende analitike; ostali nepotpuni kontrastni uzorci i širi stvarni ručni/AT pregled ostaju otvoreni. Fiksure ne dokazuju stvarne transakcije. Detalji: `.cursor/plans/aurum-web-refactor/16_ciljani-vizuelni-pregled.md`.

> **Najnoviji M2 paket:** `99240d0` / CI `44825519292` **5/5, rendered 1247 prošlo / 0 palo / 0 preskočeno**. 48 dodatnih fiksurnih kombinacija: popunjena knjiga prihoda i edit dijalog bez spremanja; direktna stylist rezervacija s odabirom klijenta/usluge ili nedostajućim spolom, bez slanja. BS/EN, Aurum light/dark, 320 CSS px / simulirani 200% root / text-spacing. Ispravljen overflow knjige na 320px; automatizacija nije ručni pregled ni dokaz stvarne finansijske transakcije. Ručni protokol je dopunjen, ali ručni text-spacing i širi pristupni pregled ostaju otvoreni.

> **Novi M2 paket:** `f5dd479` / CI `44797026431` **5/5, rendered 1199/1199**. Dodatno 72 fiksurna slučaja za popunjena admin/stylist dugovanja i statistiku te neuspješan booking i retry; Aurum visoki javni header prelazi u normalni tok da ne prekrije kontrole. Detalji, ograničenja i preostali rad u `CHANGELOG.md`.

> **Novi M2 paket:** `794f0b9` / CI `44760046621` **5/5, rendered 1127/1127**. Potvrđeno 96 fiksurnih kombinacija za admin blog komentar/galeriju/recenziju s potvrdama, parametrizirani stylist preview/confirm/retry i token otkazivanje/retry u BS/EN, oba Aurum režima, 320 CSS px i simuliranom 200% root tekstu/text-spacingu. Korisnik je prijavio da je stvarni browser prošao, bez specifikacije browsera, tema ili obima; to ne zatvara sve M2 slučajeve ni ručni text-spacing. Detalji i preostali rad: `CHANGELOG.md`.

> **Naknadna korisnička potvrda:** korisnik je rekao „Stvarni browser prošao.“ Browser, režim, zum, obuhvaćene rute i text-spacing nisu specificirani; ne proširivati ovu potvrdu na sve M2 slučajeve niti tvrditi da je text-spacing ručno provjeren.

## Najnoviji M2 dokaz — CI `44740804314`

`fb34344` / [CI 44740804314](https://github.com/mudzy992/beauty-salon-v2/actions/runs/44740804314): **5/5; rendered 1031 prošlo, 0 palo, 0 preskočeno**. Fiksurno su potvrđeni popunjena knjiga rashoda i edit dijalog, stylist inbox/odbijanje/no-show/pomjeranje (60 slučajeva), booking i token stanja (108, prethodni CI `44731561761`), te analitika i postavke; opseg i raniji nalazi su u `CHANGELOG.md`. Mjere su 320 CSS px, simulirani 200% root tekst i text-spacing; nisu stvarni browser zoom ni dokaz svih podataka i stanja. Knjiga ima imenovanu, tastaturom skrolabilnu regiju. Axe kontrast na 66 ruta: 57 prošlo, 9 incomplete, 0 violations; nepotpune nalaze treba ručno pregledati.

**Otvoreno:** ostali admin paneli/dijalozi i booking/stylist/token stanja, stvarni zoom i ručni text-spacing, tastatura/fokus, čitač ekrana, forced-colors, vizuelni pregled i reduced-motion. Korisnik je ranije prijavio 200%/400% prolaz prioritetnih ruta bez specifikacije browsera/teme; to ne zatvara cijeli M2. S8 razbijanje velikih fajlova nije odobreno; nema merge/deploy. Stariji statusi ispod su historijski i ne nadjačavaju ovaj blok.


> ⚠️ **SUPERSEDED (2026-11-18, nakon Faze F (7/) ZATVORENO).** Ovaj fajl je historijski zapis iz vremena S0–S5 na grani `arena/71be6ba3-beauty-salon-v2` (2026-11-11, bazni commit `a82020e`). Program je od tada revidiran po odobrenoj `13_revidirani-plan-novi-identitet.md` odluci (koncept `docs/design/aurum-novi-identitet-koncept.html`, odobren; implementacija se vodi uz STOP samo za stvarne Aurum kontrast padove — paleta je zabranjena za samostalno mijenjanje) i realizovan kroz **Faze C, D, E, F**. Originalni sadržaj ispod je arhiva i ne mijenja se retroaktivno; stvarno stanje je u „Ažurirani status“ odmah ispod.
>
> **Gdje je izvor istine danas:** evidencija po fazama (commit + CI run id) = `CHANGELOG.md`; tokeni = NEJRA §10 + `scripts/check_ui_contrast.py`; CI status = GitHub Actions (grana `arena/dadb4053-beauty-salon-v2`, iz master `c5267fa`).


## Najnoviji status — nakon CI `44567932983`

Ovaj blok ima prednost nad starijim „Ažurirani status“ i arhivom ispod: light admin axe je urađen; O4 potvrde imaju interaktivne fiksure za svih 13 tokova (`5407b13`, CI `44579698293` 5/5); nekorišteni `aurum-stat-grid.tsx` uklonjen (`d603042`, CI `44563869689` 5/5). M2: 15 admin ruta × Aurum light/dark na 320 CSS px prošlo, nakon popravki postavki i kalendara (`7081698`, CI `44567932983` 5/5, suite 493/493). To ne dokazuje stvarni zoom, sve dijaloge i sadržaj; ručni M1/M2/M4/M5 ostaju otvoreni. Aktuelne matrice su u `.cursor/docs/matrices/aurum-theme/` i `aurum-route-coverage/`; njihovi stari dijelovi su arhiva. Root font je globalno `106.25%` (17px uz browser default 16px); Chromium provjera browser defaulta 16/20px prošla (`caeebc4` / `44585484397` 5/5). Vizuelni pregled i ručne provjere ostaju otvoreni. S8 razbijanje velikih fajlova nije odobreno ovim radom.

## Ažurirani status (2026-11-19 — skraćena mapa; evidencija 2026-11-18; detalji u `CHANGELOG.md`)

| Segment / faza | Status | Dokaz (grana `arena/dadb4053-beauty-salon-v2` osim S1–S5) |
|---|---|---|
| S0 Dizajn dokumenti + CI baseline | ✅ ZAVRŠEN 2026-11-11 | runovi `43043182552` (5/5; prva dva runa `43032814134`, `43038425689` historijski 4/5 zbog `apt` DNS-a) |
| S1 Temelj (tokeni + 3-state + primitive) | ✅ ZAVRŠEN 2026-11-11 | `ae87acf` / `43100889990` (5/5) |
| S2 Javni shell + Početna + Usluge/Detalj | ✅ ZAVRŠEN 2026-11-11, **revidiran** | `d1fb55d` / `43110763869`; revidirano u §17–§29 changeloga (naslovnica, zaglavlje, katalog, usluga/detalj) |
| S3 Javni sadržaj (blog/galerija/kontakt/klijenti) | ✅ ZAVRŠEN 2026-11-11, **revidiran** | `a12cf5b` / `43116167107`; revidirano u §22/§28–29 |
| S4 Javni tokovi (rezervacija/profil/token) | ✅ ZAVRŠEN 2026-11-11 | `7d2ab0e` / `43177106881` |
| S5 Auth + onboarding | ✅ ZAVRŠEN 2026-11-11 | `90acca2` / `43181880043` |
| S6 Admin shell + kalendar | ✅ ODOBREN I REVIDIRAN — nikada kao zaseban „S6“ batch | `approve_s6` uz `group_with_map`/`approve_map_a` (5 sekcija), `calendar_header`, O4 `allow_s7_s9`, Dashboard `preserve_existing`; realizovano kroz revidirani identitet + **Faze C (9/–18/), D, E** novi `§16` i `§30`+ u changelogu |
| S7 Dnevna knjiga/Finansije/Lojalnost | ✅ REALIZOVANO KROZ FAZE | `Faze C (15/)–C (18/)` (tokenize/standardizacija) + admin WCAG E (3/–5/); nema zasebnog S7 releasea |
| S8 Analitika/Korisnici/Salon/Usluge/Frizeri | ✅ REALIZOVANO KROZ FAZE | admin WCAG dokazi `Faze E (1/–5/)`; AnalyticsHub child proofs kroz `F (7/)`; veliki fajlovi (Users/Services/EmailSettings) ostaju — vidi otvorene stavke |
| S9 Sadržaj + Postavke hub | ✅ REALIZOVANO KROZ FAZE | tokenizacija javnih/auth/settings površina kroz `Faze C (17/–18/)`; Settings modules čistoća kroz `F (1/–2/)` |
| S10 Stylist portal | ✅ REALIZOVANO KROZ FAZE | tokenizacija `Faza C (16/)`; workbook odabir klijenta popravak (CHANGELOG §29) |
| S11 Završni prolaz | 🟡 DJELIMIČNO | rendered axe: classic ✅ 32rute · Aurum dark admin ✅ 15 · child proofs ✅ 4 · javne Aurum light/dark ✅ (theme-policy) — **Aurum light admin** ostaje 🟡 · ručne provjere M1–M5 ostaju 🟡/➖ (public 320px urađeno; admin reflow nije) |
| Bonus §30 Admin dashboard | ✅ ZAVRŠENO | `§30`+ Faze C/D/E/F; admin shell/nav/grupisanje kroz S6+reviziju; Faza F (5/) danger reconciliation; F (6/) tail komentari |

**Izmjereno 2026-11-18 (F (7/) close-out):** build **289.6 KiB / 300**; svi `frontend test:*` **205/205**; contrast strict **148/148** (2 nova Aurum-only AAA para; classic ostaje AA); i18n **2776/2776** BS/EN; `check_ci_index.py` PASS (386/389); `check_doc_links.py` PASS; `check_repo_hygiene.py` PASS (1826 putanja). Rendered axe (F (7/)): **51/51 PROLAZ** po praćenim pravilima — `1.4.6 PROLAZ 51`; `2.5.3` = 0 incomplete; `1.4.3` incomplete = Recharts legend `.legend-item-*-text` determination-blok (classic + aurum-dark; nije prekršaj, odluka E (4/)).

**Grana i CI:** F (1/) `44486871989` (`98cf7c4`) · F (2/) `44496125943` (`903123c`) · F (3/) `44508482933` (`7ec128e`) · F (4/) `44512475492` (`cf7708e`) · F (5/) `44515714897` (`a18cc8a`) · F (6/) `44518166979` (`895feb1`) · F (7/) `44523392570` (`a8b3899`) · close-out `b1206f3` / **44525141061** (5/5) — sve 5/5 2026-11-18.

**Matrice** `.cursor/docs/matrices/aurum-theme/` i `aurum-route-coverage/`: historijski, zadnji unosi su S5 (2026-11-11) — **nisu ažurirani**; njihovu evidenciju drži `CHANGELOG.md` od Faza C–F. Zasebna odluka za sync matrica je potrebna.

**Otvorene stavke (samo vlasničke odluke; ne pokretati samoinicijativno):**
1. **O4** — 13× `window.confirm` u adminu (Blog ×2, EmailSettings ×2, Gallery ×2, Reviews, Salon, Services ×2, Users ×3) → pristupačni `ConfirmDialog` (odobreni okvir S7–S9; **nije izvršeno**).
2. **Aurum light admin** rendered axe (simetrija F (7/) dark sweepa).
3. **Admin 320 px reflow / zoom** dokaz (M2) — public ima, admin nema.
4. **Ručne provjere:** čitač ekrana (M4), `forced-colors` (M5), tastaturni e2e (M1) — ostaju 🟡/➖ u sandboxu.
5. **Veliki fajlovi (S8):** `pages/Users.tsx` 1700 ln, `pages/Services.tsx` 1504, `pages/EmailSettings.tsx` 1400 — razbijanje je zaseban projekat.
6. **Dead code:** `frontend/src/features/dashboard/aurum-stat-grid.tsx` (37 ln, **0 potrošača**, zalutao u commit `6ac2b95`).

---

**Grana:** `arena/71be6ba3-beauty-salon-v2` · **Bazni commit:** `a82020e` · **Ažurirano:** 2026-11-11 (**S5 završen: `90acca2` / run `43181880043` / 5/5**) — **arhiva; vidi blok iznad**.
**Legenda:** ✅ izmjereno/provjereno · 🟡 u kodu ili planu, nije provjereno u renderu · ❌ nije zadovoljeno · ➖ nije primjenjivo · ⬜ nije započeto

---

## 0. Kapije

| # | Kapija | Status | Dokaz |
|---|---|---|---|
| K0 | Plan + CHECKLIST + matrice napisani, **bez koda** | ✅ | ovaj folder + 2 matrice; `git status` je tada pokazivao samo `.cursor/` izmjene |
| K0b | **Odobrenje plana od vlasnika** | ✅ | odgovor `approve_s0` na Kapiju 0 |
| K1–K12 | Odobrenje svakog segmenta S0–S11 prije sljedećeg | 🟡 **K0 (`approve_s0`) + K1 (S1) + K2 (S2) + K3 (`approve_s3`) + K4 (`approve_s4`) + K5 (`approve_s5`) ✅**; K6–K12 čekaju | svaki STOP-sažetak |

---

## 1. Segmenti (popunjava se po završetku svakog segmenta)

| Seg | Naziv | Status | Commit | CI run id | 5/5 | Testova | Bundle | Napomena |
|---|---|---|---|---|---|---|---|---|
| S0 | Dizajn dokumenti + popravka CI baselinea | ✅ **ZAVRŠEN** (S1 naknadno eksplicitno odobren) | `fa6d73a` + `bbd7ca5` + `3ed3069` | **`43043182552`** + `43046250037` | ✅ **5/5** | **199/199** | 276,9 KiB | rendered axe **252/252**, 0 skipped, 32 rute; prethodna 2 runa 4/5 zbog `apt` DNS-a, riješeno odobrenim `ci_fallback` |
| S1 | Temelj: tokeni + 3-state tema + primitive | ✅ **ZAVRŠEN** | `ae87acf` | **`43100889990`** | ✅ **5/5** | **203/203** | **279,1 KiB (+2,2)** | 140/140 source-only kontrastnih parova (odluka `use_140_four`); 4 nova testa + 4 CI koraka `success`; R2 potvrđen `dark_yes`; rendered axe **252 passed \| 0 failed \| 0 skipped** / 32 rute, i dalje samo na default `classic` |
| S2 | Javni shell + Početna + Usluge + Detalj | ✅ **ZAVRŠEN** | `d1fb55d` | **`43110763869`** | ✅ **5/5** | **204/204** | **279,9 KiB (+0,8)** | `dopuna_ssot`: NEJRA §10 + `test:public-aurum-hero-contrast` + CI korak; Aurum-only CSS, 6 S1 primitiva, `aria-current`, klasični markup/API/flagovi netaknuti; rendered axe **252 passed \| 0 failed \| 0 skipped** / 32 rute na default `classic`, artifact `13896851237` |
| S3 | Javni sadržaj (blog, galerija, kontakt, klijenti) | ✅ **ZAVRŠEN** | `a12cf5b` | **`43116167107`** | ✅ **5/5** | **204/204** | **280,9 KiB (+1,0)** | `approve_s3`; 5 ruta + 2 dijeljene blog komponente u `isAurum` grani, 164 Aurum-only CSS linije, `DialogDescription`, `fieldset/legend`, `aria-describedby`, 11 novih BS/EN ključeva (2728/2728); API/parser/flagovi/`PublicFeatureGate`/`components/ui/*`/`media-image.tsx` 0 diff; rendered axe **252 passed \| 0 failed \| 0 skipped** / 32 rute na default `classic`, artifact `13899570263`; 1 source-contract regex proširen uz obrazloženje u §10 plana |
| S4 | Javni tokovi (rezervacija, profil, token…) | ✅ **ZAVRŠEN** | `7d2ab0e` | **`43177106881`** | ✅ **5/5** | **204/204** | **281,3 KiB (+0,4)** | `approve_s4`; 6 ruta + 3 dijeljene komponente, 130 Aurum-only CSS linija (append-only), `<time dateTime>` ×3, `ConfirmDialog` za revoke saglasnosti, 2 nova BS/EN ključa (**2730/2730**); FSM/`disabled`/`aria-pressed`/idempotency/stale refovi/API **0 diff**; `PublicFeatureGate` netaknut; rendered axe **252 passed \| 0 failed \| 0 skipped** / 32 rute na default `classic`, artifact `13924239127` (331564 B) |
| S5 | Auth + onboarding + NotFound | ✅ **ZAVRŠEN** | `90acca2` | **`43181880043`** | ✅ **5/5** | **204/204** | **281,6 KiB (+0,3)** | `approve_s5` + **O2 = `card_header`**; 7 ekrana, novi `AuthCardHeader`, 84 append-only Aurum CSS linije, `<h1>` na NotFound; **0 diff** auth tokova/guardova/`autocomplete`/OTP/busy-stale/API/`PublicFeatureGate`; bez novih i18n ključeva (**2730/2730**); rendered axe **252 passed \| 0 failed \| 0 skipped** / 32 rute na default `classic`, artifact `13926547985` (331785 B) |
| S6 | Admin shell + Dashboard + Rezervacije + kalendar | ⬜ | — | — | ⬜ | — | — | pitanje: grupisanje navigacije |
| S7 | Dnevna knjiga, Finansije, Lojalnost | ⬜ | — | — | ⬜ | — | — | financijski paritet |
| S8 | Analitika, Korisnici, Salon, Usluge, Frizeri | ⬜ | — | — | ⬜ | — | — | razbijanje velikih fajlova |
| S9 | Sadržaj + Postavke hub (7 tabova) | ⬜ | — | — | ⬜ | — | — | Q9 napomena |
| S10 | Stylist portal (10 ekrana + 2 redirecta) | ⬜ | — | — | ⬜ | — | — | `stylist-portal.api.ts` 0 diff |
| S11 | Završni prolaz: rendered a11y, docs, dead code | ⬜ | — | — | ⬜ | 204+ | ≤300 KiB | axe za 3 stanja |

---

## 2. Zajednička kapija svakog segmenta (kopirati u STOP-sažetak)

- [ ] Implementirani **samo** fajlovi iz popisa segmenta.
- [ ] `python3 scripts/check_repo_hygiene.py` → PASS
- [ ] `python3 scripts/check_ci_index.py` → PASS
- [ ] `python3 scripts/check_doc_links.py` → PASS
- [ ] `python3 scripts/check_i18n.py --strict` → PASS (BS/EN paritet)
- [ ] `python3 scripts/check_ui_contrast.py --strict` → PASS (**140/140** od S1; 80 klasičnih + 60 Aurum)
- [ ] Puna `test:*` petlja `frontend/package.json` → sve zeleno; nijedan test oslabljen
- [ ] `cd frontend && npm run build` → `tsc -b` + Vite + budžet ≤300 KiB gzip
- [ ] `cd frontend && npm run typecheck:e2e` → 0
- [ ] `git diff --check HEAD` → čisto
- [ ] `git push origin arena/71be6ba3-beauty-salon-v2`
- [ ] `gh run watch <id>` → `repo-checks` / `backend` / `frontend` / `a11y-e2e` / `mobile` = **5/5 success**
- [ ] `CHECKLIST.md`, `CHANGELOG.md`, `HANDOFF.md`, `MATRIX.md` ažurirani s točnim sha + run id
- [ ] STOP-sažetak poslan + pitanje za odobrenje sljedećeg segmenta

---

## 3. Cross-cutting ugovor (provjerava se u svakom segmentu)

| Stavka | Status | Napomena |
|---|---|---|
| 58 deklaracija ruta radi; stari URL-ovi + `?tab=` očuvani | ✅ **S2 + S3 + S4 + S5** | `app/router.tsx` i svi guardovi **0 diff** kroz S5; 14/14 javnih + 6/8 auth/izuzetaka = **20/58** ekrana pod Aurum slojem |
| API ugovori, `queryKeys`, socket eventi, guardovi netaknuti | ✅ **S2 + S3 + S4** | Q10; S4 `git diff -U0` bez API/`queryKey`/`*RequestIdRef`/`Idempotency`/`setStep`/statusa/`disabled` uslova |
| Podaci, iznosi, datumi, statusi, sort, paginacija, zbir netaknuti | ✅ **S2** | `features/public-catalog/*` i `data/*.mjs` 0 diff; paritet testi zeleni |
| BS/EN paritet; bez hard-coded stringova | ✅ **S2 + S3 + S4** | `check_i18n.py --strict` **2730/2730** nakon 2 nova S4 ključa s `{{service}}`/`{{date}}`; `i18n-key-resolution` 0 interpolacijskih propusta |
| Bez tvrdih boja; samo semantički tokeni | ✅ **S2 + S3 + S4** | S4 CSS isključivo `hsl(var(--*))` + `var(--aurum-*)` + `var(--nejra-hero-*)`; `git diff` bez novog hard-coded hexa; S2/S3 blokovi 0 uklonjenih linija |
| Bez novih npm zavisnosti | ✅ **S2** | Q10; `frontend/package-lock.json` 0 diff |
| `/mobile`, `/backend`, `.env`, migracije, druge grane netaknute | ✅ **S2** | `git diff --stat` u STOP-sažetku |
| Code hygiene: produkcijski fajlovi ~100–150 ln, bez mrtvog koda | ⬜ | S8 razbijanje + S11 brisanje |
| `framer-motion` / `MotionConfig reducedMotion="user"` poštovan | ✅ **S2** | `providers.tsx` netaknut; `test:wcag-source-contracts` zelen; hero `drift` ima eksplicitni `prefers-reduced-motion` isključivač |
| Nijedna WCAG tvrdnja nije ✅ bez dokaza | ⬜ | legenda ✅/🟡/❌/➖ |

---

## 4. Rendered / ručna provjera (ostaje 🟡 do S11, bez glumljenja prolaza)

| # | Provjera | Status | Gdje se dokazuje |
|---|---|---|---|
| M1 | Tastatura end-to-end: CRUD, filteri, dijalozi, kalendar, upload, izvoz | 🟡 | S11 ručna checklista + `test:tab-traversal` |
| M2 | Zoom 200% / 400%, reflow 320 px, text-spacing override | ✅ | korisnička potvrda za `718fbe0` (Brave/Edge, Windows) + automatizovane 320px fiksure; ograničenja u `15_rucni-pregled.md` |
| M3 | Fokus: prsten 3:1, `2.4.11` sticky, povratak nakon dijaloga/brisanja/rute | 🟡 | S11 axe + ručno |
| M4 | Čitač ekrana (NVDA/VoiceOver) nad 3 stanja teme | 🟡 | nema ga u sandboxu → ostaje 🟡 s razlogom |
| M5 | `forced-colors` / high contrast | 🟡 | S11 ručno |
| M6 | `prefers-reduced-motion` u svim animacijama | 🟡 | `test:wcag-source-contracts` + `test:settle-animations` |
| M7 | Rendered axe za **classic / aurum-light / aurum-dark** | 🟡 | **isključivo `a11y-e2e` u S11**; u sandboxu `test:a11y-routes` ispisuje `SKIPPED` |
| M8 | Stvarni email klijent za `EmailSettings` preview | ➖ | izvan opsega (kao i u baseline auditu) |
| M9 | Fizički uređaj / mobilna aplikacija | ➖ | Q3 isključuje `/mobile` |

---

## 5. Odluke vlasnika (brzi podsjetnik; puna tablica u `00_overview.md`)

Q1 puna specifikacija · Q2 Aurum kao dodatna tema · Q3 sve web rute, bez mobile/backend · Q4 novi plan od nule · Q5 kreirati v2/v3 · Q6 plan → STOP po segmentu · Q7 NEJRA = jedini izvor istine · Q8 izbornik s 3 opcije · Q9 Aurum fiksira paletu · Q10 strogi paritet + dopušteno grupisanje · Q11 nove AI ilustracije.

---

## 6. Baseline kvar koji se rješava u S0

`frontend/scripts/design-reference.test.mjs` → `ENOENT: docs/design/referentni-prijedlog-v2.html`. Izmjereno: **197 PASS / 1 FAIL** od 198 `test:*` skripti; sve Python provjere i build zeleni. CI na grani je zato crven prije rada; **nema pusha prije S0**.
