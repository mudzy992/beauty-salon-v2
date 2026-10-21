# Arhitektura i ponašanje — Beauty Salon v2

**Pregled koda:** 2026-10-21 (UTC)<br>
**Status:** statički pregled implementacije; ovo nije runtime/system design potvrda produkcijske konfiguracije.<br>
**Glavni handoff:** [HANDOFF.md](HANDOFF.md)<br>
**Nalazi:** [FINDINGS.md](FINDINGS.md)<br>

## 1. Sažetak sistema

Repozitorij je multi-app proizvod sa tri odvojeno instalirana npm paketa:

| Dio | Implementacija | Glavna odgovornost |
|---|---|---|
| Backend | NestJS 11, TypeScript, Prisma 7, PostgreSQL (`@prisma/adapter-pg`) | REST API, poslovna pravila, persistencija, Socket.IO, scheduled jobs |
| Web | React 18, TypeScript, Vite, React Router 6 | Javna salon stranica, klijentski booking/account tokovi, admin i stylist portali |
| Mobile | Expo SDK 57, React Native 0.86, Expo Router, TypeScript | Klijentski i stylist mobilni tokovi, push, APK update |
| Persistence | PostgreSQL + dijeljeni upload direktorij | Relacioni podaci, lokalno/host-mount fajl skladište |
| Opcionalni infra | Redis nije implementiran niti vezan u Compose | Mogući kasniji rate-limit/queue/socket adapter/distributed lock sloj |

Nema root `package.json`; `backend/`, `frontend/` i `mobile/` imaju zasebne `package-lock.json` fajlove. Aktivna DB šema je PostgreSQL. Prisma `PrismaService` eksplicitno odbija svaki `DATABASE_PROVIDER` osim `postgres`, iako dependency set još sadrži MariaDB adapter/dependency ostatke. U aktivnom `backend/prisma/migrations/` postoje PostgreSQL baseline migracija i naredna blog SEO migracija.

> Runtime topologija, živi DB sadržaj, eksterni reverse proxy, secret manager, TLS, backup i produkcijski Redis ACL nisu provjereni iz ovog repo audita.

## 2. Runtime granice i request putanja

### HTTP/API

1. `backend/src/main.ts` kreira Nest Express app, registruje JSON exception filter, Decimal→Number interceptor i globalni `ValidationPipe` (`whitelist`, `forbidNonWhitelisted`, `transform`).
2. App-wide `APP_GUARD` je `JwtAuthGuard`. Endpointi moraju eksplicitno koristiti `@Public()` da zaobiđu JWT. Prisustvo `@Roles()`/`RolesGuard` dodaje role policy na izabrane rute; ne zamjenjuje service-level ownership provjere.
3. `JwtStrategy` poziva auth validaciju koja provjerava da je korisnik aktivan i čita trenutne role iz baze. Web JWT se čuva u `localStorage`; mobile access token u `expo-secure-store`.
4. DTO-jevi sa `class-validator` dobijaju whitelist validaciju. Query/body parametri definisani samo kao inline TS tipovi ili `string` nemaju nužno istu runtime validaciju.
5. Prisma ide preko PostgreSQL adaptera. Database URL dolazi iz konfiguracije; repo ne uključuje produkcijsku DB uslugu u Compose.

Ključni entrypoint-i: [AppModule](../../backend/src/app.module.ts), [main.ts](../../backend/src/main.ts), [PrismaService](../../backend/src/prisma/prisma.service.ts), [Prisma config](../../backend/prisma.config.ts).

### Realtime

`EventsGateway` koristi Socket.IO root namespace. Konekcije bez tokena, kao i konekcije s nevažećim tokenom, ulaze u `public` room; valjan JWT ulazi u `user:<id>` i po claims-u u `admin`/`stylists`. `emitToUser`, `emitToAdmins` i `emitToStylists` ciljaju room; `emitToAll` je globalni `server.emit`. Nije konfigurisan Redis Socket.IO adapter, pa room state i connected-user mapa žive u procesu. Vidi [events.gateway.ts](../../backend/src/events/events.gateway.ts).

`SettingsService.set` sada šalje globalni `settings:updated` sa vrijednošću samo za ne-secret `PUBLIC` ključeve; `PRIVATE`/secret izmjene šalju key-only invalidaciju admin room-u, nakon čega admin klijent ponovo čita preko guarded HTTP API-ja. Ovo je source-level mitigation pokrivena service unit testom; stvarni Socket.IO room/runtime nije testiran. Anonymous/invalid sockets, stale JWT role claims i wildcard CORS ostaju otvoreni rizici (SEC-06).

## 3. Backend moduli i glavni tokovi

Backend `AppModule` registruje sljedeće domene:

| Modul | Ponašanje / granice |
|---|---|
| `auth` | Registracija, prijava, promjena lozinke, email-verification token/kod, JWT izdavanje. Nema implementiranog password-reset controller endpointa. |
| `users` | User profili, role management, klijenti/stilisti lookup, onboarding, admin analytics. User model sadrži password hash i verification token; response projekcije su sigurnosno kritične. |
| `salon` | Salon podaci, opening hours, holidays, holiday notifications. Public endpoint vraća salon profil. |
| `services` | Kategorije/podkategorije/servisi, aktivnost, cijena/trajanje, gender, loyalty konfiguracija. Admin/owner uređuje katalog; dio read ruta je public. |
| `stylists` | StylistProfile, raspored, vezani servisi, javni profil i admin analytics. |
| `reservations` | Availability, multi-service booking, stylist inbox/lock/accept/reject, direct booking, cancellation, attendance, start/complete, reschedule/reorder, public reference/view-token putanje. Rezervacija je status-driven FSM. |
| `daily-log` | Usluga i naplata nakon rezervacije ili ručni unos, before/after slike, debt payment zapis, completion/revert. |
| `finance` | Expense books/KUF, Income books/KIF, line-item expense templates, ručni prihod, audit trail, debts/repayment/write-off, totals i mjesečni rollover. |
| `loyalty` | Loyalty accounts, tier, earn/redeem/adjust i marker popusta na reservation/daily-log zapisima. |
| `notifications` | In-app notification, preference, push token, Expo push, SMTP email, test email/SMTP i kampanje. |
| `events` | Socket.IO rooms i fan-out realtime događaja. |
| `analytics` | Dashboard/agregati za prihod, rashod, stiliste, usluge i booking funnel. |
| `settings` | Registry-based AppSetting, public/admin scope, tajna enkripcija, theme/feature/system postavke. |
| `uploads` | Auth upload endpoint, slike/dokumenti, image resize i metadata u DB; Express statički servira upload root. |
| `blog` | Public list is published-only with display projection; public slug detail is published-only and sanitizes HTML on output; create/update sanitize stored content with an explicit allowlist. Public comments require approved comment + published parent. Admin all-posts, draft-by-ID and all-comments routes are role-guarded. |
| `gallery` | Public galerija i admin kategorije/slike povezane s Upload zapisima. |
| `reviews` | Review create/approval/delete; public featured/list use approved-only allowlist projection; detail requires JWT and only returns approved display fields; moderation list is role-guarded at `/api/reviews/admin`. |
| `app-releases` | Admin APK upload/release metadata; public latest Android release. Mobile provjerava SHA-256 prije pokretanja Android install intent-a. |
| `config`, `common`, `prisma`, `i18n` | Environment loading, guards/decorators/filters/interceptors/utilities, DB bootstrap i zajednički tekstovi. |

### Rezervacija (klijentski self-service)

1. Web/mobile traži aktivne servise i availability; booking UI zahtijeva prijavu, onboarding, email/phone podatke i gender.
2. `ReservationCreateService` ponovo provjerava klijentski status, odabrane servise/gender, penalizaciju, availability slot i client-day booking policy.
3. Upisuje `Reservation` u `PENDING`, zatim service-item i stylist-response redove. Odabrani stilisti dobijaju notifikaciju; potom se po potrebi redeem-uju loyalty bodovi, query-uje puni response i emituju događaji.
4. Stylist lock/accept vodi do potvrđenog termina; attendance policy, `IN_PROGRESS`, `AWAITING_DAILY_LOG`, completion/cancellation/no-show su zasebni tokovi. Status transition helper opisuje FSM u `reservations/constants.ts`.
5. Nakon rada, daily-log zapis vodi cijenu/tip, slike, eventualni dug, KIF unos i loyalty earn/redeem.

Ovaj redoslijed opisuje kod, ne garantuje transakcijsku atomarnost. Kritične djelimične-upise i concurrency kandidate dokumentuje [FINDINGS.md](FINDINGS.md).

### Dnevnik i finansije

- `DailyLogEntry` je izvor evidencije odrađene usluge; `DailyLogImage` veže upload slike uz `isBefore`/`isAfter` flagove.
- Završeni servis se sinhronizuje u mjesečni `IncomeBook` preko `IncomeBookEntry` (unique `(bookId,dailyLogEntryId)`); debt payment se knjiži odvojenim `IncomeBookManualEntry` putem.
- `ClientDebt` vezuje klijenta, stilistu i izvorni reservation/daily-log/manual entry; zatvaranje duga kreira debt-payment zapis i KIF manual income.
- `ExpenseBook` sadrži expenses, kategorije, template fields, attachments i lock events. `IncomeBookManualEntry` ima before/after audit payload.
- DB iznosi su `Decimal`, a globalni interceptor serijalizuje ih u JSON number radi postojećih klientskih tipova; krajnje poslovne aritmetičke agregacije i concurrency i dalje treba testirati.

### Content, notification i release

- Public blog list/detail uvijek filtriraju objavljene postove; public slug response sanitizes HTML with the backend allowlist before `PublicBlogPost` inserts it, and create/update sanitize before persistence. Admin list/draft/comment-moderation reads su role-guarded; browser/runtime/deployment verification za SEC-08 još nije izvršena.
- Uploaded SVG brand logo više se ne ubacuje kao inline markup; web component koristi URL kao CSS mask image da sačuva monochrome `svgColor` bez `dangerouslySetInnerHTML`.
- Public review/galerija/before-after su odvojene API surface granice.
- App notification se čuva u DB, zatim emituje korisniku i opciono šalje Expo push/SMTP prema preferencama i sistemskom flagu. Kampanje se šalju sinhrono kroz recipient loop.
- APK release JSON daje `versionCode`, `minSupportedVersionCode`, `forceUpdate`, `apkUrl` i SHA-256; mobile downloader validira hash prije installer intent-a.

## 4. Web frontend

- Entry: `frontend/src/main.tsx` → `App.tsx` → `app/router.tsx` (`useRoutes`) → `public.routes.tsx`, `admin.routes.tsx`, stylist route grana.
- Global providers: i18next, TanStack Query, auth, Socket.IO, settings, toaster.
- Public shell obuhvata home, usluge, blog, galeriju, kontakt, booking, moje rezervacije, public reservation token view, profil i reviews.
- Admin shell obuhvata users, salon/settings/appearance/SEO, services, stylists, reservations/calendar, daily-log, finance, loyalty, analytics, blog, gallery, reviews, app releases, notifications i email settings.
- Stylist shell obuhvata inbox, workbook/daily-log, schedule/direct booking, debts, stats i profile.
- Axios client koristi `VITE_API_URL` ili same-origin. Vite dev proxy usmjerava `/api` i `/auth` na lokalni backend.
- Auth Zustand store čuva JWT u `localStorage`; global request interceptor dodaje Bearer header i na 401 odjavljuje. Mnoge stranice i dalje rade direktan Axios/useEffect pored QueryClient.
- Frontend locale resursi: BS i EN JSON. Audit je našao 182 BS leaf ključa bez EN ekvivalenta.

## 5. Mobile aplikacija

- `mobile/package.json` koristi `expo-router-entry-safe.js`, koji zatim učitava `expo-router/entry`; `<Stack>` je u `mobile/app/_layout.tsx`.
- File routes pod `mobile/app/`: auth, onboarding, client tabs (home/services/reservations/profile) i stylist tabs (inbox/daily-log/schedule/stats/profile). `_components/ReactNavScreenWrapper`/adapter održava stariji screen navigation API.
- Implementacije ekrana su pretežno u `mobile/src/screens/{client,stylist,auth}`; data stores su Zustand; HTTP preko Axios; token ide u `expo-secure-store`; Socket.IO client se reconnect-a sa trenutnim tokenom.
- Tema je `StyleSheet`-oriented (`mobile/src/theme/colors.ts`, `ThemeContext.tsx`), NativeWind je prisutan, ali nije dominantan. Mobile i18n ima samo BS resurs.
- Android release updater provjerava dostupnost i SHA-256; API/socket/upload fallback URL je `http://localhost:3000`, što traži eksplicitan `EXPO_PUBLIC_API_URL` na emulatoru/fizičkom uređaju.

## 6. Baza, fajlovi i deployment

- Prisma datasource provider: PostgreSQL. Aktivne migracije: `20260822100257_postgresql_baseline` i `20260915085100_blog_post_seo`; Prisma config učitava `DATABASE_URL`.
- Uploads se čuvaju pod `UPLOAD_ROOT` (backend Docker default `/usr/app/uploads`) i root se statički izlaže pod `/uploads/`. Root `docker-compose.yml` montira shared host folder `/mnt/shared-app-files/beauty-salon-v2`.
- Root Compose ima `frontend` i `backend`; PostgreSQL se očekuje vanjski preko external `db_net`. Compose nema Redis/DB service, healthcheck ili migration job; backend Docker `CMD` izvršava `prisma migrate deploy` pri startu.
- `mobile/Dockerfile` je placeholder, ne produkcijski native build process. GitHub Actions workflow prije ovog audit-a nije postojao; ovaj branch dodaje samo checks workflow, bez deploy/merge koraka.
- Redis usage/package/socket adapter/BullMQ/distributed lock nisu pronađeni. Redis je moguća opcija samo kad se definišu deployment ACL, idempotency i operativne zahtjeve.

## 7. Build, test i granice provjere

- `npm ci` je prošao za sve tri aplikacije; frontend reinstall in this continuation reported 16 npm audit advisories.
- Frontend `npm run build` passes (4,811 modules; 1,999.52 kB JS chunk warning).
- Mobile `npx tsc --noEmit` passes (previous audit phase).
- SEC-08 backend sanitizer Node tests pass 2/2 (`npm run test:blog-sanitizer`); targeted `blog.service.spec.ts` passes 8/8; an isolated TypeScript check of the sanitizer utility passes.
- Backend `npm run build` currently fails with 650 diagnostics because generated Prisma Client/delegates are absent; sandbox TLS blocked Prisma engine download. Do not read this as a sanitizer-specific type/build failure; the utility's isolated TypeScript check passes.
- Backend has 53 Jest suite files; full DB-backed/build/generate/validate baseline remains blocked by missing generated Prisma Client.
- Frontend/mobile have no established test suite; frontend/mobile `lint` scripts have no ESLint dependency/config; backend `lint` was previously reporting missing-client diagnostics.
- An in-process Nest HTTP contract test (real routing/JWT/role guards, mocked services) passes 3 tests for SEC-01/SEC-07. No DB-backed/live/deployed HTTP test, browser payload/axe/manual keyboard audit, DB race test, real SMTP/FCM test or production deployment was executed.

## 8. Dokumenti koji su ranije bili u konfliktu

Kod je izvor istine za trenutno ponašanje. Root `SOURCE_OF_TRUTH.md`, codebase maps, `backend/POSTGRES_MIGRATION.md` i presentation docs imali su zastarjele stack/workflow tvrdnje. Ovaj branch ažurira te dokumente; tačne prvobitne nesuglasice i repo dokazi su tabelirani u [FINDINGS.md](FINDINGS.md). To ne pretvara static review u runtime/production verification.
