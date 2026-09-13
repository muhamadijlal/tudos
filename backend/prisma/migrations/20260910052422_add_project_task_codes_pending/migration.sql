-- AlterTable
ALTER TABLE `projects` ADD COLUMN `code` VARCHAR(10) NULL,
    ADD COLUMN `start_date` TIMESTAMP(0) NULL,
    ADD COLUMN `task_counter` INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `tasks` ADD COLUMN `sequence` INTEGER NULL;

-- CreateIndex
CREATE UNIQUE INDEX `unq_project_code` ON `projects`(`code`);

-- CreateIndex
CREATE UNIQUE INDEX `unq_task_project_sequence` ON `tasks`(`project_id`, `sequence`);

-- DropIndex (redundant now that unq_task_project_sequence covers project_id as its leading column)
DROP INDEX `idx_task_project_id` ON `tasks`;
