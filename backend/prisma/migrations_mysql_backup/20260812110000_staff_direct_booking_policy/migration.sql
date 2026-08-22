-- Staff Direct Booking Policy Migration
-- Adds policy fields for dual-flow reservation model (staff direct vs client self-service)

ALTER TABLE `reservations`
  ADD COLUMN `booking_origin` VARCHAR(191) NOT NULL DEFAULT 'CLIENT_SELF_SERVICE',
  ADD COLUMN `acceptance_mode` VARCHAR(191) NOT NULL DEFAULT 'INBOX',
  ADD COLUMN `attendance_policy` VARCHAR(191) NOT NULL DEFAULT 'CLIENT_REQUIRED',
  ADD COLUMN `created_by_user_id` VARCHAR(191) NULL,
  ADD COLUMN `attendance_confirmed_by` VARCHAR(191) NULL,
  ADD COLUMN `attendance_waived_at` DATETIME(3) NULL,
  ADD COLUMN `attendance_waived_by_user_id` VARCHAR(191) NULL;

-- Foreign keys for audit trail
ALTER TABLE `reservations`
  ADD CONSTRAINT `reservations_created_by_user_id_fkey`
    FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `reservations_attendance_waived_by_user_id_fkey`
    FOREIGN KEY (`attendance_waived_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Indexes for common policy queries
CREATE INDEX `reservations_booking_origin_idx` ON `reservations`(`booking_origin`);
CREATE INDEX `reservations_attendance_policy_idx` ON `reservations`(`attendance_policy`);
CREATE INDEX `reservations_created_by_user_id_idx` ON `reservations`(`created_by_user_id`);
