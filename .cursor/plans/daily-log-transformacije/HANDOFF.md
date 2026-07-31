# HANDOFF

## Done

- Schema: `deletedAt`, `deletedById`, `deleteReason`, `sourceEntryId` on DailyLogEntry; `dailyLogEntryId` on IncomeBookManualEntry.
- Public before/after: `DailyLogPublicService` with DB-level image filter + `random=1`.
- Admin: soft delete, restore, revert, full PATCH, image management on COMPLETED.
- Reversal: KIF + loyalty clamp + debts + reservation.
- Web DailyLog split under `frontend/src/features/daily-log/`.
- Mobile: PENDING edit via DailyLogNewEntry + delete on Detail.

## Verify locally

1. `cd backend && npx jest daily-log-public daily-log-admin --passWithNoTests`
2. Open `/` — "Urađeni radovi" only if COMPLETED entries have before+after.
3. Admin DailyLog: edit all fields, delete with reason, toggle "Prikaži obrisane", restore.
4. Mobile stylist: edit/delete PENDING only.

## Known follow-ups

- Historical DEBT_PAYMENT rows created before `sourceEntryId` lack reverse links.
- `DailyLog.tsx` / form fields still relatively large; further split if needed.
