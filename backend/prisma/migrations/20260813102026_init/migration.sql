-- AlterTable
ALTER TABLE `user` ADD COLUMN `reset_token` VARCHAR(191) NULL,
    ADD COLUMN `reset_token_expiry` DATETIME(3) NULL;
