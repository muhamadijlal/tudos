-- Ala Jira: Epic sekarang punya start_date juga (rentang, bukan cuma due
-- date/1 titik) — nullable, gak ada validasi yang ngunci task-nya.
ALTER TABLE `epics` ADD COLUMN `start_date` TIMESTAMP NULL AFTER `color`;
