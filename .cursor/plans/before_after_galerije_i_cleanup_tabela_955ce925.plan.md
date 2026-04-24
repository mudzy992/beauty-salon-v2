---
name: Before/After galerije i cleanup tabela
overview: Ukloniti neiskorištene tabele za slike i implementirati galerije urađenih before/after radova globalno i po servisu na frontendu i mobilnoj aplikaciji, koristeći `daily_log_images` kao jedini source of truth.
todos:
  - id: audit-schema-usage
    content: Finalno potvrditi da nema runtime upotrebe `service_images`/`reservation_images` izvan Prisma relacija i ukloniti reference u backend servisu.
    status: completed
  - id: backend-before-after-filter
    content: Proširiti `GET /api/daily-log/before-after` da podrži `serviceId` i vrati `service` info u response.
    status: completed
  - id: prisma-drop-unused-tables
    content: Ažurirati Prisma šemu i dodati migraciju za drop `service_images` i `reservation_images` (uz provjeru podataka i opcionalni data-move plan).
    status: completed
  - id: frontend-public-service-detail-gallery
    content: Dodati public service detail stranicu i ugraditi galeriju urađenih radova filtriranu po `serviceId`.
    status: completed
  - id: frontend-admin-service-gallery
    content: Dodati admin view za servis koji prikazuje njegovu before/after galeriju (reuse istog endpointa).
    status: completed
  - id: mobile-service-gallery
    content: Dodati before/after sekciju na `ServiceSingleDetailScreen` i (po potrebi) posebnu screen za “Vidi sve” sa paginacijom.
    status: completed
isProject: false
---

# Cilj

- Zadržati `**daily_log_images**` kao jedini izvor istine za before/after urađene radove.
- Ukloniti **neiskorištene** modele/tabele: `**service_images`** i `**reservation_images`** (u šemi je `reservation_images`, ne `rezervation_images`).
- Dodati **po-servisu** galerije urađenih radova na **frontend public + admin** i na **mobile** (u postojećem `ServiceSingleDetailScreen`).

# Šta je trenutno stanje (iz koda)

- **Postoji i koristi se** `daily_log_images`:
  - Backend: `POST /api/daily-log/:id/images` i public `GET /api/daily-log/before-after` ([backend/src/daily-log/daily-log.controller.ts](backend/src/daily-log/daily-log.controller.ts), [backend/src/daily-log/daily-log.service.ts](backend/src/daily-log/daily-log.service.ts)).
  - Frontend public: `PublicSatisfiedClients` učitava `/api/daily-log/before-after` ([frontend/src/pages/public/PublicSatisfiedClients.tsx](frontend/src/pages/public/PublicSatisfiedClients.tsx)).
  - Mobile: `SatisfiedClientsScreen` učitava isti endpoint; stilist upload radi preko `DailyLogDetailScreen` → `/api/uploads` + `/api/daily-log/:id/images` ([mobile/src/screens/stylist/DailyLogDetailScreen.tsx](mobile/src/screens/stylist/DailyLogDetailScreen.tsx)).
- `**service_images`**:
  - Definisan u šemi i čak se includa u `findOneService()` ([backend/src/services/services.service.ts](backend/src/services/services.service.ts)), ali nema endpoints/UI koji upravljaju tim slikama → praktično neiskorišteno.
- `**reservation_images`**:
  - Definisan u šemi, ali nema backend implementacije/poziva u `backend/src`.

# Target dizajn (minimalan, konzistentan)

- **Upload** ostaje kroz postojeći globalni uploads servis (`/api/uploads`) i slike ostaju u `Upload` (original + thumb/small/medium).
- **Urađeni radovi**:
  - Sve before/after slike vezane su za `**DailyLogEntry`** preko `DailyLogImage`.
  - Pošto `DailyLogEntry` već ima `serviceId`, iz toga dobijamo “galeriju po servisu” bez dodatnih tabela.

# Backend promjene

- Proširiti postojeći public endpoint `GET /api/daily-log/before-after` da podrži filtriranje:
  - `serviceId` (obavezno za “galerija po servisu”)
  - opcionalno: `stylistProfileId`, `fromDate`, `toDate` (za kasnije; ostaviti kao non-breaking)
- Proširiti response item (non-breaking) da uključuje:
  - `service: { id, name }`
  - opciono `completedAt` i/ili `date` radi sortiranja/prikaza
- Dodati novi convenience endpoint (ako treba zbog čistoće ruta):
  - `GET /api/services/:id/before-after` koji internu logiku delegira na daily-log servis (nije obavezno, ali olakšava klijente).

# Database / Prisma cleanup

- U `backend/prisma/schema.prisma` ukloniti:
  - model `ServiceImage` i relaciju `Service.images`
  - model `ReservationImage` i relaciju `Reservation.images`
  - relacije u `Upload` koje referenciraju `serviceImages` i `reservationImages`
- Kreirati Prisma migraciju koja:
  - dropa tabele `service_images` i `reservation_images`
  - uklanja FK constraint-e
- Sigurnosna napomena: prije dropa (u istom PR-u) dodati kratku SQL provjeru/skriptu ili dokumentovati korak provjere da su tabele prazne; ako nisu prazne, definisati mapiranje u `daily_log_images` (najčešće: prebaciti slike na odgovarajući `daily_log_entry_id` preko `reservationId` veze).

# Frontend (web) implementacija

## Public (klijenti)

- Dodati novu rutu/stranicu “Service detail” u public dijelu (npr. `/services/:serviceId`):
  - koristi postojeći `GET /api/services/:id`
  - dodaje sekciju **Galerija urađenih radova** koja poziva `GET /api/daily-log/before-after?serviceId=...` (paginacija kao danas: `limit/offset`)
  - prikaz: grid sa `BeforeAfterSlider` (postojeći [frontend/src/components/BeforeAfterSlider.tsx](frontend/src/components/BeforeAfterSlider.tsx))
- U `PublicServices` listi dodati link/click na tu novu public detalj stranicu.

## Admin (dashboard)

- U admin `Services` UI dodati “Pregled urađenih radova” akciju za servis (link na novu admin rutu npr. `/admin/services/:id/work-gallery`) ili inline drawer:
  - koristi isti endpoint filtriran po `serviceId`
  - paginacija/infinite scroll
- (Opcionalno, ali UX korisno) u admin `DailyLog` dodati mogućnost upload before/after slika za entry (da web stilist/admin može dodati slike bez mobile).

# Mobile implementacija

- U `ServiceSingleDetailScreen` ([mobile/src/screens/client/ServiceSingleDetailScreen.tsx](mobile/src/screens/client/ServiceSingleDetailScreen.tsx)) dodati sekciju “Prije / Poslije”:
  - fetch `GET /api/daily-log/before-after?serviceId=...` (prikaz prvih N parova)
  - prikaz: vertikalna lista kartica sa postojećim `BeforeAfterSlider` ([mobile/src/components/BeforeAfterSlider.tsx](mobile/src/components/BeforeAfterSlider.tsx))
  - dugme “Vidi sve” → nova screen `ServiceWorkGalleryScreen` sa infinite scroll (isti endpoint)

# i18n + Dark/Light

- Reuse postojećih tekstova gdje je moguće; nove stringove dodati u i18n (EN/BS) za:
  - “Galerija urađenih radova”, “Vidi sve”, empty state
- Mobile styling koristiti postojeći theme hook `useTheme()`.

# Test plan

- Ručno:
  - Upload before/after na mobile daily log detail i potvrdi da se pojavljuje u:
    - Public satisfied clients (global)
    - Service detail (mobile + web)
  - Provjeriti paginaciju (offset/hasMore) i da filtriranje po `serviceId` radi.
  - Provjeriti da `GET /api/services/:id` i dalje radi nakon uklanjanja `Service.images` include.

# Rizici i mitigacije

- Ako `service_images` ili `reservation_images` već imaju podatke, prije dropa uraditi migraciju podataka ili odustati od dropa dok se ne odluči mapping. U planu ćemo implementirati provjeru i migracioni korak ako se otkrije da ima podataka.
