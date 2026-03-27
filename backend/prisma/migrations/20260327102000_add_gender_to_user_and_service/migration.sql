SET @has_users_gender := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'users'
    AND COLUMN_NAME = 'gender'
);
SET @users_gender_sql := IF(
  @has_users_gender = 0,
  "ALTER TABLE `users` ADD COLUMN `gender` ENUM('MALE', 'FEMALE') NULL AFTER `phone`",
  'SELECT 1'
);
PREPARE users_gender_stmt FROM @users_gender_sql;
EXECUTE users_gender_stmt;
DEALLOCATE PREPARE users_gender_stmt;

SET @has_services_gender := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'services'
    AND COLUMN_NAME = 'gender'
);
SET @services_gender_sql := IF(
  @has_services_gender = 0,
  "ALTER TABLE `services` ADD COLUMN `gender` ENUM('MALE', 'FEMALE') NOT NULL DEFAULT 'FEMALE' AFTER `price`",
  'SELECT 1'
);
PREPARE services_gender_stmt FROM @services_gender_sql;
EXECUTE services_gender_stmt;
DEALLOCATE PREPARE services_gender_stmt;

UPDATE `users` AS `u`
INNER JOIN `user_roles` AS `ur` ON `ur`.`user_id` = `u`.`id`
INNER JOIN `roles` AS `r` ON `r`.`id` = `ur`.`role_id`
SET `u`.`gender` = 'FEMALE'
WHERE `r`.`name` = 'CLIENT'
  AND `u`.`gender` IS NULL;
