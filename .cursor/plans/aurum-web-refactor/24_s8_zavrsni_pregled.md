# S8 — pregled preostalih kriterija i odluka

Stanje pri lokalnom nastavku nakon `d6cde2c`; ovo je pregled dokaza, **ne potvrda završetka S8**. Opseg su analitika (tri pogleda i hub), korisnici, salon, usluge, frizeri i galerija radova uz uslugu. S9 i produkcijski deploy nisu pokrenuti.

## Implementirani obuhvat i granice dokaza

| Područje | Dokazi i pregledani tokovi | Ograničenje |
|---|---|---|
| Analytics hub i overview | `analytics-hub-redirect.test.mjs`, `s8-analytics-dashboard.spec.ts`, `s8-analytics-chart-keyboard.spec.ts`; `?tab=`, legacy redirect, odabrani read/retry, tastaturni graf, tekst i tabela iz istih podataka. | Plan traži `tablist`, a postojeća odobrena M1/Q7 navigacija su tri sidebar linka s `aria-current`; odluka ispod. Test nije stvarni čitač ekrana. |
| Klijentska analitika | `s8-client-analytics-races.spec.ts`, `s8-client-analytics-action-names.spec.ts`, `s8-client-analytics-presentation.spec.ts`; podaci u panelima, greške i retry, detalji i fokus. | API je mockiran, nisu sve kombinacije stvarnih podataka i AT. |
| Frizerska analitika | `s8-stylist-analytics.spec.ts`; identitet/period, odgođeni read, retry i imenovane tabele. | Ne dokazuje svaki historijski obračun ili veliki server dataset. |
| Korisnici | `s8-users-list.spec.ts`, `s8-users-read-races.spec.ts`, `s8-users-change-confirmation.spec.ts`, `s8-admin-refactor.spec.ts`; lista, kredencijali, role, deaktivacija i dijelovi uklanjanja stiliste. | Mock write nije potvrda produkcijske transakcije; rezultati scoped axe nisu potpuni audit. |
| Salon | `s8-salon-read-recovery.spec.ts`, `s8-salon-holiday-read-races.spec.ts`, `s8-salon-holiday-actions-blocked.spec.ts`; loading/greška/prazno i odabrani praznični tokovi. | Nisu provjerene sve server konkurentnosti i ručni AT. |
| Usluge | `s8-services-read-recovery.spec.ts`, `s8-service-editor-create.spec.ts`, `s8-service-editor-async-races.spec.ts`, `s8-services-cross-dialog-refresh.spec.ts`; katalog, upload, save, delete i kontrolisani async redoslijedi. | Nacrt se nakon promjene kataloga ne spašava automatski. Mock API/OS picker ne dokazuju stvarni server ili picker. |
| Frizeri | `s8-stylists-read-recovery.spec.ts`, `s8-stylists-pagination-focus.spec.ts`, `s8-stylist-action-names.spec.ts`; lista, editor, dostupnost kompetencija, fokus i retry. | Više server writeova nije jedna transakcija; stvarni AT nije testiran. |
| Work Gallery | `s8-work-gallery-loading.spec.ts`, `s8-gallery-read-races.spec.ts`, `s8-gallery-empty-pages.spec.ts`, `s8-gallery-manual-pagination.spec.ts`; loading, retry, prazne stranice, ručna alternativa i slider. | Postojeći ekran je read-only. Plan mu pripisuje upload/brisanje/reorder; odluka ispod. |

Cijela lokalna mock S8 regresija nakon naknadne ekstrakcije **411/411**, ciljano **63/63**, frontend Node **1005/1005**, build i E2E typecheck prolaze; lint 0 grešaka/6 postojećih upozorenja. Pet Python provjera i `git diff --check` prolaze. CI [45448858670](https://github.com/mudzy992/beauty-salon-v2/actions/runs/45448858670) za `c34c12f` završio je **5/5**, rendered **3131/0/0**, uz 15 axe nepotpunih contrast uzoraka. On ne pokriva `d6cde2c` ni naknadnu ekstrakciju. Konačni CI za lokalni nastavak tek treba pokrenuti i zasebno potvrditi.

## Izmjerena veličina stranica

Početno mjerenje iz CHANGELOG-a: AnalyticsHub 46, Analytics 477, ClientAnalytics 821, StylistAnalytics 248, Users 1718, Services 1519, Salon 674, Stylists 520, ServiceWorkGallery 226 linija. Trenutno: **46 / 68 / 134 / 119 / 138 / 139 / 128 / 146 / 132** istim redom. `Services.tsx` je nakon izdvajanja potvrda kategorija 171 → 139; logika je u `use-service-category-deletion.ts` (54). Izdvojeni moduli nisu svi unutar ~100–150 linija (npr. `use-service-editor.ts` 209 i `edit-user-dialog.tsx` 173); cilj je približan, ali dužina tih modula i njihovo eventualno dalje izdvajanje nisu skriveni.

## Dvije odluke prije zatvaranja

1. **Galerija radova:** `git show c5267fa:frontend/src/pages/ServiceWorkGallery.tsx` potvrđuje da je početni ekran imao samo GET za uslugu i `/api/daily-log/before-after`; nema upload/delete/reorder kontrola. Zasebni `/admin/gallery` (`Gallery.tsx`, `/api/gallery/*`) ima upravljanje sadržajem i po planu je S9. Preporuka: za S8 očuvati postojeći read-only work-gallery ugovor, a postojeću zasebnu admin galeriju obrađivati u S9. Dodavanje uređivanja before/after parova u ovaj ekran bio bi novi funkcionalni i privacy opseg, ne očuvanje postojeće funkcije.
2. **Analitička navigacija:** implementacija i `analytics-hub-redirect.test.mjs` čuvaju tri sidebar linka, `?tab=` i `aria-current`; komentar `analytics-tab-nav.tsx` bilježi da je gornji tab-menu uklonjen u S6. Preporuka: zadržati odobrenu sidebar navigaciju i uskladiti formulaciju S8 plana umjesto uvođenja drugog navigacijskog obrasca. Ako se želi pravi ARIA tablist, to je promjena interakcije i zahtijeva zasebnu implementaciju i dokaz.

## Do kraja S8

- Donijeti dvije gore navedene odluke i eksplicitno evidentirati eventualne promjene plana.
- Završiti postojeći CI, pushati lokalne commitove, te potvrditi **5/5 na tačno završnom HEAD-u**; ne miješati rezultate različitih commitova.
- Pregledati otvorene stavke i dokaze nakon tih odluka; zadržati stvarni AT/400% i druge ručne dokaze koji su u planu dodijeljeni S11, bez pretvaranja mock/axe rezultata u WCAG certifikaciju.
- Tek nakon zadovoljenih S8 kriterija stati i pitati za odobrenje S9. Nema merge/deploya.
