# Faza 13 — Zaključak: globalni a11y prolaz, dead-code sweep, dokumentacija

---

## 1. Inventar funkcionalnosti

Ova faza **ne dodaje i ne uklanja funkcionalnost**. Radi se:

1. Globalni prolaz kroz sve rute (admin + stylist + onboarding).
2. Dead-code sweep.
3. Ažuriranje dokumentacije i matrica.
4. Konačan izvještaj sa **iskrenom listom onoga što nije verifikovano u renderu**.

## 2. Inventar podataka

Nema novih podataka. Provjera da nijedna prethodna faza nije promijenila formatiranje:
`formatLocalizedAmount`, `formatLocalizedNumber`, `formatLocalizedDateTime`, `formatDateOnlyLocale`,
`getIntlLocale` — grep da se svuda koriste isti helperi (bez lokalnih `toFixed`/`Intl` kopija).

## 3. Zadaci

| # | Zadatak | WCAG |
|---|---|---|
| D1 | **Globalni a11y prolaz po rutama:** tastatura (cijeli tok bez miša), zoom 200% i 400%, reflow 320px, text spacing override, landmark/heading struktura, jedinstven `<title>`, live regioni, `forced-colors` | 1.3.1, 1.4.4, 1.4.10, 1.4.12, 2.1.1, 2.4.1–2.4.7, 4.1.3 |
| D2 | **Dead-code sweep:** `components/ui/tooltip.tsx` (**0 upotreba**, potvrđeno grep-om) — obrisati ili obrazložiti zadržavanje; nekorišteni i18n ključevi; nekorišteni tokeni; nekorištene `cva` varijante | — |
| D3 | **Sweep sirovih boja:** grep `text-slate-*`/hex u admin/stylist fajlovima → allowlist obrazloženih izuzetaka | 1.4.3 |
| D4 | **Provjera `prefers-reduced-motion`** na svim animacijama (uklj. `app-logo`, Radix `animate-in`, Sonner) | 2.3.3 |
| D5 | **Provjera 2.5.7** za `BeforeAfterSlider` (dijeljen s javnim) — ima li tastaturnu alternativu; ako nema, zabilježiti kao nalaz (ne dirati bez odobrenja) | 2.5.7 |
| D6 | **1.2.x provjera** — ima li audio/video u admin UI (blog/galerija mediji) | 1.2.x |
| D7 | **Ažuriranje docs:** `docs/audit/FINDINGS.md` (A11Y-01 status + ostatak), `docs/audit/HANDOFF.md`, `docs/codebase-map/FRONTEND.md`, `SOURCE_OF_TRUTH.md` (kratko, bez preuveličavanja) | — |
| D8 | **Konačna WCAG 2.2 matrica** sa statusima po kriteriju i modulu | — |
| D9 | **Izvještaj:** šta je objedinjeno, mapa starih → novih ruta, poznata ograničenja, preporuke | — |
| D10 | Novi nalazi (bugovi u postojećoj logici nađeni usput) → `HANDOFF.md` / `FINDINGS.md`, **bez tihog popravljanja** | — |

## 4. Razbijanje fajlova

Nema novih fajlova, osim dokumentacije. Moguće: `docs/audit/UX_UI_ROUTE_INVENTORY.md` dopuna.

## 5. WCAG stavke

Svi kriteriji iz [`dashboard-a11y/MATRIX.md`](../../docs/matrices/dashboard-a11y/MATRIX.md) dobijaju konačan status.

## 6. Rizici

| Rizik | Mitigacija |
|---|---|
| **Brisanje „mrtvog“ koda koji zapravo negdje radi** | grep + build + svi testovi prije brisanja |
| **Preuveličavanje u dokumentaciji** | svaka tvrdnja dobija status ✅/🟡/❌/➖ i način provjere; ništa se ne označi ✅ bez dokaza |
| Ažuriranje `docs/audit/*` pokvari `check_doc_links.py` | pokrenuti skriptu poslije svake izmjene |

## 7. Testovi

Svi postojeći (142 skripte) + svi novi iz faza 0–12. Plus:
- `test:no-window-confirm` (globalno, osim `media-consent-panel` ako Q2/odluka drugačije)
- `test:no-raw-colors` (allowlist-based sweep)
- `test:a11y-routes` (**samo ako Q4 odobren**)

## 8. Definition of Done

- [ ] Svi testovi zeleni; `npm run build` prolazi; 4 reporske provjere zelene
- [ ] WCAG matrica popunjena za sve module, svaki status obrazložen
- [ ] `FINDINGS.md` A11Y-01 ažuriran **realno** (šta je zatvoreno source-contract dokazom, šta čeka rendered/browser/screen-reader)
- [ ] Mrtav kod obrisan ili obrazloženo zadržan
- [ ] Javni sajt i mobilna aplikacija bez diff-a
- [ ] Konačan izvještaj predat

## 9. Obim

Dokumentacija + ~10 fajlova (sweep), 2–3 commita.
