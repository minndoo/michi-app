import { CreateTaskForm } from "@/features/tasks/TaskForm";
import { TaskRouteModal } from "@/features/tasks/components/TaskRouteModal";

type TaskCreateModalPageProps = {
  searchParams: Promise<{ goalId?: string | string[] }>;
};

const getGoalIdFromSearchParams = (goalId?: string | string[]) =>
  Array.isArray(goalId) ? goalId[0] : goalId;

export default async function TaskCreateModalPage({
  searchParams,
}: TaskCreateModalPageProps) {
  const resolvedSearchParams = await searchParams;

  return (
    <TaskRouteModal title="Create Task">
      <CreateTaskForm
        defaultGoalId={getGoalIdFromSearchParams(resolvedSearchParams.goalId)}
      />
    </TaskRouteModal>
  );
}
