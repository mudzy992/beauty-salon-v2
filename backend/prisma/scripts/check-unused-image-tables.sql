-- Safety check before dropping unused tables
-- Run against your MySQL database to confirm these tables are empty.

SELECT 'service_images' AS table_name, COUNT(*) AS row_count FROM service_images;
SELECT 'reservation_images' AS table_name, COUNT(*) AS row_count FROM reservation_images;

