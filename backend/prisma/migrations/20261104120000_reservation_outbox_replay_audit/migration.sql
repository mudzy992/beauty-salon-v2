CREATE TABLE "reservation_outbox_replay_audits" (
  "id" TEXT NOT NULL,
  "outbox_event_id" TEXT NOT NULL,
  "requested_by_user_id" TEXT NOT NULL,
  "attempts_at_request" INTEGER NOT NULL,
  "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "reservation_outbox_replay_audits_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "reservation_outbox_replay_audits_event_requested_idx"
  ON "reservation_outbox_replay_audits"("outbox_event_id", "requested_at");

CREATE INDEX "reservation_outbox_replay_audits_actor_requested_idx"
  ON "reservation_outbox_replay_audits"("requested_by_user_id", "requested_at");
