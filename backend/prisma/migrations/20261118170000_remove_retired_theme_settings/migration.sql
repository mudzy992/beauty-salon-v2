-- Remove retired skin and runtime palette keys. Aurum light/dark are the only supported modes.
DELETE FROM "app_settings"
WHERE "key" IN ('theme_active_skin', 'theme_primary', 'theme_accent');
