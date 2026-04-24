---
name: stylist-workbook-frontend
overview: "Implement a Stylist-only “Workbook” area on the web that mirrors the mobile Daily Log flow: list (bucketed), create manual entry with loyalty, entry detail with before/after uploads, complete-entry behavior, and optional reschedule preview/commit for linked reservations."
todos:
  - id: routing-guard
    content: Add `/stylist/*` routes + `StylistRoute` and update post-login redirect for STYLIST users.
    status: completed
  - id: stylist-profile-hook
    content: Implement `GET /api/stylists/me` fetch + shared hook to obtain `stylistProfileId` for the module.
    status: completed
  - id: workbook-list
    content: Implement workbook list page with mobile-equivalent date window, bucketing, sorting, and badges.
    status: completed
  - id: workbook-create
    content: Implement create page with service/client pickers, loyalty fetch + discount math, and POST create -> navigate to detail.
    status: completed
  - id: workbook-detail
    content: Implement detail page with GET entry, before/after uploads via `/api/uploads` + attach image endpoint, and complete action with optional reschedule prompt.
    status: completed
  - id: reschedule-preview
    content: Implement reschedule preview/commit page matching mobile modes, includeBreaks toggle, propose refresh, and commit confirmation flow.
    status: completed
  - id: polish-i18n
    content: Ensure labels/messages are consistent with mobile (BS) and hook into i18n keys where we already have them.
    status: completed
isProject: false
---

# Stylist Workbook Frontend Implementation

## Goal
Deliver a **stylist-facing** web module under `/stylist/workbook` that matches the mobile “Daily Log” UX/logic exactly (list bucketing, create flow, detail actions, before/after images, completion + optional reschedule preview).

## Key references (existing behavior)
- Mobile list/new/detail: `mobile/src/screens/stylist/DailyLogListScreen.tsx`, `mobile/src/screens/stylist/DailyLogNewEntryScreen.tsx`, `mobile/src/screens/stylist/DailyLogDetailScreen.tsx`
- Mobile reschedule preview: `mobile/src/screens/stylist/ReschedulePreviewScreen.tsx`
- Backend workbook APIs: `backend/src/daily-log/daily-log.controller.ts`, `backend/src/daily-log/daily-log.service.ts`
- Backend reschedule preview/commit: `backend/src/reservations/reservations.controller.ts` (`POST /api/reservations/:id/reschedule/propose|commit`)
- Frontend stack & patterns: `frontend/src/app/router.tsx`, `frontend/src/api/client.ts`, shadcn-style UI (`frontend/src/components/ui/*`)

## Routing & access control
- Add a new route group:
  - `/stylist` layout shell (simple header + nav)
  - `/stylist/workbook` list
  - `/stylist/workbook/new` create
  - `/stylist/workbook/:entryId` detail
  - `/stylist/workbook/reschedule-preview/:reservationId` preview/commit
- Add a role guard component `StylistRoute`:
  - Requires auth token + `user.roles` contains `STYLIST` (admins can be allowed optionally; default: stylist only)
  - Mirrors `ProtectedRoute` structure but with role check
- Update post-login redirect so stylists land in workbook:
  - Extend `getPostAuthRedirectPath` in `frontend/src/utils/clientOnboarding.ts` to route `STYLIST` → `/stylist/workbook`

## Data & API mapping (web parity with mobile)
- **Resolve stylistProfileId**
  - `GET /api/stylists/me` to get current stylist profile id (mobile uses a `useStylistProfile` hook)
- **List entries (same time window as mobile)**
  - `GET /api/daily-log` with params:
    - `stylistProfileId`, `fromDate` (today - 1 month), `toDate` (today + 7 days)
  - Bucket into sections: Today / This week / Last week / Other (same date-fns logic as mobile)
  - Show badges:
    - Status: `PENDING` vs `COMPLETED`
    - `B/A` when there’s at least one before and one after image
- **Create manual entry (same as mobile)**
  - Load options:
    - `GET /api/services?activeOnly=true`
    - `GET /api/users/for-daily-log`
  - Loyalty info:
    - `GET /api/loyalty/stylist/client/:clientId?serviceId=...`
  - Submit:
    - `POST /api/daily-log` with `{ stylistProfileId, serviceId, clientId, date(YYYY-MM-DD), actualPrice, tipAmount, notes?, isManual:true, desiredLoyaltyPercent? }`
  - Paid logic (same as mobile):
    - Base price from service
    - Apply desired loyalty percent (clamped by `loyaltyInfo.service.maxDiscountPercent`)
    - Charge amount = base - discount
    - paidAmount must be >= charge; tip = paid - charge
- **Entry detail (same as mobile)**
  - `GET /api/daily-log/:id`
  - Add before/after images:
    - Upload: `POST /api/uploads` multipart `{ file, entity:'daily-log' }`
    - Attach: `POST /api/daily-log/:id/images` `{ uploadId, isBefore, isAfter }`
    - Render thumbnails using `frontend/src/utils/uploadUrl.ts`
  - Complete:
    - `POST /api/daily-log/:id/complete`
    - If entry has `reservationId`, immediately call propose:
      - `POST /api/reservations/:reservationId/reschedule/propose` with `{ includeBreaks:false, mode:'actual_overrun' }`
      - If `delayMinutes > 0` and `items.length > 0`, show prompt to navigate to preview with includeBreaks choice
      - If `delayMinutes > 0` and `items.length === 0`, show informative dialog (matches mobile)

## Reschedule preview page (web version of mobile)
- Page `/stylist/workbook/reschedule-preview/:reservationId`
- UI parity with mobile:
  - mode switch: `actual_overrun | manual_minutes | use_break_only`
  - includeBreaks toggle
  - manualShiftMinutes input when `manual_minutes`
  - “Refresh preview” triggers propose
  - “Notify clients” confirms then calls commit:
    - `POST /api/reservations/:id/reschedule/commit` with the same body
  - Handle “no changes” state (and allow apply for `use_break_only`)

## Frontend module structure (suggested)
- Feature folder:
  - `frontend/src/features/stylist-workbook/`
    - `api/*.ts` (typed fetchers)
    - `hooks/*.ts` (TanStack Query: `useStylistProfileMe`, `useDailyLogList`, `useDailyLogEntry`, `useRescheduleProposal`)
    - `pages/*.tsx` (List, New, Detail, ReschedulePreview)
    - `types.ts` (shared TS types matching backend responses; align with mobile `DailyLogEntry`/proposal item shapes)
- Reuse existing shadcn components: `Button`, `Card`, `Badge`, `Dialog`, `Input`, `Textarea`.

## UX details to match mobile
- List sorting within buckets: pending first, then date desc (same comparator from mobile list)
- Copy text and button labels in Bosnian (consistent with the mobile strings); wire i18n keys where appropriate.
- Disable/guard actions when entry is `COMPLETED` (backend enforces; UI should match).

## Test plan (manual)
- Login as STYLIST → auto-redirect to `/stylist/workbook`
- List loads entries for last month → +7 days, correctly bucketed
- Create manual entry:
  - service/client search pickers work
  - loyalty percent clamps
  - paid amount validations match mobile
- Detail:
  - upload before + after, thumbnails render
  - complete entry updates status
  - if linked to reservation, reschedule prompt triggers preview and commit sends notifications
