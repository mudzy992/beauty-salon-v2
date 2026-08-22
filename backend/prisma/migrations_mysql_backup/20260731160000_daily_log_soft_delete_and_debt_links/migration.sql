-- AlterTable
ALTER TABLE `daily_log_entries`
  ADD COLUMN `source_entry_id` VARCHAR(191) NULL,
  ADD COLUMN `deleted_at` DATETIME(3) NULL,
  ADD COLUMN `deleted_by_id` VARCHAR(191) NULL,
  ADD COLUMN `delete_reason` TEXT NULL;

-- AlterTable
ALTER TABLE `income_book_manual_entries`
  ADD COLUMN `daily_log_entry_id` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `daily_log_entries_deleted_at_idx` ON `daily_log_entries`(`deleted_at`);

-- CreateIndex
CREATE INDEX `daily_log_entries_status_deleted_at_idx` ON `daily_log_entries`(`status`, `deleted_at`);

-- CreateIndex
CREATE INDEX `daily_log_entries_source_entry_id_idx` ON `daily_log_entries`(`source_entry_id`);

-- CreateIndex
CREATE INDEX `daily_log_images_daily_log_entry_id_is_before_idx` ON `daily_log_images`(`daily_log_entry_id`, `is_before`);

-- CreateIndex
CREATE INDEX `daily_log_images_daily_log_entry_id_is_after_idx` ON `daily_log_images`(`daily_log_entry_id`, `is_after`);

-- CreateIndex
CREATE INDEX `income_book_manual_entries_daily_log_entry_id_idx` ON `income_book_manual_entries`(`daily_log_entry_id`);

-- AddForeignKey
ALTER TABLE `daily_log_entries`
  ADD CONSTRAINT `daily_log_entries_deleted_by_id_fkey`
  FOREIGN KEY (`deleted_by_id`) REFERENCES `users`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `daily_log_entries`
  ADD CONSTRAINT `daily_log_entries_source_entry_id_fkey`
  FOREIGN KEY (`source_entry_id`) REFERENCES `daily_log_entries`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `income_book_manual_entries`
  ADD CONSTRAINT `income_book_manual_entries_daily_log_entry_id_fkey`
  FOREIGN KEY (`daily_log_entry_id`) REFERENCES `daily_log_entries`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
