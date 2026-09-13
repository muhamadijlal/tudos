-- Tanggal laporan (dipakai buat pengelompokan export Daily Activity) — beda
-- dari created_at yang dikunci ke saat task dibuat, field ini bebas diedit
-- user ke tanggal manapun (termasuk yang udah lewat).
ALTER TABLE `tasks` ADD COLUMN `tgl_laporan` TIMESTAMP(0) NULL;

-- Backfill task lama pakai tanggal created_at-nya masing-masing (proxy
-- historis paling masuk akal, sebelum field ini ada).
UPDATE `tasks` SET `tgl_laporan` = `created_at` WHERE `tgl_laporan` IS NULL;

-- Wajib diisi mulai sekarang — form task selalu ngirim default hari ini.
ALTER TABLE `tasks` MODIFY COLUMN `tgl_laporan` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0);
