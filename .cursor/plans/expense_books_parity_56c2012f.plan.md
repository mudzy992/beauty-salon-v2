---
name: Expense books parity
overview: Implement for KUF (rashodi) the same month selection + past-book opening and lock/unlock workflow (with reason + audit trail) as already implemented for KIF (prihodi), and block creating books for future months.
todos:
  - id: backend-prisma-lock-events
    content: Add ExpenseBookLockEvent model + relations in backend/prisma/schema.prisma and generate migration
    status: completed
  - id: backend-expense-lock-unlock
    content: Add lock/unlock DTO, controller routes, and service methods with validations (including future-month block)
    status: completed
  - id: frontend-expense-parity
    content: Update ExpenseBooksTab to include year/month picker, openMonth, lock/unlock dialog, reloadSelectedBook, and navigation guard while unlocked
    status: completed
  - id: frontend-types
    content: Extend finance.types ExpenseBook to include lockEvents and align fields with backend responses
    status: completed
isProject: false
---

## Goal
- Make **Knjiga rashoda** behave like **Knjiga prihoda** regarding:
  - opening any **past/current month** via year/month picker
  - **lock/unlock** flow (unlock requires reason; both actions recorded)
  - UX guard: prevent navigating away while a book is **unlocked**
  - refresh/reload of selected book after actions

## What exists today (reference)
- Income flow is implemented in `[frontend/src/features/finance/tabs/income-books-tab.tsx](frontend/src/features/finance/tabs/income-books-tab.tsx)`:
  - `GET /api/income-books/month/:year/:month` for opening past months
  - `POST /api/income-books/:id/unlock` with `{ reason }`
  - `POST /api/income-books/:id/lock`
  - UI blocks leaving while unlocked via `beforeunload`
- Expense backend currently only supports `GET /api/expense-books/month/:year/:month` and `POST /api/expense-books/:id/close` in `[backend/src/finance/expense-books.controller.ts](backend/src/finance/expense-books.controller.ts)`

## Backend changes (to support identical behavior)
- **Add lock/unlock endpoints for expense books**
  - Update `[backend/src/finance/expense-books.controller.ts](backend/src/finance/expense-books.controller.ts)`:
    - `POST :id/unlock` (body DTO with `reason`)
    - `POST :id/lock` (no body)
  - Add DTO `[backend/src/finance/dto/unlock-expense-book.dto.ts](backend/src/finance/dto/unlock-expense-book.dto.ts)` mirroring `UnlockIncomeBookDto`.
- **Implement service methods + validations** in `[backend/src/finance/expense-books.service.ts](backend/src/finance/expense-books.service.ts)`:
  - `getOrCreateForMonth(year, month)` should validate inputs and **reject future months** (same rules as `IncomeBooksService.getOrCreateForMonth`).
  - `unlockBook(id, reason, userId)`:
    - require non-empty reason
    - require book is currently locked (`isClosed === true`)
    - allow only for **past months** (same definition as income)
    - set `isClosed=false`, `closedAt=null`
    - write a lock event with action `UNLOCK`
  - `lockBook(id, userId)`:
    - require book unlocked (`isClosed === false`)
    - set `isClosed=true`, `closedAt=now`
    - write a lock event with action `LOCK`
- **Persist lock/unlock evidence** in Prisma
  - Update `[backend/prisma/schema.prisma](backend/prisma/schema.prisma)`:
    - add model `ExpenseBookLockEvent` analogous to `IncomeBookLockEvent`
    - add relation `ExpenseBook.lockEvents` and `User.expenseBookLockEvents` (similar pattern as income)
  - Create migration and regenerate Prisma client.

## Frontend changes (Finance page / expense tab)
- **Add year/month picker + open month** to `[frontend/src/features/finance/tabs/expense-books-tab.tsx](frontend/src/features/finance/tabs/expense-books-tab.tsx)`
  - mirror income tab state: `targetYear`, `targetMonth`, `yearOptions`, and `openMonth(year, month)` that calls `GET /api/expense-books/month/:year/:month`.
  - keep existing “Otvori tekući mjesec”, but implement it via `openMonth(currentYear, currentMonth)` for consistency.
- **Replace close-only UX with lock/unlock parity**
  - rename UI actions from “Zatvori” to “Zaključi”, and add “Otključaj” dialog requiring reason.
  - when book is unlocked, prevent leaving list view the same way income does:
    - block back button to list and show warning
    - add `beforeunload` handler while unlocked
  - update load/reload patterns:
    - add `reloadSelectedBook()` (GET `/api/expense-books/:id`)
    - after create/delete expense, lock/unlock, always reload selected book and list.
- **Update types** in `[frontend/src/features/finance/finance.types.ts](frontend/src/features/finance/finance.types.ts)`:
  - extend `ExpenseBook` to include `lockEvents?: { id; action; reason; createdAt; createdBy? }[]` and make sure fields align with backend responses (`isClosed`, `closedAt`, etc.)

## API contract (post-change)
- `GET /api/expense-books` list
- `GET /api/expense-books/month/:year/:month` (rejects future months)
- `GET /api/expense-books/:id`
- `POST /api/expense-books/:id/lock`
- `POST /api/expense-books/:id/unlock` with `{ reason }`

## Test plan
- Open Finance → “Knjiga rashoda”
- Use year/month picker to open a past month; verify it opens/creates and shows correct label.
- Lock a book; verify status changes to “Zaključana” and actions disable.
- Unlock a **past** locked book; reason required; verify it becomes unlocked and user cannot leave until re-locked.
- Try to open a future month; expect API error toast and no book creation.
