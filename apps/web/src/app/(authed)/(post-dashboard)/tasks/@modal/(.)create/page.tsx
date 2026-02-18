import { CreateTaskForm } from "@/features/tasks/TaskForm";
import { TaskRouteModal } from "@/features/tasks/components/TaskRouteModal";

export default function TaskCreateModalPage() {
  return (
    <TaskRouteModal title="Create Task">
      <CreateTaskForm />
    </TaskRouteModal>
  );
}
