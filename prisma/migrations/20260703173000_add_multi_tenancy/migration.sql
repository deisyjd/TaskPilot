-- Multi-tenancy: expand -> backfill -> contract, safe for the already-populated `wipli` DB.

-- 1. New tables
CREATE TABLE `companies` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `color` VARCHAR(191) NOT NULL DEFAULT '#8B5CF6',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `companies_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `company_memberships` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `role` VARCHAR(191) NOT NULL DEFAULT 'member',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `company_memberships_companyId_idx`(`companyId`),
    UNIQUE INDEX `company_memberships_userId_companyId_key`(`userId`, `companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 2. New columns, nullable for now (tables are already populated)
ALTER TABLE `users` ADD COLUMN `lastActiveCompanyId` VARCHAR(191) NULL;
ALTER TABLE `projects` ADD COLUMN `companyId` VARCHAR(191) NULL;
ALTER TABLE `tasks` ADD COLUMN `companyId` VARCHAR(191) NULL;
ALTER TABLE `tasks` ADD COLUMN `projectId` VARCHAR(191) NULL;
ALTER TABLE `history_events` ADD COLUMN `companyId` VARCHAR(191) NULL;

-- 3. Bootstrap a deterministic "Legacy" company that owns everything that exists today
INSERT INTO `companies` (`id`, `name`, `slug`, `color`, `createdAt`, `updatedAt`)
  VALUES ('legacy-co', 'Wipli (Legacy)', 'legacy', '#8B5CF6', NOW(3), NOW(3));

-- 4. Backfill existing rows onto Legacy
UPDATE `projects` SET `companyId` = 'legacy-co' WHERE `companyId` IS NULL;

UPDATE `tasks` t
  JOIN `projects` p ON t.`projectName` = p.`name`
  SET t.`companyId` = p.`companyId`, t.`projectId` = p.`id`
  WHERE t.`companyId` IS NULL;

UPDATE `history_events` SET `companyId` = 'legacy-co' WHERE `companyId` IS NULL;

-- 5. Give every existing user a membership in Legacy, preserving their current global role
INSERT INTO `company_memberships` (`id`, `userId`, `companyId`, `role`, `createdAt`)
  SELECT CONCAT('mem-legacy-', u.`id`), u.`id`, 'legacy-co', u.`userRole`, NOW(3)
  FROM `users` u;

UPDATE `users` SET `lastActiveCompanyId` = 'legacy-co' WHERE `lastActiveCompanyId` IS NULL;

-- 6. Tighten constraints now that every row is backfilled
ALTER TABLE `projects` MODIFY `companyId` VARCHAR(191) NOT NULL;
ALTER TABLE `tasks` MODIFY `companyId` VARCHAR(191) NOT NULL;
ALTER TABLE `tasks` MODIFY `projectId` VARCHAR(191) NOT NULL;
ALTER TABLE `history_events` MODIFY `companyId` VARCHAR(191) NOT NULL;

-- 7. Drop the old projectName-based FK/unique and the column itself
ALTER TABLE `tasks` DROP FOREIGN KEY `tasks_projectName_fkey`;
ALTER TABLE `tasks` DROP COLUMN `projectName`;
DROP INDEX `projects_name_key` ON `projects`;

-- 8. New indexes
CREATE UNIQUE INDEX `projects_companyId_name_key` ON `projects`(`companyId`, `name`);
CREATE INDEX `tasks_companyId_idx` ON `tasks`(`companyId`);
CREATE INDEX `tasks_projectId_idx` ON `tasks`(`projectId`);
CREATE INDEX `history_events_companyId_idx` ON `history_events`(`companyId`);

-- 9. New foreign keys
ALTER TABLE `company_memberships` ADD CONSTRAINT `company_memberships_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `company_memberships` ADD CONSTRAINT `company_memberships_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `users` ADD CONSTRAINT `users_lastActiveCompanyId_fkey` FOREIGN KEY (`lastActiveCompanyId`) REFERENCES `companies`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `projects` ADD CONSTRAINT `projects_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `history_events` ADD CONSTRAINT `history_events_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
