# Plan: docs-sync — RESERVATION_MODULE → current SoT

**Datum:** 2026-08-13  
**ID:** `docs-sync` (POLICY_BACKLOG #0)  
**Scope:** Dokumentacija only — bez product/kod promjena.

## Cilj

`RESERVATION_MODULE.md` = source of truth za **trenutni kod** (poslije FINDINGS FIXED + direct / `AWAITING_DAILY_LOG`).

## Hijerarhija nakon synca

| Dokument | Uloga |
|----------|-------|
| `RESERVATION_MODULE.md` | Living AS-IS (glavni narativ) |
| `matrices/reservations/MATRIX.md` | Sažeta FSM / policy matrica |
| `FINDINGS.md` | Arhiva review-a (zatvoren) |
| `HANDOFF.md` | Snapshot direct+disposition (link iz MODULE) |
| `POLICY_BACKLOG.md` | Aktivni product backlog |

## Checklist

Vidi [CHECKLIST.md](./CHECKLIST.md).

## Out of scope

- Slot hold, multi-booking, attendance product, disposition polish
- Rules/skill (`reservation-engine.mdc`) — nije u ovom planu
- Repository layer / Prisma enum
