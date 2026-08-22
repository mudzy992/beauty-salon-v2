-- AlterTable
ALTER TABLE `daily_log_entries`
  ADD COLUMN `loyalty_discount_percent` INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN `loyalty_discount_amount` DECIMAL(10, 2) NOT NULL DEFAULT 0,
  ADD COLUMN `loyalty_points_used` INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `reservations`
  ADD COLUMN `started_at` DATETIME(3) NULL,
  ADD COLUMN `completed_at` DATETIME(3) NULL,
  ADD COLUMN `reschedule_proposed_start_time` VARCHAR(191) NULL,
  ADD COLUMN `reschedule_proposed_end_time` VARCHAR(191) NULL,
  ADD COLUMN `reschedule_status` VARCHAR(191) NULL;

