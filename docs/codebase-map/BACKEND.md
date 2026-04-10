## Backend (NestJS + Prisma)

### Stack

- NestJS 11 (`backend/src/`)
- Prisma 7 (`backend/prisma/schema.prisma`) with `@prisma/adapter-mariadb`
- MySQL/MariaDB as DB
- Socket.IO via `@nestjs/websockets` + `@nestjs/platform-socket.io`

### Entrypoints

- `backend/src/main.ts`
  - global `ValidationPipe` (whitelist, forbidNonWhitelisted, transform)
  - global `HttpExceptionFilter`
  - serves uploads from `process.env.UPLOAD_ROOT || <repo>/uploads` at `/uploads/*`
  - enables CORS
- `backend/src/app.module.ts`
  - installs modules and global `JwtAuthGuard` via `APP_GUARD`

### Module map (high level)

`AppModule` imports:

- **Core**
  - `config/`: configuration
  - `prisma/`: Prisma client + DB access
  - `auth/`: JWT auth + register/login
  - `events/`: Socket.IO gateway + rooms/events
- **Domain**
  - `users/`
  - `salon/`
  - `services/`
  - `stylists/`
  - `settings/`
  - `reservations/`
  - `notifications/`
  - `daily-log/`
  - `finance/`
  - `blog/`
  - `gallery/`
  - `reviews/`
  - `analytics/`
  - `loyalty/`

The intent-level description of the modules & behaviors lives in `SOURCE_OF_TRUTH.md` (section “Trenutno stanje”).

### Database

- **Schema**: `backend/prisma/schema.prisma`
- **Scripts** (from `backend/package.json`)
  - `npm run db:migrate` → `prisma migrate deploy`
  - `npm run db:seed` → `prisma db seed` (seed entrypoint `prisma/seed.ts`)
  - `npm run db:init` → migrate + seed
  - `npm run db:studio` → Prisma Studio

### Realtime (Socket.IO)

As documented in `SOURCE_OF_TRUTH.md`:

- JWT-authenticated socket connection
- rooms like `user:{id}`, `admin`, `stylists`, `public`
- events for reservations/settings/salon/notifications/etc.

### Notifications

Authoritative implementation notes:

- `.cursor/docs/10_phase10_notifications.md`

### Business rules (authoritative)

- `.cursor/docs/05_matrice_i_poslovna_pravila.md`
# Backend Codebase Map

## Overview

- **App type**: NestJS (Express) monolith with feature modules and a global `JwtAuthGuard`
- **Runtime entrypoint**: `backend/src/main.ts`
- **Root module**: `backend/src/app.module.ts`
- **Database access**: Prisma Client with MariaDB adapter (`@prisma/adapter-mariadb`) via global `PrismaService` (`backend/src/prisma/prisma.service.ts`)
- **Database**: MySQL (Prisma schema in `backend/prisma/schema.prisma`, Prisma 7 config in `backend/prisma.config.ts`)
- **Auth**: JWT (Passport strategy `backend/src/auth/strategies/jwt.strategy.ts`), public endpoints marked with `@Public()` (`backend/src/common/decorators/public.decorator.ts`)
- **Uploads**: Local filesystem under `UPLOAD_ROOT` and exposed as static assets at `/uploads/*` (`backend/src/main.ts`, `backend/src/uploads/uploads.service.ts`)
- **Realtime**: Socket.IO gateway with JWT verification (`backend/src/events/events.gateway.ts`)

## Folder map

### Top-level backend

- `backend/src/main.ts`: creates Nest app, sets global filters/pipes, CORS, serves `UPLOAD_ROOT` at `/uploads/`, listens on `PORT`
- `backend/src/app.module.ts`: composes all feature modules and applies global guard
- `backend/src/prisma/`: DB client wiring
  - `prisma.module.ts`: `@Global()` Prisma provider
  - `prisma.service.ts`: PrismaClient with MariaDB adapter, requires `DATABASE_URL`
- `backend/prisma/`: schema + migrations + seed
  - `schema.prisma`: authoritative data model
  - `migrations/*/migration.sql`: Prisma migrations (MySQL)
  - `seed.ts`: seed script referenced from `backend/package.json` and `backend/prisma.config.ts`
- `backend/src/common/`: cross-cutting helpers
  - `filters/http-exception.filter.ts`: consistent JSON errors
  - `guards/jwt-auth.guard.ts`: global auth guard + `@Public()` escape hatch
  - `guards/roles.guard.ts` + `decorators/roles.decorator.ts`: role-based access
  - `decorators/current-user.decorator.ts`: typed `request.user` injection
  - `utils/*`: shared utilities (roles/date/pagination/parse/json)
- `backend/src/config/config.module.ts`: global env loader (`.env.local`, `.env`)

### Feature modules (module boundary = `*.module.ts`)

App composition in `backend/src/app.module.ts`:

- **Auth**: `backend/src/auth/`
  - Public routes under `auth/*` via `backend/src/auth/auth.controller.ts`
  - Uses Prisma `User/Role/UserRole`, bcrypt, email verification, and avatar upload via `UploadsService`
- **Users**: `backend/src/users/` (`UsersController`, `UsersService`)
- **Salon**: `backend/src/salon/` (salon settings, working hours, holidays)
- **Services**: `backend/src/services/` (service categories/subcategories/services)
- **Stylists**: `backend/src/stylists/` (stylist profiles, working hours, stylist-service mapping)
- **Reservations**: `backend/src/reservations/` (availability engine, stylist lock/accept/reject, reschedule/reorder)
- **Uploads**: `backend/src/uploads/` (multipart upload + sharp image derivatives + DB record)
- **Notifications**: `backend/src/notifications/` (push tokens, Expo push, SMTP email, in-app notifications)
- **Daily log**: `backend/src/daily-log/` (daily entries + images + income linkage)
- **Finance**: `backend/src/finance/` (income books, expense books, templates, categories, client debts, cron services)
- **Blog**: `backend/src/blog/` (posts, comments, slugs)
- **Gallery**: `backend/src/gallery/` (categories, images mapped to `Upload`)
- **Reviews**: `backend/src/reviews/` (service reviews)
- **Events**: `backend/src/events/` (Socket.IO gateway; exported as global module)
- **Analytics**: `backend/src/analytics/`
- **Settings**: `backend/src/settings/` (app settings registry + encryption)
- **Loyalty**: `backend/src/loyalty/` (accounts/transactions, reservation discount fields)

## Data model notes (Prisma)

Source of truth is `backend/prisma/schema.prisma`.

### Core identities & authorization

- `User`, `Role`, `UserRole`
  - Roles are strings like `SYSTEM_ADMIN | OWNER | STYLIST | CLIENT` (see `backend/prisma/schema.prisma`, `backend/src/common/utils/roles.ts`)
  - Email verification is code-based: `emailVerificationToken` + `emailVerificationExpiresAt` with `isEmailVerified`

### Reservation engine

- `Reservation` + `ReservationStylistResponse`
  - Reservation has lifecycle/status string fields (enforced in services; constants in `backend/src/reservations/constants`)
  - Stylist locking/accept/reject is modeled in `ReservationStylistResponse` with `lockedAt/lockExpiresAt/respondedAt`
  - Reschedule/reorder uses `rescheduleProposedStartTime/rescheduleProposedEndTime/rescheduleStatus`
- `SalonSettings`, `SalonWorkingHours`, `Holiday` influence availability and cancellation policy
- `ClientCancellationCount` enforces penalty windows

### Uploads as a shared primitive

- `Upload` stores **paths only**: `pathOriginal/pathThumb/pathSmall/pathMedium` (no blobs)
- Other domains reference `Upload`:
  - `DailyLogImage.uploadId`
  - `ExpenseAttachment.uploadId`
  - `GalleryImage.uploadId`

### Finance

- KUF: `ExpenseBook`, `Expense`, `ExpenseCategory`, template-driven `ExpenseCategoryTemplate/ExpenseTemplateField/ExpenseFieldValue`
- KIF: `IncomeBook`, `IncomeBookEntry`, `IncomeBookManualEntry`, audit `IncomeBookManualEntryAudit`
- `ClientDebt` can link to service/manualEntry/reservation (optional foreign keys)

### Notifications & messaging

- `Notification`, `NotificationPreference`, `PushToken`
  - Push uses Expo SDK; email uses SMTP + templates stored in `AppSetting`
- `AppSetting` is a key/value store (optionally encrypted)

## Key flows

### Boot / configuration

- **Startup**: `backend/src/main.ts`
  - Global `HttpExceptionFilter` → consistent `{ statusCode, message, error? }`
  - Global `ValidationPipe` with `whitelist`, `forbidNonWhitelisted`, `transform`
  - Static serving of uploads: `UPLOAD_ROOT` mounted at `/uploads/`
  - CORS enabled with `origin: true` and `credentials: true`
- **Env loading**: `backend/src/config/config.module.ts` loads `.env.local` then `.env`

### Auth (JWT) and route protection

- **Global auth**: `APP_GUARD` uses `JwtAuthGuard` (`backend/src/app.module.ts`, `backend/src/common/guards/jwt-auth.guard.ts`)
- **Public endpoints**: `@Public()` metadata (`backend/src/common/decorators/public.decorator.ts`)
- **JWT parsing/validation**: `JwtStrategy` reads bearer token and calls `AuthService.validateUser` (`backend/src/auth/strategies/jwt.strategy.ts`, `backend/src/auth/auth.service.ts`)
- **Role checks**: `RolesGuard` + `@Roles(...)` (`backend/src/common/guards/roles.guard.ts`)

Auth routes are under `auth/*` (`backend/src/auth/auth.controller.ts`):

- `POST auth/register` (public) supports optional multipart avatar → stored via `UploadsService.saveFile('avatars')`
- `POST auth/login` (public) returns `{ access_token, user }`
- `POST auth/change-password` (JWT required)
- `POST auth/send-verification-email` (JWT required)
- `POST auth/verify-email` (public) verifies the email code

### Uploads

- Controller: `backend/src/uploads/uploads.controller.ts` (`@Controller('api/uploads')`, JWT required)
  - `POST api/uploads` with multipart `file` and optional body `entity` → stored under `UPLOAD_ROOT/{entity}/{YYYY}/{MM}` (validated to `^[a-z0-9_-]+$`)
  - `DELETE api/uploads/by-path-original` deletes filesystem variants + DB record
- Service: `backend/src/uploads/uploads.service.ts`
  - Image derivatives generated with `sharp` for non-vector images: `thumb/small/medium` in WebP
  - Allowed docs: PDF/Word/Excel mime types

### Reservations (domain-heavy)

- Controller: `backend/src/reservations/reservations.controller.ts` under `api/reservations`
  - Client create/cancel/confirm attendance + availability endpoints
  - Admin-only endpoints protected by `@Roles('SYSTEM_ADMIN','OWNER')`
  - Stylist actions protected by `@Roles('STYLIST', ...)`: lock/accept/reject/start/complete/no-show
  - Reschedule/reorder flow has propose/commit + client accept/decline
- Service: `backend/src/reservations/reservations.service.ts`
  - Uses Prisma transactions for lock and accept flows
  - Emits Socket.IO events via `EventsGateway` and triggers notifications

### Notifications (push + email + in-app)

- Service: `backend/src/notifications/notifications.service.ts`
  - In-app notifications persisted in DB and emitted over Socket.IO
  - Push uses Expo tokens (`PushToken`) and optional `EXPO_ACCESS_TOKEN`
  - Email uses SMTP resolved from `AppSetting` first, env vars fallback (e.g. `SMTP_HOST`, `SMTP_FROM`)
  - Base app URL resolved from `AppSetting` (`system_public_app_url`) or env (`APP_PUBLIC_URL`, `FRONTEND_URL`)

### Realtime / websocket events

- Gateway: `backend/src/events/events.gateway.ts`
  - Accepts token via socket handshake auth or `Authorization` header
  - Joins rooms `admin`, `stylists`, and `user:{id}` based on JWT roles

### Settings + encryption

- Admin settings API: `backend/src/settings/settings.controller.ts` under `api/settings`
  - Protected by roles `SYSTEM_ADMIN|OWNER`
  - Public read endpoint: `GET api/settings/public` marked `@Public()`
- Encryption: `backend/src/settings/settings-encryption.service.ts`
  - Uses `APP_SETTINGS_ENCRYPTION_KEY` (base64 32 bytes) to encrypt certain setting values (`enc:v1:*`)

## API surface (controller prefixes)

Public:

- `/` and `/health`: `backend/src/app.controller.ts` (`@Public()`)
- `auth/*`: `backend/src/auth/auth.controller.ts` (`register`, `login`, `verify-email` are public)

Protected (JWT by default):

- `api/users`: `backend/src/users/users.controller.ts`
- `api/salon`: `backend/src/salon/salon.controller.ts`
- `api/services`: `backend/src/services/services.controller.ts`
- `api/stylists`: `backend/src/stylists/stylists.controller.ts`
- `api/reservations`: `backend/src/reservations/reservations.controller.ts`
- `api/uploads`: `backend/src/uploads/uploads.controller.ts`
- `api/notifications`: `backend/src/notifications/notifications.controller.ts`
- `api/daily-log`: `backend/src/daily-log/daily-log.controller.ts`
- `api/income-books`: `backend/src/finance/income.controller.ts`
- `api/expense-books`: `backend/src/finance/expense-books.controller.ts`
- `api/expense-categories`: `backend/src/finance/expense-categories.controller.ts`
- `api/expense-templates`: `backend/src/finance/expense-templates.controller.ts`
- `api/expenses`: `backend/src/finance/expenses.controller.ts`
- `api/client-debts`: `backend/src/finance/client-debts.controller.ts`
- `api/blog`: `backend/src/blog/blog.controller.ts`
- `api/gallery`: `backend/src/gallery/gallery.controller.ts`
- `api/reviews`: `backend/src/reviews/reviews.controller.ts`
- `api/settings`: `backend/src/settings/settings.controller.ts` (admin-only; has `api/settings/public`)
- `api/analytics`: `backend/src/analytics/analytics.controller.ts`
- `api/loyalty`: `backend/src/loyalty/loyalty.controller.ts`
- `api/loyalty/client`: `backend/src/loyalty/loyalty-client.controller.ts`
- `api/loyalty/stylist`: `backend/src/loyalty/loyalty-stylist.controller.ts`

## Risks / tech debt

- **Hardcoded DB URL in Docker image build/runtime**: `backend/Dockerfile` sets `ENV DATABASE_URL="mysql://mudzy:...@sql.ba101.top:3306/beauty-salon-v2"` as a placeholder for `prisma generate`. This risks leaking credentials and can confuse runtime configuration (even if overridden by compose).
- **Permissive CORS**:
  - HTTP: `origin: true` with `credentials: true` (`backend/src/main.ts`)
  - Websocket: `cors: { origin: '*', credentials: true }` (`backend/src/events/events.gateway.ts`)
- **Uploads surface area**:
  - `entity` affects filesystem path; it’s validated but still allows creating many folders (`backend/src/uploads/uploads.controller.ts`)
  - `deleteByPathOriginal` is available to any authenticated user (no ownership checks) (`backend/src/uploads/uploads.controller.ts`, `backend/src/uploads/uploads.service.ts`)
- **Mixed formatting conventions**: some files omit semicolons and use different lint style (e.g. `backend/src/uploads/uploads.repository.ts`, `backend/src/settings/settings-encryption.service.ts`)
- **Role strings are ad-hoc**: roles are plain strings in JWT payload and checks; central constants aren’t enforced at the type level (`backend/src/common/decorators/current-user.decorator.ts`, `backend/src/common/guards/roles.guard.ts`)
- **Env/config surface is split**: some settings come from env, others from DB-backed `AppSetting` (e.g. email config); this is flexible but increases debugging complexity (`backend/src/notifications/notifications.service.ts`, `backend/src/settings/*`)

## Suggested starting points

- **Boot & request lifecycle**: `backend/src/main.ts`, `backend/src/common/filters/http-exception.filter.ts`
- **Module graph**: `backend/src/app.module.ts`
- **Auth & guards**: `backend/src/auth/auth.module.ts`, `backend/src/auth/auth.controller.ts`, `backend/src/auth/auth.service.ts`, `backend/src/common/guards/jwt-auth.guard.ts`, `backend/src/common/guards/roles.guard.ts`
- **DB layer**: `backend/src/prisma/prisma.service.ts`, `backend/prisma/schema.prisma`, `backend/prisma.config.ts`
- **Core business domain**: `backend/src/reservations/reservations.service.ts`, `backend/src/reservations/availability.service.ts`
- **Uploads**: `backend/src/uploads/uploads.controller.ts`, `backend/src/uploads/uploads.service.ts`
- **Notifications + email/push**: `backend/src/notifications/notifications.service.ts`

