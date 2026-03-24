# Stylist Matrix E2E Runbook

## Purpose

End-to-end validation checklist for the full stylist matrix:

- overrun handling
- recalculation modes
- client reconfirmation
- timeout auto-cancel and penalties
- reorder offer flow
- auto-start behavior
- schedule/status visibility

Use this runbook before production rollout and after each significant change.

## Test Environment

- **Backend** running with scheduler enabled.
- **Mobile stylist app** logged in as stylist user.
- **Mobile client app** logged in as one or more client users.
- Push notifications enabled on client device(s).
- Seed data includes:
  - salon settings with pause configured
  - at least one stylist offering multiple services
  - clients with clean penalty state

## Required Baseline Data

Prepare one test day with at least these reservations for the same stylist:

1. Reservation A
   - `ATTENDANCE_CONFIRMED`
   - starts at `11:00`
   - duration `5 min`
2. Reservation B
   - `ATTENDANCE_CONFIRMED`
   - starts at `11:15`
   - duration `30 min`
3. Reservation C
   - `ATTENDANCE_CONFIRMED`
   - starts at `12:00`
   - duration `30 min`

Pause between services in salon settings: `10 min`.

## Global Verification Rules

For each scenario validate all of:

- backend status/state transition
- stylist UI action visibility and messages
- client UI state and push behavior
- notifications created in DB
- no schedule overlaps after mutation

## Scenario Group A: Start/Overdue Guard

### A1 - Normal Start (on time)

- Preconditions:
  - Reservation A is `ATTENDANCE_CONFIRMED`, current time before end.
- Steps:
  - Stylist opens reservation detail.
  - Clicks **Start**.
- Expected:
  - Status becomes `IN_PROGRESS`.
  - Started timestamp populated.
  - No overrun modal shown.

### A2 - Overdue Start Blocked

- Preconditions:
  - Reservation is still `ATTENDANCE_CONFIRMED`.
  - Current time is after planned end (e.g. start 11:30, now 12:15).
- Steps:
  - Stylist tries to start from detail.
- Expected:
  - Start is blocked.
  - Overrun handling path is offered (modal/actions).
  - No silent transition to `IN_PROGRESS`.

## Scenario Group B: Overrun Decision Modes

### B1 - Mode `actual_overrun`

- Preconditions:
  - Running reservation is late by real elapsed amount.
- Steps:
  - Open overrun modal.
  - Select **actual overrun**.
  - Commit recalculation.
- Expected:
  - Future reservations get pending proposals (`rescheduleStatus=PENDING`).
  - Proposed start/end are populated.
  - Client receives push with reconfirmation deadline.

### B2 - Mode `manual_minutes`

- Preconditions:
  - Same as B1.
- Steps:
  - Select **manual minutes**.
  - Enter fixed minutes (e.g. 8).
  - Commit recalculation.
- Expected:
  - Proposal shift equals manual input (adjusted by pause absorption if enabled).
  - Push body reflects shift and reconfirmation requirement.

### B3 - Mode `use_break_only`

- Preconditions:
  - Same as B1.
- Steps:
  - Select **use break only**.
  - Apply.
- Expected:
  - No pending proposals created.
  - Future reservation times unchanged.
  - Break usage decision stored.

## Scenario Group C: Pause Absorption

### C1 - Include Breaks OFF

- Steps:
  - Generate proposal with `includeBreaks=false`.
- Expected:
  - Shift is full overrun/manual amount.

### C2 - Include Breaks ON

- Steps:
  - Generate proposal with `includeBreaks=true`.
- Expected:
  - Shift reduced by absorbable pause budget.
  - Reduced break minutes visible in proposal item details.

## Scenario Group D: Client Reconfirmation

### D1 - Client Accepts Recalculated Term

- Steps:
  - Client opens reservation from push/list.
  - Clicks **Accept**.
- Expected:
  - Reservation start/end become proposed values.
  - `rescheduleStatus=ACCEPTED`.
  - Proposed fields cleared.
  - Stylist receives decision notification.

### D2 - Client Declines Recalculated Term

- Steps:
  - Client clicks **Decline** for recalculation proposal.
- Expected:
  - Reservation becomes `CANCELLED_BY_CLIENT`.
  - Cancel reason reflects decline.
  - Penalty path applies per policy.
  - Stylist is notified.

### D3 - Client Does Not Respond Until Deadline

- Preconditions:
  - Proposal is pending.
  - Wait past computed deadline or set test clock.
- Expected:
  - Recalculation proposal auto-cancels reservation.
  - Penalty increment is applied.
  - Stylist notified of timeout cancellation.

## Scenario Group E: Dynamic Deadline Formula

Validate formula:

- `deadline = min(30, floor(0.5 * minutesUntilTerm))`

### E1 - Near Term

- Proposed term in 20 min.
- Expected deadline: 10 min.

### E2 - Far Term

- Proposed term in 120 min.
- Expected deadline capped at 30 min.

### E3 - Very Short Window

- Proposed term in 1-2 min.
- Expected deadline minimum bounded (>0), no zero/negative window.

## Scenario Group F: Reorder Flow

### F1 - Valid Reorder Offer

- Preconditions:
  - Future confirmed reservation exists.
  - Free slot with same duration exists.
- Steps:
  - Stylist sends reorder request with target slot.
- Expected:
  - Reservation gets pending proposal.
  - Client receives reorder push.
  - No overlap created.

### F2 - Client Accepts Reorder

- Expected:
  - Reservation moves to target slot.
  - Old slot becomes available.
  - `rescheduleStatus=ACCEPTED`.

### F3 - Client Declines Reorder

- Expected:
  - Original slot remains active.
  - Proposal fields cleared.
  - No penalty.

### F4 - Reorder Timeout

- Expected:
  - Proposal expires to declined state.
  - Original slot remains.
  - No penalty.

### F5 - Invalid Reorder Duration

- Steps:
  - Stylist tries target slot with different duration.
- Expected:
  - Request rejected with validation error.

### F6 - Reorder Conflict

- Steps:
  - Stylist proposes slot overlapping active reservation.
- Expected:
  - Request rejected as occupied.

## Scenario Group G: Auto-Start

### G1 - Auto-start triggers for due attendance-confirmed reservation

- Preconditions:
  - Reservation due now.
  - No other `IN_PROGRESS` for same stylist.
- Expected:
  - Status auto changes to `IN_PROGRESS`.
  - `startedAt` populated.

### G2 - Auto-start does not trigger when another is already in progress

- Preconditions:
  - Another reservation is `IN_PROGRESS` for same stylist.
- Expected:
  - Due reservation remains unchanged.

## Scenario Group H: UI Visibility and Status Labels

### H1 - Stylist Detail Action Guarding

- Verify action buttons match state:
  - start only when allowed
  - complete only in progress
  - cancel/no-show only in allowed statuses
  - overrun options shown when overdue

### H2 - Stylist Schedule Status Markers

- Verify pending reconfirmation indicator appears when `rescheduleStatus=PENDING`.
- Verify cancelled/declined outcomes are reflected after refresh.

### H3 - Client Reservation List Actions

- For pending proposals:
  - Accept button active
  - Decline flow message matches recalculation vs reorder behavior

## Scenario Group I: Notification Routing

### I1 - Push Tap Routing

- Push `reservation_reschedule` opens reservations list focused on target reservation.
- Push `reservation_reorder` behaves identically.
- Push `delay_warning` routes to reservation context.

### I2 - Notification Persistence

- Notification rows are saved with expected type and data payload.
- Read/unread behavior remains functional.

## Scenario Group J: Regression Safety

### J1 - Existing reservation flow unaffected

- Create reservation
- stylist lock/accept
- client attendance confirm
- start
- complete/no-show/cancel paths
- Ensure no unintended blocks.

### J2 - Availability engine

- Ensure slots update after:
  - accept reschedule
  - decline recalculation
  - accept reorder
  - timeout outcomes

## Evidence Checklist (for sign-off)

Collect and attach:

- Screenshots/video for each scenario group.
- API response payload samples for critical transitions.
- DB snapshots for at least:
  - pending proposal
  - accepted proposal
  - declined recalculation
  - declined reorder
  - timeout outcomes
- Test command outputs:
  - `npm test -- reservations.service.spec.ts`
  - `npm test -- availability.service.spec.ts`
  - `npm test -- daily-log.service.spec.ts`

## Go/No-Go Criteria

Go only if:

- all mandatory scenarios pass
- no unresolved overlaps or inconsistent statuses
- push routing works on real devices
- no regression in core reservation FSM
- product owner validates expected behavior in stylist and client apps
