-- CreateTable
CREATE TABLE `app_releases` (
    `id` VARCHAR(191) NOT NULL,
    `platform` ENUM('ANDROID') NOT NULL DEFAULT 'ANDROID',
    `version` VARCHAR(191) NOT NULL,
    `version_code` INTEGER NOT NULL,
    `min_supported_version_code` INTEGER NOT NULL DEFAULT 1,
    `force_update` BOOLEAN NOT NULL DEFAULT false,
    `apk_path` VARCHAR(191) NOT NULL,
    `apk_sha256` VARCHAR(191) NOT NULL,
    `apk_size_bytes` INTEGER NOT NULL,
    `release_notes` TEXT NULL,
    `status` ENUM('DRAFT', 'PUBLISHED', 'RETIRED') NOT NULL DEFAULT 'DRAFT',
    `published_at` DATETIME(3) NULL,
    `created_by_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `app_releases_platform_version_code_key`(`platform`, `version_code`),
    INDEX `app_releases_platform_status_version_code_idx`(`platform`, `status`, `version_code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `app_releases` ADD CONSTRAINT `app_releases_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
