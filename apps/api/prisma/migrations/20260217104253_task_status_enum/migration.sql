-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('TODO', 'DONE');

-- AlterTable
ALTER TABLE "Task"
ADD COLUMN "completedAt" TIMESTAMP(3),
ADD COLUMN "dueAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "status" "TaskStatus" NOT NULL DEFAULT 'TODO';

-- AlterTable
ALTER TABLE "Goal"
ADD COLUMN "completedAt" TIMESTAMP(3),
ADD COLUMN "dueAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Backfill status and completion timestamp
UPDATE "Task"
SET "status" = CASE
  WHEN "completed" THEN 'DONE'::"TaskStatus"
  ELSE 'TODO'::"TaskStatus"
END;

UPDATE "Task"
SET "completedAt" = COALESCE("updatedAt", "createdAt", CURRENT_TIMESTAMP)
WHERE "completed" = true
  AND "completedAt" IS NULL;

-- Remove legacy boolean
ALTER TABLE "Task" DROP COLUMN "completed";
