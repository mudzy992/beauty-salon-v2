# M1/M3 — protokol za završni stvarni tastaturni i vizuelni pregled

**Status: nije izvršen.** Ovo je kontrolna lista, a ne izvještaj o prolazu. Ranije Playwright fiksure i presretnuti API odgovori ne zamjenjuju stvarnu upotrebu aplikacije. Posebno nisu dokaz sistemskog izbora datoteke, stvarne štampe ili stvarne transakcije. Evidencija dosadašnjih automatizovanih provjera je u [radnom izvještaju](17_m1_m3_izvjestaj.md).

## Sigurni preduslovi i evidencija

- Koristiti **isključivo jednokratnu izolovanu testnu bazu**, testne naloge i izmišljene klijente, usluge, rezervacije, finansijske zapise i datoteke. Ne mijenjati produkcijske podatke. Testni preview s mock API-jem nije zamjena za stvarni backend.
- Zabilježiti commit, datum, OS i verziju, browser i verziju, veličinu viewporta, aktivnu ulogu, jezik i temu. Prethodna M2 potvrda zooma ne podrazumijeva ovaj pregled.
- Proći Classic, Aurum light i Aurum dark, BS i EN, desktop i mobilnu širinu s fizičkom tastaturom. Zapisati **svaki** od stvarno provedenih kombinacija; ne upisivati prolaz za neprovjerene kombinacije.
- Bez miša: Tab/Shift+Tab, Enter/Space, strelice, Escape, Home/End gdje odgovaraju. Provjeriti prirodan redoslijed, da nema tastaturne zamke te da se svaka funkcija zaista izvršava. Datumske kontrole, file-picker i štampu isprobati u stvarnom OS-u, ne samo Playwright `fill`/`setInputFiles`/mock `print`.
- Za svaku fokusiranu kontrolu provjeriti da je indikator vidljiv i razlikuje se od neposredne podloge, da nije odsječen ili prekriven sticky zaglavljem, dijalogom ili drugim elementom tokom skrolanja. Provjeriti početni fokus dijaloga, kruženje, Escape, povrat okidaču nakon zatvaranja i razumni fallback kad je okidač uklonjen; provjeriti promjenu rute i asinhroni odgovor kad je fokus namjerno premješten.
- Za svako ispitivanje označiti **prošlo / palo / nije testirano**, zajedno sa koracima, očekivanim i stvarnim ishodom. Kod nalaza priložiti anonimizovan screenshot/video i uslove; ne snimati lične ili osjetljive podatke. Prolaz = cijeli opisani tok, ne samo otvaranje stranice.

## Stanja koja treba proći

| Grupa i rute | Tastaturni i fokusni tokovi — potrebno stvarno proći | Status |
|---|---|---|
| Javni dio i prijavljeni korisnik: `/`, `/usluge`, detalj usluge, `/rezervacija`, `/moje-rezervacije`, detalj rezervacije, `/profil`, `/kontakt`, `/blog`, `/galerija` i dostupni token tokovi | Navigacija, skip link, izbor i uklanjanje više usluga, izbor termina, validacija i potvrda, otkazivanje/izmjena, filteri, sve potvrde, povrat nakon promjene rute, prazno i greška stanje. Provjeriti i opcionalne stranice kad su omogućene. | Nije testirano u ovom protokolu |
| Admin: `/admin/users`, `/admin/salon`, `/admin/services`, galerija usluge, `/admin/stylists` | Pretraga/filter, kreiranje, uređivanje, validacija i brisanje/otkazivanje; izbor i uklanjanje slika stvarnim file-pickerom, povrat fokusa nakon uspjeha i greške. | Nije testirano u ovom protokolu |
| Admin: `/admin/reservations` i `/admin/reservations/calendar` | Filteri, svi kalendarski pogledi i događaji, period, kreiranje, detalj, pomjeranje, promjena statusa, brisanje/otkazivanje, odgođeno učitavanje, retry i povrat fokusa. Provjeriti vidljivost fokusa pri horizontalnom i vertikalnom skrolu. | Nije testirano u ovom protokolu |
| Admin: `/admin/daily-log` | Datumi, stilista, obrisani, reset, greška i retry; novi unos i validacija, uređivanje, dovršavanje, brisanje i vraćanje na originalni/drugi datum uključujući buduću rezervaciju, plus fokus nakon svakog stanja. | Nije testirano u ovom protokolu |
| Admin: `/admin/finance` | Knjige prihoda/rashoda, dužnici, filteri, kreiranje/uređivanje/brisanje, dinamičke stavke, svi tipovi priloga i stvarni upload, CSV i OS štampa/PDF, greška, otkazivanje i uspjeh. | Nije testirano u ovom protokolu |
| Admin: `/admin/blog`, `/admin/gallery`, `/admin/reviews`, `/admin/settings`, `/admin/analytics`, `/admin/loyalty` | Primjenjivi filteri, kartice, dijalozi, CRUD, objava, slike, konfiguracije, potvrde i greške. Obuhvatiti sve omogućene postavke i stvarni povrat fokusa. | Nije testirano u ovom protokolu |
| Stylist: `/stylist/schedule`, detalj i nova direktna rezervacija, `/stylist/workbook`, nova i detalj unosa, `/stylist/inbox`, `/stylist/debts`, `/stylist/stats`, `/stylist/profile` | Navigacija, filteri, unos/izmjena, naplata i otkazivanje, prije/poslije slike s OS file-pickerom, brisanje, greška i povrat fokusa, dostupne akcije svake stranice. | Nije testirano u ovom protokolu |

## Zapis po kombinaciji

`Commit | datum | OS/verzija | browser/verzija | viewport | uloga | jezik | tema | ruta/stanje | koraci | prošlo/palo/nije testirano | nalaz/link`

Ručni pregled ne zamjenjuje nezavisan audit. NVDA/VoiceOver, stvarni OS forced-colors, reduced-motion i završni axe ostaju odvojeni M4–M7; ne označavati ih dovršenim na osnovu ovog protokola.
