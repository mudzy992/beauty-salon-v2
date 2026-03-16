-- AlterTable
ALTER TABLE `services` ADD COLUMN `loyalty_enabled` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `loyalty_max_discount_percent` INTEGER NOT NULL DEFAULT 0;
