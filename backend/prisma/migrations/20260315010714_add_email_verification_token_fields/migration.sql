-- AlterTable
ALTER TABLE `users` ADD COLUMN `email_verification_expires_at` DATETIME(3) NULL,
    ADD COLUMN `email_verification_token` VARCHAR(191) NULL;
