-- Halaman "Management Epic" (list flat semua epic lintas project + create/
-- edit/delete) — permission baru, harus tetap sinkron dengan
-- src/utils/permissions.js.
INSERT INTO `permissions` (`key`, `label`, `group`) VALUES
    ('menu.epicsManage', 'Akses menu Management Epic', 'Menu');

-- Role yang udah punya menu.projectsManage otomatis dapet menu.epicsManage
-- juga (siapa pun yang ngatur Project wajar juga ngatur Epic-nya) — sama
-- pola kayak migration holidays_view_permission.
INSERT INTO `role_permissions` (`role_id`, `permission_id`)
SELECT rp.`role_id`, p.`id`
FROM `role_permissions` rp
JOIN `permissions` mp ON mp.`id` = rp.`permission_id` AND mp.`key` = 'menu.projectsManage'
JOIN `permissions` p ON p.`key` = 'menu.epicsManage';
