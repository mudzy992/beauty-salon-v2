# Plan: slot-hold — kapacitet inboxa

**Datum:** 2026-08-13  
**ID:** `slot-hold` (POLICY_BACKLOG #1)

## Model

Na istom intervalu (npr. 15:30), za uslugu:

`max rezervacija = broj stilista koji nude servis i stanu u taj slot`

Svaki `PENDING` / `STYLIST_REVIEW` troši **1** kapacitet (i bez locka).  
`CONFIRMED+` troši **tog** stilista.  
Aktivni **lock** troši **tog** stilista (isti zahtjev se ne broji dvaput).

Novi booking samo dok `zauzeto < kapacitet`.  
Kad je 0 zbog inbox holda: slot vidljiv, disabled, copy da se može uskoro osloboditi.

## Lock

- Jedan aktivni lock po rezervaciji; **nema preuzimanja** locka.
- Lock → obavezna akcija: accept, **oslobodi (unlock)**, ili reject.
- TTL (`reservationLockMinutes`) auto-release (ne auto-accept).
- Isti stilist **ne locka istu rezervaciju 2×**; nakon release može **accept** bez novog locka.
- Dok stilist drži lock, inbox **ne prikazuje** druge overlapping zahtjeve na tom terminu.

## Inbox timeout

Setting `system_reservation_inbox_timeout_hours` (default **24**).  
`PENDING`/`STYLIST_REVIEW` stariji od toga → `CANCELLED_BY_STYLISTS`, **bez** klijentske kazne.

## Defaults (Ask nije zatvorio brojke)

| Stavka | Default |
|--------|---------|
| Inbox timeout | 24h od `createdAt` |
| Lock TTL | postojeći `reservationLockMinutes` |
| Accept bez re-locka | da, ako je `hasLockedOnce` |

## Out of scope

- Multi-booking / dan, attendance staff confirm, disposition polish
