-- CreateTable
CREATE TABLE "project_favorites" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_favorites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "project_favorites_projectId_idx" ON "project_favorites"("projectId");

-- CreateIndex
CREATE INDEX "project_favorites_userId_idx" ON "project_favorites"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "project_favorites_projectId_userId_key" ON "project_favorites"("projectId", "userId");

-- AddForeignKey
ALTER TABLE "project_favorites" ADD CONSTRAINT "project_favorites_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_favorites" ADD CONSTRAINT "project_favorites_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: preserva el comportamiento actual en el momento del cambio —
-- todo miembro de la empresa que ya veía un proyecto "destacado" (flag
-- global) lo sigue viendo destacado en su propio sidebar justo después
-- de este despliegue. A partir de aquí cada quien lo maneja por su cuenta.
INSERT INTO "project_favorites" ("id", "projectId", "userId", "createdAt")
SELECT
  'fav_' || substr(md5(random()::text || clock_timestamp()::text || p."id" || cm."userId"), 1, 20),
  p."id",
  cm."userId",
  now()
FROM "projects" p
JOIN "company_memberships" cm ON cm."companyId" = p."companyId"
WHERE p."featured" = true
ON CONFLICT DO NOTHING;

-- AlterTable
ALTER TABLE "projects" DROP COLUMN "featured";
