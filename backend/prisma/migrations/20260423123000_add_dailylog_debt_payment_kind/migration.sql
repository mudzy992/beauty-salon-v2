-- Add kind + optional debt link to daily_log_entries
ALTER TABLE `daily_log_entries`
  ADD COLUMN `kind` ENUM('SERVICE','DEBT_PAYMENT') NOT NULL DEFAULT 'SERVICE',
  ADD COLUMN `debt_id` VARCHAR(191) NULL;

CREATE INDEX `daily_log_entries_debt_id_idx`
  ON `daily_log_entries`(`debt_id`);

ALTER TABLE `daily_log_entries`
  ADD CONSTRAINT `daily_log_entries_debt_id_fkey`
  FOREIGN KEY (`debt_id`) REFERENCES `client_debts`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

