# S11 — Završni prolaz: rendered a11y za 3 stanja, reflow, docs, dead code

**Status:** 🟡 čeka odobrenje S10 · **Posljednji segment; nakon njega nema STOP-a za sljedeći segment, nego predaja projekta.**

---

## 1. Cilj

Zatvoriti sve 🟡 stavke koje se **mogu** zatvoriti bez izmišljanja: proširiti rendered axe/i18n/reflow provjere na **sva 3 stanja teme**, ukloniti sav mrtvi kod nastao migracijom šablona, uskladiti dokumentaciju sa stvarnim stanjem i predati potpuni dokazni paket (lokalni + CI).

---

## 2. Ulaz

S10 završen (5/5); sve 58 deklaracija ruta refaktorisano; `HANDOFF.md` ima broj preostalih potrošača starih `features/shell/admin/ui/*` šablona; matrice `aurum-theme` i `aurum-route-coverage` ažurne.

---

## 3. Fajlovi

| Fajl | Akcija |
|---|---|
| `frontend/e2e/a11y-aurum.spec.ts` | **NOVO** — rendered axe + osnovne interakcije u `aurum-light` i `aurum-dark` na reprezentativnim rutama (javna početna, rezervacija, admin dashboard, settings, stylist inbox); pokreće ga **postojeći** `test:a11y-routes` (`npx playwright test` pokupi sve specove) → nema nove npm skripte ni novog CI koraka |
| `frontend/e2e/a11y-routes.spec.ts`, `a11y-admin.spec.ts`, `a11y-stylist.spec.ts`, `wcag-rendered.spec.ts` | **IZMJENA samo ako treba** — parametrizacija stanja teme bez slabljenja postojećih asertacija |
| `frontend/e2e/dom-metrics.mjs`, `tab-traversal.mjs`, `axe-coverage.mjs` | **IZMJENA** — mjere za 3 stanja; `test:dom-metrics`, `test:tab-traversal`, `test:axe-coverage` zadržavaju istu garanciju |
| `frontend/src/features/shell/admin/ui/*` (stari šabloni) | **BRISANJE** — samo fajlovi s **0 potrošača** (grep dokaz u `CHANGELOG.md`); testovi koji su ih čitali ažuriraju se na nove primitive uz obrazloženje |
| `frontend/src/**` (preostali mrtvi kod) | **BRISANJE** — `code-hygiene-and-matrices.mdc`: odmah brisati, bez `TODO` ostavljanja |
| `docs/audit/CI.md` | **IZMJENA** — stvarni broj testova, novi koraci, rendered pokrivenost 3 stanja, točan run id |
| `docs/codebase-map/FRONTEND.md`, `docs/audit/UX_UI_ROUTE_INVENTORY.md` | **IZMJENA** — nove putanje, nove primitive, 3 stanja teme, statusi |
| `SOURCE_OF_TRUTH.md` | **IZMJENA** — samo snapshot činjenice (stack, dizajn izvor, CI opseg); bez tvrdnji o produkciji |
| `README.md` | **BEZ IZMJENE** (prezentacijski dokument, ne tehnčki izvor) |
| `.cursor/plans/aurum-web-refactor/{CHECKLIST,CHANGELOG,HANDOFF}.md`, `.cursor/docs/matrices/aurum-theme/*`, `aurum-route-coverage/*`, `.cursor/docs/matrices/dashboard-a11y/*` | **IZMJENA** — konačni statusi |
| `scripts/check_ui_contrast.py` | **BEZ IZMJENE** osim ako se pronađe stvarni propust (tada STOP + pitanje) |

---

## 4. Ugovor

- **Nijedan test se ne briše niti slabi.** Ako brisanje starog šablona ostavi test bez mete, test se preusmjerava na novu primitivu sa **istom garancijom** i obrazloženjem u `CHANGELOG.md`.
- `check_ci_index.py` ostaje zelen; `test:a11y-routes` i dalje jedini pokreće Playwright (nema duplog koraka).
- **Iskrenost:** sve što se ne može provjeriti bez stvarnog čitača ekrana / fizičkog uređaja ostaje 🟡 ili ➖ s razlogom; nikad ✅ „na osnovu izvora" za rendered kriterij.
- Bez novih zavisnosti; bez promjena `/backend`, `/mobile`, `.env`, migracija; bez PR-a, merge-a ili deploya.
- Dokumentacija se ažurira **samo onim što je stvarno implementirano i CI-provjereno**; ne prepisuju se historijski audit nalazi.

---

## 5. Koraci

1. `grep -rn` svih potrošača starih šablona → spisak s 0 potrošača → brisanje → ažuriranje pogođenih testova → `check_ci_index.py` + puna `test:*` petlja.
2. `a11y-aurum.spec.ts`: za svako od 3 stanja postaviti `localStorage`/`data-skin` prije posjete ruti (kroz javni `ThemeSwitcher`, ne privatnim hackom), pokrenuti axe (`critical`/`serious` asertacije kao u postojećim specovima), provjeriti `aria-pressed` izbornika, fokus prsten, `role="status"` najavu i kontrast; **classic ostaje default i njime se ne manipulira u ostalim specovima**.
3. `dom-metrics` / `tab-traversal` / `axe-coverage`: proširiti mjerenje na 320 px / 200% / 400% zoom i 3 stanja; `test:settle-animations` i `prefers-reduced-motion` ostaju.
4. Ručna checklista u `CHECKLIST.md`: tastatura end-to-end (CRUD, filteri, dijalozi, kalendar, upload, izvoz), zoom 200/400%, text-spacing, `forced-colors`, NVDA/VoiceOver, fokus-povratak nakon brisanja reda i promjene rute. **Svaka stavka dobija ✅ (s dokazom) / 🟡 (nije provjereno u renderu) / ➖ (nije primjenjivo, zašto)**; u sandboxu se ne glumi prolaz.
5. Docs sync: ažurirati navedene fajlove; u `docs/audit/CI.md` upisati točan broj `test:*` skripti, 140 kontrastnih parova, nove CI korake i id zelenog runa.
6. Matrice: `aurum-theme/MATRIX.md` i `aurum-route-coverage/MATRIX.md` → svi redovi ✅ ili 🟡 s razlogom; `dashboard-a11y/MATRIX.md` ažurirati samo za kriterije koje je S11 stvarno izmjerio.
7. Finalna provjera cijelog repozitorija (§7), završni commit + push + `gh run watch`, pa predaja.

---

## 6. Testovi

- Puna `test:*` petlja (203+ skripti, sve zelene).
- `test:a11y-routes` u CI: `a11y-routes`, `a11y-admin`, `a11y-stylist`, `wcag-rendered` + novi `a11y-aurum` spec; `auth.setup.ts` i dalje kreira CI-only naloge; status fajlovi se ne smiju tiho preskočiti (CI korak već ih anotira).
- `test:dom-metrics`, `test:tab-traversal`, `test:axe-coverage`, `test:settle-animations`, `test:wcag-source-contracts`, `test:theme-ssot-sync`, `test:theme-state`, `test:theme-brand-precedence`, `test:theme-switcher-a11y`.
- `check_ui_contrast.py --strict` (140/140), `check_i18n.py --strict`, `check_doc_links.py`, `check_repo_hygiene.py`, `check_ci_index.py`.

---

## 7. CI provjere — završna matrica

| Lokalno | CI |
|---|---|
| 5 Python provjera | `repo-checks` |
| puna `test:*` petlja | `frontend` (svaki korak) |
| `npm run build` + budžet ≤300 KiB | `frontend` + Docker build |
| `npm run typecheck:e2e` | `frontend` |
| `git diff --check` | dio `repo-checks` |
| `test:a11y-routes` → `SKIPPED` u sandboxu (iskreno) | **`a11y-e2e`: stvarni Chromium + axe za 3 stanja** |
| — | `backend`, `mobile` (netaknuti, moraju biti zeleni) |

Push → `gh run watch <id>` → **5/5 success**. Ako `a11y-e2e` padne na Aurum stanju → popravka u S11, novi commit + push + novi run; segment se ne zatvara dok nije zelen.

---

## 8. DoD + dokazi (predaja projekta)

- ✅ 58/58 ruta u 3 stanja; 0 mrtvih šablona; 0 mrtvog koda; svi testovi zeleni; 140/140 kontrast; paritet; build u budžetu.
- ✅ CI 5/5 s **rendered axe dokazom za classic / aurum-light / aurum-dark**; run id + commit sha u svim evidencijama.
- ✅ Dokumentacija i matrice usklađene; svaka 🟡/➖ stavka ima razlog; nijedna lažna ✅ tvrdnja.
- ✅ `CHANGELOG.md` sadrži svih 12 segmenata (šta, zašto, testovi, CI run id); `HANDOFF.md` sadrži odluke Q1–Q11, rizike i preostali ručni posao.
- ✅ Potvrda da `/mobile`, `/backend`, `.env`, migracije i druge grane **nisu dirani** (`git diff --stat` u sažetku).
- **Kraj:** predaja sažetka bez pitanja za sljedeći segment; navesti tačno šta ostaje za ručnu provjeru (čitač ekrana, fizički uređaj, stvarni email klijent) i da nije bilo deploya/PR-a/merge-a.

---

## 9. Rizici / pitanja

- Ako `a11y-aurum.spec.ts` otkrije kontrastni propust u Aurum tamnoj koji `check_ui_contrast.py` nije vidio (rendered vs source) → **STOP + pitanje**: Q9 zabranjuje samostalnu promjenu palete; potreban je prijedlog minimalne korekcije (samo svjetlina, uz stari→novi omjer) i odobrenje.
- Ako brisanje starog šablona pokaže da ga još koristi neki ekran izvan 58 ruta (npr. `e2e` harness) → ne brisati, zabilježiti i pitati.
- Ne tvrditi „WCAG 2.2 AA u potpunosti zadovoljen": u sandboxu nema čitača ekrana ni fizičkog uređaja; ostaje 🟡 za 1.3.2, 1.4.4, 1.4.12, 2.1.1, 3.3.1–3.3.3 u punom renderu, kao i u baseline `dashboard-a11y/MATRIX.md`.
- Ako vlasnik želi PR/merge → to je **novi zahtjev**; ovaj plan izričito ne otvara PR niti merge-a.
