# Ručni pregled novog identiteta — radni protokol

**Status: nije izvršen.** U ovom sandboxu nema instaliranog preglednika niti pristupa njegovom download CDN-u; korisnikov preglednik nije sandbox, a prijavljeni admin/stylist tokovi traže izolovanu bazu i račune. Automatizovani a11y-e2e i source provjere nisu zamjena za ovaj pregled. Ne koristiti stvarne klijentske podatke.

Za svaki identitet (classic, Aurum light i Aurum dark), jezik BS/EN i relevantnu ulogu, na izolovanom testnom okruženju:

1. Na 320px i 400% zumu pregledati header, navigaciju, naslovnu, katalog/detalj, sadržajne stranice, auth/onboarding, rezervaciju/profil te admin/stylist ekrane: bez gubitka sadržaja/akcija, nenamjernog horizontalnog skrola i preklapanja; zabilježiti svaki izuzetak s rutom i snimkom.
2. Samo tastaturom proći skip link, meni/drawer, promjenu jezika i teme, filtere, forme, tabele i dijaloge; provjeriti redoslijed fokusa, vidljivost fokusa, zatvaranje Escapeom i povrat fokusa, uključujući kalendar i sve statuse učitavanja/greške.
3. Čitačem ekrana pregledati landmarke, h1/h2, nazive i aktivno stanje navigacije, oznake polja, greške, status i promjene sadržaja. Zabilježiti tačan browser, OS i čitač.
4. Provjeriti `prefers-reduced-motion`, forced-colors, dugačke stvarne nazive, prazne kolekcije, učitavanje, grešku i retry, stvarne medije i korisnički uploadan logo bez izlaganja privatnih podataka.
5. Provjeriti admin izbor identiteta/režima, osvježenje i drugi uređaj/tab, naslijeđenu lokalnu preferenciju, prekidač skriven u classic, dozvole te postavke nakon greške mreže.

Zapisivati datum, commit, uređaj/viewport, ulogu, rutu, postavku, rezultat, dokaz i otvorene nalaze. Nijedna stavka se ne smatra prolazom dok nije stvarno pregledana. Kontrast prijavljen od rendered axe-a: STOP i odluka vlasnika prije izmjene palete; ne slabiti testove.
