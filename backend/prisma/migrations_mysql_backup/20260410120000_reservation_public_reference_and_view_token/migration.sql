ALTER TABLE `reservations`
ADD COLUMN `public_reference_code` VARCHAR(191) NULL,
ADD COLUMN `client_view_token` VARCHAR(191) NULL;

UPDATE `reservations`
SET
  `public_reference_code` = CONCAT(
    'RZ-',
    DATE_FORMAT(`reservation_date`, '%Y%m%d'),
    '-',
    UPPER(SUBSTRING(REPLACE(`id`, '-', ''), 1, 8))
  ),
  `client_view_token` = LOWER(
    CONCAT(REPLACE(UUID(), '-', ''), REPLACE(UUID(), '-', ''))
  )
WHERE `public_reference_code` IS NULL OR `client_view_token` IS NULL;

ALTER TABLE `reservations`
MODIFY COLUMN `public_reference_code` VARCHAR(191) NOT NULL,
MODIFY COLUMN `client_view_token` VARCHAR(191) NOT NULL;

CREATE UNIQUE INDEX `reservations_public_reference_code_key` ON `reservations`(`public_reference_code`);
CREATE UNIQUE INDEX `reservations_client_view_token_key` ON `reservations`(`client_view_token`);
