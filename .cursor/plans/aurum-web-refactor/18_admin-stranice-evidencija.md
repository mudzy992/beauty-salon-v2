# Admin: evidencija pregleda stranica i TSX potrošača

Cilj vlasnika: svaki admin ekran i njegova TSX stabla, sve vidljive površine/boje kroz postojeću Aurum paletu, ne samo početna. Ovo je **radna evidencija, ne tvrdnja o završenom pregledu**. Pregledati light/dark, Classic paritet, sve uloge, popunjeno/prazno/učitavanje/greške, hover/fokus, mobilno i portale. Grafove, upravljive sadržaje/slike i statusne elemente provjeravati zasebno, jer nisu nužno obične površine. Nijedna skripta sama ne garantuje da je renderirana boja ili kontrast ispravan. Ako nije moguće postići potreban kontrast postojećim tokenima, stati i pitati prije promjene palete.

Legenda: **otvoreno** = detaljan pregled još nije obavljen; **djelimično** = neki konkretni tokovi/komponente provjereni, nije kompletna stranica. Registar u `17_admin-poprecni-pregled.md`; `python3 scripts/audit_tsx_ui.py --json` uključuje sve TSX fajlove, a `--scope admin` statički dosegnute; provjeriti i shared/unclassified i dinamičke importe. Testne fixturee ne smatrati stvarnim salonskim podacima.

| Ruta / skup | Evidencija | Status |
|---|---|---|
| `/admin` | KPI, djelimični pad, odabrani states i navigacija imaju E2E; outbox i popunjene kombinacije nisu kompletno ručno pregledani. | Djelimično |
| `/admin/reservations` | Default Card surface u oba režima, osnovni axe; lista, detalj, svi statusi/forme nisu kompletno provjereni. | Djelimično |
| `/admin/reservations/calendar` | Osnovni axe i površina/loader; sadržajan kalendar, interakcije i svi stilovi otvoreni. | Djelimično |
| `/admin/daily-log` | Osnovni route axe; forme i svi podaci/stanja neprovjereni u novom inventaru. | Otvoreno |
| `/admin/finance` i `?tab=income/expense/categories/debtors` | Zajednička stanja i Card djelimično obrađeni; svi finansijski podmoduli i dijalozi otvoreni. | Otvoreno |
| `/admin/loyalty` | Osnovni route axe, ostale komponente/stanja otvoreni. | Otvoreno |
| `/admin/analytics`, `?tab=clients/stylists` i deep linkovi | Direktne boje u grafovima, karticama i tabelama; značenje i realne vrijednosti zahtijevaju pažljiv pregled. | Otvoreno |
| `/admin/users` | Pregled koda otkrio legacy kartice, tabove, polje pretrage, role i zasebne dijaloge. Prvi inkrement usklađuje tabove, default polja i role u glavnom prikazu; fixture s klijentom u oba režima i 320/desktop tek treba CI. Dijalozi, greške i ostale boje otvoreni. Uočeno: list-load catch briše podatke i može izgledati kao prazno stanje; potrebno posebno riješiti i testirati. | Djelimično |
| `/admin/salon` | Zaglavlja, tabele, postavke i praznici otvoreni. | Otvoreno |
| `/admin/services`, `/admin/services/:serviceId/work-gallery` | Default Card na listi kategorija testiran; hijerarhija, forme, dijalozi, galerija i sva stanja otvoreni. | Djelimično |
| `/admin/stylists` | Tabovi, tabele, radno vrijeme, kompetencije i modali otvoreni. | Otvoreno |
| `/admin/blog` | Lista, komentari, editor i upload otvoreni. | Otvoreno |
| `/admin/gallery` | Kategorije, odabir, reorder, slike i dijalozi otvoreni. | Otvoreno |
| `/admin/reviews` | Statusi, lista, moderacija i dijalozi otvoreni. | Otvoreno |
| `/admin/settings` i svi postojeći tabovi: site, operations, appearance, seo, releases, notifications, email | Shared tabs inkrement može pomoći, ali različiti editori, preview sadržaja, boje konfiguracije i svi dijalozi nisu pregledani. Sačuvati redirecte i query parametre. | Otvoreno |
| Shell i portali | Navigacija, korisnički meni i fokus mobilnog menija imaju odabrane light/dark fixturee; mnogi shared dialog/button/badge/form potrošači ostaju. | Djelimično |

## Sigurnost promjena i dokaz

1. Za svaku rutu pregledati importovani TSX, uključujući zajedničke primitive, ne samo vršni fajl. Prvo opisati stvarni kontekst boje i statusa, zatim zamijeniti postojećim semantičkim parovima; ne raditi globalnu mehaničku zamjenu sveg `slate`/`rose`.
2. Svaki inkrement testirati kao stvarni render s reprezentativnim fixtureima i izračunatim stilovima (oba Aurum režima, 320 px i desktop), tastaturom i odgovarajućim a11y pravilima, te BS/EN i postojeće poslovne/role testove. Classic provjeriti zasebno. Dokumentovati CI, nepotpune i neprovjerene nalaze.
3. Ne označiti rutu dovršenom bez potvrde svih njenih relevantnih stanja i interakcija. Ručni vizuelni i screen-reader pregled uz realne podatke ostaje poseban dokaz, uz zaštitu privatnosti.

### Korisnici — drugi inkrement, provjera u toku

- Pregledani `Users.tsx` list-load i create/edit/remove/credentials dijalog markup, shared Badge i data-state. Sada se neuspjelo učitavanje liste jasno prikazuje uz retry umjesto lažnog praznog stanja, a zastarjeli upit ne može nadjačati noviji; učitavanje se najavljuje. Potrebna provjera stvarnog retry-ja i navigacije.
- U glavnom korisničkom prikazu i označenim portalima Badge varijante koriste odgovarajuće postojeće ok/warn/bad/neutralne Aurum tokene. Default polja, selecti i odabrane boje poruka u korisničkim dijalozima također su usklađeni; Classic ostaje izvan pravila. I dalje ostaju ikone, akcije, drugi dijalozi/stanja i provjera svih značenja statusa — stranica nije završena.
- Dodane izolirane browser fixturee za grešku i retry te create dijalog u oba režima/viewporta, uključujući izračunatu površinu i zasebni AAA axe; test ne piše podatke. Lokalni build, lint, source i E2E typecheck prošli. CI još potreban. Raniji inkrement `947ac57`: CI `43442340350` 5/5.
