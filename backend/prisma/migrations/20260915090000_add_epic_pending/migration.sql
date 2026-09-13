-- Langkah A dari rollout Epic (Project -> Epic -> Task). Pola sama persis
-- kayak rollout Project.code/taskCounter yang lama: tabel baru + kolom
-- nullable dulu, backfill lewat script Node (backend/src/scripts/backfill_epics.js),
-- baru difinalisasi NOT NULL + drop kolom lama di migration berikutnya
-- (20260915093000_finalize_epics). JANGAN sentuh tasks.project_id/sequence
-- atau projects.code/task_counter di sini — dibiarin coexist sementara.

-- CreateTable
CREATE TABLE `epics` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `project_id` INTEGER UNSIGNED NOT NULL,
    `user_id` INTEGER UNSIGNED NULL,
    `code` VARCHAR(10) NOT NULL,
    `task_counter` INTEGER NOT NULL DEFAULT 0,
    `name` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `due_date` TIMESTAMP(0) NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `deleted_at` TIMESTAMP(0) NULL,

    UNIQUE INDEX `unq_epic_code`(`code`),
    INDEX `idx_epic_project_id`(`project_id`),
    INDEX `idx_epic_user_id`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `epics` ADD CONSTRAINT `fk_epic_project` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `epics` ADD CONSTRAINT `fk_epic_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable: epic_id nullable dulu, diisi backfill_epics.js
ALTER TABLE `tasks` ADD COLUMN `epic_id` INTEGER UNSIGNED NULL AFTER `project_id`;

-- CreateIndex
CREATE INDEX `idx_task_epic_id` ON `tasks`(`epic_id`);

-- AddForeignKey
ALTER TABLE `tasks` ADD CONSTRAINT `fk_task_epic` FOREIGN KEY (`epic_id`) REFERENCES `epics`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
