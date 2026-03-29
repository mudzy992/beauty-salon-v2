ALTER TABLE `users` ADD COLUMN `gender_onboarding_completed` BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE `users` SET `gender_onboarding_completed` = TRUE;
