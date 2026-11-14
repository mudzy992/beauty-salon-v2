# Pregled `/admin/users`

- Status: u toku; korisnik je izričito zadao ovu stranicu prije analitike. Koristi protokol i šablon iz `19_checklist-template-pregled-stranice.md`.
- Svrha: pregled klijenata, stilista i administratora, upravljanje ulogama, statusom, podacima, dugovanjima i početnim pristupom. Stvarne izmjene i pristup moraju ostati autorizovani na backendu.
- Plan: (1) čitanje cijelog page fajla i popis zavisnosti; (2) ugovori, hardkod, tokeni, i18n, interakcije i a11y; (3) ispravke i izolirani testovi sa reprezentativnim podacima za sve pogođene tokove; (4) CI i dokumentovanje ograničenja, pa korisnikov vizuelni pregled.

## Inventar

| Fajl / kontekst | Opseg | Status |
|---|---|---|
| `frontend/src/pages/Users.tsx` | linije 1–1588 prije izmjena | pročitan u cijelosti |
| shared DataTable/DataState, Badge, Card, Button, Dialog, Alert, Dropdown, Switch, Tabs, Input, Label, Avatar, ConfirmDialog | relevantna implementacija i portal stilovi | u toku |
| API katalog, greške, upload, toast, i18n, backend role i ugovori | relevantni dijelovi | u toku |
| `frontend/src/features/users/*.test.mjs`, E2E i translations | relevantni slučajevi | u toku |

## Početni nalazi

| ID | Nalaz | Prioritet | Status |
|---|---|---|---|
| U-01 | Create dijalog primary button u svijetlom režimu 6.01:1, ispod ciljanog AAA, 2 prethodna CI pada. | srednji | popraviti postojećim tokenima, bez izmjene palete i uz CI test |
| U-02 | Select za prijenos stilističke uloge koristi isti ID za više kategorija, pa label može označavati pogrešan element. | visok | napraviti jedinstven ID i provjeru više kategorija |
| U-03 | Switch aktivnog statusa nema programski naziv. | visok | povezati s vidljivom oznakom i testirati |
| U-04 | Async provjere dostupnosti username-a mogu ažurirati status nakon novijeg unosa ili zatvaranja. | srednji | zaštititi od zastarjelih odgovora i testirati |
| U-05 | Obojene stavke, dugovi, statusi, akcije i dijalozi trebaju sveobuhvatnu provjeru stvarnih površina, kontrasta i interakcija. | visok | u toku |

Vizuelni pregled radi korisnik; automatski testovi ne zamjenjuju čitač ekrana niti dokazuju sve WCAG kriterije. Ne dirati nepovezani nepraćeni dashboard WIP.

## Prvi inkrement

- U-01: primarno dugme samo u Users portalu prešlo na postojeće površinske/tekstualne tokene, s hover stanjem; Classic nije promijenjen. CI treba dokazati kontrast.
- U-02/03: jedinstveni ID po kategoriji prijenosa, switch povezan s vidljivom oznakom, potrebni podaci programački označeni. U-04: otkazivanje zastarjelih rezultata provjere username-a pri izmjeni/zatvaranju. Dodan browser scenarij edit i dvije kategorije prijenosa, oba moda/viewporta; čeka CI.
- Dodatno: unikatna imena role akcija s username, vidljiv fokus i minimalni 24px gumb, brisanje privremene lozinke iz stanja na potvrdi, reduced-motion spinner, usklađene odabrane površine/tekst/ikone u korisničkom prikazu i dijalozima.
- `Users.tsx` pročitan u cijelosti. Relevantni DataTable, DataState, Badge, Button, Card, Dialog, Alert, ConfirmDialog i API catalog pregledani; dodatne zavisnosti, backend ugovori, ostala stanja i svi testovi još nisu dovršeni.
- Lokalno users-a11y 7/7, lint, build i E2E typecheck prošli; rezultat browser/CI još nije poznat.

### CI i dodatni nalaz

- CI `43585781634` za `d5fe688`: **5/5 poslova prošlo**. Ranija dva Users create AAA pada su otklonjena; četiri nova edit/role-transfer scenarija također su prošla. Ovo nije dokaz svih stanja niti automatska potvrda potpune pristupačnosti.
- U-06: zajednički `ConfirmDialog` ostajao je zaključan nakon neuspješne mutacije dok se dijalog ne zatvori. Implementirana zaštita od duplog klika i reset zaključavanja poslije pending ciklusa; izmjena je zajednička za postojeće finance potrošače. Source test ažuriran, lokalni build/lint prošli. Dodan stvarni browser test neuspjeha i ponavljanja otpisa s mockom, čeka CI. Nije izvršena mutacija stvarnih podataka.
- I dalje otvoreni detalji: izvršni test zastarjelih username odgovora, ostali dijalozi i stanja, sadržajne fixturee u oba moda, Classic, dostupnost čitačem ekrana i korisnikov vizuelni pregled. `/admin/users` nije još označen završenim.
- CI `43586377293`: 4/5 poslova; novi test je dokazao drugi poziv nakon greške, ali pao na testnoj lokaciji `getByRole('dialog').last()` koja nakon zatvaranja pronalazi ponovo otvoreni edit dijalog. Koristimo tačan pristupačni naziv potvrde, bez mijenjanja aplikacijskog ponašanja; ponovna provjera potrebna.
- CI `43587004231` za `0db652f`: 5/5 poslova. Retry testa otpisa je sada prošao, kao i ostali testovi; CI ne garantuje svaku kombinaciju svih potrošača zajedničkog dijaloga.
- Dodat izvršni browser test za namjerno odgođen stariji odgovor provjere korisničkog imena; čeka CI.
- CI `43587542493` za `cee6449`: 5/5; browser test odgođenog zastarjelog username odgovora prošao.
- U-07 (visok): uklanjanje uloge stiliste bez povezanih zapisa prethodno se slalo automatski nakon preview odgovora, čak i bez potvrde; zatvaranje dok preview traje nije prekidalo tok. Uklonjena automatska mutacija i dodana zaštita od zastarjelih preview odgovora. Sada je potrebna eksplicitna potvrda i kad nema povezanih zapisa; dodan izolovan browser test otkazivanja i potvrde. Test čeka CI; nijedan stvarni korisnik nije mijenjan.
- CI `43588111224` za `d25d56b`: 5/5. Browser test potvrđuje da nema automatskog uklanjanja pri nula povezanih zapisa, otkazivanje ne šalje mutaciju, a izričita potvrda šalje jednu izolovanu mock mutaciju.
- Dodani test kompletnog popunjenog prikaza (AA plus izvještaj AAA/incomplete) u oba moda/viewporta i simulirana kreacija s jednokratnim pristupnim podacima; čeka CI.
- CI `43588639783` za `082e4a5`: 5/5, simulirana kreacija i brisanje prikazanih jednokratnih pristupnih podataka prošli. Popunjeni Users axe u light režimu prijavio AAA 6.38–6.39:1 na zaglavljima i značkama (AA prošao), dark bez nalaza. Usklađen tekst s postojećim jačim tokenima, zadržani statusni obrubi/pozadine, bez izmjene palete; test sada zahtijeva i AAA bez violations. Čeka ponovni CI.
