# Rezervacije — policy backlog (jedna tačka po sesiji)

**Datum:** 2026-08-13
**Svrha:** Prioritetne tačke za diskusiju → plan → implementaciju, bez miješanja više tema u istom chatu.
**AS-IS kontekst:** [RESERVATION_MODULE.md](./RESERVATION_MODULE.md) · [FINDINGS.md](./FINDINGS.md) · [../matrices/reservations/MATRIX.md](../matrices/reservations/MATRIX.md)

---

## Proces

1. **Diskusija (Ask)** — samo tačka sa statusom `discussing`.
2. **Plan mode** — plan u `.cursor/plans/<plan-slug>/` + link ovdje (`planned`). **Čeka odobrenje. Bez koda.**
3. **Implementacija (Agent)** — tek nakon odobrenog plana.
4. **Zatvaranje** — status `done` + datum + kratka napomena; matrice/CHANGELOG uz logičke promjene.

**Pravilo:** ostale tačke ostaju `queued` dok aktivna nema plan (ili nije zatvorena).
**Ne** raditi plan i kod u istom Agent runu.

### Statusi


| Status            | Značenje                           |
| ----------------- | ---------------------------------- |
| `next`            | Sljedeća za pokretanje             |
| `queued`          | Čeka red                           |
| `discussing`      | Aktivna Ask diskusija              |
| `planned`         | Plan snimljen; čeka implementaciju |
| `implementing`    | U toku                             |
| `done`            | Završeno                           |
| `wontfix-for-now` | Svjesno odgođeno                   |


---



## Redoslijed


| #   | ID                   | Tema                                                     | Status   |
| --- | -------------------- | -------------------------------------------------------- | -------- |
| 0   | `docs-sync`          | Docs sync (MODULE / matrix / FINDINGS / stylist matrix)  | `done`   |
| 1   | `slot-hold`          | Slot hold policy                                         | `done`   |
| 2   | `direct-disposition` | Direct disposition polish                                | `done`   |
| 3   | `multi-booking`      | Multi-booking / dan                                      | `done`   |
| 4   | `attendance-policy`  | Attendance default sati + staff confirm umjesto klijenta | `done`     |


---



## 0. Docs sync

- **ID:** `docs-sync`
- **Status:** `done`
- **Prioritet:** P0 (preduslov za čist review i planove)
- **Diskusija:** MODULE je bio AS-IS snapshot (11.08.). FINDINGS FIXED + direct/`AWAITING_DAILY_LOG` nisu vraćeni u MODULE. Sync = MODULE = trenutni kod SoT; FINDINGS = arhiva.
- **Otvorena pitanja:** —
- **Plan:** [.cursor/plans/docs-sync/](../../plans/docs-sync/00_overview.md)
- **Implementacija:** 2026-08-13 — `RESERVATION_MODULE.md` living SoT; FINDINGS archive; MOBILE AS-IS; stylist matrix + MATRIX attendance note; CHANGELOG entry.

---



## 1. Slot hold policy

- **ID:** `slot-hold`
- **Status:** `done`
- **Prioritet:** P0 (product)
- **Diskusija:** Kapacitet = broj stilista na slotu. Svaki PENDING/REVIEW troši 1. Lock je ekskluzivan (accept/unlock/reject). Inbox timeout 24h bez klijentske kazne. UI: held slot disabled + “može se uskoro osloboditi”.
- **AS-IS (prije ove tačke):** C2-B — samo CONFIRMED+ zauzimaju slot.
- **Plan:** [.cursor/plans/slot-hold/](../../plans/slot-hold/00_overview.md)
- **Implementacija:** 2026-08-13 — capacity hold, exclusive lock + unlock, inbox timeout, web/mobile UI.

---



## 2. Direct disposition polish

- **ID:** `direct-disposition`
- **Status:** `done`
- **Prioritet:** P1
- **Diskusija:** B — UX/copy + reminder, bez auto-timeouta. Calendar PATCH notify ulazi. `discard` nestaje iz UI (API alias ostaje). Klijent i dalje ne vidi `AWAITING_DAILY_LOG` na mobileu.
- **AS-IS:** CRON seed DK + `AWAITING_DAILY_LOG`; `dispose`: discard / cancel_as_stylist / cancel_as_client / no_show / reorder.
- **Otvorena pitanja:** —
- **Plan:** [.cursor/plans/direct-disposition/](../../plans/direct-disposition/00_overview.md)
- **Implementacija:** 2026-08-13 — copy/hijerarhija, web `targetDate`, `reservation_time_changed` (DK reorder + calendar PATCH), reminder 12h.

---



## 3. Multi-booking / dan

- **ID:** `multi-booking`
- **Status:** `done`
- **Prioritet:** P1
- **Diskusija:** M2 + unique `serviceId` po danu. Više rezervacija OK ako se vremena ne preklapaju i servisi se ne ponavljaju. Više servisa u **jednoj** rezervaciji ostaje. Isto za klijenta i staff direct. `AWAITING_DAILY_LOG` + `COMPLETED` broje se za unique servis (ne za overlap). Cancel / `NO_SHOW` ne broje se.
- **AS-IS (prije ove tačke):** Max jedna aktivna rezervacija po klijentu po danu (`PENDING`…`IN_PROGRESS`).
- **Kandidati:** M0 ostaje 1/dan · M1 max N (setting) · M2 bez vremenskog preklapanja (neograničen broj).
- **Otvorena pitanja:** —
- **Plan:** [.cursor/plans/multi-booking/](../../plans/multi-booking/00_overview.md)
- **Implementacija:** 2026-08-13 — `assertClientDayBookingAllowed`; create/direct/PATCH/reorder/reschedule/disposition.

---



## 4. Attendance policy

- **ID:** `attendance-policy`
- **Status:** `done`
- **Prioritet:** P1
- **Diskusija:** A3 — klijent do `T − N` (default 12h); staff (stilist + admin) do starta; CRON cancel na startu + kazna. Direct `STAFF_WAIVED` bez izmjene.
- **AS-IS (prije ove tačke):** Rok iz settings (`system_reservation_attendance_hours`, fallback 24h); `confirmAttendance` samo klijent; CRON na `T − N`.
- **Otvorena pitanja:** —
- **Plan:** [.cursor/plans/attendance-policy/](../../plans/attendance-policy/00_overview.md)
- **Implementacija:** 2026-08-13 — default 12; staff confirm; CRON na startu; `attendanceClientDeadlineAt`.

---



## Tech debt (van product reda)


| ID                   | Tema                                                       | Status                                                                          |
| -------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `repo-layer`         | Formalni Repository layer za reservations (FINDINGS T2/T4) | `wontfix-for-now` — split servisa + FSM/assert dovoljni; nije produkcijski blok |
| `status-prisma-enum` | Statusi kao Prisma enum umjesto string                     | `wontfix-for-now` — string + `assertReservationTransition` OK                   |


---



## Log


| Datum      | Šta                                                                                                                                 |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| 2026-08-13 | `attendance-policy` **done** — A3: klijent T−N (default 12), staff do starta, CRON na startu. Plan: `.cursor/plans/attendance-policy/`. |
| 2026-08-13 | `attendance-policy` **planned** — A3. Plan: `.cursor/plans/attendance-policy/`.                                                     |
| 2026-08-13 | `multi-booking` **done** — M2 + unique servis/dan. Plan: `.cursor/plans/multi-booking/`. Sljedeće: Ask `attendance-policy`.        |
| 2026-08-13 | `multi-booking` **planned** — M2 + unique servis/dan. Plan: `.cursor/plans/multi-booking/`.                                         |
| 2026-08-13 | Session HANDOFF: [HANDOFF_SESSION.md](./HANDOFF_SESSION.md). Sljedeće: Ask `multi-booking`.                                         |
| 2026-08-13 | `direct-disposition` **done** — plan `.cursor/plans/direct-disposition/`. Sljedeće: `multi-booking`.                                |
| 2026-08-13 | Session HANDOFF: [HANDOFF_SESSION.md](./HANDOFF_SESSION.md). Proces: Plan mode → odobrenje → Agent. Sljedeće: `direct-disposition`. |
| 2026-08-13 | `slot-hold` **done** — plan `.cursor/plans/slot-hold/`. Sljedeće: `direct-disposition`.                                             |
| 2026-08-13 | `docs-sync` **done** — MODULE = living SoT; plan `.cursor/plans/docs-sync/`. Sljedeće: `slot-hold`.                                 |
| 2026-08-13 | Kreiran backlog; redoslijed dogovoren (docs-sync → slot-hold → disposition → multi-booking → attendance).                           |
