-- "Unit" diganti istilah jadi "Department" (sekarang wajib diisi pas
-- register user baru) — rename kolom, bukan drop+create, biar data yang
-- udah sempet keisi (lewat popup export Daily Activity) gak ilang.
ALTER TABLE `users` CHANGE COLUMN `unit` `department` VARCHAR(100) NULL;

-- NIK ternyata cuma boleh angka 5-8 digit (divalidasi di aplikasi) — kolom
-- dipersempit ke VARCHAR(8) biar konsisten sama batas maksimalnya.
ALTER TABLE `users` MODIFY COLUMN `nik` VARCHAR(8) NULL;
ALTER TABLE `users` MODIFY COLUMN `supervisor_nik` VARCHAR(8) NULL;

-- Jabatan Penanggung Jawab (mis. "IT Development Department Head") —
-- sebelumnya auto-generate dari department, sekarang diisi manual lewat
-- popup export biar teksnya bisa bebas gak keiket format tertentu.
ALTER TABLE `users` ADD COLUMN `supervisor_title` VARCHAR(150) NULL;
