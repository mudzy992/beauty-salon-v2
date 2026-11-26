# S10 — Stylist portal (10 ekrana + 2 redirecta)

**Status:** ✅ S10 implementacija i CI gate završeni · CI run `45781994850` je 5/5 za `e6b4271`; S11 je odobren i aktivan. Ručni stylist keyboard flow ostaje otvoren u S11 checklisti · **Zatvara posljednju grupu ekrana iz Q3.**

---

## 1. Cilj

Refaktor cijelog `/stylist/*` portala prema NEJRA §06 (uloge i tokovi), §09 i §11: ujednačeni shell (već ima `ThemeSwitcher` iz S1), inbox, dnevna knjiga (lista/novi unos/detalj/reschedule preview), raspored (lista/direct booking/detalj), dugovanja, statistika. **Bez promjene FSM-a rezervacija, API-ja, iznosa i statusa.**

---

## 2. Ulaz

S9 završen (5/5); 0 preostalih admin potrošača starih šablona; NEJRA §09 ima retke za 12 deklaracija; `layouts/StylistLayout.tsx` ima `ThemeSwitcher` od S1.

---

## 3. Fajlovi

| Fajl | Akcija |
|---|---|
| `frontend/src/layouts/StylistLayout.tsx` | **IZMJENA** — gornji nav, landmarki, skip link, korisnički meni, jezik, tema |
| `frontend/src/features/stylist-portal/pages/*` (inbox, schedule, schedule/new, schedule/:id, debts, stats) | **IZMJENA** — 6 ekrana |
| `frontend/src/features/stylist-workbook/pages/*` (list, new, detail, reschedule-preview) | **IZMJENA** — 4 ekrana |
| `frontend/src/features/stylist-portal/stylist-portal.api.ts` | **BEZ IZMJENE** (API ugovor; prethodni DoD je to izričito štitio) |
| `frontend/src/features/stylist-workbook/*` (data/logika) | **BEZ IZMJENE** osim prezentačkog sloja |
| `frontend/src/i18n/locales/bs.json`, `en.json` | **IZMJENA** — paritet |
| `frontend/src/app/router.tsx` | **BEZ IZMJENE** (`/stylist` → inbox, `/stylist/profile` → `/profil`) |

---

## 4. Ugovor

- `StylistRoute` guard, 12 deklaracija ruta i 2 redirecta ostaju; `/profil` (S4) se i dalje koristi iz stylist menija.
- **Inbox tok:** isto preuzimanje/lock/accept/decline, isti statusi, iste notifikacije; ručni start i završetak usluge (unos stvarno naplaćenog) ostaju identični.
- **Dnevna knjiga:** isti iznosi, napojnice, bilješke, before/after slike, restore/delete, reschedule preview, `3.3.7 Redundant Entry`, `fieldset/legend`.
- **Raspored:** ista dostupnost, isti direct booking, isti detalj rezervacije; `2.5.7` alternativa za svako povlačenje/premještanje.
- **Dugovanja / statistika:** isti iznosi, isti zbiri, isti formati (BS/EN), iste tabele s `aria-sort`/`caption`.
- `test:stylist-dark-contrast-a11y` je tvrdi gate: **Aurum tamna ne smije pokvariti nijedan tamni par** u stylist modulu.
- `4.1.3`: svi statusi (loading/success/error/busy) kroz live regije; `test:stylist-status-messages-a11y` zelen.
- Bez novih zavisnosti; bez diranja `/mobile` (stylist mobilna aplikacija ostaje van obima, Q3).

---

## 5. Koraci

1. `StylistLayout`: uskladiti obrazac shella s adminom (skip link, `header`/`nav`/`main`, aktivna stavka `aria-current` + oblik, `3.2.6 Consistent Help`, `LanguageSwitcher`, `ThemeSwitcher`), ali zadržati **gornji nav** specifičan za stylist (Q4 ne znači brisanje razlika u sadržaju navigacije po ulozi).
2. Inbox: nove `DataState`/`StatusBadge`/`ConfirmDialog` primitive; jedinstvena imena akcija po rezervaciji; `role="status"` za preuzimanje; bez promjene redoslijeda koraka FSM-a.
3. Workbook: `DataTable` + `FormSection` + `ErrorState`; zadržati sve i18n ključeve, `aria-live`, `fieldset`, `label-in-name`, `useId` povezivanje, retry i stale-response zaštite.
4. Schedule / direct booking / detalj: isto + tastaturna alternativa za premještanje termina; `<time datetime>`, puni iznos u `aria-label`.
5. Debts / stats: `StatCard` + `DataTable`; grafikon (ako postoji) s tekstualnim sažetkom + tabelom; bez novih izračuna.
6. Aurum: tamna radna površina, zlato samo za primarnu akciju, serifni naslovi; provjeriti `stylist-dark-contrast-a11y` **prije** commit-a.

---

## 6. Testovi

Zadržati zelenima (ažurirati uz obrazloženje): `test:stylist-workbook-list-i18n`, `test:stylist-workbook-read-accessibility`, `test:stylist-workbook-detail-i18n`, `test:stylist-workbook-reschedule-i18n`, `test:stylist-workbook-reschedule-accessibility`, `test:workbook-form-groups-a11y`, `test:redundant-entry-a11y`, `test:workbook-loading-status-a11y`, `test:stylist-status-messages-a11y`, `test:stylist-form-controls-a11y`, `test:stylist-dark-contrast-a11y`, `test:stylist-analytics-tables-a11y`, `test:form-error-suggestion`, `test:admin-api-errors`, `test:generic-aria-and-row-actions`, `test:theme-ssot-sync`.

---

## 7. CI provjere

Lokalno: 5 Python + puna `test:*` petlja + `npm run build` (`stylist inbox` 17,9 KiB gzip baseline; `stylist-reservation-detail-page` 29,07 KiB) + `typecheck:e2e` + `git diff --check`. Push → `gh run watch` → **5/5**; `a11y-e2e` ima poseban `e2e/a11y-stylist.spec.ts` koji mora ostati zelen.

---

## 8. DoD + dokazi

- ✅ Refactor 10 ekrana + shell je na grani; `stylist-portal.api.ts` 0 diff. CI `45781994850` nad commitom `e6b4271` je **5/5**.
- 🟡 `stylist-dark-contrast-a11y` source gate **3/3**; S11 proširuje rendered axe na Classic/Aurum light/Aurum dark.
- 🟡 58/58 deklaracija/ruta su zadržane u routeru; route matrix finalization je S11 zadatak.
- ✅ Lokalni S10 suite/build/gates i evidence su za commit; CI [45781994850](https://github.com/mudzy992/beauty-salon-v2/actions/runs/45781994850) je **5/5** uključujući rendered a11y job.
- 🟡 Ručni rendered keyboard tok inbox → start → završetak prenesen je u S11 checklistu; automated route axe nije dokaz poslovnog keyboard toka.
- **STOP zatvoren korisničkim odobrenjem:** „Možeš krenuti sa S11“ nakon potvrde zelenog S10 CI gate-a.

---

## 9. Rizici / pitanja

- `stylist-dark-contrast-a11y` čita `dark:` klase: ako je R2 potvrđen (Aurum tamna dodaje `.dark`), ovaj test sada **stvarno** radi u renderu samo u CI; paziti da Aurum tokeni ne snize omjere.
- Ako NEJRA §06 opisuje drugačiji tok („Admin/stilista potvrđuje") od stvarnog FSM-a (stylist inbox → lock → accept, potvrda dolaska klijenta) → **kod je izvor istine**; ne mijenjati tok, razliku zabilježiti u `HANDOFF.md` i pitati.
- Ne dirati mobilnu stylist aplikaciju; ako vlasnik naknadno traži isti dizajn i tamo → novi zahtjev, ne proširenje S10.
