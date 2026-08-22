-- Alter stylist_profiles.specialization to TEXT to prevent truncation errors
ALTER TABLE `stylist_profiles`
MODIFY `specialization` TEXT NULL;

