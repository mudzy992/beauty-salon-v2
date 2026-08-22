-- Indeksi za najčešće finance upite (filtriranje rashoda po knjizi/kategoriji,
-- polja predloška po redoslijedu, te dugovi vezani za ručnu KIF stavku).
CREATE INDEX `expenses_book_id_created_at_idx` ON `expenses`(`book_id`, `created_at`);
CREATE INDEX `expenses_category_id_idx` ON `expenses`(`category_id`);
CREATE INDEX `expense_template_fields_template_id_sort_order_idx` ON `expense_template_fields`(`template_id`, `sort_order`);
CREATE INDEX `client_debts_manual_entry_id_status_idx` ON `client_debts`(`manual_entry_id`, `status`);

-- Automatsko zaključavanje knjige iz CRON-a nema korisnika, pa autor postaje opcionalan.
ALTER TABLE `income_book_lock_events` DROP FOREIGN KEY `income_book_lock_events_created_by_id_fkey`;
ALTER TABLE `income_book_lock_events` MODIFY `created_by_id` VARCHAR(191) NULL;
ALTER TABLE `income_book_lock_events`
  ADD CONSTRAINT `income_book_lock_events_created_by_id_fkey`
  FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
