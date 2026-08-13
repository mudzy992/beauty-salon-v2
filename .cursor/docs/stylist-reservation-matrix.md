# Stylist Reservation Matrix

## Scope

This document defines the stylist-side reservation matrix for overrun handling, recalculation, client reconfirmation, reorder requests, timeout behavior, penalties, and auto-start.

**Full FSM / policy / direct booking:** `.cursor/docs/matrices/reservations/MATRIX.md` and `.cursor/docs/reservations/RESERVATION_MODULE.md`.  
Direct `AWAITING_DAILY_LOG` + disposition is **not** an overrun flow — see MODULE §6.5.

## Reservation States

- `PENDING`
- `STYLIST_REVIEW`
- `CONFIRMED`
- `ATTENDANCE_CONFIRMED`
- `IN_PROGRESS`
- `AWAITING_DAILY_LOG` (direct staff only; after DK auto-seed — out of schedule / not slot-blocking)
- `COMPLETED`
- `CANCELLED_BY_CLIENT`
- `CANCELLED_BY_STYLISTS`
- `NO_SHOW`

## Overrun Decision Matrix

When a confirmed attendance reservation is late and stylist has not started it in time, stylist must choose one mode:

1. `actual_overrun`
   - Shift future same-day reservations by actual overrun.
   - Optional pause absorption (`includeBreaks`).

2. `manual_minutes`
   - Shift future same-day reservations by manually entered minutes.
   - Optional pause absorption (`includeBreaks`).

3. `use_break_only`
   - Do not shift future reservations.
   - Use shorter break after overrun reservation.

## Recalculation Rules

- Future reservations considered:
  - Same stylist
  - Same date
  - Status in `CONFIRMED`, `ATTENDANCE_CONFIRMED`
  - Start after current reservation
- Pause absorption:
  - If `includeBreaks=true`, delay is absorbed across future pauses up to configured pause capacity.
- Proposal payload includes old/new times and shift per item.

## Client Reconfirmation

After recalculation or reorder request, client gets push notification and must confirm.

### Dynamic Confirmation Deadline

For each pending proposal:

- `minutesUntilTerm = proposedStart - sentAt`
- `deadlineMinutes = min(30, floor(0.5 * minutesUntilTerm))`
- Lower bounded to 1 minute.

## Client Decision Outcomes

### Accept

- Reservation is updated to proposed start/end.
- `rescheduleStatus` becomes `ACCEPTED`.
- Proposed fields cleared.

### Decline (recalculation)

- Reservation is cancelled (`CANCELLED_BY_CLIENT`).
- No-show-like penalization is applied via cancellation counter.

### Decline (reorder request)

- Reservation remains active on original confirmed slot.
- `rescheduleStatus` becomes `DECLINED`.
- Proposed fields cleared.
- No penalty.

## Timeout Outcomes

Pending requests are periodically evaluated.

- If deadline expires with no response:
  - Recalculation request: auto-cancel + penalty.
  - Reorder request: decline request, keep original slot, no penalty.

## Reorder Rules

Stylist can propose moving a future reservation into a free slot if:

- Reservation belongs to confirmed stylist.
- Reservation status is `CONFIRMED` or `ATTENDANCE_CONFIRMED`.
- New slot duration equals original duration.
- New slot does not overlap with other active reservations for that stylist.

Client accepts/declines by push flow.

## Auto-Start

A periodic job auto-starts due reservations when:

- Start time is reached.
- Same stylist has no existing `IN_PROGRESS` reservation.
- Status is `ATTENDANCE_CONFIRMED` (standard), **or** `CONFIRMED` with `attendancePolicy=STAFF_WAIVED` (direct).

## Notifications

Notification kinds used:

- `reservation_reschedule`
- `reservation_reorder`
- `delay_warning`
- `stylist_reschedule_decision`

Client push navigation routes to reservations list with focused reservation.

## Stylist UI Guidance

- Reservation detail actions:
  - Start
  - Complete
  - No-show
  - Stylist cancel
  - Overrun handling modal
  - Reorder request modal
- Schedule list should display pending reconfirmation marker for `rescheduleStatus=PENDING`.

## Test Matrix

Minimum backend tests:

- Overrun propose in all modes.
- Commit recalculation emits pending proposals.
- Accept validates overlap and applies proposed times.
- Decline recalculation cancels reservation.
- Decline reorder keeps reservation.
- Timeout recalculation auto-cancels + penalty.
- Timeout reorder keeps reservation and clears pending proposal.
- Auto-start respects no-concurrent-in-progress guard.

## Rollback Notes

If rollback is needed:

1. Disable new stylist flows in mobile UI.
2. Keep existing accept/decline endpoints operational.
3. Temporarily disable timeout and auto-start scheduler calls.
4. Revert reorder endpoint exposure first if instability is detected.
