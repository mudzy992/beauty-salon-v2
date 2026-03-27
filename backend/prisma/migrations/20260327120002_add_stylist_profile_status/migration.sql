-- Add status to stylist_profiles so new stylist profiles can start as PENDING
ALTER TABLE `stylist_profiles`
ADD COLUMN `status` ENUM('PENDING', 'ACTIVE') NOT NULL DEFAULT 'PENDING';

-- Existing stylists are considered active profiles
UPDATE `stylist_profiles`
SET `status` = 'ACTIVE'
WHERE `status` = 'PENDING';

