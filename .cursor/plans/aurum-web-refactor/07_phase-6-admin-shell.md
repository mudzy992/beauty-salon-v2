# S6 — Admin shell + Dashboard + Rezervacije + fullscreen kalendar

**Status:** 🟡 čeka odobrenje S5 · **Prvi dashboard segment; ovdje se zamjenjuju stari admin šabloni (Q4).**

---

## 1. Cilj

Refaktor admin omotača i tri ključna ekrana prema NEJRA §05 (admin iskustvo), §09, §11: ujednačeni shell (skip link, landmarki, header, navigacija, korisnički meni, jezik, tema), `PageHeader`/`StatCard`/`FilterBar`/`DataTable`/`StatusBadge`, radni filteri, stanja, jedan CTA po ekranu, pristupačan kalendar s alternativom za povlačenje. **Bez promjene brojeva, statusa, filtera, sortiranja, paginacije i API ugovora.**

---

## 2. Ulaz

S5 završen (5/5); `ThemeSwitcher` u `admin-chrome.tsx` od S1; nove primitive u `features/shell/aurum/ui/`; NEJRA §09 ima retke za 24 admin rute + fullscreen kalendar. **Potrebna odluka vlasnika u STOP-sažetku S5:** hoće li se koristiti dopušteno grupisanje navigacije (Q10) i gdje `ThemeSwitcher` stoji u fullscreen kalendaru.

---

## 3. Fajlovi

| Fajl | Akcija |
|---|---|
| `frontend/src/features/shell/admin/admin-layout.tsx`, `admin-chrome.tsx`, `admin-nav-menu.tsx`, `admin-nav.ts`, `tab-redirect.tsx` | **IZMJENA** — shell + eventualno grupisanje; `TabRedirect` ostaje čuvar `?tab=` |
| `frontend/src/layouts/DashboardLayout.tsx` | **IZMJENA** — kompozicija |
| `frontend/src/features/shell/admin/ui/*` (stari šabloni) | **MIGRACIJA** — potrošači prelaze na `features/shell/aurum/ui/*`; brisanje u S11 kad ostane 0 potrošača |
| `frontend/src/pages/Dashboard.tsx`, `features/dashboard/*` | **IZMJENA** — KPI kartice, filteri, stanja |
| `frontend/src/pages/Reservations.tsx`, `features/reservations/*` (admin dio) | **IZMJENA** — lista, filteri, detalj dijalog, `DataTable` |
| `frontend/src/pages/ReservationsCalendar.tsx` | **IZMJENA** — fullscreen, izvan `DashboardLayout`; `ThemeSwitcher`, `SkipLink`, sticky konteksti |
| `frontend/src/i18n/locales/bs.json`, `en.json` | **IZMJENA** — paritet |

---

## 4. Ugovor

- **24 admin ruta + `/admin/reservations/calendar`** ostaju; `ProtectedRoute` + `DashboardLayout` netaknuti u logici; `/admin/debtors` i 6 `TabRedirect` ruta i dalje rade s `?tab=`.
- **Grupisanje (Q10 dopušta, ne nalaže):** svako spajanje zahtijeva mapu `stari URL → novi`, `<Navigate replace>`/`TabRedirect`, očuvanje query parametara i odobrenje vlasnika **prije** implementacije. Bez odobrenja: navigacija ostaje današnjih 7 sekcija.
- **Dashboard:** NEJRA §05 opisuje tri pitanja (danas / traži pažnju / prihod). **Ne dodaju se novi KPI-ji niti novi izvori podataka** — restilizuju se postojeći. Ako §05 traži drugačiji skup KPI-ja → **STOP + pitanje** (to bi bila funkcionalna promjena).
- **Paritet podataka:** `test:dashboard-stat-parity` je tvrdi gate; svaki broj, iznos, datum, status, badge, filter i zbir ostaje isti; formatiranje BS/EN se ne mijenja.
- **Kalendar:** `react-big-calendar` + `calendar-aria-shim` ostaju; `2.5.7` tastaturna alternativa za drag&drop se ne uklanja; `2.4.11` sticky header/kolone ne prekrivaju fokus (`scroll-padding`/`scroll-margin`); `aria-sort`, `caption`, jedinstvena imena akcija.
- `2.2.2`: auto-refresh / polling / toast trajanje ostaju podesivi po postojećem rješenju; nove animacije poštuju `prefers-reduced-motion`.
- `window.confirm` u admin modulima: zamjena pristupačnim `ConfirmDialog` (ista poruka, isti uvjet, isti efekat, fokus-povratak) je **dozvoljena po NEJRA §04, ali se ne radi bez potvrde vlasnika** u STOP-sažetku (vidi §9).

---

## 5. Koraci

1. Shell: zamijeniti `slate-*` semantičkim tokenima; zadržati skip link, `header`/`nav`/`main`/`aside` landmark-e, Radix Drawer s `DialogTitle` i `aria-expanded`/`aria-controls`, aktivnu stavku (`aria-current` + oblik + boja), `LanguageSwitcher`, `ThemeSwitcher`, `3.2.6 Consistent Help` na istom relativnom mjestu.
2. Ako je grupisanje odobreno: `admin-nav.ts` + `TabRedirect`/`<Navigate replace>`; `test:settings-hub-redirect` i `test:analytics-hub-redirect` ostaju zeleni.
3. `Dashboard`: nove `StatCard`/`FilterBar`/`DataState`; zadržati sve izvore podataka; jedan `h1`; loading skeleton bez layout shift-a; prazno stanje s idućim korakom; error s retry.
4. `Reservations`: migracija na novi `DataTable` (caption, `aria-sort` dugme u `th`, `nav` + `aria-current` za paginaciju, kartice <640 px bez gubitka kolona), `StatusBadge` (tekst + ikona + boja), detalj dijalog s `DialogTitle`/`DialogDescription`, jedinstvena imena akcija po redu (`Obriši – {klijent}, {vrijeme}`).
5. `ReservationsCalendar`: `ThemeSwitcher` + `SkipLink` jer je izvan layouta; sticky konteksti, alternativa za premještanje termina, lista termina kao pristupačna alternativa kalendaru.
6. Stari šabloni ostaju samo za S7–S10 potrošače; u `HANDOFF.md` se vodi tačan broj preostalih potrošača po šablonu (da S11 zna šta briše).

---

## 6. Testovi

Zadržati zelenima (ažurirati uz obrazloženje u `CHANGELOG.md`): `test:shell-a11y`, `test:navigation-drawer-accessibility`, `test:admin-templates-a11y`, `test:data-table-consistency`, `test:admin-render-smoke`, `test:axe-render-a11y`, `test:dashboard-stat-parity`, `test:dashboard-states`, `test:dashboard-a11y`, `test:admin-reservations-list-filters-i18n`, `test:admin-reservations-list-page-i18n`, `test:admin-reservation-details-i18n`, `test:reservation-list-accessibility`, `test:admin-reservations-calendar-i18n`, `test:admin-calendar-drawer-accessibility`, `test:calendar-aria-shim`, `test:reservation-scheduler-combobox`, `test:settings-hub-redirect`, `test:analytics-hub-redirect`, `test:generic-aria-and-row-actions`, `test:theme-ssot-sync`.

---

## 7. CI provjere

Lokalno: 5 Python + puna `test:*` petlja + `npm run build` (pratiti `admin dashboard` i `reservations calendar` gzip budžete: 13,3 / 99,4 KiB baseline, limiti 125–140 KiB) + `typecheck:e2e` + `git diff --check`. Push → `gh run watch` → **5/5**; `a11y-e2e` sada je ključan: axe nad admin rutama (25 testova s `auth.setup.ts`) u default stanju.

---

## 8. DoD + dokazi

- ✅ Shell + 3 ekrana u 3 stanja; `test:dashboard-stat-parity` zelen = podaci netaknuti.
- ✅ Sve rute i `?tab=` rade; ako je grupisanje rađeno, mapa redirecta u `CHANGELOG.md`.
- ✅ Kalendar: 2.5.7 alternativa + 2.4.11 sticky + `ThemeSwitcher`; bez gubitka kolona u `DataTable`.
- ✅ Build u budžetima; CI 5/5; `HANDOFF.md` s brojem preostalih potrošača starih šablona.
- 🟡 Rendered fokus kroz kalendar i 400% zoom → S11.
- **STOP** → „Odobravaš li S7 (Dnevna knjiga, Finansije, Lojalnost)?"

---

## 9. Rizici / pitanja

- **Pitanje za S5 STOP:** (a) grupisanje navigacije da/ne + tačna mapa; (b) mjesto `ThemeSwitcher`-a u fullscreen kalendaru; (c) smije li se `window.confirm` zamijeniti `ConfirmDialog`om u S7–S9 (ista poruka/uvjet/efekat).
- Ako `DataTable` migracija promijeni broj kolona ili redoslijed → **STOP** (Q10).
- Ako NEJRA §05 KPI skup ne odgovara stvarnim podacima → **STOP**, ne dodavati „ilustrativne" KPI-je u kod.
- `test:admin-render-smoke` / `test:axe-render-a11y` koriste JSDOM render harness; nova primitive moraju proći kroz njega bez novih zavisnosti.
