-- CreateEnum
CREATE TYPE "GoalStatus" AS ENUM ('TODO', 'INPROGRESS', 'DONE');

-- AlterTable
ALTER TABLE "Goal"
ADD COLUMN "status" "GoalStatus" NOT NULL DEFAULT 'TODO';

-- Backfill goal status from linked task completion state
UPDATE "Goal" AS goal
SET "status" = CASE
  WHEN counts.total_tasks = 0 THEN 'TODO'::"GoalStatus"
  WHEN counts.completed_tasks = counts.total_tasks THEN 'DONE'::"GoalStatus"
  ELSE 'INPROGRESS'::"GoalStatus"
END
FROM (
  SELECT
    goal_inner.id,
    COUNT(task.id)::INT AS total_tasks,
    COUNT(task.id) FILTER (WHERE task.status = 'DONE')::INT AS completed_tasks
  FROM "Goal" AS goal_inner
  LEFT JOIN "Task" AS task ON task."goalId" = goal_inner.id
  GROUP BY goal_inner.id
) AS counts
WHERE goal.id = counts.id;
