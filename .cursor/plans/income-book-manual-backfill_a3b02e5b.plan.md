---
name: income-book-manual-backfill
overview: Enable admins to create and edit past income books with manual service-based entries, controlled unlock/lock workflow, and full audit logging shown in Admin UI; prevent leaving an unlocked book without re-locking.
todos:
  - id: audit-existing-income-flow
    content: Confirm current KIF pipeline (daily log → income book) and where totals are recalculated; identify touch points in `backend/src/finance/*` and `backend/src/daily-log/*`.
    status: completed
  - id: prisma-add-manual-and-audit-models
    content: Extend `backend/prisma/schema.prisma` with manual income entry model + lock/audit log models; run Prisma migration & generate.
    status: completed
  - id: backend-income-lock-unlock
    content: Implement lock/unlock endpoints in `IncomeBooksService` + `IncomeController`, including reason-required unlock and past-month validation.
    status: completed
  - id: backend-manual-entry-crud
    content: Implement manual entry CRUD endpoints with guards (must be unlocked) + totals recalculation + audit logging.
    status: completed
  - id: backend-tests
    content: Add/extend Jest unit tests for unlock/lock, manual entry CRUD, and audit rows/totals behavior.
    status: completed
  - id: frontend-income-month-picker
    content: Add month/year selection to open/create specific income book month in `frontend/src/pages/Finance.tsx`.
    status: completed
  - id: frontend-unlock-lock-workflow
    content: Add unlock modal (reason required), lock button, and UI state rendering for locked/unlocked books.
    status: completed
  - id: frontend-manual-entries-ui
    content: Add manual entries table + create/edit/delete modals wired to backend endpoints.
    status: completed
  - id: frontend-audit-log-ui
    content: Render lock/unlock events and manual entry change logs in book detail view.
    status: completed
  - id: frontend-exit-guard
    content: Prevent leaving book detail view while unlocked (block back button + add beforeunload warning).
    status: completed
isProject: false
---

# Manual income books backfill + audit logs

## Current state (audit)

- **Income book storage**: `IncomeBook` is monthly (`@@unique([year, month])`) with `openedAt`, `closedAt`, `totalRevenue`, `totalTips`. Entries are `IncomeBookEntry` and are **hard-linked** to `DailyLogEntry` (`dailyLogEntryId` required). See `backend/prisma/schema.prisma`.
- **Auto open/close**: `IncomeCronService` runs **1st day 00:05** and calls `IncomeBooksService.openNewMonthAndClosePrevious()` which sets `closedAt` on previous month and creates current month if missing.
- **How entries are added**: `DailyLogService.complete()` calls `incomeBooks.addEntryFromDailyLog(id)`; `IncomeBooksService.addEntryFromDailyLog()` pulls the `DailyLogEntry` and inserts `IncomeBookEntry`.
- **Constraint**: Completed `DailyLogEntry` cannot be updated (`DailyLogService.update()` throws if `status === 'COMPLETED'`). That makes “unlock past book and edit entries” impossible without new domain/API.

## Target behavior

- Admin can **create/select an income book in the past** and **fill it with manual entries** (service-based).
- If a past book is “locked” (closed), admin can **unlock it** only by providing a **reason**; system records unlock + all subsequent edits; logs are visible in book details.
- While a book is unlocked, admin **cannot leave the book detail view without locking it**.

## Design choice (simplest + safe)

Implement **manual income entries directly on the book**, without reusing `DailyLogEntry`.

Why:

- Avoids changing invariants of `DailyLogEntry` (status COMPLETED immutability) and avoids side effects (loyalty earn/redeem, reservation coupling).
- Keeps existing “automatic” income pipeline intact (reservations → daily log → income book entries).

## Backend changes

### 1) Prisma schema: add manual entries + audit logs

Add new models (names can be adjusted to your naming conventions):

- `IncomeBookManualEntry`
  - `id`, `bookId`, `date` (db.Date), `serviceId` (FK), optional `stylistProfileId` (FK, if you want attribution), `amount`, `tipAmount`, `notes`, `createdById`, timestamps.
- `IncomeBookLockEvent`
  - `id`, `bookId`, `action` (LOCK|UNLOCK), `reason` (required for UNLOCK), `createdById`, `createdAt`.
- `IncomeBookManualEntryAudit`
  - `id`, `bookId`, `manualEntryId` (nullable for delete), `action` (CREATE|UPDATE|DELETE), `reason` (optional; required for UNLOCK already), `beforeJson`, `afterJson`, `createdById`, `createdAt`.

Also update `IncomeBook` query logic to calculate totals from:

- existing `IncomeBookEntry` sums (auto)
- plus `IncomeBookManualEntry` sums (manual)

### 2) Services

In `backend/src/finance/income-books.service.ts`:

- Add `getOrCreateForMonth(year, month)` remains, but extend `findOne()` to include manual entries + lock events + audit logs.
- Add `unlockBook(bookId, { reason }, user)` and `lockBook(bookId, user)`:
  - Only allow for roles `SYSTEM_ADMIN`/`OWNER`.
  - Only allow unlock for **past months** (
    - derive by comparing `(year, month)` to current month
    ).
  - Persist `IncomeBookLockEvent`.
  - Define “locked” as `closedAt != null` for backward compatibility; `unlock` sets `closedAt = null`, `lock` sets `closedAt = now`.
  - Optional: prevent unlock if already unlocked.
- Add CRUD for manual entries:
  - `createManualEntry(bookId, dto, user)`
  - `updateManualEntry(bookId, entryId, dto, user)`
  - `deleteManualEntry(bookId, entryId, user)`
  - Guard: **only allowed when book is unlocked**.
  - Each mutation writes a row to `IncomeBookManualEntryAudit` with before/after snapshots.
  - Recalculate totals after each mutation.

### 3) Controllers / routes

In `backend/src/finance/income.controller.ts` extend with:

- `POST /api/income-books/:id/unlock` (body: `{ reason: string }`)
- `POST /api/income-books/:id/lock`
- `POST /api/income-books/:id/manual-entries`
- `PATCH /api/income-books/:id/manual-entries/:entryId`
- `DELETE /api/income-books/:id/manual-entries/:entryId`

DTOs under `backend/src/finance/dto/` with `class-validator`.

### 4) Tests

Add/update unit tests:

- `backend/src/finance/income-books.service.spec.ts`
  - unlock requires reason, only past months, writes lock event
  - manual entry mutation requires unlocked state
  - audit rows created with correct action and before/after
  - totals updated correctly

## Frontend changes (Admin UI)

In `frontend/src/pages/Finance.tsx` (IncomeBooksTab):

- Add “Open/create for selected month” UI:
  - Month picker (year+month) allowing past months.
  - Button “Otvori knjigu” that calls `GET /api/income-books/month/:year/:month`.
- Add lock state handling inside the **book detail** view:
  - Show `Badge`: Locked/Unlocked.
  - If locked (has `closedAt`), show button **“Otključaj”** → modal with required **reason**.
  - If unlocked (closedAt null), show button **“Zaključi”**.
- Manual entries section (only when unlocked):
  - Table listing manual entries (service, date, amount, tip, notes)
  - Add/Edit/Delete forms (Chakra modal) hitting new endpoints.
- Audit log section (always visible in book detail):
  - Show combined timeline:
    - lock/unlock events
    - manual entry audits (create/update/delete with before/after diff summary)
- “Cannot leave unlocked book” enforcement:
  - Replace the existing “Nazad na listu” action with logic:
    - if book unlocked → block and show toast prompting to lock
    - also add `beforeunload` warning to prevent accidental tab close
  - If you later split finance into proper routes, use React Router navigation blocking as well.

## Data & security considerations

- Keep all routes behind existing `@Roles('SYSTEM_ADMIN','OWNER')` (already used in `IncomeController`).
- Validate amounts, date within book month (manual entry date must fall inside that month).
- Store reasons and audit JSON safely; avoid storing secrets.

## Migration / rollout

- Create Prisma migration in `backend/prisma/migrations/`*.
- Deploy backend first; then frontend.
- Optional: add backfill script to compute totals from both sources for all books.
