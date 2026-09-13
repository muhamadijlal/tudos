-- CreateTable
CREATE TABLE `roles` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(50) NOT NULL,
    `description` VARCHAR(255) NULL,
    `is_system` BOOLEAN NOT NULL DEFAULT false,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `unq_role_name`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `permissions` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `key` VARCHAR(100) NOT NULL,
    `label` VARCHAR(150) NOT NULL,
    `group` VARCHAR(50) NOT NULL,

    UNIQUE INDEX `unq_permission_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `role_permissions` (
    `role_id` INTEGER UNSIGNED NOT NULL,
    `permission_id` INTEGER UNSIGNED NOT NULL,

    PRIMARY KEY (`role_id`, `permission_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `role_permissions` ADD CONSTRAINT `fk_role_permission_role` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `role_permissions` ADD CONSTRAINT `fk_role_permission_permission` FOREIGN KEY (`permission_id`) REFERENCES `permissions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed permission catalog (harus tetap sinkron dengan src/utils/permissions.js)
INSERT INTO `permissions` (`key`, `label`, `group`) VALUES
    ('users.view', 'Lihat daftar user', 'Users'),
    ('users.update', 'Edit data user lain', 'Users'),
    ('users.delete', 'Hapus user', 'Users'),
    ('users.assignRole', 'Ubah role user', 'Users'),
    ('roles.view', 'Lihat role & permission', 'Roles'),
    ('roles.manage', 'Buat/ubah/hapus role', 'Roles'),
    ('categories.manage', 'Kelola kategori task', 'Categories'),
    ('projects.viewAll', 'Lihat semua project (bukan cuma yang ada task miliknya)', 'Projects'),
    ('tasks.viewAll', 'Lihat semua task (bukan cuma miliknya)', 'Tasks'),
    ('tasks.assignOthers', 'Assign task ke user lain', 'Tasks');

-- Seed 2 role bawaan (system role) supaya user existing gak kehilangan akses
INSERT INTO `roles` (`name`, `description`, `is_system`) VALUES
    ('Admin', 'Role bawaan dengan akses penuh ke seluruh fitur', true),
    ('Member', 'Role bawaan dengan akses standar (tanpa fitur administrasi)', true);

-- Admin dapet semua permission, Member gak dapet satupun (sama seperti perilaku hari ini)
INSERT INTO `role_permissions` (`role_id`, `permission_id`)
SELECT (SELECT `id` FROM `roles` WHERE `name` = 'Admin'), `id` FROM `permissions`;

-- AlterTable: tambah role_id nullable dulu buat backfill dari kolom enum lama
ALTER TABLE `users` ADD COLUMN `role_id` INTEGER UNSIGNED NULL;

UPDATE `users` SET `role_id` = (SELECT `id` FROM `roles` WHERE `name` = 'Admin') WHERE `role` = 'admin';
UPDATE `users` SET `role_id` = (SELECT `id` FROM `roles` WHERE `name` = 'Member') WHERE `role_id` IS NULL;

-- AlterTable: role_id wajib diisi dari sini
ALTER TABLE `users` MODIFY COLUMN `role_id` INTEGER UNSIGNED NOT NULL;
ALTER TABLE `users` DROP COLUMN `role`;

-- CreateIndex
CREATE INDEX `idx_user_role_id` ON `users`(`role_id`);

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `fk_user_role` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
