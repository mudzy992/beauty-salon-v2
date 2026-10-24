-- BIZ-02: atomically persist retry identity, reservation outbox work, and
-- notification provenance without rewriting existing reservation history.
ALTER TABLE "reservations"
  ADD COLUMN "idempotency_key" TEXT,
  ADD COLUMN "idempotency_request_hash" TEXT;

CREATE UNIQUE INDEX "reservations_client_id_idempotency_key_key"
  ON "reservations" ("client_id", "idempotency_key");

ALTER TABLE "notifications"
  ADD COLUMN "source_event_id" TEXT;

CREATE UNIQUE INDEX "notifications_source_event_user_key"
  ON "notifications" ("source_event_id", "user_id");

CREATE TABLE "outbox_events" (
  "id" TEXT NOT NULL,
  "event_type" TEXT NOT NULL,
  "aggregate_id" TEXT NOT NULL,
  "dedupe_key" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "next_attempt_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "locked_at" TIMESTAMP(3),
  "delivered_at" TIMESTAMP(3),
  "last_error" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "outbox_events_dedupe_key_key"
  ON "outbox_events" ("dedupe_key");

CREATE INDEX "outbox_events_status_next_attempt_at_idx"
  ON "outbox_events" ("status", "next_attempt_at");
