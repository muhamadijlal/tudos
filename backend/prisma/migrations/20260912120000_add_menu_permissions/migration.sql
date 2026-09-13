-- Permission gate buat SEMUA menu (bukan cuma menu administrasi) — biar role
-- custom bisa dibatasin menu mana aja yang boleh diakses.
INSERT INTO `permissions` (`key`, `label`, `group`) VALUES
    ('menu.dashboard', 'Akses menu Dashboard', 'Menu'),
    ('menu.tudos', 'Akses menu Tudos', 'Menu'),
    ('menu.kanban', 'Akses menu Kanban', 'Menu'),
    ('menu.timeline', 'Akses menu Timeline', 'Menu'),
    ('menu.projects', 'Akses menu Project', 'Menu'),
    ('menu.projectsManage', 'Akses menu Management Project', 'Menu');

-- Menu-menu ini sebelumnya kebuka buat SEMUA role (gak dibatasi sama sekali)
-- — jadi biar perilaku existing gak berubah, semua role yang udah ada
-- (termasuk role custom yang mungkin udah dibuat) otomatis dapet akses
-- ke semua menu ini. Role baru yang dibuat SETELAH migration ini gak
-- otomatis dapet — admin yang milih menu apa aja buat role itu.
INSERT INTO `role_permissions` (`role_id`, `permission_id`)
SELECT r.`id`, p.`id`
FROM `roles` r
CROSS JOIN `permissions` p
WHERE p.`key` IN (
    'menu.dashboard', 'menu.tudos', 'menu.kanban',
    'menu.timeline', 'menu.projects', 'menu.projectsManage'
);
