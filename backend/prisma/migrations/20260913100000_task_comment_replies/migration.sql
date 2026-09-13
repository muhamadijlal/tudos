-- Komentar sekarang bisa dibalas maksimal 1 level (balasan gak bisa dibalas
-- lagi) — divalidasi di service layer, bukan lewat constraint DB.

-- AlterTable
ALTER TABLE `task_comments` ADD COLUMN `parent_id` INTEGER UNSIGNED NULL;

-- CreateIndex
CREATE INDEX `idx_task_comment_parent_id` ON `task_comments`(`parent_id`);

-- AddForeignKey
ALTER TABLE `task_comments` ADD CONSTRAINT `fk_task_comment_parent` FOREIGN KEY (`parent_id`) REFERENCES `task_comments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
