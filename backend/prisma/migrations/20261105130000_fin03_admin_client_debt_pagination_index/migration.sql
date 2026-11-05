-- Supports the bounded admin debt list filter and stable createdAt/id ordering.
CREATE INDEX "client_debts_status_created_at_id_idx"
ON "client_debts"("status", "created_at", "id");
