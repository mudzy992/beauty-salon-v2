# S11 — vlasnikova provjera i jedini preostali ručni korak

## Evidencija koju je prijavio vlasnik

Ove stavke prihvatam kao **vlasnikovu ručnu prijavu**, ne kao nezavisno mjerenje. Browser/OS verzije i tačan commit nisu navedeni; zato ne tvrdim nezavisnu ili potpunu WCAG provjeru.

| Provjera | Prijavljeni rezultat | Evidencija / granica |
|---|---|---|
| Javna tema + jezik | ✅ radi | Theme switcher dark/light i promjena prevoda rade; uočena fiksna BS hero CTA oznaka „Rezerviši termin“ — ideja za zasebno poboljšanje CMS/BS-EN sadržaja, nije S11 blocker |
| Gostujući `/rezervacija` | ✅ radi | Neprijavljen korisnik ide na `/login` |
| Admin dashboard, admin postavke, stylist inbox | ✅ pristup/prijava radi | Ovo potvrđuje pristup, ne cjelovit sadržajni audit svake stranice |
| Tastatura i fokus | ✅ radi | Vlasnikova ručna provjera |
| OS forced-colors / high contrast | ✅ radi | Vlasnikova ručna provjera |
| OS reduced-motion | ✅ radi | Vlasnikova ručna provjera |
| Screen reader | ➖ vlasnik ne može testirati | Nije provjereno; ne prikazuje se kao PASS i ne tvrdi se potpuna pristupačnost |
| Browser zoom 200–400% | ❌ otvoreno za ispravku | Vlasnik prijavljuje da se sidebar gubi; S11 CI potvrđuje usko grlo reflowa na 320 CSS px na admin i stylist shellovima |

### Odvojena ideja za proizvod

Fiksni hero CTA „Rezerviši termin“ nije moguće prevesti preko trenutnih Appearance postavki. Zabilježena je ideja da se za uređive stavke u administraciji omoguće odvojeni BS i EN tekstovi. To traži zasebno definisanje CMS modela/opsega; **nije implementirano niti dio ovog S11 popravka**.

## Jedina korisnička provjera koja ostaje: ponoviti zoom nakon moje ispravke

**Ne ponavljaj ostale stavke iz gornje tabele.** Sačekaj da ti javim da je ispravka pushovana i da postoji nova grana/verifikacijski rezultat. Tada koristi staging/QA, ne produkciju; koristi testne admin/stylist naloge. Ako nemaš staging ili testne naloge, stani — ne pokušavaj stvarne podatke.

1. U pregledniku postavi zoom na **200%**, a zatim **400%** (`Ctrl` + `+`; macOS `⌘` + `+`; reset na kraju `Ctrl/⌘` + `0`). Ne smanjuj zoom niti povećavaj prozor da bi prikrio problem.
2. U temi Classic otvori `/admin` i `/admin/settings`. Na uskom rasporedu očekuje se vidljiva **menu ikona/dugme za navigaciju** umjesto stalne desktop bočne trake. Otvori je; očekuje se da su navigacijski linkovi dostupni i da se drawer može skrolati. `Esc` treba zatvoriti drawer i vratiti fokus na menu dugme. Otvori `/admin/settings` i potvrdi da sadržaj i glavne akcije nisu odsječeni.
3. Na `/admin/settings` kratko provjeri Aurum Light i Aurum Dark: isto menu dugme i sve stavke navigacije trebaju ostati dostupni. Na `/stylist/inbox` provjeri da se zaglavlje presloži bez odsijecanja; stylist navigacija je namjerno horizontalno skrolabilna na uskom ekranu — pomjeri je i potvrdi da se sve stavke mogu dohvatiti.
4. Pri 200% zoomu, na jednom admin i jednom stylist ekranu uključi text-spacing override (DevTools → Console, samo staging):

```js
(() => {
  document.getElementById('s11-text-spacing')?.remove();
  const style = document.createElement('style');
  style.id = 's11-text-spacing';
  style.textContent = `* { line-height: 1.5 !important; letter-spacing: .12em !important; word-spacing: .16em !important; } p { margin-bottom: 2em !important; }`;
  document.head.append(style);
})();
```

   Očekuje se da naslovi, tekst, navigacija, dugmad i kontrole ostanu vidljivi i bez preklapanja. Ukloni override osvježavanjem stranice; resetuj zoom na 100%.

### Kriterij prolaza

- Pri 200% i 400% nema izgubljene administrativne navigacije: menu dugme se vidi, drawer se otvara, linkovi su dohvatljivi, `Esc` zatvara i fokus se vraća na dugme.
- Admin postavke i stylist inbox nemaju odsječen sadržaj niti horizontalni skrol cijele stranice potreban za čitanje; lokalno skrolabilne navigacije/tabele mogu skrolati unutar svog kontejnera.
- Test je u testnom okruženju i ne mijenja stvarne podatke.

Pošalji samo:

```text
OS/preglednik:
Zoom 200% — /admin, /admin/settings, /stylist/inbox: PASS/FAIL (šta se izgubilo):
Zoom 400% — iste stranice: PASS/FAIL (šta se izgubilo):
Menu/drawer, linkovi, Esc + povrat fokusa: PASS/FAIL:
Text-spacing — admin + stylist: PASS/FAIL:
```

Ako nešto padne, dodaj temu/jezik, tačnu putanju i korake za reprodukciju. Screen reader ostaje eksplicitno neprovjeren/N/A po tvojoj prijavi; ne trebaš instalirati alat koji nemaš.
