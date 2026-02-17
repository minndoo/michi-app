import { TaskDetail } from "@/features/tasks/TaskDetail";

type TaskDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function TaskDetailPage({ params }: TaskDetailPageProps) {
  const { id } = await params;

  return <TaskDetail taskId={id} />;
}
