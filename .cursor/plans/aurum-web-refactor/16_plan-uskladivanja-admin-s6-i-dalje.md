# Plan usklađivanja admina do S6 i nastavak nakon S6

**Aktuelni plan rada · 2026-11-11**

## Polazna tačka i odluke

- Vlasnik je zatvorio javnu fazu i traži najveći fokus na admin dashboardu. To nije potvrda pune WCAG usklađenosti javnog dijela: ručni nalazi ostaju otvoreni u `15_rucni-pregled.md`. Naslovnicu i odobreni hero ne mijenjati u ovom radu.
- S0–S5 su historijski završeni za tadašnji opseg. Revidirani identitet i kasnije izmjene ne postaju automatski WCAG-certificirani zbog ranijih zelenih testova. S6 **nije završen**: uključuje admin shell, početni dashboard, rezervacije i fullscreen kalendar, ne samo `/admin`.
- Prvi inkrement dashboarda: `b8d967c`, `fb092ab`, `48266ac`; [CI 43429394222](https://github.com/mudzy992/beauty-salon-v2/actions/runs/43429394222) prošao 5/5. Pokriveni su odabrani scenariji djelimičnog pada u svijetlom/tamnom modu i na desktopu/320 px; opći axe filter ne pretvara ovo u dokaz AAA. Potrebni su reprezentativni popunjeni podaci i vizuelni te ručni pregled.
- Odobreni novi identitet (Aurum) mora biti premium, prepoznatljiv i funkcionalan u oba režima; classic ostaje očuvan. Koristiti postojeću paletu, izvore, rute, uloge i BS/EN. Bez lažnih podataka, novih metrika ili poslovnih tvrdnji. Ako stvarni kontrast ne prolazi s dostupnim kombinacijama palete, **STOP i pitati vlasnika prije promjene palete**.
- Raniji dokumenti 00–12 su historijska specifikacija pojedinih segmenata, a novije vlasnikove odluke i revidirani plan 13 imaju prednost gdje se razlikuju (uključujući izbor teme, ograničene backend izmjene i prelazak između faza bez ponovnog odobrenja). Ovaj plan pojašnjava redoslijed i dokaz, ne tvrdi da je posao urađen.
- Zatečeni neversionirani `frontend/src/features/dashboard/aurum-stat-grid.tsx` sačuvati; ne brisati niti commitovati bez zasebnog pregleda i odluke.

## Do završetka S6

### 1. Inventar i osnovni kvalitet admin shell-a

- Pregledati stvarne rute, uloge, 17 postojećih linkova i aktivna stanja odobrene mape A, uključujući `?tab=` i redirecte. Ne preuređivati URL-ove ili prava radi izgleda.
- Vizuelno i funkcionalno uskladiti sidebar, zaglavlje, korisnički meni, jezik, režim i mobilnu navigaciju u Aurum light/dark; provjeriti Classic zasebno. Identifikovati i otkloniti loše portalne pozadine i kontrast u stvarnim stanjima, a ne masovno zamjenjivati semantičke boje.
- Tastatura: skip-link, redoslijed i vidljiv fokus, otvaranje/zatvaranje mobilne navigacije i menija, Escape i povratak fokusa; provjeriti duga imena, 320 px, reflow i reduced motion.

### 2. Dashboard `/admin` — dovršiti, ne samo prebojiti

- Pregledati postojeću kompoziciju uz reprezentativne podatke: veliki iznosi, duga imena, više statusa, dugi prijevodi, prazne tabele, učitavanje, potpuni/djelimični pad i retry. Dizajnerski doraditi hijerarhiju, ritam, kartice i brze pristupe, bez izmišljanja grafova, trendova ili KPI-ja.
- Provjeriti osam nezavisnih izvora: svaka nedostupna vrijednost i zavisna suma mora biti označena, a uspješni podaci ostaju vidljivi; neuspio izvor rezervacija ne smije izgledati kao prazna lista. Sačuvati formule (prihod od usluga + napojnice; neto = prihod − rashodi), lokalizaciju, rezervacije i postojeće linkove.
- Outbox ostaje samo za ovlaštene uloge, s postojećom potvrdom, upozorenjem i auditiranim replayem. Testirati i neovlaštenu ulogu te greške, ne prikazivati osjetljive detalje pogrešnoj ulozi.
- Renderirani testovi trebaju sadržavati i stvarno popunjeno stanje te provjere dostupnosti u oba Aurum režima i Classic, desktop i 320 px, s izričitom provjerom AA i zasebnim AAA nalazima. Zabilježiti `incomplete`, ne skrivati ga pod prolaz. Provjeriti fokus i geometriju, ne samo axe.

### 3. Admin rezervacije

- Inventarisati aktuelni tok liste i detalja, pretragu, filtere, sortiranje, paginaciju, statusne akcije i dozvole; preoblikovati layout, kartice/tabelu, filtere i dijaloge prema istom jeziku kao dashboard.
- Očuvati API parametre, podatke, statuse, obračune, potvrde, obavijesti i tok greške/oporavka. Provjeriti praznu listu, mnogo redova, duge nazive, učitavanje, greške, promjenu filtera, detalj i potvrde, bez mutiranja produkcijskih podataka.
- Tastatura, fokus unutar dijaloga i povratak, odgovarajuće oznake, kontrast i reflow u svijetlom/tamnom te paritet Classic; provjeriti horizontalno pomjeranje tastaturom gdje je nužno.

### 4. Fullscreen kalendar rezervacija

- Provjeriti stvarnu zasebnu rutu i shell, trenutni period, prelazak datuma, stiliste, događaje, detalj, učitavanje i greške. Uskladiti zaglavlje i upravljanje režimom s odobrenom globalnom postavkom, bez mijenjanja vremenske logike ili API granica.
- Zadržati/omogućiti postojeću alternativu za svaku radnju povlačenjem; testirati tastaturu, fokus, imena događaja/statusa, dugačke sadržaje i mobilni raspored. Ako je potrebna nova poslovna radnja ili ugovor, prvo pitati vlasnika.

### 5. S6 kontrolna tačka

- Provesti relevantne postojeće testove pariteta, dozvola i i18n, lint, typecheck, build/bundle budžet, E2E typecheck i projektne gateove; bez slabljenja asercija. Za svaki novi scenarij evidentirati fixture, stanje, režim i viewport.
- Pokrenuti CI na ovoj grani i zapisati commit, run i svih 5 poslova; ne smatrati preskočen autentificirani test dokazom. Evidentirati axe AA/AAA, `incomplete`, testirane i netestirane rute/stanja te pronađene probleme.
- Ručno provjeriti 320 px i 400% zoom/reflow, tastaturu, vidljiv fokus, reduced motion i čitač ekrana u reprezentativnim stvarnim tokovima; ako okruženje to ne dopušta, izričito navesti da je neizvršeno. Vizuelno pregledati s realnim salonskim sadržajem uz zaštitu ličnih podataka.
- Ažurirati `07_phase-6-admin-shell.md`, checklist i changelog prema stvarno provjerenom stanju. S6 označiti završenim tek kada su sve četiri cjeline i kriteriji iznad ispunjeni; neriješeni nalazi ostaju vidljivi, ne pretvarati ih u potvrdu usklađenosti.

## Nakon S6 — nastaviti bez nepotrebnog čekanja

| Faza | Fokus i obavezni paritet | Ključni dokazi |
|---|---|---|
| **S7** | Dnevna knjiga, finansije, loyalty; isti iznosi, KIF/KUF, dugovanja, bodovi, filteri i akcije. | Testovi finansijskih formula i realistični create/edit/delete/retry tokovi, zaštita destruktivnih akcija; oba Aurum režima + Classic. |
| **S8** | Analitika, korisnici, salon, usluge, stilisti i galerija radova; iste uloge, analitika, paginacija i rute. | Grafikoni s tekstualnom/tabelarnom alternativom; reprezentativni podaci, dozvole i dugi sadržaj. Velike fajlove mjeriti prije opravdanog razdvajanja. |
| **S9** | Blog, galerija, recenzije i svi postojeći tabovi postavki. | Editor, moderacija, upload/reorder, potvrde i deep-linkovi; provjera promjene globalne teme i autorizacije. |
| **S10** | Cijeli stylist portal i dnevna knjiga. | Isti rezervacijski FSM, cijene i tokovi; provjeriti prethodni ispravak odabira klijenta/usluga i sa stvarnim salonskim podacima nakon deploya. |
| **S11** | Završni pregled svih web ruta, konsolidacija dokumentacije i predaja. | Stvarni rezultat po ruti/stanjima i režimu, ručne provjere, poznate iznimke, nedostaci i dokaz CI; uklanjati samo dokazano nekorišten kod, uz očuvanje zatečenog WIP-a. |

Za svaku fazu ponoviti kontrolnu tačku iz S6 prilagođenu opsegu, uz stvarne podatke ili jasno označene fixturee. Problemi se rješavaju u fazi u kojoj su otkriveni; puna usklađenost se ne proglašava dok potrebni ručni pregledi i odgovarajući dokazi ne postoje. Nakon S6 nastaviti redom S7–S11 bez dodatnog odobrenja za običan prelaz; pitati samo kad je potrebna odluka vlasnika, promjena palete ili promjena poslovnog ugovora. Nema PR-a, mergea ili deploya bez posebnog zahtjeva.
