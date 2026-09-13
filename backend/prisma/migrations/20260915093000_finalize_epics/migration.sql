-- Langkah C (finalize) dari rollout Epic — dijalankan SETELAH
-- backend/src/scripts/backfill_epics.js dan verifikasi
-- `SELECT COUNT(*) FROM tasks WHERE epic_id IS NULL` = 0.
-- Task gak lagi nempel langsung ke Project (projectId dihapus), Project gak
-- lagi punya code/taskCounter sendiri (migrasi ke Epic).

-- AlterTable: epic_id wajib mulai sekarang
ALTER TABLE `tasks` MODIFY COLUMN `epic_id` INTEGER UNSIGNED NOT NULL;

-- DropForeignKey + DropIndex + DropColumn: tasks.project_id gak dipakai lagi
ALTER TABLE `tasks` DROP FOREIGN KEY `fk_task_project`;
ALTER TABLE `tasks` DROP INDEX `unq_task_project_sequence`;
ALTER TABLE `tasks` DROP COLUMN `project_id`;

-- CreateIndex: sequence sekarang unik per Epic, bukan per Project
ALTER TABLE `tasks` ADD CONSTRAINT `unq_task_epic_sequence` UNIQUE (`epic_id`, `sequence`);

-- DropIndex + DropColumn: code/taskCounter pindah ke Epic
ALTER TABLE `projects` DROP INDEX `unq_project_code`;
ALTER TABLE `projects` DROP COLUMN `code`;
ALTER TABLE `projects` DROP COLUMN `task_counter`;
