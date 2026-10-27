# BIZ-03 — read-only daily-log completion reconciliation

**Namjena:** pregledati legacy completed SERVICE zapise, KIF/loyalty duplikate i djelimična reservation stanja prije bilo kakve automatske popravke ili migracije koja uvodi uniqueness. Ovo je read-only izvještaj; ne bira pobjednički red, ne briše i ne mijenja finansijsku historiju.

## Pre-deployment SQL preflight

Izvršavati samo nad odobrenom, neprodukcijskom kopijom/disposable bazom tokom razvoja. Ako je potreban owner preflight nad stvarnim podacima prije cutover-a, vlasnik/DBA ga izvodi kroz svoj odobreni kanal; agent ne otvara niti testira production/shared DB. U prvom upitu promijeniti samo `2026, 3` na željeni period.

```sql
-- Completed service logs sa 0 ili više od 1 auto-KIF reda u izabranom mjesecu.
SELECT
  dl.id AS daily_log_entry_id,
  dl.date,
  COUNT(ibe.id) AS kif_rows,
  ARRAY_AGG(ibe.id) FILTER (WHERE ibe.id IS NOT NULL) AS kif_entry_ids,
  ARRAY_AGG(ibe.book_id) FILTER (WHERE ibe.id IS NOT NULL) AS book_ids
FROM daily_log_entries AS dl
LEFT JOIN income_book_entries AS ibe
  ON ibe.daily_log_entry_id = dl.id
WHERE dl.status = 'COMPLETED'
  AND dl.deleted_at IS NULL
  AND dl.kind = 'SERVICE'
  AND dl.date >= make_date(2026, 3, 1)
  AND dl.date < make_date(2026, 4, 1)
GROUP BY dl.id, dl.date
HAVING COUNT(ibe.id) <> 1
ORDER BY dl.date, dl.id;

-- KIF duplikati globalno (migracija odbija dodati globalni unique index ako ih ima).
SELECT
  daily_log_entry_id,
  COUNT(*) AS kif_rows,
  ARRAY_AGG(id) AS kif_entry_ids,
  ARRAY_AGG(book_id) AS book_ids
FROM income_book_entries
GROUP BY daily_log_entry_id
HAVING COUNT(*) > 1
ORDER BY daily_log_entry_id;

-- Loyalty EARN duplikati po legacy source (migracija odbija nejasne duplikate).
SELECT
  source,
  COUNT(*) AS earn_rows,
  ARRAY_AGG(id) AS transaction_ids,
  ARRAY_AGG(account_id) AS account_ids
FROM loyalty_transactions
WHERE type = 'EARN'
  AND LEFT(source, LENGTH('daily_log:')) = 'daily_log:'
GROUP BY source
HAVING COUNT(*) > 1
ORDER BY source;

-- Kandidati bez loyalty EARN reda. Odsustvo reda nije dokaz greške:
-- tadašnji program/iznos/service eligibility ovdje nije historijski rekonstruisan.
SELECT dl.id, dl.date, dl.client_id, dl.actual_price, dl.service_id
FROM daily_log_entries AS dl
WHERE dl.status = 'COMPLETED'
  AND dl.deleted_at IS NULL
  AND dl.kind = 'SERVICE'
  AND dl.client_id IS NOT NULL
  AND dl.actual_price > 0
  AND NOT EXISTS (
    SELECT 1
    FROM loyalty_transactions AS lt
    WHERE lt.type = 'EARN'
      AND lt.source = 'daily_log:' || dl.id
  )
ORDER BY dl.date, dl.id;

-- Completed logovi bez vremena završetka ili sa neusklađenom vezanom rezervacijom.
SELECT
  dl.id AS daily_log_entry_id,
  dl.completed_at AS daily_log_completed_at,
  dl.reservation_id,
  dl.stylist_profile_id AS daily_log_stylist_profile_id,
  r.status AS reservation_status,
  r.confirmed_stylist_id AS reservation_stylist_profile_id,
  r.completed_at AS reservation_completed_at
FROM daily_log_entries AS dl
LEFT JOIN reservations AS r ON r.id = dl.reservation_id
WHERE dl.status = 'COMPLETED'
  AND dl.deleted_at IS NULL
  AND (
    dl.completed_at IS NULL
    OR (
      dl.reservation_id IS NOT NULL
      AND (
        r.id IS NULL
        OR r.status <> 'COMPLETED'
        OR r.completed_at IS NULL
        OR r.confirmed_stylist_id IS DISTINCT FROM dl.stylist_profile_id
      )
    )
  )
ORDER BY dl.date, dl.id;

-- KIF redovi vezani za obrisan/ne-završen zapis.
SELECT
  ibe.id AS income_book_entry_id,
  ibe.book_id,
  ibe.daily_log_entry_id,
  dl.status,
  dl.deleted_at
FROM income_book_entries AS ibe
LEFT JOIN daily_log_entries AS dl ON dl.id = ibe.daily_log_entry_id
WHERE dl.id IS NULL
   OR dl.deleted_at IS NOT NULL
   OR dl.status <> 'COMPLETED'
ORDER BY ibe.date, ibe.id;
```

## Read-only API izvještaj nakon BIZ-03 migracije

Za admin/owner nalog:

```text
GET /api/income-books/{bookId}/completion-integrity
```

Odgovor sadrži period, skenirani broj redova, missing/duplicate/wrong-period/orphaned KIF, nepostavljen `completedAt`, neusklađene rezervacije i loyalty `idempotencyKey` stanje. `loyaltyNoEarnFound` je namjerno označen `NOT_EVALUATED`: konfiguracija lojalnosti u trenutku istorijskog završetka nije snapshotovana. Zato samo taj kandidat postavlja `needsReview=true`, ali ne čini `isHealthy=false`; potvrđene KIF/reservation/ledger anomalije i dalje čine izvještaj nezdravim. Endpoint ništa ne mijenja.

Postojeći `POST /api/income-books/{bookId}/resync` je write/repair akcija za KIF. Prije njenog korištenja pregledati read-only izvještaj i owner/finance odobrenje; nemojte automatski popravljati duplikate ili zaključane knjige. Ako zapis koji nedostaje u ciljnoj knjizi već ima KIF red u drugoj knjizi, endpoint sada odbija resync umjesto da prijavi lažni uspjeh ili pokuša duplirati red.

## Migracijska zaštita i ograničenja

Migracija `20261024100000_biz03_daily_log_completion` prvo provjerava globalne KIF duplikate i legacy EARN duplikate čiji je `source` tačno prefiksiran sa `daily_log:`. Ako postoje, migracija namjerno prekida prije izmjena i ne bira/uklanja redove. Potom postavlja completion generation na `1` za već završene zapise, backfill-a loyalty idempotency key za poznate dnevno-knjižne EARN redove i uvodi globalni KIF unique index. KIF period/iznosi i loyalty balance se ne prepisuju.

Post-commit outbox šalje receipt/notification i realtime invalidaciju; cron obrađuje pending BIZ-03 događaje i vraća istekle processing lease-ove. DB notification i outbox identiteti su dedupe-protected. Email, push provider i Socket.IO su vanjske isporuke i mogu biti at-least-once ako proces padne nakon prihvata vanjskog efekta, a prije `DELIVERED` upisa; ovo nije exactly-once garancija. Reversal/loyalty history reconciliation ostaje dalja loyalty faza BIZ-05.
