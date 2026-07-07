-- CreateTable
CREATE TABLE "task_assignees" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_assignees_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "task_assignees_taskId_idx" ON "task_assignees"("taskId");

-- CreateIndex
CREATE INDEX "task_assignees_userId_idx" ON "task_assignees"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "task_assignees_taskId_userId_key" ON "task_assignees"("taskId", "userId");

-- AddForeignKey
ALTER TABLE "task_assignees" ADD CONSTRAINT "task_assignees_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_assignees" ADD CONSTRAINT "task_assignees_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- DataMigration: copy existing tasks.assignee (name string) into task_assignees,
-- matching a user with that name who belongs to the task's own company.
-- This is the only data we have to migrate legacy assignments off the old
-- string column before dropping it.
INSERT INTO "task_assignees" ("id", "taskId", "userId", "createdAt")
SELECT t."id" || '-tas-' || u."id", t."id", u."id", CURRENT_TIMESTAMP
FROM "tasks" t
JOIN "users" u ON u."name" = t."assignee"
JOIN "company_memberships" cm ON cm."userId" = u."id" AND cm."companyId" = t."companyId"
WHERE t."assignee" IS NOT NULL AND t."assignee" <> ''
ON CONFLICT DO NOTHING;

-- AlterTable
ALTER TABLE "tasks" DROP COLUMN "assignee",
ADD COLUMN     "parentTaskId" TEXT,
ADD COLUMN     "recurrence" TEXT,
ADD COLUMN     "recurrenceInterval" INTEGER,
ADD COLUMN     "recurrenceUntil" TEXT;

-- CreateIndex
CREATE INDEX "tasks_parentTaskId_idx" ON "tasks"("parentTaskId");

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_parentTaskId_fkey" FOREIGN KEY ("parentTaskId") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
