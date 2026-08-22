-- AlterTable
ALTER TABLE `income_book_manual_entries` ADD COLUMN `client_id` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `income_book_manual_entries` ADD CONSTRAINT `income_book_manual_entries_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

