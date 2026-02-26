import { CreateTaskForm } from "@/features/tasks/TaskForm";

type TaskCreatePageProps = {
  searchParams: Promise<{ goalId?: string | string[] }>;
};

const getGoalIdFromSearchParams = (goalId?: string | string[]) =>
  Array.isArray(goalId) ? goalId[0] : goalId;

export default async function TaskCreatePage({
  searchParams,
}: TaskCreatePageProps) {
  const resolvedSearchParams = await searchParams;

  return (
    <CreateTaskForm
      defaultGoalId={getGoalIdFromSearchParams(resolvedSearchParams.goalId)}
    />
  );
}
