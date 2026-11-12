# S6 — Admin shell + Dashboard + Rezervacije + fullscreen kalendar

**Status:** 🟡 S6 odobren (`approve_s6`); mapa A odobrena (`approve_map_a`), implementacija u toku · **Prvi dashboard segment; ovdje se zamjenjuju stari admin šabloni (Q4).**

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

## 10. Odobrene odluke prije implementacije

`approve_s6`; `approve_map_a`: pet grupa bez izmjene hrefova/redirecta, puna mapa u CHANGELOG §14. `calendar_header`: izbornik teme u zaglavlju fullscreen kalendara. `allow_s7_s9`: admin `window.confirm` se ne mijenja u S6.

Dashboard STOP: `preserve_existing` — ostaju postojeći KPI-ji, izvori, formule i filteri; razlika prema NEJRA §05 je odobreno odstupanje.

### Lokalni WIP — nije DoD

Odobrena mapa A, zaglavlje kalendara i Dashboard prezentacija su u lokalnom diffu. Kartice rezervacija sada prikazuju i cijenu/popust i stilistu. **S6 nije završen:** tabela liste rezervacija još koristi izvorni markup (nije migrirana na Aurum `DataTable`), treba završiti paritet svih osam kolona i akcija, jedinstvena imena akcija i ostale S6 kriterije, zatim ponoviti punu verifikaciju, CI 5/5 i dokumentovati dokaze. Nijedna ruta ovim WIP-om nije proglašena završenom.

### Revidirani identitet — inkrement 2026-11-11

Sačuvani WIP je pregledan: zadržana mapa A, kalendarski header i mobilni podaci rezervacije; dodane dekorativne Lucide ikone svih 17 stavki i Aurum-scoped oblikovanje admin navigacije i dashboarda, bez novih podataka. Za izbjegavanje paralelnih standarda dashboard koristi postojeće admin `StatGrid`, `DataTable` i `EmptyState`; prethodni `aurum-stat-grid.tsx` ostaje lokalno sačuvan, nije u ovom inkrementu. Ovo je djelimičan inkrement, ne završetak S6 ni cijelog identiteta; lista rezervacija i preostale površine traže dalji rad. Šest novih a11y-e2e slučajeva mjeri tri admin rute u oba režima, s provjerom autentificirane rute i režima; nema uklanjanja ili slabljenja postojećih testova. CI je na čekanju. Ručni 320px/400%, tastatura i čitač ekrana nisu potvrđeni.

### STOP — rendered dark kontrast

Commit `f4ed95554b52c3a2613a9959619633f64f4a8ff8` / [CI 43234242404](https://github.com/mudzy992/beauty-salon-v2/actions/runs/43234242404) završio 4/5; rendered a11y **263 passed / 2 failed**. Nova dark mjerenja: dashboard tabela `#64748b` na `#1a1510` 3,8:1 (4,5:1 potrebno); kalendar satne oznake `#f5ede0` na bijeloj 1,16:1 i današnje zaglavlje `#f5ede0` na `#eaf6ff` 1,05:1 (4,5:1 potrebno). Light mjerenja svih triju dodatih ruta i dark rezervacije prolaze u ovom CI-u. Artefakt `13952146753`, sha256 `e79666242d07f65f86de6dd7439c17dd78b94c7fa9fb6cd7997ad529651da3a0`. STOP za stvarni pad Aurum kontrasta; paleta i testovi nisu promijenjeni. Potrebna odluka prije sanacije postojećim semantičkim tokenima i ponovnog CI-a.

Vlasnik je odobrio sanaciju: zaglavlja zajedničke admin tabele koriste `--text-muted`, a satna traka i današnji dan kalendara `--surface` / `--surface-muted` u Aurumu. Postojeći light/dark axe testovi ostaju nepromijenjeni; dodata source provjera pravila, CI rendered rezultat još na čekanju.

### Rezultat sanacije

Commit `14e5e789329ba5c6ae295369a6bc6ce1e91ed20e` — [CI 43236053280](https://github.com/mudzy992/beauty-salon-v2/actions/runs/43236053280) **5/5 success**, a11y-e2e job `131243599403`, 265 izvršenih testova, uključujući šest novih scenarija za tri S6 rute u oba Aurum režima. Artifact `13954055123`, sha256 `2f41356ed51d8d5aa12f8d8508120fcfcd08a5c7c8524ba8a373905e3b225cce`. Rezultat ne dokazuje sve stranice, sva stanja ni potpunu WCAG 2.2 / AAA usklađenost; 1.4.3 coverage ima nepotpune nalaze, a 1.4.6 pada. Nastavak: ostali S6 kriteriji (posebno tabela liste rezervacija), revidirani javni i auth tokovi i stylist/admin površine; potrebne ručne 320px/400%, tastatura, čitač ekrana i dodatna rendered mjerenja.
