import { EditTaskForm } from "@/features/tasks/TaskForm";
import { TaskRouteModal } from "@/features/tasks/components/TaskRouteModal";

type TaskEditPageProps = {
  params: Promise<{ id: string }>;
};

export default async function TaskEditPage({ params }: TaskEditPageProps) {
  const { id } = await params;

  return (
    <TaskRouteModal title="Edit Task">
      <EditTaskForm taskId={id} />
    </TaskRouteModal>
  );
}
