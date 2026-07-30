-- AlterTable
ALTER TABLE "reminders" ADD COLUMN     "parentReminderId" TEXT,
ADD COLUMN     "recurrence" TEXT,
ADD COLUMN     "recurrenceInterval" INTEGER,
ADD COLUMN     "recurrenceUntil" TEXT;

-- CreateIndex
CREATE INDEX "reminders_parentReminderId_idx" ON "reminders"("parentReminderId");

-- AddForeignKey
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_parentReminderId_fkey" FOREIGN KEY ("parentReminderId") REFERENCES "reminders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

