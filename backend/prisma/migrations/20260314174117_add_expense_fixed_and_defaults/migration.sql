-- AlterTable
ALTER TABLE `expense_categories` ADD COLUMN `is_fixed` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `expense_template_fields` ADD COLUMN `default_value` TEXT NULL;
