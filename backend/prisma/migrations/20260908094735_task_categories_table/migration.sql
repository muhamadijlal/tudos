-- CreateTable
CREATE TABLE `categories` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(50) NOT NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL,
    `deleted_at` TIMESTAMP(0) NULL,

    UNIQUE INDEX `unq_category_name`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Seed default categories (nilai yang sama seperti enum TaskCategory lama)
INSERT INTO `categories` (`name`, `updated_at`) VALUES
    ('bug', CURRENT_TIMESTAMP(0)),
    ('feature', CURRENT_TIMESTAMP(0)),
    ('improvement', CURRENT_TIMESTAMP(0)),
    ('task', CURRENT_TIMESTAMP(0));

-- AlterTable: tambah category_id (nullable dulu, biar bisa di-backfill)
ALTER TABLE `tasks` ADD COLUMN `category_id` INTEGER UNSIGNED NULL AFTER `category`;

-- Backfill category_id dari kolom enum category yang lama
UPDATE `tasks` t
JOIN `categories` c ON c.`name` = t.`category`
SET t.`category_id` = c.`id`;

-- Wajibkan category_id sekarang semua row sudah ke-isi
ALTER TABLE `tasks` MODIFY COLUMN `category_id` INTEGER UNSIGNED NOT NULL;

-- Buang kolom enum lama
ALTER TABLE `tasks` DROP COLUMN `category`;

-- AddForeignKey
ALTER TABLE `tasks` ADD CONSTRAINT `fk_task_category` FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX `idx_task_category_id` ON `tasks`(`category_id`);
