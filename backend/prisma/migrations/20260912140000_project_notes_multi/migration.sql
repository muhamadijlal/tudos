-- 1 project sekarang bisa punya banyak catatan (bukan cuma 1 field notes).
ALTER TABLE `projects` DROP COLUMN `notes`;

-- CreateTable
CREATE TABLE `project_notes` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `project_id` INTEGER UNSIGNED NOT NULL,
    `title` VARCHAR(150) NOT NULL,
    `content` TEXT NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `deleted_at` TIMESTAMP(0) NULL,

    INDEX `idx_project_note_project_id`(`project_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `project_notes` ADD CONSTRAINT `fk_project_note_project` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
