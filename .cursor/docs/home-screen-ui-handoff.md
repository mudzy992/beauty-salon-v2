# Home Screen UI Handoff

## Šta je urađeno

- `mobile/src/screens/client/HomeScreen.tsx`
  - Hero je trenutno izveden kao zaobljena kartica sa slikom.
  - Preko slike je zadržan gornji dark fade zbog sistemskih ikona.
  - Na dnu slike je dodat glossy overlay panel.
  - Overlay ima 2 kolone:
    - lijevo: `Dobrodošli, {firstName}` + slogan
    - desno: CTA dugme za rezervaciju
  - Kategorije usluga ostaju odmah ispod hero-a.
- `mobile/RELEASE_NOTES.draft.md`
  - Dodana UX stavka za novi izgled početnog hero segmenta.

## Trenutno stanje hero-a

- Hero visina: `HERO_HEIGHT = 220`
- Hero wrapper: `styles.heroWrap`
- Hero kartica: `styles.heroShell`
- Top veil: `styles.heroGrayVeil`
- Bottom glossy tray:
  - `styles.heroOverlay`
  - `styles.heroOverlayGloss`
  - `styles.heroOverlayContent`
  - `styles.heroOverlayCopy`
  - `styles.heroOverlayAction`

Relevantan kod:

- hero render: `mobile/src/screens/client/HomeScreen.tsx`
- hero stilovi: `mobile/src/screens/client/HomeScreen.tsx`

## Donesene odluke i razlozi

- Sadržaj je vraćen preko slike, ali ne kao slobodan tekst preko hero pozadine nego kao strukturisan glossy tray.
  - Razlog: čitljivost i bolji premium feel.
- CTA je u desnoj koloni, a copy lijevo.
  - Razlog: jasan fokus na akciju bez zatrpavanja centra hero-a.
- Gornji dark fade je zadržan.
  - Razlog: status bar / sistemske ikone ostaju čitljive na svijetloj slici.
- Kategorije su ostale odmah ispod hero-a bez dodatnog odvojenog intro bloka.
  - Razlog: manje “nabacan” layout nego ranija varijanta sa tekstom ispod slike.

## Otvorena pitanja / moguća dalja poliranja

- Da li glossy tray treba biti:
  - tamniji
  - svjetliji
  - više blur / manje blur
- Da li CTA treba biti:
  - kraći label
  - uži
  - vizuelno mirniji
- Da li hero treba ostati na `220` ili ići:
  - niže, npr. `200`
  - više, npr. `240`
- Da li slogan treba ostati 2 linije ili ga skratiti kroz public settings copy.
- Treba provjeriti kako overlay izgleda na užim Android ekranima i sa dužim imenom korisnika.

## Rizici

- Na manjim ekranima slogan + CTA mogu djelovati tijesno u 2-kolonskom tray-u.
- Ako slogan bude duži od očekivanog, CTA može djelovati stisnuto.
- `boxShadow` na `heroShell` treba vizuelno provjeriti na Androidu.

## Next steps

1. Vizuelno testirati hero na:
   - Android uski ekran
   - tamna / svijetla tema
   - korisnik prijavljen / nije prijavljen
2. Po potrebi dotjerati:
   - visinu hero-a
   - padding overlay panela
   - odnos širine copy/CTA kolona
3. Ako user traži još premium feel:
   - probati diskretniji border na glossy tray-u
   - eventualno blagi inner highlight

## Test status

- Nije rađen formalni E2E test.
- `ReadLints` za `HomeScreen.tsx`: bez lint grešaka.
- Expo Go je ranije bio problem zbog worklets / reanimated; to je posebno adresirano izvan ovog handoffa.
