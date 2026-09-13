-- Project jadi murni container (gak punya due date sendiri lagi) — due date
-- sekarang di level Epic (epics.due_date).
ALTER TABLE `projects` DROP COLUMN `start_date`;
ALTER TABLE `projects` DROP COLUMN `due_date`;
