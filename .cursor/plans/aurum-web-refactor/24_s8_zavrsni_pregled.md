# S8 — pregled preostalih kriterija i odluka

> **ARHIVA:** Ovo je historijski plan, zapis ili dokaz. Ne opisuje aktuelnu temu ni trenutne verifikacijske rezultate. Podržani su samo Aurum light i Aurum dark.

Stanje nakon vlasnikovih odluka, refaktora bočne trake (jedna stavka po području) i lokalne implementacije tablista; ovo je pregled dokaza, **ne potvrda završetka S8**. Opseg su analitika (tri pogleda i hub), korisnici, salon, usluge, frizeri i galerija radova uz uslugu. S9 i produkcijski deploy nisu pokrenuti.

## Najnoviji dokazi (lokalni nastavak refaktora navigacije)

| Oblast | Dokaz | Ograničenje |
|---|---|---|
| Navigacija po područjima | `analytics-link-purpose.test.mjs`, `analytics-hub-redirect.test.mjs`, `settings-hub-redirect.test.mjs`, `s6-presentation.test.mjs`, `s8-admin-sidebar-navigation.spec.ts` (BS/EN Chromium) | Izvor (`src/`) se čita statički; niz provjera ne izvršava DOM. |
| Izbori u analitici | `backend/test/analytics-picker.e2e-spec.ts` **5/5** (pravi HTTP + PostgreSQL), `s8-admin-sidebar-navigation.spec.ts` | Backend nema `q` za stiliste, pa se taj picker ne pretražuje; nema mjerenja velikog dataseta. |
| Autentificirani admin/stylist a11y | `a11y-admin.spec.ts` + `a11y-stylist.spec.ts` uz pravi backend/PostgreSQL/Redis: **830/830** u ponovljenom pokretanju (prvo 828/2 — oba pada zastarjela očekivanja) | Mockirani podaci u M2 scenarijima; nisu stvarni AT audit ni CI build. |
| Mock browser regresija | **cijeli `chromium` projekat 2355/2355** (S8 + M1–M6 + `wcag-rendered`); ciljani analitički S8 specovi 22/22 | Sintetički viewport/pointer; nije OS picker niti mobilni uređaj. |
| Frontend statički | **207/207** `test:*` skripti, `tsc --noEmit` čist, ESLint 0 grešaka / 6 upozorenja, build zelen (initial 294,8/300 KiB, Analytics 116,4/140 KiB), pet Python provjera PASS | `test:auth-session-rendered` traži ispravan `PLAYWRIGHT_BROWSERS_PATH`; bez njega pada okolina, ne kod. |
| Backend | Novi `analytics-picker.e2e-spec.ts` **5/5**; **cijeli backend E2E 7/7 suita, 106/106** | Nova baza `beauty_salon_ci` u CI-ju zadovoljava zaštitu „baciva lokalna test baza“. |
| CI na tačno završnom HEAD-u | **[45662884896](https://github.com/mudzy992/beauty-salon-v2/actions/runs/45662884896)** za `cf147bd` je **5/5** — repo higijena, mobilni TypeScript, backend build+testovi, frontend typecheck+build i rendered a11y nad izolovanom CI bazom; svi koraci zeleni | Tačan broj prošlih testova u rendered a11y koraku nije izvučen iz CI loga u ovoj sredini (host za logove i artifikate nije dostupan iz sandboxa), pa se ne navodi broj koji nije provjeren; autoritativni signal su zaključci runa i koraka. |

**Odgovor na dva pala scenarija iz autentificiranog runa.** Oba su bila zastarjela očekivanja, ne kvarovi: (1) test „users eye …“ je tražio dugme „nazad na korisnike“ i odlazak na `/admin/users`, a novi ugovor vraća na listu klijenata **u istom analitičkom tabu**; (2) test „analytics subviews …“ je očekivao da se pod-pogled bira u bočnoj traci, a sada ga bira **tablist**. Uz ispravku očekivanja oba prolaze; ista garancija (tastaturna izmjena pod-pogleda, `aria-selected`, očuvanje query parametara, tabela/tipka grafikona) je zadržana i proširena.

**Utjecaj na ugovor URL-a.** Zadani analitički tab više ne piše `?tab=` (`next.delete('tab')`), isto kao u `finance-page.tsx` i `settings-tab-nav.tsx`. Time bočna stavka i tablist daju istu adresu za isti pogled. `?tab=overview` i dalje radi kao deep link.

## Implementirani obuhvat i granice dokaza

| Područje | Dokazi i pregledani tokovi | Ograničenje |
|---|---|---|
| Analytics hub i overview | `analytics-hub-redirect.test.mjs`, `s8-analytics-tabs.spec.ts`, `s8-analytics-dashboard.spec.ts`, `s8-analytics-chart-keyboard.spec.ts`; tablist, `?tab=`, legacy redirect, read/retry, tastaturni graf, tekst i tabela iz istih podataka. | Sidebar linkovi ostaju uz novi tablist; stvarni čitač ekrana nije testiran. |
| Klijentska analitika | `s8-client-analytics-races.spec.ts`, `s8-client-analytics-action-names.spec.ts`, `s8-client-analytics-presentation.spec.ts`; podaci u panelima, greške i retry, detalji i fokus. | API je mockiran, nisu sve kombinacije stvarnih podataka i AT. |
| Frizerska analitika | `s8-stylist-analytics.spec.ts`; identitet/period, odgođeni read, retry i imenovane tabele. | Ne dokazuje svaki historijski obračun ili veliki server dataset. |
| Korisnici | `s8-users-list.spec.ts`, `s8-users-read-races.spec.ts`, `s8-users-change-confirmation.spec.ts`, `s8-admin-refactor.spec.ts`; lista, kredencijali, role, deaktivacija i dijelovi uklanjanja stiliste. | Mock write nije potvrda produkcijske transakcije; rezultati scoped axe nisu potpuni audit. |
| Salon | `s8-salon-read-recovery.spec.ts`, `s8-salon-holiday-read-races.spec.ts`, `s8-salon-holiday-actions-blocked.spec.ts`; loading/greška/prazno i odabrani praznični tokovi. | Nisu provjerene sve server konkurentnosti i ručni AT. |
| Usluge | `s8-services-read-recovery.spec.ts`, `s8-service-editor-create.spec.ts`, `s8-service-editor-async-races.spec.ts`, `s8-services-cross-dialog-refresh.spec.ts`; katalog, upload, save, delete i kontrolisani async redoslijedi. | Nacrt se nakon promjene kataloga ne spašava automatski. Mock API/OS picker ne dokazuju stvarni server ili picker. |
| Frizeri | `s8-stylists-read-recovery.spec.ts`, `s8-stylists-pagination-focus.spec.ts`, `s8-stylist-action-names.spec.ts`; lista, editor, dostupnost kompetencija, fokus i retry. | Više server writeova nije jedna transakcija; stvarni AT nije testiran. |
| Work Gallery | `s8-work-gallery-loading.spec.ts`, `s8-gallery-read-races.spec.ts`, `s8-gallery-empty-pages.spec.ts`, `s8-work-gallery-visibility.spec.ts`, `s8-work-gallery-order.spec.ts`, `s8-work-gallery-upload.spec.ts` i backend `work-gallery-visibility.e2e-spec.ts` + `work-gallery-upload.e2e-spec.ts`; učitavanje, sakrivanje/vraćanje uz potvrdu, ručni redoslijed po usluzi i privatni upload before/after para. | Sakrivanje ne ukida direktni URL derivata niti zasebno ručno objavljene fotografije; nema OS pickera ni pravog mobilnog uređaja. |

Cijela lokalna mock S8 regresija nakon naknadne ekstrakcije **411/411**, ciljano **63/63**, frontend Node **1005/1005**, build i E2E typecheck prolaze; lint 0 grešaka/6 postojećih upozorenja. Pet Python provjera i `git diff --check` prolaze. CI [45458456025](https://github.com/mudzy992/beauty-salon-v2/actions/runs/45458456025) za `87578b2` završio je **5/5**, rendered **3147/0/0**, uz 15 axe nepotpunih contrast uzoraka. On ne pokriva novi tablist ni sakrivanje galerije. Novi nastavak (jedna stavka po području + analitički pickeri) ima **svoj** run: **[45662884896](https://github.com/mudzy992/beauty-salon-v2/actions/runs/45662884896)** za `cf147bd` je **5/5**.

## Izmjerena veličina stranica

Početno mjerenje iz CHANGELOG-a: AnalyticsHub 46, Analytics 477, ClientAnalytics 821, StylistAnalytics 248, Users 1718, Services 1519, Salon 674, Stylists 520, ServiceWorkGallery 226 linija. Nakon nastavka refaktora navigacije: **62 / 68 / 145 / 118 / 138 / 139 / 128 / 146 / 152** istim redom (AnalyticsHub / Analytics / ClientAnalytics / StylistAnalytics / Users / Services / Salon / Stylists / ServiceWorkGallery), plus `Dashboard.tsx` 97. Sve su unutar ~100–150 linija.

Najveći izdvojeni moduli u ovom paketu: `admin-user-menu.tsx` 143, `admin-layout.tsx` 142, `admin-nav-menu.tsx` 140, `client-analytics-detail-panels.tsx` 139, `admin-mobile-nav.tsx` 128, `stylist-picker.tsx` 109, `client-picker.tsx` 106, `client-analytics-stat-cards.tsx` 98, `client-analytics-summary.tsx` 91. Preostali dugi moduli (`use-service-editor.ts`, `edit-user-dialog.tsx`) su iz S8-ranijeg nastavka i nisu dirani u ovom paketu; njihova dužina i eventualno dalje izdvajanje nisu skriveni.

## Odluke vlasnika i novo stanje

1. **Galerija radova:** vlasnik je odabrao implementaciju uređivanja u S8. Novi par povezuje se s postojećim završenim zapisom usluge; upload je privatan i objava čeka zasebnu klijentovu saglasnost za svaku sliku. Uklanjanje skriva par iz admin i javne galerije bez brisanja originala ili povlačenja saglasnosti; redoslijed vrijedi u admin prikazu i javnom feedu filtriranom po usluzi, ostali feedovi ostaju nepromijenjeni. Sakrivanje, vraćanje i sortiranje su lokalno implementirani; upload para je **implementiran** (jedan par po zapisu, sadržajna provjera tipa, privatno skladištenje, bez stvaranja saglasnosti). Revizija reda pokriva pomake, ne sve izmjene saglasnosti ili zapisa; inicijalna normalizacija može zaključavati mnogo redova. Početni work-gallery je read-only i javni feed je izveden iz dnevnih zapisa (`git show c5267fa:frontend/src/pages/ServiceWorkGallery.tsx`); zasebni `/admin/gallery` je i dalje S9. Posebno zaštititi autorizaciju, privatne fajlove, revokaciju saglasnosti, transakcijske utrke, paginaciju i stabilan redoslijed. Postojeći `DELETE /api/daily-log/:id/images/:imageId` briše sliku iz zapisa i nije ekvivalent odabranom skrivanju.
2. **Analitička navigacija:** vlasnik je odabrao pravi tablist. Lokalno uveden kontrolisani Radix tablist i paneli, automatsko biranje strelicama, Home/End, očuvanje query parametara, browser historije i sidebar deep linkova. Prije izmjene nova browser fiksura 4/4 FAIL (tablist nije postojao); nakon izmjene ciljana regresija **26/26**, puni S8 **415/415**, uključujući četiri scoped axe skena tablista bez violations za pet ARIA/button pravila. Prva puna regresija bila je **407/415**, zbog testnog selektora koji nije očekivao ugniježđene tabove; selektor je ograničen na unutrašnji panel, zatim 415/415. Mock podaci i scoped axe nisu stvarni AT audit. Node **1005/1005**, build i E2E typecheck PASS, lint 0/6; CI za ovu promjenu još nije provjeren.

## Do kraja S8

- ✅ Implementirati i testirati odobreni tok galerije; ne objavljivati slike bez aktivne saglasnosti i ne koristiti destruktivno brisanje za sakrivanje. — Upload, redoslijed i revizijska zaštita vidljivosti su implementirani i pokriveni pravim PostgreSQL/JWT testovima.
- ✅ Refaktor navigacije na jednu stavku po području + analitički pickeri. — Implementirano, pokriveno statičkim ugovorima, mock browser testovima, pravim backend E2E testom i autentificiranim axe pokretanjem.
- ✅ **Pushati lokalne commitove i potvrditi CI 5/5 na tačno završnom HEAD-u.** Paket je pushan kao `cf147bd` i **[45662884896](https://github.com/mudzy992/beauty-salon-v2/actions/runs/45662884896)** je **5/5** (svih pet poslova i koraka zeleno) — rezultati različitih commitova nisu miješani.
- ⬜ Pregledati otvorene stavke i dokaze nakon tih odluka; zadržati stvarni AT/400% i druge ručne dokaze koji su u planu dodijeljeni S11, bez pretvaranja mock/axe rezultata u WCAG certifikaciju.
- ⬜ Tek nakon zadovoljenih S8 kriterija stati i pitati za odobrenje S9. Nema merge/deploya.
