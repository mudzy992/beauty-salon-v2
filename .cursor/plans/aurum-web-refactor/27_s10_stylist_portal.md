# S10 — Stylist portal: 10 ekrana + shell

> **ARHIVA:** Ovo je historijski plan, zapis ili dokaz. Ne opisuje aktuelnu temu ni trenutne verifikacijske rezultate. Podržani su samo Aurum light i Aurum dark.

Izvršni plan za S10. Faza (`11_phase-10-stylist-portal.md`) je vlasnik odobrio 2026-11-25
nastavkom „nastavi S10”. Ovaj fajl je mjerenje, redoslijed rada i evidencija dokaza;
faza ostaje vlasnički dokument.

**Ulaz:** S9 završen — CI [45694496238](https://github.com/mudzy992/beauty-salon-v2/actions/runs/45694496238),
[45702072097](https://github.com/mudzy992/beauty-salon-v2/actions/runs/45702072097),
[45709806591](https://github.com/mudzy992/beauty-salon-v2/actions/runs/45709806591) i
[45717674997](https://github.com/mudzy992/beauty-salon-v2/actions/runs/45717674997) — svi **5/5**
za `bef75dc`, `071ad50`, `7f61060` i `9ece0ae`.

---

## 1. Izmjereno stanje (prije razbijanja)

### 1.1 Fajlovi preko 150 linija (meta: 100–150)

| Fajl | Linije | Plan |
|---|---|---|
| `features/stylist-workbook/pages/workbook-new-entry-page.tsx` | **666** | `features/stylist-workbook/`: hook forme, kartica klijenta, kartica usluge, kartica plaćanja, kartica lojalnosti, dijalog djelimičnog plaćanja |
| `features/stylist-workbook/pages/workbook-detail-page.tsx` | **536** | `features/stylist-workbook/`: detalj zaglavlje, slike, iznosi, akcije |
| `features/stylist-portal/pages/stylist-direct-booking-page.tsx` | **386** | `features/stylist-portal/`: forma, odabir klijenta/usluge, termini |
| `features/stylist-workbook/pages/workbook-reschedule-preview-page.tsx` | **369** | `features/stylist-workbook/`: zaglavlje, tabela termina, potvrda |
| `features/stylist-portal/pages/stylist-inbox-page.tsx` | **325** | `features/stylist-portal/`: lista, filter, akcije preuzimanja |
| `features/stylist-workbook/pages/workbook-list-page.tsx` | **225** | `features/stylist-workbook/`: tabela, filter, drawer |
| `features/stylist-portal/pages/stylist-schedule-page.tsx` | **212** | `features/stylist-portal/`: dnevni raspored, zaglavlje dana |
| `features/stylist-portal/components/complete-reservation-dialog.tsx` | **216** | `features/stylist-portal/components/`: polja iznosa, akcije |
| `features/stylist-workbook/components/daily-log-disposition-panel.tsx` | **201** | `features/stylist-workbook/components/`: odluka o dugovima |
| `features/stylist-portal/pages/stylist-debts-page.tsx` | **199** | `features/stylist-portal/`: tabela dugovanja, filter |
| `features/stylist-portal/hooks/use-reservation-detail-actions.ts` | **184** | `features/stylist-portal/hooks/`: akcije po rezervaciji |
| `features/stylist-portal/pages/stylist-reservation-detail-page.tsx` | **180** | `features/stylist-portal/`: detalj rezervacije |
| `layouts/StylistLayout.tsx` | **179** | `layouts/`: navigacija, korisnički meni, jezik, tema |
| `features/stylist-portal/hooks/use-reservation-detail-status.ts` | **159** | `features/stylist-portal/hooks/`: status FSM-a |

### 1.2 Fajlovi u okviru (ostaju)

`features/stylist-portal/hooks/useStylistReservationDetail.ts` 127, `useStylistReservations.ts` 124,
`components/reservation-detail-actions.tsx` 146, `components/reorder-reservation-dialog.tsx` 132,
`pages/stylist-stats-page.tsx` 128, `components/client-debt-selector.tsx` 98,
`components/reservation-detail-summary.tsx` 93, `types.ts` 86,
`components/no-show-reservation-dialog.tsx` 85, `components/reject-reservation-dialog.tsx` 79,
`components/overrun-reservation-dialog.tsx` 73, `utils/reservation-detail.ts` 70,
`components/cancel-reservation-dialog.tsx` 64, `utils/complete-dialog-helpers.ts` 44,
`utils/reservation-time.ts` 39, `hooks/use-stylist-portal-socket-refresh.ts` 15.

### 1.3 Zaštićeno (bez izmjene)

| Fajl | Linije | Razlog |
|---|---|---|
| `features/stylist-portal/api/stylist-portal.api.ts` | 113 | faza §3: „BEZ IZMJENE (API ugovor)” — DoD traži **0 diff** |
| `features/stylist-workbook/api/stylist-workbook.api.ts` | 158 | faza §3: „data/logika BEZ IZMJENE osim prezentačkog sloja” |
| `features/stylist-workbook/types.ts` | 131 | isto |
| `features/stylist-workbook/hooks/useWorkbookEntries.tsx` | 93 | isto |
| `features/stylist-workbook/hooks/useWorkbookEntry.ts` | 20 | isto |
| `features/stylist-workbook/hooks/useStylistProfileMe.ts` | 20 | isto |
| `features/stylist-workbook/workbook-display.ts` | 22 | isto |
| `app/router.tsx` | — | faza §3: „BEZ IZMJENE” — 12 deklaracija + 2 redirecta ostaju |

### 1.4 Ruta (12 deklaracija + 2 redirecta — ostaju)

`/stylist` → inbox · `/stylist/inbox` · `/stylist/workbook` · `/stylist/workbook/new` ·
`/stylist/workbook/reschedule-preview/:reservationId` · `/stylist/workbook/:entryId` ·
`/stylist/schedule` · `/stylist/schedule/new` · `/stylist/schedule/:reservationId` ·
`/stylist/debts` · `/stylist/stats` · `/stylist/profile` → `/profil`.
Guard: `StylistRoute`. Sve rute su **lazy** u `router.tsx` (`route-code-splitting` test).

---

## 2. Motion (2.3.3 / 2.5.4)

**Utvrđeno:** S10 opseg ima **11** `animate-spin` instanci **bez** `motion-reduce` zaštite i
**0** `animate-pulse`. Globalni blok u `globals.css` (`prefers-reduced-motion`) postoji, ali
smanjuje trajanje — spiner ostaje rotiran u proizvoljnom uglu. `motion-reduce:animate-none`
je `animation: none` i spiner je statički (isti obrazac kao S8 i S9).

| Fajl | `animate-spin` |
|---|---|
| `features/stylist-workbook/pages/workbook-detail-page.tsx` | 4 |
| `features/stylist-workbook/pages/workbook-reschedule-preview-page.tsx` | 4 |
| `features/stylist-workbook/pages/workbook-new-entry-page.tsx` | 3 |

**Pravilo:** svaki `animate-*` u S10 opsegu dobija `motion-reduce:animate-none`.
Novi ugovor `test:s10-reduced-motion` broji instance **iz izvora** (kao `test:s9-reduced-motion`).

---

## 3. Boje (1.4.3 / 1.4.11)

**Utvrđeno:** četiri fajla u S10 opsegu imaju sirove Tailwind palete:

| Fajl | Klase | Problem |
|---|---|---|
| `features/stylist-portal/components/reservation-detail-actions.tsx` | `text-amber-300`, `text-amber-700` | van Aurum palete; `amber-300` na tamnoj je nizak kontrast |
| `features/stylist-portal/components/reservation-detail-summary.tsx` | `text-amber-300`, `text-amber-700` | isto |
| `features/stylist-workbook/components/daily-log-disposition-panel.tsx` | `bg-amber-50/60`, `bg-amber-950/20`, `border-amber-200`, `border-amber-900/40` | površine nisu tematske — Aurum tamna ih ne neutrališe |
| `features/stylist-workbook/pages/workbook-reschedule-preview-page.tsx` | `bg-white` | bijela površina u Aurum tamnoj |

**Zamjena:** `text-amber-300`/`text-amber-700` → `text-warn-foreground`; `bg-amber-50/60` →
`bg-warn-surface` (ili `bg-surface-muted`); `bg-amber-950/20` → `bg-warn-surface`;
`border-amber-200`/`border-amber-900/40` → `border-line`; `bg-white` → `bg-surface`.
Svaka zamjena se mjeri u sve tri teme (classic / Aurum light / Aurum dark) prije commita.

**Tvrdi gate:** `test:stylist-dark-contrast-a11y` čita `dark:` klase — Aurum tamna ne smije
pokvariti nijedan tamni par u stylist modulu.

---

## 4. Redoslijed rada

1. **Mjerenje** — ovaj fajl (gotovo).
2. **Baseline** — fokusirani `test:*` skup: **54/54 zeleno** prije izmjena.
3. **Shell** — `StylistLayout`: skip link, `header`/`nav`/`main`, `aria-current`, jezik, tema.
4. **Radna knjiga** — `workbook-new-entry` → `workbook-detail` → `workbook-reschedule-preview`
   → `workbook-list`.
5. **Portal** — `stylist-inbox` → `stylist-schedule` → `stylist-direct-booking` →
   `stylist-reservation-detail` → `stylist-debts` → `stylist-stats` → `complete-reservation-dialog`.
6. **Motion + boje** — zaštita i semantički tokeni; novi ugovori `test:s10-reduced-motion`
   i `test:s10-semantic-colors`.
7. **Dokazi** — puna `test:*` petlja, `typecheck`, `typecheck:e2e`, lint, build, 5 Python provjera.
8. **Dokumentacija** — CHANGELOG, HANDOFF, CHECKLIST, faza, matrica.
9. **Push** → CI 5/5.

---

## 5. Nepromjenjivi ugovori (faza §4)

- `StylistRoute` guard, 12 deklaracija ruta i 2 redirecta ostaju; `/profil` se i dalje koristi
  iz stylist menija.
- **Inbox tok:** isto preuzimanje/lock/accept/decline, isti statusi, iste notifikacije; ručni
  start i završetak usluge (unos stvarno naplaćenog) ostaju identični. **Bez promjene FSM-a.**
- **Dnevna knjiga:** isti iznosi, napojnice, bilješke, before/after slike, restore/delete,
  reschedule preview, `3.3.7 Redundant Entry`, `fieldset/legend`.
- **Raspored:** ista dostupnost, isti direct booking, isti detalj rezervacije; `2.5.7`
  alternativa za svako povlačenje/premještanje.
- **Dugovanja / statistika:** isti iznosi, isti zbiri, isti formati (BS/EN), iste tabele.
- `4.1.3`: svi statusi (loading/success/error/busy) kroz live regije.
- **Bez novih zavisnosti; bez diranja `/mobile`** (Q3 — stylist mobilna aplikacija je van obima).

---

## 6. Dokazi — lokalni napredak (2026-11-26)

- **New entry:** `useWorkbookNewEntryForm.ts` je kompozicija od **148** linija; katalog/pretrage su u `useWorkbookNewEntryCatalog.ts` (**146**), lojalnost/resetu popusta u `useWorkbookNewEntryLoyalty.ts` (**78**), a validaciji/payloadu/djelimičnom plaćanju u `useWorkbookNewEntrySubmission.ts` (**143**). Stranica je 233 linije. Sačuvani su debounce i stale-response guard klijenata, gender filter i izbor-reseti, isti validacijski redoslijed, payload, debt-handling, iznosi i prevedeni toastovi.
- **Direct booking:** stranica **98** linija; `useStylistDirectBooking.ts` **110**, katalog **112**, submission **76**. Klijentski/service request-id guardovi, gender-filter/reset, automatski kraj termina, `submitGeneration` + `sessionVersion`, in-flight guard i isti endpoint/payload ostaju. API nije diran.
- **Dodatne stranice:** schedule stranica **117** linija; sekcije sa grupisanjem/sortiranjem (**62**) i reservation card (**59**) su izdvojene bez promjene današnjih/budućih pravila, statusnog prioriteta, vremena, statusnih oznaka i akcija. Dugovanja stranica **146**, repayment hook **54**, dialog **64**; ista ruta/payload, lokalizovane greške, uspjeh i refetch. Completion dialog **143** + state hook **118**; draft reset na otvaranje, intent, validacija, iznosi, debt/tip payload ostaju.
- **Ugovori:** accessibility/i18n/recovery source lists čitaju izdvojene module; `raw-api-error-exposure` pozitivna kontrola prati `resolveAdminApiError` u `useStylistDirectBookingSubmission.ts`. Fokusirani new-entry ugovori **28/28**, direct-booking + inbox **10/10**, schedule **5/5**, completion dialog **9/9**, debts **4/4**; S10 reduced-motion **5/5**, semantic-colors **6/6**, stylist dark-contrast source contract **3/3**.
- **Lokalna provjera nakon ovih izmjena:** puni frontend Node suite **1041/1041**; `npx tsc --noEmit -p tsconfig.json` i `npm run typecheck:e2e` čisti; build PASS u budžetu (initial JS/CSS **294.7/300 KiB gzip**, Analytics **116.4/140**, calendar **101.8/125**, stylist inbox **19.4**, dashboard **15.3**). ESLint **0 grešaka / 5 upozorenja** (postojeća exhaustive-deps upozorenja u reservation-detail-status, debts, reservation-detail page i DailyLog). `git diff --check` PASS; pet Python provjera PASS: repo hygiene (2205 putanja), CI index (393/396; 3 interaktivna izuzeta), doc links (765 linkova/262 Markdown fajla), BS/EN i18n (2897/2897), contrast (148/148 source parova).
- **CI checkpoint:** commit `e6b4271b46eab994e0512e1be4500c7702755eea` je pushan; GitHub Actions [run **45781994850**](https://github.com/mudzy992/beauty-salon-v2/actions/runs/45781994850) završio **5/5 success** (repo hygiene, mobile TypeScript, backend, frontend build/test, rendered a11y). Taj run obuhvata schedule/debts/completion izmjene. Broj rendered testova nije naveden ovdje jer nije izvučen iz job summaryja; ne tvrdi se tri-skin pokrivenost — to je S11.
- **Status:** S10 CI gate je zatvoren. Ručni rendered keyboard prolaz inbox → start → završetak je prenesen u S11 checklistu. Route/theme matrice će biti finalizovane samo za ono što S11 stvarno izmjeri; stvarni AT/zoom ostaje otvoren. Nema merge/deploya.
