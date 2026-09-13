/*
  Warnings:

  - Made the column `assignee_id` on table `tasks` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE `tasks` DROP FOREIGN KEY `fk_task_assignee`;

-- AlterTable
ALTER TABLE `tasks` MODIFY `assignee_id` INTEGER UNSIGNED NOT NULL;

-- AddForeignKey
ALTER TABLE `tasks` ADD CONSTRAINT `fk_task_assignee` FOREIGN KEY (`assignee_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
