-- AlterTable
ALTER TABLE `daily_log_entry_service_items`
  ADD COLUMN `unit_price` DECIMAL(10, 2) NULL;

-- Backfill from catalog service price
UPDATE `daily_log_entry_service_items` AS i
INNER JOIN `services` AS s ON s.`id` = i.`service_id`
SET i.`unit_price` = s.`price`
WHERE i.`unit_price` IS NULL;

-- Enforce NOT NULL after backfill
ALTER TABLE `daily_log_entry_service_items`
  MODIFY COLUMN `unit_price` DECIMAL(10, 2) NOT NULL;

-- AlterTable
ALTER TABLE `reservations`
  ADD COLUMN `pay_debts_intent` BOOLEAN NOT NULL DEFAULT false;
