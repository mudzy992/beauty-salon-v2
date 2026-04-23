-- Add optional daily_log_entry reference to client_debts
ALTER TABLE `client_debts`
  ADD COLUMN `daily_log_entry_id` VARCHAR(191) NULL;

CREATE INDEX `client_debts_daily_log_entry_id_idx`
  ON `client_debts`(`daily_log_entry_id`);

ALTER TABLE `client_debts`
  ADD CONSTRAINT `client_debts_daily_log_entry_id_fkey`
  FOREIGN KEY (`daily_log_entry_id`) REFERENCES `daily_log_entries`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

