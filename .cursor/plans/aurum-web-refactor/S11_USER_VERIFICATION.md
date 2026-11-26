# S11 — Aurum svijetli/tamni režim: ručna provjera

## Poznato

Podržani su samo Aurum light i Aurum dark. Lokalni production build, source-contract testovi i E2E TypeScript provjera prolaze, ali ne zamjenjuju rendered CI niti stvarni zoom pregled u pregledniku.

Vlasnik je ranije prijavio da tastatura/fokus, forced-colors i reduced-motion rade. Ne tražiti ponovno te provjere bez novog signala regresije. Provjera čitačem ekrana ostaje nepotvrđena jer vlasnik nema odgovarajući alat/uređaj.

Raniji rendered test uskog prikaza prijavio je overflow u Stylist inboxu. Responsive ispravka je u trenutnom radu i mora proći novi rendered CI. Posljednji relevantni CI pokušaj je otkazan; za trenutni diff još nema rendered rezultata.

## Provjera nakon zelenog rendered CI-ja

Koristi samo staging/QA i testne naloge, nikad produkciju. Ako staging ili testni nalozi nisu dostupni, stani — ne koristi stvarne korisničke podatke.

1. Postavi browser zoom na **200%**, zatim **400%** (`Ctrl` + `+`; macOS `⌘` + `+`). Nemoj smanjivati zoom niti širiti prozor da prikriješ problem.
2. U Aurum light i dark otvori `/admin` i `/admin/settings`. Na uskom prikazu potvrdi da je menu dugme vidljivo, otvara navigacijski drawer koji se može skrolati, a linkovi su dohvatljivi. `Esc` zatvara drawer i vraća fokus na dugme. Potvrdi da su sadržaj postavki i glavne akcije dostupni.
3. Otvori `/stylist/inbox` u oba režima. Potvrdi da se zaglavlje presloži, sadržaj ostaje čitljiv i da se lokalna horizontalna navigacija može skrolati do svih stavki bez horizontalnog skrola cijele stranice.
4. Pri 200% zoomu primijeni text-spacing override na jednoj admin i jednoj Stylist stranici koristeći DevTools Console, isključivo u stagingu:

```js
(() => {
  document.getElementById('s11-text-spacing')?.remove();
  const style = document.createElement('style');
  style.id = 's11-text-spacing';
  style.textContent = `* { line-height: 1.5 !important; letter-spacing: .12em !important; word-spacing: .16em !important; } p { margin-bottom: 2em !important; }`;
  document.head.append(style);
})();
```

   Potvrdi da su naslovi, tekst, navigacija, dugmad i kontrole vidljivi i da se ne preklapaju. Osvježi stranicu za uklanjanje override-a i vrati zoom na 100%.

## Kriteriji prolaza

- Na 200% i 400% admin menu dugme se vidi, drawer se otvara, linkovi su dohvatljivi, a `Esc` zatvara drawer i vraća fokus.
- Postavke i Stylist inbox nemaju odsječen sadržaj. Tabele/navigacija mogu skrolati unutar svojih regija; cijela stranica ne zahtijeva horizontalni skrol za čitanje.
- Sve provjere prolaze u Aurum light i dark, s testnim nalozima u testnom okruženju.

Pošalji samo:

```text
OS/preglednik:
Zoom 200% — /admin, /admin/settings, /stylist/inbox: PASS/FAIL (šta se izgubilo):
Zoom 400% — iste stranice: PASS/FAIL (šta se izgubilo):
Menu/drawer, linkovi, Esc + povrat fokusa: PASS/FAIL:
Text-spacing — admin + Stylist: PASS/FAIL:
```

Čitač ekrana ostaje izričito neprovjeren/N/A dok ne bude dostupan odgovarajući alat. Ove provjere same po sebi ne dokazuju potpunu usklađenost pristupačnosti.
