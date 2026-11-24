# S8 — pregled preostalih kriterija i odluka

Stanje nakon vlasnikovih odluka i lokalne implementacije tablista; ovo je pregled dokaza, **ne potvrda završetka S8**. Opseg su analitika (tri pogleda i hub), korisnici, salon, usluge, frizeri i galerija radova uz uslugu. S9 i produkcijski deploy nisu pokrenuti.

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
| Work Gallery | `s8-work-gallery-loading.spec.ts`, `s8-gallery-read-races.spec.ts`, `s8-gallery-empty-pages.spec.ts`, `s8-gallery-manual-pagination.spec.ts`; loading, retry, prazne stranice, ručna alternativa i slider. | Postojeći ekran je read-only. Plan mu pripisuje upload/brisanje/reorder; odluka ispod. |

Cijela lokalna mock S8 regresija nakon naknadne ekstrakcije **411/411**, ciljano **63/63**, frontend Node **1005/1005**, build i E2E typecheck prolaze; lint 0 grešaka/6 postojećih upozorenja. Pet Python provjera i `git diff --check` prolaze. CI [45448858670](https://github.com/mudzy992/beauty-salon-v2/actions/runs/45448858670) za `c34c12f` završio je **5/5**, rendered **3131/0/0**, uz 15 axe nepotpunih contrast uzoraka. On ne pokriva `d6cde2c` ni naknadnu ekstrakciju. Konačni CI za lokalni nastavak tek treba pokrenuti i zasebno potvrditi.

## Izmjerena veličina stranica

Početno mjerenje iz CHANGELOG-a: AnalyticsHub 46, Analytics 477, ClientAnalytics 821, StylistAnalytics 248, Users 1718, Services 1519, Salon 674, Stylists 520, ServiceWorkGallery 226 linija. Trenutno: **57 / 68 / 134 / 119 / 138 / 139 / 128 / 146 / 132** istim redom. `Services.tsx` je nakon izdvajanja potvrda kategorija 171 → 139; logika je u `use-service-category-deletion.ts` (54). Izdvojeni moduli nisu svi unutar ~100–150 linija (npr. `use-service-editor.ts` 209 i `edit-user-dialog.tsx` 173); cilj je približan, ali dužina tih modula i njihovo eventualno dalje izdvajanje nisu skriveni.

## Odluke vlasnika i novo stanje

1. **Galerija radova:** vlasnik je odabrao implementaciju uređivanja u S8. Novi par povezuje se s postojećim završenim zapisom usluge; upload je privatan i objava čeka zasebnu klijentovu saglasnost za svaku sliku. Uklanjanje skriva par iz admin i javne galerije bez brisanja originala ili povlačenja saglasnosti; redoslijed vrijedi u admin prikazu i javnom feedu filtriranom po usluzi, ostali feedovi ostaju nepromijenjeni. Ovo **još nije implementirano**. Početni work-gallery je read-only i javni feed je izveden iz dnevnih zapisa (`git show c5267fa:frontend/src/pages/ServiceWorkGallery.tsx`); zasebni `/admin/gallery` je i dalje S9. Posebno zaštititi autorizaciju, privatne fajlove, revokaciju saglasnosti, transakcijske utrke, paginaciju i stabilan redoslijed. Postojeći `DELETE /api/daily-log/:id/images/:imageId` briše sliku iz zapisa i nije ekvivalent odabranom skrivanju.
2. **Analitička navigacija:** vlasnik je odabrao pravi tablist. Lokalno uveden kontrolisani Radix tablist i paneli, automatsko biranje strelicama, Home/End, očuvanje query parametara, browser historije i sidebar deep linkova. Prije izmjene nova browser fiksura 4/4 FAIL (tablist nije postojao); nakon izmjene ciljana regresija **26/26**, puni S8 **415/415**, uključujući četiri scoped axe skena tablista bez violations za pet ARIA/button pravila. Prva puna regresija bila je **407/415**, zbog testnog selektora koji nije očekivao ugniježđene tabove; selektor je ograničen na unutrašnji panel, zatim 415/415. Mock podaci i scoped axe nisu stvarni AT audit. Node **1005/1005**, build i E2E typecheck PASS, lint 0/6; CI za ovu promjenu još nije provjeren.

## Do kraja S8

- Implementirati i testirati odobreni tok galerije; ne objavljivati slike bez aktivne saglasnosti i ne koristiti destruktivno brisanje za sakrivanje.
- Završiti postojeći CI, pushati lokalne commitove, te potvrditi **5/5 na tačno završnom HEAD-u**; ne miješati rezultate različitih commitova.
- Pregledati otvorene stavke i dokaze nakon tih odluka; zadržati stvarni AT/400% i druge ručne dokaze koji su u planu dodijeljeni S11, bez pretvaranja mock/axe rezultata u WCAG certifikaciju.
- Tek nakon zadovoljenih S8 kriterija stati i pitati za odobrenje S9. Nema merge/deploya.
