-- Non-admin sekarang gak bisa milih owner epic ke user lain (cuma bisa
-- dirinya sendiri) — permission baru, harus tetap sinkron dengan
-- src/utils/permissions.js.
INSERT INTO `permissions` (`key`, `label`, `group`) VALUES
    ('epics.assignOwner', 'Assign owner epic ke user lain', 'Epics');

-- Cuma role Admin yang otomatis dapet (beda dari pola migration sebelumnya
-- yang nurunin ke role terkait) — sengaja dibatasin ketat, role lain (termasuk
-- custom role yang udah ada) harus di-toggle manual sama admin kalau memang mau.
INSERT INTO `role_permissions` (`role_id`, `permission_id`)
SELECT r.`id`, p.`id`
FROM `roles` r
JOIN `permissions` p ON p.`key` = 'epics.assignOwner'
WHERE r.`name` = 'Admin' AND r.`is_system` = true;
