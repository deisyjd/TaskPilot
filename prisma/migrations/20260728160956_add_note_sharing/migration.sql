-- AlterTable
ALTER TABLE "notes" ADD COLUMN     "createdById" TEXT;

-- CreateTable
CREATE TABLE "note_shares" (
    "id" TEXT NOT NULL,
    "noteId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'viewer',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "note_shares_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "note_shares_noteId_idx" ON "note_shares"("noteId");

-- CreateIndex
CREATE INDEX "note_shares_userId_idx" ON "note_shares"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "note_shares_noteId_userId_key" ON "note_shares"("noteId", "userId");

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "note_shares" ADD CONSTRAINT "note_shares_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "note_shares" ADD CONSTRAINT "note_shares_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: empareja notas existentes (solo tienen un nombre en "createdBy")
-- con un usuario real de la misma empresa, para que puedan ser dueñas de su
-- nota bajo el nuevo modelo de privacidad. Si el nombre coincide con más de
-- un usuario de la empresa (ambiguo) o con ninguno, se deja createdById en
-- NULL — esa nota conserva el comportamiento anterior (visible para todo
-- el que vea el proyecto) en vez de desaparecer.
WITH candidate_matches AS (
  SELECT
    n."id" AS note_id,
    u."id" AS user_id,
    COUNT(*) OVER (PARTITION BY n."id") AS match_count
  FROM "notes" n
  JOIN "company_memberships" cm ON cm."companyId" = n."companyId"
  JOIN "users" u ON u."id" = cm."userId" AND u."name" = n."createdBy"
  WHERE n."createdBy" IS NOT NULL
)
UPDATE "notes" n
SET "createdById" = cm2.user_id
FROM candidate_matches cm2
WHERE cm2.note_id = n."id" AND cm2.match_count = 1;
