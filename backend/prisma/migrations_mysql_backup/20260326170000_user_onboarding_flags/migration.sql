ALTER TABLE `users`
  MODIFY `email` VARCHAR(191) NULL,
  ADD COLUMN `must_change_password` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `password_changed_at` DATETIME(3) NULL;
