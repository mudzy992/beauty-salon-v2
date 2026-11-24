# S8 — work-gallery: odobreni ugovor i implementacijski kontrolni spisak

Ovo je radni plan, **ne implementacija**. Vlasnik je odabrao dodati upload, uklanjanje i redoslijed u S8:

- Novi before/after par veže se za postojeći **završeni zapis usluge**. Novi originali su privatni; javni prikaz zahtijeva zasebnu aktivnu saglasnost stvarnog klijenta za svaku fotografiju.
- Uklanjanje iz galerije znači sakriti par u javnim i admin prikazima galerije, bez brisanja originala ili saglasnosti. Ovo nije opoziv saglasnosti; trenutni direktni URL izvedene slike je provjerava i sam po sebi ostaje dostupan dok saglasnost vrijedi. Ako se pod „sakriti“ očekuje i ukidanje direktnog URL-a, mora se dodatno promijeniti ugovor javnog fajla i provjeriti uticaj na druga mjesta.
- Ručni redoslijed vrijedi u admin galeriji i javnom before/after feedu filtriranom po usluzi. Nepodijeljeni i slučajni javni feedovi zadržavaju svoj redoslijed; sakrivanje se ipak primjenjuje na javnu galeriju općenito.
- Zasebna `/admin/gallery` ostaje S9. Bez mergea/deploya i bez proglašenja S8 završenim dok ovdje nije sve provedeno.

## Polazište koje implementacija mora poštovati

- `DailyLogPublicService` po zapisu bira najviše jedan važeći par (prva validna before/after slika u stabilnom `sortOrder,id` redoslijedu), javni izlaz sadrži ID zapisa, a ne ID-ove privatnih slika. Upload dodatnog para u zapis koji već ima slike **ne smije obećavati** zamjenu ili pojavljivanje u feedu ako se izbor para zapravo nije promijenio. Predvidjeti i testirati jednoznačan postupak za postojeće slike, bez tihe izmjene klijentovog ranijeg pristanka.
- `/api/uploads` sprema privatni upload; postojeći `POST /api/daily-log/:id/images` dodaje pojedinačne slike. Ta dva poziva i dva dodavanja nisu sama po sebi atomski par. Potrebni su autorizacija i serverska validacija vlasništva/vrste fajla, svrhe, završetka i pripadnosti zapisa odabranoj usluzi te strategija greške djelimičnog uploada i napuštenih fajlova.
- `/api/media/consents/:imageId/grant` dozvoljava klijentu dati saglasnost za pojedinu fotografiju; admin ne smije grantovati umjesto njega. Javne putanje vode na derivat s aktivnom saglasnošću i bez privatnog opisa, osim zasebno odobrenog snapshota. Povlačenje, promjena klijenta/statusa zapisa i konkurentni grant ne smiju vratiti par u feed bez validne provjere.
- Postojeći `DELETE /api/daily-log/:id/images/:imageId` uklanja originalnu vezu iz dnevnog zapisa, pa **nije implementacija odabranog sakrivanja**. Treba zasebna perzistentna kontrola vidljivosti, adminsko vraćanje sakrivenog para i jasna potvrda; ne mijenjati saglasnost.
- Paginacija javnog feeda broji zapise, mapping može izostaviti nevažeće parove; slučajni feed koristi indeksirani kružni prozor. Skrivanje mora biti u filtriranju prije count/skip, ne poslije mapiranja. Sortiranje usluge mora imati stabilne tie-breakere i raditi preko svih stranica, a ne samo u trenutno učitanom DOM-u. Bez promjene vremenskog ili slučajnog redoslijeda feedova bez filtera usluge.

## Redoslijed rada i provjere

1. Napraviti backend model/migraciju za vidljivost i red po usluzi te jasno ograničene administratorske API-je; zaštititi prava na serveru, validirati ulaze i konkurentne promjene unutar odgovarajućih transakcija. Spriječiti izgubljene izmjene pri dva istovremena sortiranja i pokazati korisniku konflikt/refresh.
2. Napisati DB-backed HTTP testove za autorizaciju, upload/vezivanje, pojedinačne saglasnosti i njihovo povlačenje, sakrivanje/vraćanje bez brisanja originala/saglasnosti, kontrolisane konkurentne promjene i migraciju. Testirati javni feed po usluzi, nefiltrirani i random feed, više stranica, prazne mapirane stranice i stabilnost poretka; ne oslanjati se samo na mock Prisma.
3. UI: izbor završenog zapisa i obje slike, prikaz privatnog statusa i čekanja saglasnosti, rukovanje djelimičnim greškama, imenovane akcije, potvrda, tastaturni pomak gore/dolje bez drag-only uslova, statusi i povrat fokusa nakon nestanka/ponovnog učitavanja. Odvojeno BS/EN, mobilni i desktop viewport, race/duplicate-submit testovi i scoped axe.
4. Lokalni build/Node/backend/Playwright/pet Python provjera; CI za tačno konačni commit. Ručni AT/OS ostaju označeni odvojeno. Ne opisivati sintetičke ili mock dokaze kao produkcijsku validaciju privatnosti.
