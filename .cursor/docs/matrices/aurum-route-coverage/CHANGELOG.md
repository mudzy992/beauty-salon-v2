# CHANGELOG — aurum-route-coverage matrica

## 2026-11-11 · K0 · Matrica kreirana (PLAN)

**Šta:** popisano **58 deklaracija ruta** (javne 14, auth/izuzeci 8, admin 24, stylist 12) + 13 dijeljenih slojeva, svaki s vlasničkim segmentom S0–S11, ključnim testovima i statusom.

**Zašto:** Q3 traži refaktor svih web ruta bez izuzetka; matrica je jedini način da se dokaže da nijedna ruta nije preskočena i da se u S11 potvrdi 58/58.

**Izvor:** isključivo `frontend/src/app/router.tsx`, `app/routes/public.routes.tsx`, `app/routes/admin.routes.tsx` i `docs/audit/UX_UI_ROUTE_INVENTORY.md`. Nijedna ruta nije izmišljena; `TabRedirect`/`<Navigate>` su označeni ➖ jer nemaju vlastiti ekran.

**Status:** svi redovi ⬜ (ili ➖ za redirecte). Ažurira se po svakom segmentu; bez koda, bez commit/push.

## 2026-11-11 · S0 · Mapa ruta preslikana u punu specifikaciju

**Šta:** 58 redaka iz ove matrice preslikano je u §09 dokumenta `NEJRA – beauty salon · Referentni dokument.html` (ruta, ekran, skup, stanja, prijelom, segment). `test:design-spec` sada tvrdi da tablica ima točno 58 redaka i da ključne rute nisu izbrisane (mutacijska provjera na `/stylist/stats`).

**Zašto:** Q1/Q7 — dizajn dokument je jedini izvor istine i mora sadržavati provjerljivu mapu svih ruta; bez toga bi se u S2–S10 mogla preskočiti neka ruta.

**Status:** ✅ za „Dizajn dokumenti" i „CI" — run **`43043182552`** je **5/5** nakon odobrenog `ci_fallback`; `test:design-spec` i rendered axe (252/252) su zeleni. Prva dva runa (`43032814134`, `43038425689`) ostaju historijski 4/5 zbog `apt` DNS-a. Svih 58 ruta i dalje ⬜ jer refaktor koda još nije započet. Bez izmjena u `frontend/src`.

---

## 2026-11-11 · S1 · Dijeljeni temelj implementiran, rute još nisu refaktorisane

**Šta:** u §5 (dijeljeni slojevi) prebačeni u ✅/🟡 redovi za providere, CSS tokene/Tailwind, `features/shell/theme/*`, `features/shell/aurum/ui/*` (8 novih primitiva), i18n, kontrast skriptu i CI (S1 dio: 4 nova koraka / 4 nove `test:*` skripte). Stare `features/shell/admin/ui/*` ostaju ⬜ do S11. Svih **58 deklaracija ruta i dalje ⬜** — S1 po ugovoru ne mijenja nijednu rutu, API, `queryKey`, socket, guard ni podatke.

**Zašto:** S1 je „temelj" koji S2–S10 konzumiraju; `ThemeSwitcher` je montiran u 3 shella, ali stil i migracija ekrana dolaze tek u njihovim segmentima. Matrica ne smije tvrditi da je ruta obrađena ako njen ekran nije diran.

**Status:** ✅ lokalni dokazi (203/203 `test:*`, 140/140 kontrast, 2717/2717 i18n, 5 Python gate-ova, build 279,1/300 KiB, `typecheck:e2e` 0); 🟡 rendered axe za Aurum stanja do S11. **CI:** commit `ae87acf` (`ae87acfbde4b2b2411afcd3ed5ade5c20ed72ec4`), run **`43100889990`** = **5/5 success**; `a11y-e2e` job `130791757930`: **252 passed | 0 failed | 0 skipped** nad 32 rute na **default `classic`**, artifact `playwright-a11y-report.zip` ID `13891846859` (331192 B); 4 nova S1 koraka (`130791757438` #155–#158) su `success`.


---

## 2026-11-11 · S2 · Prve 3 javne rute + javni shell refaktorisani

**Šta:** redovi 1–3 (`/`, `/usluge`, `/usluge/:serviceId`) i „Javni shell" prebačeni u ✅; „Dijeljeni UI" ima grep dokaz **0 diff**; „Nove primitive" bilježi 6/8 potrošača. `PublicHome` dobio filmski Aurum hero, `PublicServices` Aurum `FilterBar`/`EmptyState`/`ErrorState`/`TableSkeleton`, `PublicServiceDetail` Aurum `PageHeader`/`StatusBadge`. Klasične grane u izvoru ostaju doslovno identične; API/`queryKey`/stale brojači/flagovi/`data/*.mjs` netaknuti.

**Zašto:** S2 je prvi segment koji konzumira S1 temelj; NEJRA §09 potvrđuje da su ovo jedine S2 rute. `dopuna_ssot` je razriješila STOP uvjet za hero kontrast u §10.

**Status:** ✅ **204/204** `test:*` (novi `test:public-aurum-hero-contrast` 4/4 + CI korak), 5 Python gate-ova, build 279,9/300 KiB. **CI:** commit `d1fb55d` (`d1fb55d7006e8e74c24f6f0ee018424136c92ba7`), run **`43110763869`** = **5/5 success**; `a11y-e2e` job `130825854913` **252 passed | 0 failed | 0 skipped** / 32 rute na default `classic`, artifact `13896851237`. Preostalih 55 ruta i rendered axe za 3 stanja ostaju ⬜/🟡 do S3–S11.
