-- CreateTable
CREATE TABLE `reservation_service_items` (
    `id` VARCHAR(191) NOT NULL,
    `reservation_id` VARCHAR(191) NOT NULL,
    `service_id` VARCHAR(191) NOT NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `reservation_service_items_reservation_id_service_id_key`(`reservation_id`, `service_id`),
    INDEX `reservation_service_items_service_id_idx`(`service_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `daily_log_entry_service_items` (
    `id` VARCHAR(191) NOT NULL,
    `daily_log_entry_id` VARCHAR(191) NOT NULL,
    `service_id` VARCHAR(191) NOT NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `daily_log_entry_service_items_daily_log_entry_id_service_id_key`(`daily_log_entry_id`, `service_id`),
    INDEX `daily_log_entry_service_items_service_id_idx`(`service_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Backfill existing single-service rows
INSERT INTO `reservation_service_items` (`id`, `reservation_id`, `service_id`, `sort_order`, `created_at`)
SELECT UUID(), r.`id`, r.`service_id`, 0, r.`created_at`
FROM `reservations` r
LEFT JOIN `reservation_service_items` i ON i.`reservation_id` = r.`id` AND i.`service_id` = r.`service_id`
WHERE i.`id` IS NULL;

INSERT INTO `daily_log_entry_service_items` (`id`, `daily_log_entry_id`, `service_id`, `sort_order`, `created_at`)
SELECT UUID(), e.`id`, e.`service_id`, 0, e.`created_at`
FROM `daily_log_entries` e
LEFT JOIN `daily_log_entry_service_items` i ON i.`daily_log_entry_id` = e.`id` AND i.`service_id` = e.`service_id`
WHERE i.`id` IS NULL;

-- AddForeignKey
ALTER TABLE `reservation_service_items` ADD CONSTRAINT `reservation_service_items_reservation_id_fkey`
FOREIGN KEY (`reservation_id`) REFERENCES `reservations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reservation_service_items` ADD CONSTRAINT `reservation_service_items_service_id_fkey`
FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `daily_log_entry_service_items` ADD CONSTRAINT `daily_log_entry_service_items_daily_log_entry_id_fkey`
FOREIGN KEY (`daily_log_entry_id`) REFERENCES `daily_log_entries`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `daily_log_entry_service_items` ADD CONSTRAINT `daily_log_entry_service_items_service_id_fkey`
FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

