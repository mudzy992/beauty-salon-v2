ALTER TABLE `daily_log_entries`
  ADD COLUMN `public_reference_code` VARCHAR(32) NULL;

UPDATE `daily_log_entries`
SET `public_reference_code` = CONCAT(
  'DK-',
  DATE_FORMAT(`date`, '%Y%m%d'),
  '-',
  UPPER(SUBSTRING(REPLACE(`id`, '-', ''), 1, 6))
)
WHERE `public_reference_code` IS NULL;

-- Resolve rare collisions after backfill
UPDATE `daily_log_entries` dle
JOIN (
  SELECT `public_reference_code`
  FROM `daily_log_entries`
  GROUP BY `public_reference_code`
  HAVING COUNT(*) > 1
) dup ON dup.`public_reference_code` = dle.`public_reference_code`
SET dle.`public_reference_code` = CONCAT(
  dle.`public_reference_code`,
  '-',
  UPPER(SUBSTRING(REPLACE(dle.`id`, '-', ''), 7, 4))
);

ALTER TABLE `daily_log_entries`
  MODIFY `public_reference_code` VARCHAR(32) NOT NULL;

CREATE UNIQUE INDEX `daily_log_entries_public_reference_code_key`
  ON `daily_log_entries`(`public_reference_code`);
