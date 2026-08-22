-- Additive: line_role for modular variable expense columns
ALTER TABLE `expense_template_fields`
  ADD COLUMN `line_role` VARCHAR(191) NOT NULL DEFAULT 'NONE';
