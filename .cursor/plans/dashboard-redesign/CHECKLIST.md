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
| 6 | Analitika (+ M1 ako odobren) | `[ ]` | |
| 7 | Korisnici | `[ ]` | |
| 8 | Salon / Usluge / Frizeri | `[ ]` | |
| 9 | Sadržaj (Blog, Galerija, Recenzije) | `[ ]` | |
| 10 | Postavke (+ M2 ako odobren) | `[ ]` | |
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
