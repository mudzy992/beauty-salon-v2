-- CreateTable
CREATE TABLE `income_book_manual_entries` (
    `id` VARCHAR(191) NOT NULL,
    `book_id` VARCHAR(191) NOT NULL,
    `date` DATE NOT NULL,
    `service_id` VARCHAR(191) NOT NULL,
    `stylist_profile_id` VARCHAR(191) NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `tip_amount` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `notes` TEXT NULL,
    `created_by_id` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `income_book_manual_entries_book_id_date_idx`(`book_id`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `income_book_lock_events` (
    `id` VARCHAR(191) NOT NULL,
    `book_id` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `reason` TEXT NULL,
    `created_by_id` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `income_book_lock_events_book_id_created_at_idx`(`book_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `income_book_manual_entry_audits` (
    `id` VARCHAR(191) NOT NULL,
    `book_id` VARCHAR(191) NOT NULL,
    `manual_entry_id` VARCHAR(191) NULL,
    `action` VARCHAR(191) NOT NULL,
    `before_json` JSON NULL,
    `after_json` JSON NULL,
    `created_by_id` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `income_book_manual_entry_audits_book_id_created_at_idx`(`book_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `income_book_manual_entries` ADD CONSTRAINT `income_book_manual_entries_book_id_fkey` FOREIGN KEY (`book_id`) REFERENCES `income_books`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `income_book_manual_entries` ADD CONSTRAINT `income_book_manual_entries_service_id_fkey` FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `income_book_manual_entries` ADD CONSTRAINT `income_book_manual_entries_stylist_profile_id_fkey` FOREIGN KEY (`stylist_profile_id`) REFERENCES `stylist_profiles`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `income_book_manual_entries` ADD CONSTRAINT `income_book_manual_entries_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `income_book_lock_events` ADD CONSTRAINT `income_book_lock_events_book_id_fkey` FOREIGN KEY (`book_id`) REFERENCES `income_books`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `income_book_lock_events` ADD CONSTRAINT `income_book_lock_events_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `income_book_manual_entry_audits` ADD CONSTRAINT `income_book_manual_entry_audits_book_id_fkey` FOREIGN KEY (`book_id`) REFERENCES `income_books`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `income_book_manual_entry_audits` ADD CONSTRAINT `income_book_manual_entry_audits_manual_entry_id_fkey` FOREIGN KEY (`manual_entry_id`) REFERENCES `income_book_manual_entries`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `income_book_manual_entry_audits` ADD CONSTRAINT `income_book_manual_entry_audits_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

