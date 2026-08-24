-- Fase A (alta concurrencia): índices para columnas calientes, índices
-- compuestos para los ORDER BY del hot path, y unicidad de ocurrencias de
-- recurrencia (blindaje contra duplicados creados en carrera).
--
-- Incluye una deduplicación PUNTUAL de ocurrencias duplicadas preexistentes
-- (las que pudo crear la generación concurrente antigua) antes de crear los
-- índices únicos. Solo afecta ocurrencias generadas (parentTaskId /
-- parentReminderId NO nulo); conserva la más antigua de cada grupo. Las
-- plantillas (parent = null) nunca se tocan.

-- 1) Deduplicar ocurrencias de tareas recurrentes (conserva la más antigua)
DELETE FROM "tasks"
WHERE "id" IN (
  SELECT "id" FROM (
    SELECT "id",
           ROW_NUMBER() OVER (
             PARTITION BY "parentTaskId", "dueDate"
             ORDER BY "createdAt" ASC, "id" ASC
           ) AS rn
    FROM "tasks"
    WHERE "parentTaskId" IS NOT NULL
  ) ranked
  WHERE ranked.rn > 1
);

-- 2) Deduplicar ocurrencias de recordatorios recurrentes
DELETE FROM "reminders"
WHERE "id" IN (
  SELECT "id" FROM (
    SELECT "id",
           ROW_NUMBER() OVER (
             PARTITION BY "parentReminderId", "dueDate"
             ORDER BY "createdAt" ASC, "id" ASC
           ) AS rn
    FROM "reminders"
    WHERE "parentReminderId" IS NOT NULL
  ) ranked
  WHERE ranked.rn > 1
);

-- 3) Índices de columnas calientes y compuestos
CREATE INDEX "tasks_companyId_status_idx" ON "tasks"("companyId", "status");
CREATE INDEX "tasks_companyId_createdAt_idx" ON "tasks"("companyId", "createdAt");
CREATE INDEX "comments_taskId_idx" ON "comments"("taskId");
CREATE INDEX "checklist_items_taskId_idx" ON "checklist_items"("taskId");
CREATE INDEX "checklist_items_assigneeId_idx" ON "checklist_items"("assigneeId");
CREATE INDEX "reminders_companyId_dueDate_idx" ON "reminders"("companyId", "dueDate");

-- 4) Reemplazar índices simples por los compuestos que los superan (el
--    compuesto sirve también las consultas por la primera columna)
DROP INDEX "messages_conversationId_idx";
CREATE INDEX "messages_conversationId_createdAt_idx" ON "messages"("conversationId", "createdAt");
DROP INDEX "history_events_companyId_idx";
CREATE INDEX "history_events_companyId_timestamp_idx" ON "history_events"("companyId", "timestamp");

-- 5) Unicidad de ocurrencias de recurrencia (evita duplicados en carrera)
CREATE UNIQUE INDEX "tasks_parentTaskId_dueDate_key" ON "tasks"("parentTaskId", "dueDate");
CREATE UNIQUE INDEX "reminders_parentReminderId_dueDate_key" ON "reminders"("parentReminderId", "dueDate");
