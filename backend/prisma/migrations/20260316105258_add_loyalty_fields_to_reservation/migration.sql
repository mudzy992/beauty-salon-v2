-- AlterTable
ALTER TABLE `reservations` ADD COLUMN `loyalty_discount_amount` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    ADD COLUMN `loyalty_discount_percent` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `loyalty_points_used` INTEGER NOT NULL DEFAULT 0;
