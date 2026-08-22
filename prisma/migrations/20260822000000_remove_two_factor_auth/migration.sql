-- DropTable (arrastra su índice y la FK hacia users)
DROP TABLE "two_factor_backup_codes";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "twoFactorEnabled",
DROP COLUMN "twoFactorSecret";
