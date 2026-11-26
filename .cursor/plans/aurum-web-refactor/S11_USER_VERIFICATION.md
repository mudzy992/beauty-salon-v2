# S11 — završne provjere koje zahtijevaju vlasnika

Ovaj dokument je **samo ručni rep S11**: ne traži ponavljanje automatiziranih CI/testova. Automatizirani rendered axe, BS/EN, tri teme, simulirani reflow i testovi koda ostaju moj dio. **Nemoj počinjati ručne korake dok ti ne pošaljem završni CI status i potvrdim da je grana spremna za pregled.** Ako taj status još nije poslan, čekaj.

## Šta mi treba od tebe

Samo pregled u stvarnom pregledniku i stvarnim OS/assistive-tech postavkama, koje sandbox ne može potvrditi:

1. stvarni browser zoom i text-spacing na ciljanim ekranima;
2. tastaturni prolaz kroz ključne navigacijske i stylist tokove;
3. stvarni čitač ekrana;
4. OS forced-colors/high-contrast;
5. OS reduced-motion.

Ne trebaš pokretati test suite, instalirati zavisnosti, pregledavati kod, mijenjati fajlove, praviti commit, otvarati PR, merge-ati ili deployati.

## Prije početka — sigurnost i preduvjeti

- Koristi **staging/QA ili drugi neprodukcijski URL** i testne admin/stylist naloge.
- Za stylist tok pripremi jednu testnu rezervaciju koju je dozvoljeno započeti i završiti, ili dogovoren testni zapis koji se može vratiti/resetovati.
- **Ne mijenjaj produkcijske rezervacije ni stvarne klijentske podatke.** Ako nemaš neprodukcijski URL, naloge ili testnu rezervaciju, stani i javi šta nedostaje; nemoj improvizirati u produkciji.
- Zabilježi OS, preglednik i verziju, datum te koristi BS i EN gdje je navedeno. Zatvori i ponovo otvori stranicu nakon svake OS postavke ako se promjena ne primijeni odmah.

Ciljne stranice:

| Dio | Putanja | Napomena |
|---|---|---|
| Javna naslovnica | `/` | testiraj i Language/Theme kontrole |
| Gostujući ulaz rezervacije | `/rezervacija` | bez sesije očekuj preusmjeravanje na `/login`; ne očekuj formu rezervacije |
| Admin dashboard | `/admin` | prijava testnim admin nalogom |
| Admin postavke | `/admin/settings` | prijava testnim admin nalogom |
| Stylist inbox | `/stylist/inbox` | prijava testnim stylist nalogom |

## 1) Stvarni zoom, reflow i tekstualni razmak

**Kako:** u pregledniku postavi zoom na 200%, pa 400% (Windows/Linux: `Ctrl` + `+`; macOS: `⌘` + `+`; reset: `Ctrl/⌘` + `0`). Ne mijenjaj širinu prozora da bi prikrio problem. Na 400% provjeri i prevedi stranicu na BS pa EN, jer duži tekst može promijeniti raspored. Ponovi pregled u sva tri izbora teme: `classic`, `aurum-light`, `aurum-dark`.

**Obuhvat:** prođi svih pet ciljnih putanja; zaštićene admin/stylist putanje provjeri odgovarajućim testnim nalogom. `/rezervacija` se provjerava do očekivanog `/login` odredišta.

**Na svakom ekranu očekuje se:**
- sadržaj se preslaže i ostaje čitljiv; nema odsječenih naslova, teksta, dugmadi ili kontrola;
- nema horizontalnog skrolanja cijele stranice koje je potrebno da bi se došlo do običnog sadržaja; ako je tabela namjerno skrolabilna, samo ona smije imati vlastito skrolanje i ostati dostupna;
- akcije, navigacija, dijalozi i oznake ostaju vidljivi i upotrebljivi; ništa nije prekriveno ili izgubljeno;
- nakon promjene teme/jezika raspored i sadržaj i dalje stanu.

**Text-spacing provjera:** na najmanje jednom admin i jednom stylist ekranu pri 200% zoomu privremeno uključi WCAG text-spacing vrijednosti. Najjednostavnije u DevTools → Console (samo na stagingu) zalijepi:

```js
(() => {
  document.getElementById('s11-text-spacing')?.remove();
  const style = document.createElement('style');
  style.id = 's11-text-spacing';
  style.textContent = `* { line-height: 1.5 !important; letter-spacing: .12em !important; word-spacing: .16em !important; } p { margin-bottom: 2em !important; }`;
  document.head.append(style);
})();
```

Očekuje se da tekst/dugmad ne preklapaju niti sakrivaju sadržaj. Ukloni privremeni stil osvježavanjem stranice (ili `document.getElementById('s11-text-spacing')?.remove()` u Console).

## 2) Tastatura i fokus

Isključi miš nakon učitavanja. `Tab` naprijed, `Shift+Tab` nazad, `Enter` za link/dugme, `Space` za prekidač/checkbox, `Esc` za dijalog/meni.

- Na `/` i `/login`: dođi tastaturom do promjene jezika i teme, mijenjaj ih i potvrdi vidljivi fokus i stanje izabranog prekidača.
- Na `/admin` → `/admin/settings`: dođi do navigacije, otvori postavke i vrati se; fokus mora biti vidljiv, redoslijed smislen i fokus ne smije nestati iza zaglavlja/menija.
- Na `/stylist/inbox`: pronađi pripremljenu testnu rezervaciju, prođi dozvoljene akcije do **start → completion** tastaturom. Ako postoji potvrda, otvori je, provjeri naziv/tekst i odaberi očekivanu akciju. Nakon potvrde očekuj ažuriran status i fokus na smislenom elementu; `Esc` zatvara otkazivi dijalog bez izvršenja akcije. Ne aktiviraj stvarnu rezervaciju.
- Ako se red obriše ili ekran promijeni, fokus treba preći na sljedeći smislen element, ne vratiti se na `<body>` niti postati nevidljiv.

**Još pet admin interakcija iz ranije otvorene M1/M3 checkliste** (samo ako nemaš već evidentiran prolaz na istoj verziji aplikacije): na odgovarajućim admin ekranima tastaturom (1) promijeni/poništi jedan filter i provjeri rezultat, (2) otvori pa otkaži jedan dijalog, zatim za create/edit/delete koristi samo testni zapis, (3) otvori kalendar i kreći se datumima/terminima bez miša, (4) otvori upload i otkaži file chooser ili koristi samo odobrenu testnu datoteku, (5) pokreni export samo na stagingu. Ne moraš mijenjati produkcijske postavke ni stvarne zapise. Za svaki tok očekuje se jasan fokusni prsten, fokus koji nije prekriven sticky zaglavljem, bez tastaturnog zamka, `Esc` zatvara otkazivi dijalog, a nakon zatvaranja/brisanja/rutiranja fokus ostaje na smislenom mjestu. Ako nema testnog sadržaja ili ne možeš sigurno resetovati zapis, preskoči mutirajuću akciju i prijavi razlog.

## 3) Čitač ekrana (NVDA na Windowsu ili VoiceOver na macOS-u)

Koristi čitač koji ti je već dostupan; ne treba instalirati novi. Testiraj `/`, `/login` (preko `/rezervacija`), `/admin`, `/admin/settings` i `/stylist/inbox`, barem u BS i EN. Ponovi barem admin postavke i stylist inbox u Aurum light i dark.

**Očekuje se:**
- stranica i glavna područja imaju smislen naziv; naslovi se mogu pregledati hijerarhijski;
- svako dugme, polje, link i prekidač izgovara razumljivo ime, ulogu i stanje;
- promjena jezika/teme, navigacija, greška/status i dijalog najavljuju promjenu kada se desi;
- fokus čitača prati tastaturni fokus, a sadržaj se ne čita duplo ili kao neimenovana kontrola.

Zabilježi samo konkretan problem (tačna putanja, kontrola i šta je čitač izgovorio/propustio); nema potrebe slati audio/snimak ekrana ako sve prođe.

## 4) OS forced-colors / high contrast

Ovo je provjera **stvarnog OS moda**, ne DevTools emulacije. Na Windowsu: **Settings → Accessibility → Contrast themes**, odaberi kontrastnu temu i Apply. (Naziv menija može varirati po verziji Windowsa.) Provjeri `/`, `/admin/settings` i `/stylist/inbox`, posebno fokusni okvir, tekst, dugmad, polja, statusne oznake i otvoreni dijalog.

**Očekuje se:** tekst i kontrole ostaju vidljivi/razlučivi, fokus je jasno označen, ikone/obavezno stanje nisu prikazani samo bojom, nijedan element nije nestao. Nakon testa vrati prethodnu OS temu. Ako nemaš Windows/forced-colors podršku, označi stavku kao „nije moguće provjeriti“ — nemoj je označiti prolaznom na osnovu emulacije.

## 5) OS reduced-motion

U OS-u uključi smanjenje/isključivanje animacija (Windows: **Settings → Accessibility → Visual effects → Animation effects Off**; macOS: **System Settings → Accessibility → Display → Reduce motion**). Osvježi `/admin`, `/admin/settings` i `/stylist/inbox`; otvori meni/dijalog i pregledaj loading ili prijelaz ako se pojavi prirodno.

**Očekuje se:** nepotrebne animacije/pulsiranje i glatki prijelazi se uklone ili svedu na minimum, ali sadržaj, statusi i mogućnost korištenja ostanu. Ne izazivaj stvarni kvar niti spremanje podataka samo radi prikaza spinnera. Nakon testa vrati OS postavku.

## Kako mi javiti rezultat

Odgovori ovim kratkim obrascem (možeš samo označiti PASS/FAIL/N/A i dopuniti problem):

```text
OS / verzija:
Preglednik / verzija:
Testirano na staging/QA URL-u (da/ne):
Zoom + text-spacing (5 putanja, 3 teme): PASS / FAIL — detalji:
Tastatura/fokus + stylist start→completion: PASS / FAIL — detalji:
Čitač ekrana (koji): PASS / FAIL / N/A — detalji:
OS forced-colors: PASS / FAIL / N/A — detalji:
OS reduced-motion: PASS / FAIL / N/A — detalji:
```

Za svaki FAIL navedi putanju, temu/jezik, korake za ponavljanje i šta si očekivao naspram onoga što se desilo. Screenshot je potreban samo ako pomaže objasniti vizuelni problem. Ako je neka stavka N/A, napiši razlog; ja ću onda ažurirati evidenciju bez lažne tvrdnje da je provjerena.
