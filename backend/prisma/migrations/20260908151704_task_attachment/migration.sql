-- AlterTable: tambah field lampiran opsional buat task
ALTER TABLE `tasks` ADD COLUMN `attachment` VARCHAR(255) NULL AFTER `status`;
ALTER TABLE `tasks` ADD COLUMN `attachment_name` VARCHAR(255) NULL AFTER `attachment`;
