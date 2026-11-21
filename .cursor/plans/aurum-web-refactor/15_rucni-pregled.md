# Ručni pregled novog identiteta — radni protokol

**Korisnikov M2 izvještaj:** korisnik je prijavio Brave i Edge na Windowsu, sve rute, uloge, jezike i teme, uredan ishod bez preklapanja, odsijecanja ili nedostupnih kontrola. Naknadno je izričito potvrdio stvarni browser zoom na 200% i 400%, text-spacing override i pregled verzije s popravkom `718fbe0`. Viewport, verzije browsera, pojedinačna stanja i vrijeme pregleda nisu navedeni. Ovo je korisnikov izvještaj, ne nezavisno provjeren audit. M2 se zatvara na osnovu te potvrde i automatizovanih 320px fiksura; čitač ekrana, sistemski forced-colors i druge nepokrivene provjere ostaju zasebno otvorene.

Sandbox je koristio izolovani Chromium s fiksurama; ograničena vizuelna procjena statičnih snimaka zabilježena je u [ciljanom pregledu](16_ciljani-vizuelni-pregled.md). Ona nije zamjena za čitač ekrana ni stvarne sistemske postavke. Automatizovani a11y-e2e i source provjere također nisu zamjena. Ne koristiti stvarne klijentske podatke.

Za svaki identitet (classic, Aurum light i Aurum dark), jezik BS/EN i relevantnu ulogu, na izolovanom testnom okruženju:

1. Na 320px i 400% zumu pregledati header, navigaciju, naslovnu, katalog/detalj, sadržajne stranice, auth/onboarding, rezervaciju/profil te admin/stylist ekrane: bez gubitka sadržaja/akcija, nenamjernog horizontalnog skrola i preklapanja; zabilježiti svaki izuzetak s rutom i snimkom.
2. Samo tastaturom proći skip link, meni/drawer, promjenu jezika i teme, filtere, forme, tabele i dijaloge; provjeriti redoslijed fokusa, vidljivost fokusa, zatvaranje Escapeom i povrat fokusa, uključujući kalendar i sve statuse učitavanja/greške.
3. Čitačem ekrana pregledati landmarke, h1/h2, nazive i aktivno stanje navigacije, oznake polja, greške, status i promjene sadržaja. Zabilježiti tačan browser, OS i čitač.
4. Provjeriti `prefers-reduced-motion`, forced-colors, dugačke stvarne nazive, prazne kolekcije, učitavanje, grešku i retry, stvarne medije i korisnički uploadan logo bez izlaganja privatnih podataka.
5. Provjeriti admin izbor identiteta/režima, osvježenje i drugi uređaj/tab, naslijeđenu lokalnu preferenciju, prekidač skriven u classic, dozvole te postavke nakon greške mreže.

## Text-spacing — postupak za stvarni ručni pregled

Na izolovanom testnom okruženju otvoriti reprezentativne popunjene javne, admin i stylist rute i dijaloge, u BS/EN i Aurum light/dark. Pomoću alata za korisnički CSS ili DevTools primijeniti sljedeći override, bez izmjene izvornog koda aplikacije:

```css
*, *::before, *::after {
  line-height: 1.5 !important;
  letter-spacing: 0.12em !important;
  word-spacing: 0.16em !important;
}
p { margin-bottom: 2em !important; }
```

Pregledati sadržaj, oznake i poruke, vidljivost i upotrebljivost kontrola, preklapanja, odsijecanje te dijaloge i njihove skrol regije; po potrebi proći tastaturom. Zabilježiti i ukloniti override nakon pregleda. Ne unositi stvarne klijentske podatke niti izvršavati stvarne finansijske radnje. Automatizovani CSS override i diferencijalna DOM mjera nisu dokaz ovog vizuelnog i interaktivnog pregleda.

Zapisivati datum, commit, uređaj/viewport, browser, ulogu, rutu, jezik, temu, postavku, rezultat, dokaz i otvorene nalaze. Nijedna stavka se ne smatra prolazom dok nije stvarno pregledana. Najnovija korisnička prijava i njena ograničenja su na početku ovog dokumenta. Kontrast prijavljen od rendered axe-a: STOP i odluka vlasnika prije izmjene palete; ne slabiti testove.

### Klijentska lista: fiksurna automatizacija, nije zamjena za ručni pregled

Na `/moje-rezervacije` je lokalno prošlo 60 izolovanih BS/EN Aurum light/dark kombinacija: popunjena lista, dijalog otkazivanja, simulirani uspjeh, odbijanje prijedloga s greškom i retry učitavanja, pri 320 px, simuliranom 200% root tekstu i text-spacing overrideu. Duga napomena se u Aurumu više ne odsijeca; `aria-describedby` povezuje referencu, status i detalje. Escape vraća fokus na okidač, a simulirani uspjeh na naslov kada je okidač nedostupan. Provjeriti ručno stvarni zoom, redoslijed i vidljivost fokusa, čitač ekrana te oba prikaza dijaloga; fiksura ne vrši stvarnu rezervacijsku transakciju i ne zatvara M2.

### Booking s više usluga

U izolovanoj sesiji provjeriti pretragu, Tab do rezultata, Enter, Escape, dodavanje, zasebna dugmad za uklanjanje i čišćenje te promjenu usluge nakon izbora termina. Posebno provjeriti da fokus i sadržaj ostaju vidljivi pri skrolu ispod sticky headera, s dugačkim nazivima, oba jezika i realnim zoom/text-spacing postavkama. Fiksurnih 72 slučaja i izresci kartice su u [ciljanom pregledu](16_ciljani-vizuelni-pregled.md); izresci su namjerno snimljeni bez sticky ponašanja headera i nisu dokaz ručnog pregleda ni stvarne rezervacije. Naknadno je u fiksuri reproducirano pokrivanje prethodnog dugmeta pri `Shift+Tab`, pa je dodan izmjereni scroll-padding; to pokriva samo testirani slučaj, ne sve kombinacije uređaja i skrola.
