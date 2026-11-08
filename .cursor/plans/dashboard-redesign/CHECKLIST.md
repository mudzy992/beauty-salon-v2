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
| 0 | Temelj (tokeni, shell, primitivi, šabloni) | `[~]` | **STOP poslije** |
| 1 | Dashboard (pilot) | `[ ]` | **STOP poslije** |
| 2 | Rezervacije (lista + kalendar) | `[ ]` | |
| 3 | Dnevna knjiga | `[ ]` | |
| 4 | Finansije | `[ ]` | |
| 5 | Lojalnost | `[ ]` | |
| 6 | Analitika (+ M1 ako odobren) | `[ ]` | |
| 7 | Korisnici | `[ ]` | |
| 8 | Salon / Usluge / Frizeri | `[ ]` | |
| 9 | Sadržaj (Blog, Galerija, Recenzije) | `[ ]` | |
| 10 | Postavke (+ M2 ako odobren) | `[ ]` | |
| 11 | Stylist portal | `[ ]` | |
| 12 | Onboarding / ForceChangePassword | `[ ]` | |
| 13 | Zaključak (globalni prolaz, sweep, docs) | `[ ]` | |

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
