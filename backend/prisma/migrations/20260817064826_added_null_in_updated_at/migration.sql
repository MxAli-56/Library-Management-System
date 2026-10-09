-- AlterTable
ALTER TABLE `access` MODIFY `updated_at` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `book` MODIFY `updated_at` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `book_borrow` MODIFY `updated_at` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `book_request` MODIFY `updated_at` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `branch` MODIFY `updated_at` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `late_return` MODIFY `updated_at` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `membership` MODIFY `updated_at` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `role` MODIFY `updated_at` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `role_access` MODIFY `updated_at` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `status` MODIFY `updated_at` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `user` MODIFY `updated_at` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `user_branch` MODIFY `updated_at` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `user_late` MODIFY `updated_at` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `user_membership` MODIFY `updated_at` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `user_role` MODIFY `updated_at` DATETIME(3) NULL;
