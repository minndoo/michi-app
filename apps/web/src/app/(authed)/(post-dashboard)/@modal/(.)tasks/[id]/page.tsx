import { TaskDetail } from "@/features/tasks/TaskDetail";
import { TaskRouteModal } from "@/features/tasks/components/TaskRouteModal";

type TaskDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function TaskDetailPage({ params }: TaskDetailPageProps) {
  const { id } = await params;

  return (
    <TaskRouteModal title="Task Detail">
      <TaskDetail taskId={id} />
    </TaskRouteModal>
  );
}
