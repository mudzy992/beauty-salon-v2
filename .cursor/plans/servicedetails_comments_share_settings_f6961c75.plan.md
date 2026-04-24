---
name: ServiceDetails_Comments_Share_Settings
overview: Promijeniti mobilni UX za odabir servisa (detalji prije rezervacije + preselect u koraku 1), popraviti “back” ponašanje u rezervacijskom flow-u, dodati komentare na blogove u mobilnoj app, uvesti admin postavke/moderaciju komentara sa badge indikatorima, implementirati share za blogove (web+mobile), te prikaz socijalnih mreža iz postavki u web footer/kontakt i mobilni Home+Kontakt.
todos:
  - id: mobile-service-details-first
    content: Preusmjeriti tap na servis (Services tab) da ide na detalje, a rezervacija da krene iz detalja sa preselect servisom na koraku 1.
    status: completed
  - id: mobile-reservation-back
    content: Ujediniti i popraviti back logiku u `ReservationScreen` (koraci + back na origin screen).
    status: completed
  - id: mobile-blog-comments-share
    content: Dodati komentare i share na mobilnim blog screenovima.
    status: completed
  - id: comment-settings-moderation
    content: Dodati grupu postavki za komentare (auto/manual approve, badwords, blocked users) i primijeniti ih u backendu.
    status: completed
  - id: admin-badges
    content: Dodati pending/total badge indikatore u web adminu (nav + blog lista).
    status: completed
  - id: public-share-social
    content: Implementirati share na web public blog postu i prikaz socijalnih mreža u web footer/kontakt + mobile Home/Kontakt.
    status: completed
isProject: false
---

## Ciljevi po tačkama
- **Mobile (servisi → detalji → rezervacija)**: tap na servis ne otvara odmah rezervaciju nego `ServiceSingleDetail`; iz detalja “Rezerviši” vodi u `Reservation` flow na **korak 1** sa servisom već selektovanim.
- **Mobile (back kroz korake)**: back uvijek vraća na prethodni ekran/korak (koraci unutar rezervacije idu 4→3→2→1; na koraku 1 back vraća na screen odakle je korisnik došao).
- **Mobile (blog komentari)**: prikaz odobrenih komentara + dodavanje komentara iz mobilne aplikacije.
- **Web admin (komentari)**: vidljivo stanje neodobrenih komentara + profesionalne postavke komentara (auto/manual approve, badwords, blokirani korisnici za komentarisanje…)
- **Badge uz ikonicu komentara**: ukupno komentara (zeleno), a ako ima neodobrenih (crveno).
- **Share blogova (web+mobile)**: share button sa platformama (FB, X/Twitter, Viber, WhatsApp) + “system share”.
- **Socijalne mreže iz postavki**: prikaz u web footer + kontakt, i na mobilnoj i na Home i na Kontakt/About ekranu.

## Šta već postoji (važno za implementaciju)
- **Mobile**:
  - `ServicesScreen` trenutno za “featured/last used” ide direktno na `Reservation` (`mobile/src/screens/client/ServicesScreen.tsx`).
  - `ServiceDetailScreen` već otvara `ServiceSingleDetail` na tap info dijela servisa (`mobile/src/screens/client/ServiceDetailScreen.tsx`).
  - `ReservationScreen` sada **preskače korak 1** ako primi `serviceId` (`useState(initialServiceId ? 2 : 1)` + `setStep(2)` u effect-u) (`mobile/src/screens/client/ReservationScreen.tsx`).
  - `BlogListScreen`/`BlogPostScreen` postoje, ali bez komentara/share (`mobile/src/screens/client/BlogListScreen.tsx`, `mobile/src/screens/client/BlogPostScreen.tsx`).
- **Backend**:
  - Prisma modeli `BlogPost` i `BlogComment` već postoje (`backend/prisma/schema.prisma`).
  - Endpoints za komentare već postoje (`backend/src/blog/blog.controller.ts`) i servis `BlogCommentsService` kreira komentar sa `isApproved=false` (`backend/src/blog/blog-comments.service.ts`).
- **Web (public)**: komentari već postoje na javnom blog postu (`frontend/src/pages/public/PublicBlogPost.tsx`).
- **Web (admin)**: odobravanje/brisanje komentara postoji unutar admin blog stranice (`frontend/src/pages/Blog.tsx`) ali nema globalnog “pending” indikatora u navigaciji i nema badge po postovima.
- **Settings / social**: `public_social_facebook/instagram/tiktok` već su definisani i editabilni u adminu, ali se ne renderuju u footer/kontakt (`backend/src/settings/settings-registry.ts`, `frontend/src/pages/Settings.tsx`, `frontend/src/features/shell/public/public-layout.tsx`, `frontend/src/pages/public/PublicContact.tsx`).

## Plan izmjena

### 1) Mobile: Tap na servis → detalji, pa rezervacija
- **Promjena tap-a na featured/last used servisima**
  - U `[mobile/src/screens/client/ServicesScreen.tsx](mobile/src/screens/client/ServicesScreen.tsx)` promijeniti navigaciju sa `'Reservation'` na `'ServiceSingleDetail'` uz `{ serviceId, serviceName }`.
  - Time se izbjegava “auto rezervacija” direktno sa početnog servisa.
- **Rezervacija iz detalja**
  - U `[mobile/src/screens/client/ServiceSingleDetailScreen.tsx](mobile/src/screens/client/ServiceSingleDetailScreen.tsx)` “Rezerviši” dugme treba slati u `Reservation` sa novim parametrom koji kaže **kreni od koraka 1** ali sa preselect servisom (npr. `prefillServiceId` + `startAtStep: 1`).
- **Tipovi navigacije**
  - U `[mobile/src/navigation/types.ts](mobile/src/navigation/types.ts)` proširiti `Reservation` params tako da podrže novi parametar (npr. `startAtStep?: 1|2` ili `skipServiceStep?: boolean`).

### 2) Mobile: Preselect servis ali ostani na koraku 1
- U `[mobile/src/screens/client/ReservationScreen.tsx](mobile/src/screens/client/ReservationScreen.tsx)`:
  - Promijeniti inicijalni `step` tako da ne zavisi isključivo od `serviceId`.
  - U effect-u koji preselectuje servis (gdje se sada radi `setStep(2)`) usloviti prelazak na korak 2 samo kad je eksplicitno traženo (npr. `startAtStep === 2`).
  - Rezultat: korisnik vidi listu servisa (korak 1) sa već odabranim servisom i može dodati još.

### 3) Mobile: Logika vraćanja korak nazad (uvijek na prethodni ekran)
- U `[mobile/src/screens/client/ReservationScreen.tsx](mobile/src/screens/client/ReservationScreen.tsx)`:
  - Uvesti jedinstvenu funkciju `handleBack()`:
    - ako je `step > 1` → `setStep(step-1)` + reset samo relevantnog dijela stanja (kao sada)
    - ako je `step === 1` → `navigation.goBack()` (ili `navigation.getParent()?.goBack()` zavisno od stack-a)
  - Prespojiti sva postojeća “Back” dugmad na tu logiku.
  - Po potrebi dodati listener za hardware back (Android) da poštuje istu logiku.

### 4) Mobile: Komentari na blogove
- U `[mobile/src/screens/client/BlogPostScreen.tsx](mobile/src/screens/client/BlogPostScreen.tsx)`:
  - Dodati fetch odobrenih komentara `GET /api/blog/:postId/comments?approved=true` (nakon što se učita post).
  - UI: lista komentara + counter (broj), loading state.
  - Form za slanje komentara ako je user logovan (koristiti postojeći auth store), `POST /api/blog/:postId/comments`.
  - Nakon slanja: prikaz poruke “poslano na odobrenje” i refresh.

### 5) Web admin: Pending indikatori + profesionalne postavke komentara
- **Settings keys** (backend): u `[backend/src/settings/settings-registry.ts](backend/src/settings/settings-registry.ts)` dodati novu grupu “Komentari” sa npr:
  - `comments_auto_approve` (true/false)
  - `comments_badwords` (tekst/CSV/JSON)
  - `comments_blocked_user_ids` ili `comments_blocked_emails/phones` (format dogovorimo u implementaciji; predlog: userId list ako je uvijek auth-required)
  - opciono: `comments_rate_limit_per_minute`, `comments_min_length`, `comments_max_length` (u skladu s DTO).
- **Primjena postavki** (backend): u `[backend/src/blog/blog-comments.service.ts](backend/src/blog/blog-comments.service.ts)` prije kreiranja komentara:
  - provjeriti blocked user
  - provjeriti badwords
  - postaviti `isApproved` na osnovu `comments_auto_approve` (ako nije blocked/badwords).
  - (Ako već postoji settings service/repository koji se može ubrizgati, koristi se isti pattern kao ostale postavke.)
- **Admin indikacija pending komentara**:
  - Dodati admin-only endpoint koji vraća broj neodobrenih komentara (globalno) i/ili per-post.
  - U web adminu:
    - u `[frontend/src/features/shell/admin/admin-layout.tsx](frontend/src/features/shell/admin/admin-layout.tsx)` dodati badge uz “Blog” nav item kada `pendingCount>0`.
    - u `[frontend/src/pages/Blog.tsx](frontend/src/pages/Blog.tsx)` dodati badge uz ikonicu komentara po postu: zeleni total, crveni ako ima pending.

### 6) Badge uz ikonicu komentara (total/pending)
- Backend: proširiti listu blog postova (admin list i/ili public list po potrebi) da nosi:
  - `commentsTotalCount`
  - `commentsPendingCount`
- Frontend admin: prikazati badge:
  - **zeleno** ako total>0 i pending==0
  - **crveno** ako pending>0 (broj na badge-u je i dalje “ukupan” ili “pending”? prema zahtjevu: badge prikazuje ukupan broj; boja se mijenja na crvenu ako postoji pending).

### 7) Share button za blogove (web + mobile)
- **Web** (`frontend/src/pages/public/PublicBlogPost.tsx`):
  - Dodati share dugme (npr. u hero ili iznad komentara).
  - Preferirati `navigator.share()` gdje postoji, fallback na:
    - Facebook share URL
    - X/Twitter intent
    - Viber share link
    - WhatsApp share link
    - Copy link.
- **Mobile** (`mobile/src/screens/client/BlogPostScreen.tsx`):
  - Dodati share button u header (npr. `navigation.setOptions({ headerRight: ... })`) ili u content.
  - Koristiti React Native `Share.share({ message, url, title })`.
  - Link za share: canonical web URL blog posta (definisati base URL kroz settings/env ako već postoji).

### 8) Socijalne mreže iz postavki → web footer/kontakt + mobile Home/Kontakt
- **Backend**: proširiti registry po potrebi (dodati `public_social_x`, `public_social_viber`, `public_social_whatsapp`, `public_social_youtube`, itd. ako želite).
- **Web**:
  - U `[frontend/src/features/shell/public/public-layout.tsx](frontend/src/features/shell/public/public-layout.tsx)` renderovati social ikonice/linkove u footer-u ako su setovani.
  - U `[frontend/src/pages/public/PublicContact.tsx](frontend/src/pages/public/PublicContact.tsx)` dodati social linkove u kontakt sekciju.
- **Mobile**:
  - Koristiti `mobile/src/services/publicSettings.ts` i postojeći public settings endpoint.
  - Dodati social sekciju na **Home** (`mobile/src/screens/client/HomeScreen.tsx`) i kreirati/extendovati “Kontakt/About” screen (pošto sad nema jasnog mjesta gdje se renderuju contact/social).

## Data flow (komentari/moderacija)
```mermaid
flowchart TD
  ClientApp[ClientApp(WebOrMobile)] -->|POST_addComment| BlogApi[BlogController]
  BlogApi --> BlogCommentsService
  BlogCommentsService -->|check_settings_badwords_blocklist| SettingsService[SettingsService]
  BlogCommentsService -->|create_comment(isApproved_auto_or_manual)| DB[(MySQL/Prisma)]
  AdminApp[AdminWeb] -->|GET_pendingCounts| BlogApi
  AdminApp -->|PATCH_approve| BlogApi
```

## Test plan (u implementaciji)
- Mobile:
  - Tap featured servis → otvara detalje; iz detalja “Rezerviši” → Reservation step 1 preselect.
  - Back kroz korake 4→3→2→1; na 1 ide na prethodni screen.
  - Blog post: submit komentar → toast + komentar se ne vidi dok nije odobren.
  - Share otvara native share sheet.
- Web admin:
  - Pending badge se pojavi kad ima neodobrenih komentara.
  - Badge boje: green kada pending=0, red kada pending>0.
- Web public:
  - Share radi (navigator.share ili fallback linkovi).
  - Footer/kontakt prikazuju social linkove kad su setovani.

## Scope/napomene
- Komentari su već auth-required (userId je obavezan), pa je “blocked users” najčistije vezati za `userId`.
- Instagram direktni “share URL” za web ne radi pouzdano; na webu ćemo ga tretirati kroz system share ili link ka Instagram profilu (dok FB/X/Viber/WhatsApp imaju share URL-ove).
