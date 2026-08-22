-- Add optional daily_log_entry reference to client_debts
-- NOTE: `client_debts` table was missing in some environments; create it if needed.
CREATE TABLE IF NOT EXISTS `client_debts` (
  `id` VARCHAR(191) NOT NULL,
  `client_id` VARCHAR(191) NOT NULL,
  `stylist_profile_id` VARCHAR(191) NOT NULL,
  `service_id` VARCHAR(191) NULL,
  `manual_entry_id` VARCHAR(191) NULL,
  `reservation_id` VARCHAR(191) NULL,
  `amount` DECIMAL(10, 2) NOT NULL,
  `note` TEXT NULL,
  `status` ENUM('OPEN','SETTLED') NOT NULL DEFAULT 'OPEN',
  `created_by_id` VARCHAR(191) NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `settled_at` DATETIME(3) NULL,
  `settled_by_id` VARCHAR(191) NULL,

  PRIMARY KEY (`id`),
  INDEX `client_debts_client_id_status_idx` (`client_id`, `status`),
  INDEX `client_debts_stylist_profile_id_status_idx` (`stylist_profile_id`, `status`),
  INDEX `client_debts_created_by_id_status_idx` (`created_by_id`, `status`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Add base FKs (reservation FK is added in a later migration)
ALTER TABLE `client_debts`
  ADD CONSTRAINT `client_debts_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `client_debts_stylist_profile_id_fkey` FOREIGN KEY (`stylist_profile_id`) REFERENCES `stylist_profiles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `client_debts_service_id_fkey` FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `client_debts_manual_entry_id_fkey` FOREIGN KEY (`manual_entry_id`) REFERENCES `income_book_manual_entries`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `client_debts_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `client_debts_settled_by_id_fkey` FOREIGN KEY (`settled_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `client_debts`
  ADD COLUMN `daily_log_entry_id` VARCHAR(191) NULL;

CREATE INDEX `client_debts_daily_log_entry_id_idx`
  ON `client_debts`(`daily_log_entry_id`);

ALTER TABLE `client_debts`
  ADD CONSTRAINT `client_debts_daily_log_entry_id_fkey`
  FOREIGN KEY (`daily_log_entry_id`) REFERENCES `daily_log_entries`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

