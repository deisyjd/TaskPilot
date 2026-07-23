-- AlterTable
ALTER TABLE "project_members" ADD COLUMN     "role" TEXT NOT NULL DEFAULT 'editor';

-- AlterTable
ALTER TABLE "task_assignees" ADD COLUMN     "role" TEXT NOT NULL DEFAULT 'editor';
