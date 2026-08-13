# Plan: multi-booking — M2 + unique servis/dan

**Datum:** 2026-08-13  
**ID:** `multi-booking` (POLICY_BACKLOG #3)  
**Odluka (Ask):** M2 — neograničen broj rezervacija isti dan, uz overlap vremena i unique `serviceId` po danu. Više servisa u **jednoj** rezervaciji ostaje.

## Pravilo

- **Overlap:** `start < other.end && end > other.start`. Statusi: `PENDING` … `IN_PROGRESS`. Pauza između klijentovih termina nije obavezna.
- **Isti servis:** presjek `serviceId` iz `ReservationServiceItem` (fallback `Reservation.serviceId`). Statusi: živi + `AWAITING_DAILY_LOG` + `COMPLETED`. Cancel / `NO_SHOW` ne broje se.
- Isto za klijentski create, admin STANDARD, staff direct.
- Isti assert na PATCH, reorder request, accept reschedule, overrun commit, disposition reorder.

Nema novog settinga, nema Prisma migracije.

## Faze

1. Shared helper + constants
2. Create + direct-create (ukloniti 1/dan)
3. Move putanje + testovi + docs

Checklist: [CHECKLIST.md](./CHECKLIST.md)

## Out of scope

- Availability / date-picker filtriranje već bookanih servisa
- Slot-hold, attendance-policy, disposition UX/notify/reminder
- M1 max N setting
