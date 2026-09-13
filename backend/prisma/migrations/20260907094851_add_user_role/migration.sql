-- AlterTable
ALTER TABLE `users` ADD COLUMN `role` ENUM('admin', 'member') NOT NULL DEFAULT 'member';
