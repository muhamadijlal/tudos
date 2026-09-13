-- CreateTable: task bisa punya banyak lampiran (sebelumnya cuma 1 kolom di tasks)
CREATE TABLE `task_attachments` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `task_id` INTEGER UNSIGNED NOT NULL,
    `path` VARCHAR(255) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_task_attachment_task_id`(`task_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Pindahin data lampiran tunggal yang lama (kalau ada) ke tabel baru
INSERT INTO `task_attachments` (`task_id`, `path`, `name`)
SELECT `id`, `attachment`, `attachment_name`
FROM `tasks`
WHERE `attachment` IS NOT NULL;

-- AddForeignKey
ALTER TABLE `task_attachments` ADD CONSTRAINT `fk_task_attachment_task` FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: buang kolom lampiran tunggal yang lama dari tasks
ALTER TABLE `tasks` DROP COLUMN `attachment`;
ALTER TABLE `tasks` DROP COLUMN `attachment_name`;
