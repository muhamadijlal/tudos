-- Task sekarang bisa punya banyak assignee (many-to-many lewat
-- task_assignees), bukan cuma 1 assignee_id.

-- CreateTable
CREATE TABLE `task_assignees` (
    `task_id` INTEGER UNSIGNED NOT NULL,
    `user_id` INTEGER UNSIGNED NOT NULL,

    INDEX `idx_task_assignee_user_id`(`user_id`),
    PRIMARY KEY (`task_id`, `user_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Backfill dari assignee_id lama sebelum kolomnya di-drop
INSERT INTO `task_assignees` (`task_id`, `user_id`)
SELECT `id`, `assignee_id` FROM `tasks`;

-- AddForeignKey
ALTER TABLE `task_assignees` ADD CONSTRAINT `fk_task_assignee_task` FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `task_assignees` ADD CONSTRAINT `fk_task_assignee_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- DropForeignKey + DropColumn (kolom & index lama, index ikut ke-drop bareng kolomnya)
ALTER TABLE `tasks` DROP FOREIGN KEY `fk_task_assignee`;
ALTER TABLE `tasks` DROP COLUMN `assignee_id`;
