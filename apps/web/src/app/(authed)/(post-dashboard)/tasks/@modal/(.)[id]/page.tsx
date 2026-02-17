import { TaskDetail } from "@/features/tasks/TaskDetail";
import { TaskRouteModal } from "@/features/tasks/components/TaskRouteModal";

type TaskDetailModalPageProps = {
  params: Promise<{ id: string }>;
};

export default async function TaskDetailModalPage({
  params,
}: TaskDetailModalPageProps) {
  const { id } = await params;

  return (
    <TaskRouteModal title="Task Detail">
      <TaskDetail taskId={id} />
    </TaskRouteModal>
  );
}
