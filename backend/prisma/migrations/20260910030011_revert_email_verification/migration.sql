/*
  Warnings:

  - You are about to drop the column `email_verified_at` on the `users` table. All the data in the column will be lost.
  - You are about to drop the `email_verification_tokens` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `email_verification_tokens` DROP FOREIGN KEY `fk_email_verification_token_user`;

-- AlterTable
ALTER TABLE `users` DROP COLUMN `email_verified_at`;

-- DropTable
DROP TABLE `email_verification_tokens`;
