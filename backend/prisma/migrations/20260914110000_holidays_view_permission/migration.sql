-- Pisah holidays.manage jadi 2 permission (harus tetap sinkron dengan
-- src/utils/permissions.js) — sama kayak pola roles.view/roles.manage:
-- holidays.view buat lihat kalender libur doang, holidays.manage buat
-- buat/ubah/hapus/sync.
INSERT INTO `permissions` (`key`, `label`, `group`) VALUES
    ('holidays.view', 'Lihat kalender libur nasional', 'Holidays');

-- Role yang udah punya holidays.manage otomatis dapet holidays.view juga
-- (biar gak kehilangan akses buka halaman /holidays yang sekarang digembok
-- holidays.view, bukan holidays.manage lagi).
INSERT INTO `role_permissions` (`role_id`, `permission_id`)
SELECT rp.`role_id`, p.`id`
FROM `role_permissions` rp
JOIN `permissions` mp ON mp.`id` = rp.`permission_id` AND mp.`key` = 'holidays.manage'
JOIN `permissions` p ON p.`key` = 'holidays.view';
