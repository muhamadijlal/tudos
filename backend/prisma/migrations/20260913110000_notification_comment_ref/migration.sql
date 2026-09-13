-- Notifikasi komentar/balasan sekarang nyimpen comment_id-nya juga, dipakai
-- frontend buat nge-highlight & scroll ke komentar yang dimaksud.

-- AlterTable
ALTER TABLE `notifications` ADD COLUMN `comment_id` INTEGER UNSIGNED NULL;

-- CreateIndex
CREATE INDEX `idx_notification_comment_id` ON `notifications`(`comment_id`);

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `fk_notification_comment` FOREIGN KEY (`comment_id`) REFERENCES `task_comments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
