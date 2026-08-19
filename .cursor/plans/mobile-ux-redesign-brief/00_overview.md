# Mobile UX/UI redizajn — implementacijska specifikacija

> **Svrha:** Referentni dokument za agenta koji implementira potpuni vizuelni rebrand mobilne aplikacije Beauty Salon Nejra v2.  
> **Opseg:** samo `mobile/` — bez promjene business logike, API-ja ili backend-a.  
> **Stack:** Expo Router, React Native, TypeScript, Zustand, Socket.IO realtime, i18n (BS default).  
> **Vizuelni source of truth:** `C:\Dokumentacija\Projekti web\Bauty\mobile-app-ui-redesign` — React/Vite mockup koji prikazuje sve 34 ekrana u simuliranim mobilnim frame-ovima. Agent čita odgovarajuću komponentu iz tog mockup-a za svaki ekran i implementira isti vizuelni obrazac u React Native/Expo.

---

## 1. Brand Identity — konkretan vizuelni identitet

Ovo nije slobodan izbor agenta. Vizuelni identitet je **definisan** u mockup-u i ovdje je precizno specificiran za implementaciju.

### 1.1 Vizuelni pravac

**Dark-first** premium beauty brand. Obsidian baza, Champagne Gold akcent. Isti vizuelni jezik važi i za light varijantu — tople neutralne površine umjesto čisto bijele.

Mockup URL: `C:\Dokumentacija\Projekti web\Bauty\mobile-app-ui-redesign`  
Svi ekrani su prikazani u sekcijama: Design System → Auth → Onboarding → Početna → Usluge → Rezervacije → Profil → Stilist.

### 1.2 Paleta boja

| Naziv | Hex | Uloga |
| --- | --- | --- |
| **Champagne Gold** | `#C9A96E` | Brand akcent, CTA button, label, aktivni tab, ikone |
| **Deep Gold** | `#8B6914` | CTA gradient kraj, pressed state |
| **Gold Light** | `#E8D5A3` | Suptilni tekst na tamnima |
| **Obsidian** | `#0A0A0A` | Glavni background, app pozadina |
| **Surface 01** | `#121212` | Page background |
| **Surface 02** | `#1C1C1C` | Kartice (cards), elevated sections |
| **Surface 03** | `#262626` | Input fields, još elevated |
| **Surface 04** | `#303030` | Modali, bottom sheets |
| **Border** | `#2E2E2E` | Dividers, card outline |
| **Success** | `#4CAF87` | CONFIRMED, completed, verified |
| **Warning** | `#E8A020` | PENDING, STYLIST_REVIEW, inbox badge |
| **Error** | `#E85A4F` | Cancelled, debt, error state |
| **Info** | `#5B8DEF` | COMPLETED badge, system notifikacije |
| **No-show** | `#9B59B6` | NO_SHOW status |
| **Text primary** | `#FFFFFF` | Primarni tekst |
| **Text secondary** | `rgba(255,255,255,0.50)` | Opisi, subtitles |
| **Text muted** | `rgba(255,255,255,0.25)` | Placeholder, hints, meta |
| **Text ultra-muted** | `rgba(255,255,255,0.15)` | Footer, version info |

**CTA button gradient:** `from-[#C9A96E] to-[#B8904A]` — tekst na buttonu je `#0A0A0A` (tamni).

### 1.3 Token mapa — `mobile/src/theme/colors.ts`

Ovo su **obavezne vrijednosti** za ažuriranje `colors.ts` tokena:

#### Dark tema

| Token | Nova vrijednost |
| --- | --- |
| `background` | `#0A0A0A` |
| `surface` | `#121212` |
| `surfaceElevated` | `#1C1C1C` |
| `card` | `#1C1C1C` |
| `border` | `#2E2E2E` |
| `borderLight` | `rgba(255,255,255,0.05)` |
| `primary` | `#C9A96E` |
| `primaryText` | `#0A0A0A` |
| `text` | `#FFFFFF` |
| `textSecondary` | `rgba(255,255,255,0.50)` |
| `textMuted` | `rgba(255,255,255,0.25)` |
| `inputBg` | `#1C1C1C` |
| `inputBorder` | `rgba(255,255,255,0.08)` |
| `inputText` | `#FFFFFF` |
| `inputPlaceholder` | `rgba(255,255,255,0.25)` |
| `headerBg` | `#0A0A0A` |
| `headerText` | `#C9A96E` |
| `tabBar` | `#0D0D0D` |
| `tabActive` | `#C9A96E` |
| `tabInactive` | `rgba(255,255,255,0.25)` |
| `success` | `#4CAF87` |
| `successLight` | `rgba(76,175,135,0.15)` |
| `warning` | `#E8A020` |
| `warningLight` | `rgba(232,160,32,0.15)` |
| `error` | `#E85A4F` |
| `errorLight` | `rgba(232,90,79,0.15)` |
| `info` | `#5B8DEF` |
| `infoLight` | `rgba(91,141,239,0.15)` |
| `accent` | `rgba(201,169,110,0.10)` |
| `accentLight` | `rgba(201,169,110,0.06)` |

#### Light tema

Light tema koristi **tople neutralne** — nije čisto bijela, nego champagne bijela baza.

| Token | Light vrijednost |
| --- | --- |
| `background` | `#F8F5F0` |
| `surface` | `#FFFFFF` |
| `surfaceElevated` | `#FFFFFF` |
| `card` | `#FFFFFF` |
| `border` | `#E8E0D5` |
| `borderLight` | `rgba(0,0,0,0.05)` |
| `primary` | `#C9A96E` |
| `primaryText` | `#FFFFFF` |
| `text` | `#0A0A0A` |
| `textSecondary` | `rgba(10,10,10,0.55)` |
| `textMuted` | `rgba(10,10,10,0.35)` |
| `inputBg` | `#F2EDE6` |
| `inputBorder` | `rgba(0,0,0,0.10)` |
| `inputText` | `#0A0A0A` |
| `inputPlaceholder` | `rgba(10,10,10,0.35)` |
| `headerBg` | `#0A0A0A` |
| `headerText` | `#C9A96E` |
| `tabBar` | `#FFFFFF` |
| `tabActive` | `#C9A96E` |
| `tabInactive` | `rgba(10,10,10,0.35)` |
| `accent` | `rgba(201,169,110,0.12)` |
| `accentLight` | `rgba(201,169,110,0.06)` |

> Napomena: `success`, `warning`, `error`, `info` i njihovi light varijanti ostaju isti za obje teme — semantičke boje su universalne.

### 1.4 Tipografija

Novi vizuelni identitet koristi **dva fonta**. Potrebno ih je instalirati i koristiti konzistentno.

| Uloga | Font | Weights |
| --- | --- | --- |
| **Display / naslovi** | Cormorant Garamond | Light 300, Regular 400 |
| **UI / interface** | DM Sans | Light 300, Regular 400, Medium 500, SemiBold 600 |

**Expo instalacija:**
```
npx expo install @expo-google-fonts/cormorant-garamond @expo-google-fonts/dm-sans
```

**Ažurirati u `mobile/app/_layout.tsx`** — `useFonts` hook:
```ts
CormorantGaramond_300Light,
CormorantGaramond_400Regular,
DMSans_300Light,
DMSans_400Regular,
DMSans_500Medium,
DMSans_600SemiBold,
```

**Ažurirati `mobile/src/theme/fonts.ts`** — `fontFamily` konstante:
```ts
export const fontFamily = {
  display: 'CormorantGaramond_300Light',
  displayRegular: 'CormorantGaramond_400Regular',
  sans: 'DMSans_400Regular',
  sansLight: 'DMSans_300Light',
  sansMedium: 'DMSans_500Medium',
  sansSemiBold: 'DMSans_600SemiBold',
};
```

**Tipografska skala:**

| Nivo | Veličina | Weight | Font | Upotreba |
| --- | --- | --- | --- | --- |
| Display | 32px | 300 | Cormorant Garamond | Hero, naslov salona |
| H1 | 24px | 400 | Cormorant Garamond | Screen naslovi |
| H2 | 18px | 500 | DM Sans | Section naslovi |
| Body | 15px | 400 | DM Sans | Tekst sadržaj |
| Small | 13px | 400 | DM Sans | Meta, opisi |
| Caption | 11px | 600 | DM Sans | Badges, labels, uppercase tracking |

### 1.5 Shape language i elevation

| Element | Border radius |
| --- | --- |
| Kartice (cards) | `16px` (`rounded-2xl`) |
| Modali, bottom sheets | `24px` (`rounded-3xl`) |
| Inputi | `12px` (`rounded-xl`) |
| Badges | `full` (pill) |
| Avatari | `12px` ili `full` (krug) |
| Manje akcione ćelije | `8–10px` |

Elevation sistem:
- **Level 0** `#0A0A0A` — app background
- **Level 1** `#121212` — page background
- **Level 2** `#1C1C1C` — cards, sections
- **Level 3** `#262626` — inputi, elevated elements
- **Level 4** `#303030` — modali, sheets

### 1.6 Status badge vizuelni standard

Svi statusi koriste **pill format** sa dot indikatorom i border outline. Uzor iz mockup-a:

```
● POTVRĐENO    — #4CAF87   bg: rgba(76,175,135,0.15)   border: rgba(76,175,135,0.3)
● NA ČEKANJU   — #E8A020   bg: rgba(232,160,32,0.15)   border: rgba(232,160,32,0.3)
● OTKAZANO     — #E85A4F   bg: rgba(232,90,79,0.15)    border: rgba(232,90,79,0.3)
● ZAVRŠENO     — #5B8DEF   bg: rgba(91,141,239,0.15)   border: rgba(91,141,239,0.3)
● U TOKU       — #C9A96E   bg: rgba(201,169,110,0.15)  border: rgba(201,169,110,0.3)
● NIJE STIGAO  — #9B59B6   bg: rgba(155,89,182,0.15)   border: rgba(155,89,182,0.3)
● ST. PREGLED  — #FF9F45   bg: rgba(255,159,69,0.15)   border: rgba(255,159,69,0.3)
```

Veličina teksta: `9–10px`, font: `DMSans_600SemiBold`, `tracking-wider`, `uppercase`.

### 1.7 Tab bar standard

**Klijent — 4 taba:** Početna · Usluge · Termini · Profil  
**Stilist — 5 tabova:** Inbox · Dnevnik · Raspored · Statistika · Profil

Vizuelni standard (iz mockup-a `shared.tsx`):
- Background: `#0D0D0D/95` sa `backdrop-blur`
- Border top: `rgba(255,255,255,0.08)`
- Aktivni tab: `rgba(201,169,110,0.10)` background chip + gold tekst + gold indicator linija (`4px wide, 2px height, rounded-full`) na dnu
- Neaktivni: `rgba(255,255,255,0.20)` ikona/tekst
- Inbox badge za stilista: `#E8A020` (narančasta za STYLIST_REVIEW)
- Profile badge: `#E85A4F` (crvena za unread notifications)

### 1.8 Motion principi

| Tip interakcije | Trajanje | Easing | Biblioteka |
| --- | --- | --- | --- |
| Page / stack transition | 300ms | ease-out | Reanimated |
| Tab switch | 200ms | ease-in-out | Reanimated |
| Modal / bottom sheet open | 350ms | spring | Reanimated |
| Button press scale | 150ms | ease | Reanimated |
| Card / list item appear | 200ms | FadeInDown | Reanimated |
| In-progress status pulse | 2s loop | — | Reanimated |

### 1.9 Ekran-specifični vizuelni obrasci

Za svaki ekran, agent uzima konkretan mockup iz `C:\Dokumentacija\Projekti web\Bauty\mobile-app-ui-redesign\src\components\` kao primarni vizuelni referent:

| Sekcija | Mockup fajl |
| --- | --- |
| Design system, paleta, komponente | `DesignSystem.tsx` |
| Login, Register | `AuthScreens.tsx` |
| Onboarding (4 koraka) | `OnboardingScreens.tsx` |
| Home, Blog lista, Blog post, Transformacije | `ClientHomeScreens.tsx` |
| Usluge hub, Kategorija, Detalj, Galerija, Rezervacija wizard | `ClientServicesScreens.tsx` |
| Moje rezervacije, Detalj, Recenzija | `ClientReservationsScreens.tsx` |
| Profil, Edit, Lozinka, Notifikacije, Kontakt | `ClientProfileScreens.tsx` |
| Inbox, Dnevnik, Raspored, Statistika, Stilist profil | `StylistScreens.tsx` |

**Pravilo:** za svaki ekran koji se implementira, agent mora pročitati odgovarajuću komponentu iz gore navedenog fajla i koristiti isti layout, vizuelne elemente i kompoziciju kao osnovu za React Native implementaciju.

### 1.10 Header standard

Svi stack screen headeri (ne tab root ekrani):
- Background: `#0A0A0A/95` + `backdrop-blur`
- Border bottom: `rgba(255,255,255,0.05)`
- Naslov: `DMSans_600SemiBold`, `14px`, `#FFFFFF`
- Back dugme: `32px` kružni chip, `rgba(255,255,255,0.06)` background, `←` ikona `rgba(255,255,255,0.60)`

### 1.11 Principi koji se ne smiju kršiti

| Princip | Opis |
| --- | --- |
| **Funkcionalna potpunost** | Nijedna postojeća funkcionalnost ne smije biti izgubljena ili nepristupačna |
| **Slike HD/HQ** | Uvijek `MediaImage` / upload URL helperi; nikad hardkodirane dimenzije koje krše aspect ratio |
| **Ne dirati business logiku** | JSX struktura, stilovi, spacing, tipografija, animacije — DA. API pozivi, Zustand store, FSM, validacije, push routing — NE |
| **Light + dark konzistentnost** | Oba moda moraju biti implementirana i konzistentna; light tema je topla champagne bijela, nije inverz dark-a |
| **Safe area** | Uvijek `useSafeAreaInsets` za bottom padding; testirati Android 3-button + gesture varijante |

---

## 2. Workspaces (visoki nivo)

Aplikacija ima **5 workspace-ova**. Korisnik ulazi u odgovarajući prema auth stanju i ulozi.

```mermaid
flowchart TD
  Start[index /] --> Auth{Autentifikovan?}
  Auth -->|Ne| WS_Auth[Auth workspace]
  Auth -->|Da| Onboard{Onboarding gate?}
  Onboard -->|mustChangePassword| WS_Onb[Onboarding workspace]
  Onboard -->|gender/email/phone| WS_Onb
  Onboard -->|OK| Role{Uloga + appMode}
  Role -->|Klijent| WS_Client[Client workspace]
  Role -->|Stylist + mode stylist| WS_Stylist[Stylist workspace]
  Role -->|Dual role| Switch[Profile: prebacivanje moda]
  Switch --> WS_Client
  Switch --> WS_Stylist
```

| Workspace | Ruta | Ko vidi | Ulaz |
| --- | --- | --- | --- |
| **Auth** | `/login`, `/register` | Gosti | Nema sesije |
| **Onboarding** | `/onboarding/*` | Novi klijenti | Obavezni koraci prije klijentskog app-a |
| **Client** | `/(tabs)/*` | Klijenti (+ stilisti u client modu) | `/home` |
| **Stylist** | `/stylist/(tabs)/*` | Stilisti (+ dual role u stylist modu) | `/stylist/inbox` |
| **Global overlay** | root `_layout` | Svi autentifikovani | APK update modal, push, Socket sync |

**Dual role:** Korisnik može biti i klijent i stilist. `appModeStore` (`client` \| `stylist`) + prekidač na Profile ekranima.

---

## 3. Globalni sistemi (van pojedinačnih ekrana)

| Sistem | Lokacija | UX uticaj |
| --- | --- | --- |
| **Tema** | `ThemeContext`, light/dark/system | Boje, header, tab bar, inputi |
| **Auth** | `authStore` | Login/logout, profil, redirect |
| **Notifikacije** | `notificationStore`, push hooks | Badge na Profile tabu, Notifications ekran |
| **Realtime** | `SocketProvider`, `SocketRealtimeSync` | Auto-refresh rezervacija, dostupnosti, public content |
| **APK self-update** | `useApkUpdateCheck`, `ApkForceUpdateModal` | Force/soft update modal na root nivou |
| **i18n** | `react-i18next` | BS primarni copy; EN infrastruktura |
| **Floating tab bar** | `BottomNavMenu` | Donja navigacija, safe area, blur |

**Shared UI komponente za redizajn:**

- `Button`, `Card`, `Input`, `Badge`, `EmptyState`, `LoadingScreen`
- `MediaImage`, `BeforeAfterSlider`
- `OnboardingShell` (onboarding koraci)
- `DateTimeField` (stilist forme)

---

## 4. Auth workspace

### 4.1 Login — `/login`

**Komponenta:** `LoginScreen`

| Aspekt | Detalj |
| --- | --- |
| **Svrha** | Prijava postojećeg korisnika |
| **UI sekcije** | Hero slika (iz public settings), gradient overlay, forma (username/email + lozinka), link na registraciju |
| **Akcije** | Validacija polja → `authStore.login` → redirect na `/` |
| **Podaci** | `GET /api/settings` (hero/branding), login API |
| **Edge cases** | Mrežna greška sa uputstvom za `EXPO_PUBLIC_API_URL`; 401 poruka |

### 4.2 Register — `/register`

**Komponenta:** `RegisterScreen`

| Aspekt | Detalj |
| --- | --- |
| **Svrha** | Registracija novog klijenta |
| **UI sekcije** | Forma: username, email, lozinka, ime, prezime, opcionalno telefon |
| **Akcije** | Validacija → `authStore.register` → automatski login → onboarding flow |
| **Navigacija** | Link nazad na login |

---

## 5. Onboarding workspace

Blokira klijentski app dok se ne ispune obavezni uslovi (`app/index.tsx` redirect logika).

| Korak | Ruta | Ekran | Funkcionalnost |
| --- | --- | --- | --- |
| 1 | `/onboarding/change-password` | `ChangePasswordScreen` u `OnboardingShell` | Obavezna promjena lozinke (`mustChangePassword`) |
| 2 | `/onboarding/gender` | inline route | Izbor spola MALE/FEMALE — obavezan za rezervacije usluga |
| 3 | `/onboarding/email` | inline route | Unos emaila + verifikacioni kod (6 cifara), resend |
| 4 | `/onboarding/phone` | inline route | Unos telefona ili **Preskoči** (SecureStore flag) |

**Napomena za redizajn:** postojeći onboarding je organizovan kao 4 koraka, ali agent **ne mora** zadržati isti step-by-step raspored. Dozvoljeno je spojiti, presložiti ili vizuelno drugačije strukturirati onboarding, sve dok ostanu pokriveni:

- promjena lozinke kada je obavezna
- izbor spola
- email unos i verifikacija
- telefon ili skip logika

---

## 6. Client workspace

**Tab navigacija** (`/(tabs)/_layout.tsx`):

| Tab | Ruta | Ikona |
| --- | --- | --- |
| Početna | `/home` | home |
| Usluge | `/services` | cut |
| Rezervacije | `/reservations` | calendar |
| Profil | `/profile` | person (+ unread badge) |

---

### 6.1 Tab: Početna (`/home`)

#### 6.1.1 Home — `/home`

**Komponenta:** `HomeScreen` — **glavni landing**, bez stack headera.

| Sekcija | Sadržaj | Akcije |
| --- | --- | --- |
| **Hero** | Slika iz settings, gradient, subtitle, CTA | CTA → rezervacija (`/services/reservation`) |
| **Welcome** | „Dobrodošli, {ime}" | — |
| **Dug banner** | Ako klijent ima otvorene dugove | Tap → Profile tab |
| **Kategorije usluga** | Horizontalni scroll po kategorijama (muški/ženski redovi) | Tap usluge → single detail; „Sve" → Services tab |
| **Zadovoljni klijenti** | Before/after slider + featured recenzija | CTA → `/home/satisfied-clients` |
| **Blog** | 2–3 kartice članaka | „Sve" → blog list; tap → blog post |
| **Kontakt teaser** | Adresa/telefon preview | → Profile → Contact |
| **Maintenance mode** | Full-screen poruka | Blokira cijeli home |

**Realtime:** socket refresh public content. **Pull-to-refresh** na cijelom scroll-u.

#### 6.1.2 Blog lista — `/home/blog-list`

**Komponenta:** `BlogListScreen`

- FlatList objavljenih postova (slika, naslov, datum, excerpt)
- Tap → `/home/blog-post/[slug]`

#### 6.1.3 Blog članak — `/home/blog-post/[slug]`

**Komponenta:** `BlogPostScreen`

- Hero slika, naslov, datum, HTML/rendered sadržaj
- Share (ako implementirano u ekranu)

#### 6.1.4 Zadovoljni klijenti — `/home/satisfied-clients`

**Komponenta:** `SatisfiedClientsScreen`

- Paginirana lista before/after transformacija (`BeforeAfterSlider`)
- Infinite scroll (`/api/daily-log/before-after`)

---

### 6.2 Tab: Usluge (`/services`)

#### 6.2.1 Services hub — `/services`

**Komponenta:** `ServicesScreen`

| Sekcija | Sadržaj | Akcije |
| --- | --- | --- |
| **Kategorije** | Muške/ženske kategorije (max 2 chip kartice) | → Service detail po kategoriji |
| **Popularno / featured** | Najpopularnija ili prva usluga | → single detail |
| **Zadnja korištena** | Iz completed rezervacija | → single detail |
| **CTA rezervacija** | Brzi ulaz | → `/services/reservation` |

#### 6.2.2 Kategorija usluga — `/services/service-detail`

**Komponenta:** `ServiceDetailScreen`

- SectionList: podkategorije → liste usluga sa hero slikom
- Gender gate: usluga drugog spola disabled
- Tap usluge → single detail; dugme „Rezerviši" → reservation

#### 6.2.3 Detalj usluge — `/services/service-single-detail`

**Komponenta:** `ServiceSingleDetailScreen`

| Sekcija | Sadržaj |
| --- | --- |
| Hero + opis | Cijena, trajanje, opis |
| Before/after | Do 3 para iz dnevnika |
| Recenzije | Odobrene recenzije |
| Galerija link | → service-work-gallery |
| CTA | Rezerviši ovu uslugu |

#### 6.2.4 Galerija radova — `/services/service-work-gallery`

**Komponenta:** `ServiceWorkGalleryScreen`

- Paginirani before/after slideri filtrirani po `serviceId`

#### 6.2.5 Rezervacija (wizard) — `/services/reservation`

**Komponenta:** `ReservationScreen` — **najkompleksniji klijentski flow**

| Korak | Sadržaj | Akcije |
| --- | --- | --- |
| **1 — Usluge** | Pretraga, multi-select usluga | Gender filter; min 1 usluga |
| **2 — Datum** | Kalendar (`react-native-calendars`), dostupni datumi | Socket refresh dostupnosti |
| **3 — Termin** | Lista slotova za izabrani dan | |
| **4 — Potvrda** | Sažetak, napomena, loyalty popust, plaćanje dugova | Submit → kreira rezervaciju |

**Posebno:** loyalty bodovi, `payDebtsIntent`, open debts total, deep link sa `serviceId` / `startAtStep`.

---

### 6.3 Tab: Rezervacije (`/reservations`)

#### 6.3.1 Moje rezervacije — `/reservations`

**Komponenta:** `MyReservationsScreen`

| Funkcionalnost | Opis |
| --- | --- |
| **Liste** | Sekcije: Nadolazeće / Prošle (SectionList) |
| **Status badge** | Svi reservation statusi (PENDING → COMPLETED, cancelled, NO_SHOW…) |
| **Tap kartice** | → detalj rezervacije |
| **Potvrdi dolazak** | Za CONFIRMED + attendance policy (deadline) |
| **Prihvati/odbij reschedule** | Kad stilist predloži pomak |
| **Otkaži** | Modal sa razlogom |
| **Ocijeni** | → write-review (COMPLETED) |
| **Nova rezervacija** | Empty state CTA → reservation wizard |
| **Realtime** | Socket + auto refresh; layout animacije |

#### 6.3.2 Detalj rezervacije — `/reservations/[reservationId]`

**Komponenta:** `ClientReservationDetailScreen`

- Referentni kod, status, usluge, stilist, datum/vrijeme
- Payment summary (ako postoji)
- Pull-to-refresh

#### 6.3.3 Napiši recenziju — `/reservations/write-review`

**Komponenta:** `ReviewsScreen`

- Star rating usluge (+ opcionalno stilista)
- Komentar, izbor usluge ako nije proslijeđena
- Submit → `POST /api/reviews`

---

### 6.4 Tab: Profil (`/profile`)

#### 6.4.1 Profil — `/profile`

**Komponenta:** `ProfileScreen`

| Sekcija | Funkcionalnost |
| --- | --- |
| **Hero** | Avatar (tap → edit), ime, email (+ verify), telefon |
| **Dugovi** | Lista otvorenih dugova klijenta |
| **Prebaci na Stylist** | Ako `isStylist(user)` → stylist app |
| **Meni** | Edit profil, lozinka, notifikacije, tema (light/dark/system), kontakt, provjeri update, odjava |
| **Email verify modal** | Kod 6 cifara inline |

#### 6.4.2 Uredi profil — `/profile/edit`

**Komponenta:** `EditProfileScreen`

- Avatar upload (gallery picker → `/api/uploads`)
- Ime, prezime, email, telefon, spol
- Email verifikacija modal

#### 6.4.3 Promjena lozinke — `/profile/change-password`

**Komponenta:** `ChangePasswordScreen`

- Stara + nova + potvrda lozinke

#### 6.4.4 Notifikacije — `/profile/notifications`

**Komponenta:** `NotificationsScreen`

- Lista in-app notifikacija (tip: reservation, review, blog, holiday, system)
- Unread vizuelni akcent; tap → mark as read
- Auto refresh + socket

#### 6.4.5 Kontakt — `/profile/contact`

**Komponenta:** `ContactScreen`

- Adresa, telefon, email (tap → dial/mail)
- Radno vrijeme salona
- Mapa / navigacija (lat/lng iz settings)
- Social linkovi (Instagram, Facebook…)
- Realtime refresh settings

---

## 7. Stylist workspace

**Tab navigacija** (`/stylist/(tabs)/_layout.tsx`):

| Tab | Ruta | Label |
| --- | --- | --- |
| Inbox | `/stylist/inbox` | Inbox |
| Dnevnik | `/stylist/daily-log` | Dnevnik |
| Raspored | `/stylist/schedule` | Raspored |
| Statistika | `/stylist/stats` | Statistika |
| Profil | `/stylist/profile` | Profil |

---

### 7.1 Tab: Inbox — `/stylist/inbox`

**Komponenta:** `StylistInboxScreen`

| Funkcionalnost | Opis |
| --- | --- |
| **Lista** | Rezervacije PENDING / STYLIST_REVIEW za stilista |
| **Lock** | Zaključaj pregled (exclusive) |
| **Unlock** | Otključaj |
| **Prihvati** | Accept — provjera dugova klijenta (alert) |
| **Odbij** | Reject sa opcionalnim razlogom |
| **Realtime** | Socket + 30s/120s polling |

---

### 7.2 Tab: Dnevnik (`/stylist/daily-log`)

**Stack:** lista → detail → new-entry → debts → reschedule-preview

#### 7.2.1 Lista — `/stylist/daily-log`

**Komponenta:** `DailyLogListScreen`

- SectionList po sedmicama (zadnjih ~1 mj + 7 dana)
- Kartica: datum, klijent, usluge, iznos, status
- Header actions: **Dužnici** (→ debts), **Novi zapis** (→ new-entry)
- Tap → detail

#### 7.2.2 Detalj zapisa — `/stylist/daily-log/detail/[entryId]`

**Komponenta:** `DailyLogDetailScreen`

| Funkcionalnost | Opis |
| --- | --- |
| **Pregled** | Klijent, usluge, cijene, naplata, napojnica, dugovi |
| **Slike** | Upload before/after (ImagePicker) |
| **Završi zapis** | Complete → knjiga + rezervacija |
| **Dispozicija** | Panel za direct disposition flow |
| **Akcije meni** | Edit, delete (modal + razlog), link na rezervaciju |
| **Transformacije** | Before/after prikaz |

#### 7.2.3 Novi ručni zapis — `/stylist/daily-log/new-entry`

**Komponenta:** `DailyLogNewEntryScreen`

- Datum, klijent (search picker), multi usluge, cijene po stavci
- Plaćeni iznos, kreiranje duga, loyalty popust
- Namirenje postojećih dugova klijenta
- Edit mode ako `entryId` u params

#### 7.2.4 Dužnici — `/stylist/daily-log/debts`

**Komponenta:** `StylistDebtsScreen` (inline u app route)

- Lista otvorenih dugova stilista
- Pretraga po klijentu/usluzi/referenci
- **Naplati** → zatvara dug, upis u dnevnik

#### 7.2.5 Preview pomjeranja — `/stylist/daily-log/reschedule-preview/[reservationId]`

**Komponenta:** `ReschedulePreviewScreen`

- Predlog pomaka termina (overrun / manual / break-only)
- Toggle include breaks, manual minute shift
- Tabela pogođenih termina (staro → novo vrijeme)
- Potvrda → primjenjuje reschedule

---

### 7.3 Tab: Raspored (`/stylist/schedule`)

#### 7.3.1 Raspored — `/stylist/schedule`

**Komponenta:** `StylistScheduleScreen`

| Funkcionalnost | Opis |
| --- | --- |
| **Lista** | Sekcije po danu, 30 dana unaprijed |
| **Filter** | Samo preuzeti termini (`confirmedStylistId`) + IN_PROGRESS |
| **Kartice** | Hero backdrop, usluge, trajanje, status |
| **Akcije** | Detalj termina; CTA za start/complete ovisno o statusu |
| **Header +** | → Direktna rezervacija |

#### 7.3.2 Direktna rezervacija — `/stylist/schedule/direct-booking`

**Komponenta:** `StylistDirectBookingScreen`

- Pretraga klijenta, multi usluge, datum/vrijeme početak/kraj, napomena
- Kreira termin bez attendance potvrde klijenta

#### 7.3.3 Detalj termina — `/stylist/schedule/reservation-detail/[reservationId]`

**Komponenta:** `StylistReservationDetailScreen`

**Sažetak:** `ReservationDetailSummary` + `ReservationDetailActions`

| Akcija | Modal / flow |
| --- | --- |
| Staff confirm attendance | Inline |
| Start termina | API start |
| Overrun / pomak | → Overrun modal → reschedule preview |
| Završi | Complete modal (cijena, napojnica, plaćanje, loyalty) |
| No-show | NoShow modal (penal opcija) |
| Otkaži | Cancel modal (razlog) |
| Reorder usluga | Reorder modal |
| Refresh | Pull-to-refresh |

**Modali:** `CancelReservationModal`, `CompleteReservationModal`, `NoShowReservationModal`, `OverrunReservationModal`, `ReorderReservationModal`

---

### 7.4 Tab: Statistika — `/stylist/stats`

**Komponenta:** `StylistStatsScreen`

- Mjesečni pregled (trenutni mjesec)
- Kartice: završeni termini, nadolazeći, prihod usluga, napojnice, namireni dugovi
- Podaci iz rezervacija + daily-log API

---

### 7.5 Tab: Profil — `/stylist/profile`

**Komponenta:** `StylistProfileScreen`

- Avatar inicijali, ime, uloga „Stilist"
- **Prebaci na Client app** (dual role)
- Provjeri APK update
- Odjava

---

## 8. Mapa ekrana (brza referenca)

| # | Workspace | Ruta | Ekran |
| --- | --- | --- | --- |
| 1 | Auth | `/login` | Login |
| 2 | Auth | `/register` | Register |
| 3 | Onboarding | `/onboarding/change-password` | Promjena lozinke |
| 4 | Onboarding | `/onboarding/gender` | Spol |
| 5 | Onboarding | `/onboarding/email` | Email + verifikacija |
| 6 | Onboarding | `/onboarding/phone` | Telefon |
| 7 | Client | `/home` | Početna |
| 8 | Client | `/home/blog-list` | Blog lista |
| 9 | Client | `/home/blog-post/[slug]` | Blog članak |
| 10 | Client | `/home/satisfied-clients` | Transformacije |
| 11 | Client | `/services` | Usluge hub |
| 12 | Client | `/services/service-detail` | Kategorija |
| 13 | Client | `/services/service-single-detail` | Detalj usluge |
| 14 | Client | `/services/service-work-gallery` | Galerija radova |
| 15 | Client | `/services/reservation` | Rezervacija wizard |
| 16 | Client | `/reservations` | Moje rezervacije |
| 17 | Client | `/reservations/[id]` | Detalj rezervacije |
| 18 | Client | `/reservations/write-review` | Recenzija |
| 19 | Client | `/profile` | Profil |
| 20 | Client | `/profile/edit` | Uredi profil |
| 21 | Client | `/profile/change-password` | Lozinka |
| 22 | Client | `/profile/notifications` | Notifikacije |
| 23 | Client | `/profile/contact` | Kontakt |
| 24 | Stylist | `/stylist/inbox` | Inbox |
| 25 | Stylist | `/stylist/daily-log` | Dnevnik lista |
| 26 | Stylist | `/stylist/daily-log/detail/[id]` | Dnevnik detalj |
| 27 | Stylist | `/stylist/daily-log/new-entry` | Novi zapis |
| 28 | Stylist | `/stylist/daily-log/debts` | Dužnici |
| 29 | Stylist | `/stylist/daily-log/reschedule-preview/[id]` | Reschedule preview |
| 30 | Stylist | `/stylist/schedule` | Raspored |
| 31 | Stylist | `/stylist/schedule/direct-booking` | Direktna rezervacija |
| 32 | Stylist | `/stylist/schedule/reservation-detail/[id]` | Detalj termina |
| 33 | Stylist | `/stylist/stats` | Statistika |
| 34 | Stylist | `/stylist/profile` | Stilist profil |

**Ukupno: 34 ekrana/ruta** (+ globalni modali: APK update, cancel/complete/no-show/overrun/reorder, email verify, delete daily log).

---

## 9. Korisnički tokovi (za redizajn)

```mermaid
flowchart LR
  subgraph client_book [Klijent: rezervacija]
    H[Home CTA] --> R[Reservation wizard]
    S[Services] --> R
    R --> MR[Moje rezervacije]
    MR --> RD[Detalj]
    MR --> RV[Recenzija]
  end

  subgraph stylist_day [Stilist: radni dan]
    I[Inbox accept] --> SCH[Raspored]
    SCH --> SD[Detalj termina]
    SD --> DL[Dnevnik zapis]
    DL --> ST[Statistika]
  end
```

Ovi tokovi služe kao **funkcionalna mapa**, ne kao obavezna UX struktura. Agent smije promijeniti način kako korisnik prolazi kroz ove tokove, ali ne smije ukloniti nijednu ključnu radnju, informaciju ili mogućnost.

---

## 10. Backup protokol prije implementacije

Prije prve implementacije redizajna obavezan je **maksimalno siguran backup trenutnog mobilnog dizajna**.

Ovaj korak nije opcionalan i mora biti završen **prije bilo kakvih UI izmjena** na redesign branchu.

### Obavezni koraci

1. Uraditi pregled trenutnog stanja preko `git status` i `git diff`.
2. Napraviti jedan jasan commit koji predstavlja **posljednju stabilnu verziju postojećeg mobilnog dizajna prije rebranda**.
3. Pushati taj commit na remote.
4. Napraviti i pushati **backup referencu** za povrat:
   - obavezno: **backup tag**
   - preporučeno dodatno: **backup branch**
5. U ovom planu zabilježiti tačnu backup verziju:
   - commit SHA
   - naziv backup taga
   - naziv backup brancha ako postoji
   - datum kreiranja
   - kratki opis šta ta verzija predstavlja
6. Tek nakon toga početi implementaciju novog dizajna.

### Svrha ovog pravila

- da trenutni dizajn ne bude izgubljen
- da postoji jasan i udaljeni backup na remote-u
- da se repo u bilo kojem trenutku može vratiti na stabilnu pre-redesign verziju
- da se po potrebi mogu raditi parcijalni ili potpuni rollback scenariji

### Preporučena konvencija

- Backup tag: `mobile-pre-rebrand-v1` ili `backup-mobile-ui-YYYY-MM-DD`
- Backup branch: `backup/mobile-pre-rebrand-YYYY-MM-DD`

### Obavezni zapis u planu nakon backup-a

```md
- Backup commit SHA: `<upisati>`
- Backup tag: `<upisati>`
- Backup branch: `<upisati ako postoji>`
- Datum: `<upisati>`
- Opis: Posljednja stabilna verzija mobilnog UI-ja prije potpunog rebranda.
```

### Pravilo za rollback

Ako redesign uvede velike probleme, regresije ili nezadovoljavajući rezultat, backup verzija iz ovog koraka se tretira kao **sigurna povratna tačka** za:

- poređenje promjena
- selektivni povrat fajlova ili commitova
- potpuni rollback na pre-redesign stanje

---

## 11. Prioriteti implementacije

Redoslijed koji agent treba pratiti:

1. **Design system foundation** — ažurirati `colors.ts` (token mapa, sekcija 1.3), `fonts.ts` (sekcija 1.4), instalirati fontove, ažurirati `_layout.tsx`
2. **Shared komponente** — `Button`, `Card`, `Input`, `Badge`, `EmptyState`, `LoadingScreen` prema mockup `DesignSystem.tsx`
3. **Tab bar** — `BottomNavMenu` prema novom vizuelnom standardu iz sekcije 1.7
4. **Auth ekrani** — `LoginScreen`, `RegisterScreen` prema `AuthScreens.tsx` u mockup-u
5. **Onboarding** — 4 koraka prema `OnboardingScreens.tsx` u mockup-u
6. **Client: Home** — `HomeScreen` i nested ekrani prema `ClientHomeScreens.tsx`
7. **Client: Usluge + Rezervacija** — svi ekrani usluga uključujući wizard prema `ClientServicesScreens.tsx`
8. **Client: Rezervacije** — lista, detalj, recenzija prema `ClientReservationsScreens.tsx`
9. **Client: Profil** — svi profil ekrani prema `ClientProfileScreens.tsx`
10. **Stylist: svi ekrani** — Inbox, Dnevnik (sa svim pod-ekranima), Raspored, Statistika, Profil prema `StylistScreens.tsx`

---

## 12. Handoff uputstvo za redesign agenta

1. **Pročitaj ovaj dokument u potpunosti** prije bilo koje UI izmjene.
2. **Prije prve implementacije ispoštuj Backup protokol** iz sekcije 10 ovog dokumenta — obavezan commit + push + tag.
3. **Vizuelni source of truth** je mockup na `C:\Dokumentacija\Projekti web\Bauty\mobile-app-ui-redesign`. Za svaki ekran čitaj odgovarajuću komponentu iz tog mockup-a i koristi je kao primarni vizuelni referent. Mapa fajlova je u sekciji 1.9.
4. **Počni sa `colors.ts` i `fonts.ts`** — bez ispravnih tokena i fontova sve ostalo nema smisla. Token mapa je u sekciji 1.3, font spec u sekciji 1.4.
5. **Instaliraj fontove** (`@expo-google-fonts/cormorant-garamond`, `@expo-google-fonts/dm-sans`) i ažuriraj `_layout.tsx` + `fonts.ts` prije nego krenesš na ekrane.
6. **Redoslijed implementacije:** design system (tokeni + fontovi + shared komponente) → tab bar → auth → onboarding → client ekrani → stylist ekrani.
7. **Obavezno sačuvaj svu funkcionalnost** — nijedna akcija, informacija ni flow ne smije nestati ili biti nepristupačna. Inventar ekrana u sekcijama 4–7 je funkcionalna mapa onoga što mora biti pokriveno.
8. **Ne mijenjaj business logiku** — dozvoljeno: JSX struktura, vizuelna hijerarhija, komponente, stilovi, spacing, tipografija, animacije. Zabranjeno: API pozivi, Zustand store logika, FSM rezervacija, validacije, push routing.
9. **Light + dark** moraju oba raditi. Light je topla champagne bijela (`#F8F5F0` baza), nije inverz dark-a. Token mapa za obje teme je u sekciji 1.3.
10. **Safe area** — uvijek `useSafeAreaInsets` za bottom padding; testirati Android 3-button + gesture bar.
11. **Slike** — uvijek `MediaImage` / upload URL helperi; nikad hardkodirane dimenzije koje kvare aspect ratio.
12. **Animacije** — koristiti selektivno prema motion principima iz sekcije 1.8; cilj je kvalitet UX feedbacka, ne vizuelni spektakl.
13. **Referenca tehničkog audita** (NativeWind setup, edge-to-edge, Expo SDK): `.cursor/plans/mobile_ui_redesign_audit_24155cab.plan.md`.

---

*Implementacijska specifikacija — Beauty Salon Nejra v2 mobile rebrand.*
