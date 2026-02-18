import { EditTaskForm } from "@/features/tasks/TaskForm";
import { TaskRouteModal } from "@/features/tasks/components/TaskRouteModal";

type TaskEditModalPageProps = {
  params: Promise<{ id: string }>;
};

export default async function TaskEditModalPage({
  params,
}: TaskEditModalPageProps) {
  const { id } = await params;

  return (
    <TaskRouteModal title="Edit Task">
      <EditTaskForm taskId={id} />
    </TaskRouteModal>
  );
}
