-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "attachments" JSONB,
ADD COLUMN     "coverImageUrl" TEXT,
ADD COLUMN     "links" JSONB;
