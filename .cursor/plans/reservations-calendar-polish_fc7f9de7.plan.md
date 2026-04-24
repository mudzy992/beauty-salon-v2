---
name: reservations-calendar-polish
overview: Popraviti duplu resource kolonu, poravnanje sedmičnog headera i vidljivost/klikabilnost evenata u sedmičnom prikazu u admin kalendaru rezervacija (react-big-calendar), uz Apple/Linear vizuelni polish.
todos:
  - id: fix-resources-unassigned
    content: U `ReservationScheduler.tsx` prikazati `unassigned` resource samo kad je potreban (ima ne-potvrđenih rezervacija ili je filter eksplicitno izabran).
    status: completed
  - id: fix-week-header-alignment
    content: U `reservation-scheduler.css` stabilizovati scrollbar i poravnati `.rbc-time-header` sa `.rbc-time-content` (scrollbar-gutter + header overflow-y).
    status: completed
  - id: make-week-events-clickable
    content: Dodati `eventWrapper` + z-index/pointer-events i podesiti `dayLayoutAlgorithm`/eventPropGetter da eventi budu uvijek klikabilni i vizuelno jasni.
    status: completed
  - id: fullscreen-polish
    content: Ukloniti `70vh` ograničenje i prilagoditi visinu za pravi full-screen sedmični prikaz, uz Apple/Linear vizuelni polish.
    status: completed
isProject: false
---

## Problem (što sam našao)
- `ReservationScheduler` uvijek dodaje pseudo-resource `{ id: 'unassigned', title: 'Nije potvrđen' }` uz sve stiliste, pa i kad nema ne-potvrđenih rezervacija. Zato sa 1 stilistom uvijek vidiš 2 kolone.
- Sedmični header “bježi” u odnosu na grid tipično zbog **vertical scrollbar width** u `.rbc-time-content` (na većim ekranima/OS postavkama scrollbar zauzima više prostora) dok `.rbc-time-header` ne kompenzuje isti offset.
- U sedmičnom prikazu vidiš samo “liniju” u time-slotovima jer event sloj nije u prvom planu / nema pouzdan clickable target. Pošto `reservation-scheduler.css` ne dira `pointer-events`, najrealniji uzrok je layout/stacking i premala visina wrappera + RBC defaults.

## Plan izmjena (konkretno)
### 1) Resources: ukloni duplu kolonu kad nije potrebna
- U `[frontend/src/features/reservations/components/ReservationScheduler.tsx](frontend/src/features/reservations/components/ReservationScheduler.tsx)`:
  - Izračunati `hasUnassignedEvents` iz `props.reservations` (npr. `some(r => !r.confirmedStylist?.id)`)
  - Dodati `unassigned` resource **samo** ako `hasUnassignedEvents === true` ili ako je user eksplicitno filtrirao `selectedStylistIds` da sadrži `'unassigned'`
  - Zadržati label “Nije potvrđen” ali da se ne pojavljuje “prazna” kolona

### 2) Sedmični header poravnanje sa time-grid kolonama (scrollbar fix)
- U `[frontend/src/features/reservations/components/reservation-scheduler.css](frontend/src/features/reservations/components/reservation-scheduler.css)`:
  - Dodati stabilan scrollbar prostor:
    - `scrollbar-gutter: stable;` na `.rbc-time-content`
  - Dodati kompenzaciju za header/content alignment:
    - `.rbc-time-header { overflow-y: scroll; }` (da header dobije isti scrollbar prostor kao content)
  - Po potrebi dodati i `.rbc-time-header-content { overflow: hidden; }` da ne pravi dodatne horizontalne offsete

### 3) Sedmični eventi: učini ih vidljivim i 100% klikabilnim
- U `[frontend/src/features/reservations/components/ReservationScheduler.tsx](frontend/src/features/reservations/components/ReservationScheduler.tsx)`:
  - U `DragAndDropCalendar` dodati:
    - `dayLayoutAlgorithm="no-overlap"` (stabilniji layout u timeGrid)
    - `components.eventWrapper` koji:
      - postavi `className="cursor-pointer"`
      - osigura `pointer-events: auto` i `z-index` iznad slot linija
      - prosledi klik na `onSelectEvent` (RBC ponekad propagira click na slot umjesto event)
  - Pojačati event styling u `eventPropGetter`:
    - dodati `zIndex: 2`, `boxShadow` i `cursor: 'pointer'`

### 4) Full-screen polish (Apple/Linear)
- U `[frontend/src/features/reservations/components/ReservationScheduler.tsx](frontend/src/features/reservations/components/ReservationScheduler.tsx)`:
  - Umjesto `style={{ height: '70vh' }}` koristiti visinu kontejnera (npr. `height: 'calc(100dvh - 72px - headerBlockHeight)'`) ili prop `height` iz page-a, da sedmični pogled ima dovoljno vertikalnog prostora
  - U CSS-u dotjerati grid linije (subtle), hover state za event i selection (bez agresivnih boja)

## Test plan (manual)
- Sa 1 stilistom i svim rezervacijama potvrđenim: u week/day view treba biti **1 kolona**.
- Ako postoji ijedna rezervacija bez `confirmedStylist`: pojavi se dodatna kolona “Nije potvrđen” i event ode tamo.
- Sedmični view: header (stilisti) poravnat sa kolonama i nakon skrolovanja; ne smije “bježati” na većim ekranima.
- Sedmični view: event je vidljiv kao kartica i klik otvara details drawer; ne smije se desiti da klik hvata `.rbc-time-slot` umjesto event-a.
