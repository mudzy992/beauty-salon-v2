# CHANGELOG — dashboard-a11y matrica

## 2026-11-08 — Inicijalno kreiranje (ETAPA A, plan)

**Šta:** kreirana `MATRIX.md` sa kompletnom WCAG 2.2 matricom (A + AA + AAA gdje je izvodivo) za web dashboard.

**Zašto:** `PROMPT_dashboard_redesign.md` §5 i A4 traže WCAG matricu u ETAPI A, prije bilo kakve implementacije.

**Sadržaj:**
- 4 sekcije (Perceivable / Operable / Understandable / Robust), ukupno **57 kriterija**
- Za svaki: kako se rješava, vlasnik (`shell` / `ui` / `modul` / `repo`), faza, status, način verifikacije
- Eksplicitna legenda ✅ / 🟡 / ❌ / ➖ sa pravilom da ✅ ide **samo** uz dokaz (test, skripta, proračun)
- AAA odluke (1.4.6, 1.4.8, 1.4.9, 2.3.3, 2.4.12, 2.4.13, 2.5.5, 3.3.9) sa razlogom za svaku
- Napomena da je 4.1.1 Parsing uklonjen u WCAG 2.2

**Stanje na dan kreiranja (izmjereno, ne procijenjeno):**
- ✅ verifikovano: 3 kriterija
- 🟡 zadovoljeno u kodu, nije verifikovano u renderu: 21
- ❌ nije zadovoljeno (planirano po fazama): 24
- ➖ nije primjenjivo / odbijeno AAA: 9

**Ključni dokazi iz koda:**
- `aria-current` — **0 pojavljivanja** u `frontend/src`
- skip link — **0 pojavljivanja**
- `scroll-padding` / `scroll-margin` — **0 pojavljivanja**
- `forced-colors` — **0 pojavljivanja**
- `<caption>` — 3; `th scope` — 17 od 129 `<th>`; `aria-sort` — 2 fajla
- `window.confirm` — 14 poziva u 8 fajlova
- `focus-visible` — 40 pojavljivanja u cijelom `src`
- `text-slate-400` na bijeloj = **2.56:1** (1.4.3 FAIL); `text-orange-600` = **3.56:1** (1.4.3 FAIL)
- `--input`/`--border` `#E2E8F0` na bijeloj = **1.23:1** (1.4.11 FAIL)
- `components/ui/tooltip.tsx` — 0 upotreba → 1.4.13 nije primjenjivo
- `framer-motion` se ne koristi u dashboardu → 2.3.3 rizik nizak

**Sljedeće ažuriranje:** u ETAPI B, po modulu (svaka faza ažurira statuse kriterija koje pokriva).
