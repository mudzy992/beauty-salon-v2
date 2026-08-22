/*
  Warnings:

  - You are about to drop the `reservation_images` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `service_images` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `reservation_images` DROP FOREIGN KEY `reservation_images_reservation_id_fkey`;

-- DropForeignKey
ALTER TABLE `reservation_images` DROP FOREIGN KEY `reservation_images_upload_id_fkey`;

-- DropForeignKey
ALTER TABLE `service_images` DROP FOREIGN KEY `service_images_service_id_fkey`;

-- DropForeignKey
ALTER TABLE `service_images` DROP FOREIGN KEY `service_images_upload_id_fkey`;

-- DropTable
DROP TABLE `reservation_images`;

-- DropTable
DROP TABLE `service_images`;
