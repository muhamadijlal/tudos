-- Path relatif file foto profil di disk (storage/profile_picture/xxx.jpg) —
-- diserve lewat GET /users/:id/profile-picture, bukan URL publik langsung.
ALTER TABLE `users` ADD COLUMN `profile_picture` VARCHAR(255) NULL;
