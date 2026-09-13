-- AlterTable: profil tambahan buat export Daily Activity (nama resmi + NIK
-- user itu sendiri, plus unit & data Penanggung Jawab/atasan yang diisi
-- lewat popup export dan disimpen di sini biar gak nanya ulang tiap export).
ALTER TABLE `users`
    ADD COLUMN `full_name` VARCHAR(150) NULL,
    ADD COLUMN `nik` VARCHAR(50) NULL,
    ADD COLUMN `unit` VARCHAR(100) NULL,
    ADD COLUMN `supervisor_name` VARCHAR(150) NULL,
    ADD COLUMN `supervisor_nik` VARCHAR(50) NULL;

-- CreateTable: master kalender libur nasional Indonesia
CREATE TABLE `national_holidays` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `date` DATE NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `unq_national_holiday_date`(`date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Permission baru buat kelola kalender libur (harus tetap sinkron dengan
-- src/utils/permissions.js)
INSERT INTO `permissions` (`key`, `label`, `group`) VALUES
    ('holidays.manage', 'Kelola kalender libur nasional', 'Holidays');

-- Fitur ini baru dibuat sekarang (belum pernah ada sebelumnya), jadi gak ada
-- perilaku existing yang perlu dipertahankan — cukup role Admin yang
-- otomatis dapet, sama kayak categories.manage/roles.manage.
INSERT INTO `role_permissions` (`role_id`, `permission_id`)
SELECT r.`id`, p.`id`
FROM `roles` r
CROSS JOIN `permissions` p
WHERE r.`name` = 'Admin' AND p.`key` = 'holidays.manage';
