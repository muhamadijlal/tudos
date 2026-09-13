-- Warna epic (chip/badge di Kanban & Tudos) — default 'blue' buat epic
-- existing (semua project saat ini cuma punya 1 epic, jadi gak perlu
-- round-robin backfill; epic baru ke depannya di-assign otomatis lewat
-- nextEpicColor() di epic.service.js).
ALTER TABLE `epics` ADD COLUMN `color` VARCHAR(20) NOT NULL DEFAULT 'blue';
