---
name: manual-start-attendance-deadline-reorder
overview: Uklanjamo autostart i uvodimo obaveznu attendance potvrdu (deadline = reservationStartAt−24h), auto-otkaz + penal za nepotvrđene, te automatske reorder ponude za potvrđene klijente nakon što “rupe” nastanu.
todos:
  - id: remove-autostart
    content: Ukloniti autostart poziv iz `backend/src/reservations/reservation-delay.cron.ts` i prilagoditi testove ako postoje.
    status: completed
  - id: time-calculation-fix
    content: Prebaciti `confirmAttendance()` i `cancelByClient()` na računanje deadlina od `reservationStartAt = combine(reservationDate,startTime)` (24h attendance, cancellationDeadlineHours cancel).
    status: completed
  - id: attendance-enforcement-cron
    content: Implementirati `processAttendanceDeadlines()` + poziv u cron tick-u, uz penal i notifikacije/evente.
    status: completed
  - id: auto-reorder-generator
    content: "Implementirati konzervativni greedy reorder generator (fill gaps, bez kaskade), koji postavlja `rescheduleStatus=PENDING` i šalje `kind: reservation_reorder` notifikacije."
    status: completed
  - id: stylist-start-window
    content: Pojačati `stylistStart()` prozor na `plannedEnd + 60min` i zadržati postojeće blokade (pending reorder, raniji termini).
    status: completed
  - id: frontend-mobile-copy
    content: "U frontendu i mobilnoj aplikaciji prikazati specifičan tekst za sistemski otkaz: `CANCELLED_BY_CLIENT` + `cancelReason === 'Nije potvrđen dolazak u roku'`."
    status: completed
  - id: tests
    content: Dodati/izmijeniti unit testove za nove deadline proračune, attendance enforcement, i reorder generator.
    status: completed
  - id: todo-1776086083237-aficb1oqk
    content: Izmjene zabilježiti u dokumentaciji i source of truth
    status: pending
isProject: false
---
