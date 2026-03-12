import { EditTaskForm } from "@/features/tasks/TaskForm";

type TaskEditPageProps = {
  params: Promise<{ id: string }>;
};

export default async function TaskEditPage({ params }: TaskEditPageProps) {
  const { id } = await params;

  return <EditTaskForm taskId={id} />;
}
