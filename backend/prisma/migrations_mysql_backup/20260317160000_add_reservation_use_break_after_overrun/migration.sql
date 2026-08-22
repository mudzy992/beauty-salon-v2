-- AlterTable
ALTER TABLE `reservations`
  ADD COLUMN `use_break_after_overrun` BOOLEAN NULL,
  ADD COLUMN `use_break_decided_at` DATETIME(3) NULL;

