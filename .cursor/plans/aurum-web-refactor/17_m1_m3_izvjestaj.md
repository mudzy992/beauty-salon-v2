# M1 i M3 — radni izvještaj tastature i fokusa

**Status: u toku, M1 i M3 nisu kompletirani.** Ovo je evidencija stvarno izvršenih provjera, ne potpuni WCAG audit, pregled svih mogućih podataka i stanja, ni ručni prolazak čovjeka. Sva nova ispitivanja ispod koriste sintetične naloge/podatke i izolovane odgovore; mutacije su presretnute i nisu došle do stvarnog backenda. Klijentske transakcije, stvarni upload i štampa nisu izvršeni. M2 je već zatvoren zasebno prema korisnikovoj potvrdi i 320px fiksurama.

## Dosadašnja osnova

CI `44942176458` za dokumentaciju `9e65f3e` je 5/5, rendered suite 1505/0/0. Ranije su automatizovani Tab prolazi početnih admin/stylist stranica, javni skip-link, 13 O4 potvrda i niz booking, token, admin, stylist i klijentskih fiksura. To nije dokaz da su sve funkcije dostupne tastaturom: neki postojeći testovi ciljaju element pomoću `.focus()` ili `.click()` i ne obuhvataju sve kombinacije. M2 popravka `718fbe0` obuhvatila je konkretan `Shift+Tab` fokus pod sticky javnim headerom u fiksuri dvije usluge.

## Paket 1 — učitavanje fotografija, navigacija i izvoz

| Tok | Nova lokalna provjera | Rezultat i granica |
|---|---|---|
| Stylist radna knjiga, dodavanje prije/poslije | `m1-workbook-upload.spec.ts`: Classic, Aurum light/dark × BS/EN × prije/poslije × Enter/Space × uspjeh/503/pomjeren fokus/otkazivanje izbora | **96/96**. Stvarni Tab do dugmeta i događaj izbora datoteke; sintetična datoteka, upload i povezivanje isključivo mockovani. Test potvrđuje payload, fokus nakon uspjeha ili greške, da kasnije premješten fokus nije ukraden, te da otkazivanje ne šalje zahtjev. Ne testira nativni OS file-picker ni stvarni upload. |
| 404 i stylist raspored: povratak, direktna rezervacija, detalj i naplata | `m1-navigation.spec.ts`: tri teme × BS/EN × četiri odredišta | **24/24**. Stvarni Tab i Enter, naziv, jedno semantičko interaktivno odredište, URL, te otvaranje dijaloga naplate bez mutacije. Ne potvrđuje stvarnu naplatu. |
| Admin knjiga prihoda i rashoda: izvoz | `m1-finance-export.spec.ts`: tri teme × BS/EN × dvije knjige × Enter/Space | **24/24**. Stvarni Tab do knjige, CSV i PDF akcije; CSV datoteka s fiksurnim podacima stvarno se generiše i provjerava naziv/sadržaj. `window.open` i štampa su simulirani: provjereni sadržaj i poziv print, ne PDF datoteka ni OS dijalog. Nema stvarnih finansijskih podataka ili upisa. |
| Klijentski dijalog otkazivanja | Dopunjen postojeći `m2-client-list.spec.ts`: BS/EN × Aurum light/dark × tri ranije M2 postavke | Ukupno **60/60**. U 12 `cancel-dialog` slučajeva Tab od početka stranice, kruženje Tab i Shift+Tab unutar dijaloga/drawera, obilazak polja i obje akcije, `:focus-visible`, centar kontrole nije prekriven, Escape i povrat fokusa. Mjeri samo te kontrole i stanja; stvarno otkazivanje nije izvršeno. Ranije M2 tvrdnje su zadržane. |
| Raniji stylist regresijski slučajevi | `a11y-stylist.spec.ts` s izolovanom sintetičnom sesijom | **14/14**: dva 320px početna rasporeda, šest popunjenih rasporeda i šest detalja radne knjige. Za direktnu rezervaciju očekuje se ispravna uloga linka umjesto ranije ugniježđenog dugmeta; ranija provjera vidljivosti i položaja je zadržana. |

### Popravljeni nalazi

1. Dugmad „Dodaj prije/poslije“ prethodno su bila zasebna dugmad unutar `<label>` sa skrivenim file inputom. Izolovani Chromium test je potvrdio da Enter na fokusiranom dugmetu **ne otvara** file chooser. Sada nativno dugme otvara odgovarajući input preko reference; Enter, Space i miš koriste isti handler. Pri slanju se kontrola privremeno onemogući: ako se fokus zbog toga izgubi, vraća se nakon uspjeha/greške, osim ako je korisnik u međuvremenu fokus pomjerio. Fiksure pokrivaju i otkazivanje izbora.
2. Povratak iz radne knjige, direktna rezervacija, detalj i naplata u stylist rasporedu, te povratak s 404 imali su `<button>` unutar linka. Zamijenjeni su jednim linkom stilizovanim postojećim `Button asChild`; odredišta i vidljivi tekstovi ostaju isti. Prije popravke ciljna provjera direktne rezervacije našla je jedan ugniježđeni button; nakon popravke nova matrica prolazi.

## Paket 2 — fokus glavnog sadržaja nakon navigacije i skip linka

Pri provjeri direktne rezervacije stvarnim Tab/Enter ustanovljeno je da `useFocusOnNavigate` ispravno fokusira stylist `main`, ali `outline-none` daje transparentan obris. Ista klasa postojala je i na admin `main`. Provjera koja gleda samo `outline-style` pogrešno bi prošla (transparentni `solid`); test zato dodatno provjerava boju i širinu. Nakon popravke oba landmarka imaju 3px unutrašnji obris na `:focus-visible`, scroll-margin ispod zaglavlja i sistemsku `Highlight` boju u forced-colors. Ovo ne mijenja prvi ulaz, fokusiranje mišem niti mehaniku navigacije.

- Prošireni `m1-navigation.spec.ts`: za direktnu rezervaciju i detalje provjerava da je fokus na `main`, da je `:focus-visible`, obris nije transparentan/bez širine i vrh glavnog sadržaja nije iznad dna headera; za naplatu provjerava fokus unutar dijaloga. Sa ostalim ranijim provjerama **24/24**.
- Novi `m3-route-focus.spec.ts`: **12/12** admin BS/EN × tri teme × standardne i Chromium forced-colors emulacije. Stvarnim Tab/Enter aktivira skip link i sidebar link na rezervacije, za oba provjerava fokus, stil, širinu i položaj vrha, te da naredni Tab ostaje u glavnom sadržaju; svi upisi blokirani.
- Skupno **36/36**, nakon produkcijskog builda ponovno i **180/180** upload, finance i klijentskih regresija, E2E typecheck i ciljani ESLint PASS, dva shell node skupa **20/20**, produkcijski build PASS. Nakon uklanjanja `outline-none`, ali prije rebuilda, test je i dalje padao jer lokalni preview služi build; nakon rebuilda prolazi. Forced-colors je samo emulacija, ne stvarni Windows high contrast. Provjera izračunatog CSS-a i vrha landmarka ne dokazuje kontrast i izloženost čitavog obrisa, sve širine, tokove ili browser/OS kombinacije.

## Dijagnostika indikatora fokusa — nije zaključen M3

Lokalni Chromium, 1280 × 900, BS, reduced-motion, izolovani podaci: za 404 povratak, direktnu rezervaciju i dugme „Dodaj prije“ snimljena su fokusirana stanja u Classic/Aurum light/Aurum dark. Zatim je samo za dijagnostiku u pregledniku privremeno uklonjen `outline` i `box-shadow` fokusiranog elementa, snimak ponovljen, te poređeni pikseli do 8px izvan geometrije kontrole. U svih devet slučajeva postojao je barem jedan promijenjen piksel s omjerom ≥3:1 prema odgovarajućem pikselu bez fokusa. Maksimalni izmjereni omjeri za redoslijed 404/raspored/radna knjiga bili su Classic **3,11 / 3,11 / 3,26**, Aurum light **6,46 / 5,91 / 6,37**, Aurum dark **8,75 / 9,48 / 8,75**.

To je samo **maksimum diferencijalnih piksela**, može uključiti sjenu i ne dokazuje da je cjelokupan prsten, njegova površina ili susjedna podloga 3:1. Nisu sačuvani snimci niti je mjeren svaki kontrolni stil, pozadina, stanje, browser ili fokusni obris. Source-only `check_ui_contrast.py --strict` prolazi 148/148 odabranih parova, što također nije rendered dokaz. Ne proglašavati M3 završenim na osnovu ovih maksimuma.

## Otvoreno i sljedeći koraci

- Proći preostale admin i stylist CRUD tokove, filtere, kalendar, dijaloge, upload/izvoz i greške u stvarnom Tab redoslijedu; prethodne fiksure koje pozivaju `.focus()`/`.click()` ne proglašavati potpunim tastaturnim prolazom.
- Proširiti pregled fokusnog obrisa i kontrasta na reprezentativne površine, kontrole i interaktivna stanja, uključujući stvarno prekrivanje pri skrolu, povrat fokusa nakon brisanja, rute i asinhronih operacija. Centar kontrole nije provjera cjelokupnog obrisa.
- Provjeriti kompletne tokove u stvarnom pregledniku samo tastaturom, uključujući nativni izbor datoteke, te dokumentovati browser, OS, rute, uloge, teme, stanja i nalaze. Ne koristiti stvarne klijentske podatke. OS forced-colors, screen reader i stvarni reduced-motion zasebne su otvorene stavke M4–M6.
- CI za raniji paket `b403b6a` je pokrenut; konačan ishod treba potvrditi. Lokalni rezultati naredne fokusne dopune nisu dokaz pravog backend upisa, štampe ili potpune WCAG usklađenosti.
