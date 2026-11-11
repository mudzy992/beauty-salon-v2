# CHECKLIST — Aurum web refaktor

**Grana:** `arena/71be6ba3-beauty-salon-v2` · **Bazni commit:** `a82020e` · **Ažurirano:** 2026-11-11 (Kapija 0)
**Legenda:** ✅ izmjereno/provjereno · 🟡 u kodu ili planu, nije provjereno u renderu · ❌ nije zadovoljeno · ➖ nije primjenjivo · ⬜ nije započeto

---

## 0. Kapije

| # | Kapija | Status | Dokaz |
|---|---|---|---|
| K0 | Plan + CHECKLIST + matrice napisani, **bez koda** | ✅ | ovaj folder + 2 matrice; `git status` je tada pokazivao samo `.cursor/` izmjene |
| K0b | **Odobrenje plana od vlasnika** | ✅ | odgovor `approve_s0` na Kapiju 0 |
| K1–K12 | Odobrenje svakog segmenta S0–S11 prije sljedećeg | ⬜ | svaki STOP-sažetak |

---

## 1. Segmenti (popunjava se po završetku svakog segmenta)

| Seg | Naziv | Status | Commit | CI run id | 5/5 | Testova | Bundle | Napomena |
|---|---|---|---|---|---|---|---|---|
| S0 | Dizajn dokumenti + popravka CI baselinea | 🔴 **BLOKIRAN: 4/5 CI** | `fa6d73a` | `43032814134` / `43038425689` | ❌ | **199/199** | 276,9 KiB | lokalno sve zeleno; `a11y-e2e` pao na `apt` DNS-u runnera prije axe suite; čeka odluku vlasnika |
| S1 | Temelj: tokeni + 3-state tema + primitive | ⬜ | — | — | ⬜ | 203 | — | jedini novi feature; potvrda R2 |
| S2 | Javni shell + Početna + Usluge + Detalj | ⬜ | — | — | ⬜ | — | — | |
| S3 | Javni sadržaj (blog, galerija, kontakt, klijenti) | ⬜ | — | — | ⬜ | — | — | |
| S4 | Javni tokovi (rezervacija, profil, token…) | ⬜ | — | — | ⬜ | — | — | najstroži paritet FSM-a |
| S5 | Auth + onboarding + NotFound | ⬜ | — | — | ⬜ | — | — | pitanje: mjesto ThemeSwitcher-a |
| S6 | Admin shell + Dashboard + Rezervacije + kalendar | ⬜ | — | — | ⬜ | — | — | pitanje: grupisanje navigacije |
| S7 | Dnevna knjiga, Finansije, Lojalnost | ⬜ | — | — | ⬜ | — | — | financijski paritet |
| S8 | Analitika, Korisnici, Salon, Usluge, Frizeri | ⬜ | — | — | ⬜ | — | — | razbijanje velikih fajlova |
| S9 | Sadržaj + Postavke hub (7 tabova) | ⬜ | — | — | ⬜ | — | — | Q9 napomena |
| S10 | Stylist portal (10 ekrana + 2 redirecta) | ⬜ | — | — | ⬜ | — | — | `stylist-portal.api.ts` 0 diff |
| S11 | Završni prolaz: rendered a11y, docs, dead code | ⬜ | — | — | ⬜ | 203+ | ≤300 KiB | axe za 3 stanja |

---

## 2. Zajednička kapija svakog segmenta (kopirati u STOP-sažetak)

- [ ] Implementirani **samo** fajlovi iz popisa segmenta.
- [ ] `python3 scripts/check_repo_hygiene.py` → PASS
- [ ] `python3 scripts/check_ci_index.py` → PASS
- [ ] `python3 scripts/check_doc_links.py` → PASS
- [ ] `python3 scripts/check_i18n.py --strict` → PASS (BS/EN paritet)
- [ ] `python3 scripts/check_ui_contrast.py --strict` → PASS (80 → 140 parova od S1)
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
| 58 deklaracija ruta radi; stari URL-ovi + `?tab=` očuvani | ⬜ | Q10; `TabRedirect` / `<Navigate replace>` |
| API ugovori, `queryKeys`, socket eventi, guardovi netaknuti | ⬜ | Q10 |
| Podaci, iznosi, datumi, statusi, sort, paginacija, zbir netaknuti | ⬜ | `test:dashboard-stat-parity`, `test:finance-summary-parity`, `test:daily-log-amount-parity` |
| BS/EN paritet; bez hard-coded stringova | ⬜ | `check_i18n.py --strict` |
| Bez tvrdih boja; samo semantički tokeni | ⬜ | `test:theme-ssot-sync` od S1 |
| Bez novih npm zavisnosti | ⬜ | Q10 |
| `/mobile`, `/backend`, `.env`, migracije, druge grane netaknute | ⬜ | `git diff --stat` u svakom STOP-sažetku |
| Code hygiene: produkcijski fajlovi ~100–150 ln, bez mrtvog koda | ⬜ | S8 razbijanje + S11 brisanje |
| `framer-motion` / `MotionConfig reducedMotion="user"` poštovan | ⬜ | `test:wcag-source-contracts` |
| Nijedna WCAG tvrdnja nije ✅ bez dokaza | ⬜ | legenda ✅/🟡/❌/➖ |

---

## 4. Rendered / ručna provjera (ostaje 🟡 do S11, bez glumljenja prolaza)

| # | Provjera | Status | Gdje se dokazuje |
|---|---|---|---|
| M1 | Tastatura end-to-end: CRUD, filteri, dijalozi, kalendar, upload, izvoz | 🟡 | S11 ručna checklista + `test:tab-traversal` |
| M2 | Zoom 200% / 400%, reflow 320 px, text-spacing override | 🟡 | S11 `test:dom-metrics` + ručno |
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
