"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  FormDateInput,
  FormInput,
  FormSelect,
  FormTextArea,
  type FormSelectOption,
} from "@repo/form";
import { Button, Text, View, YStack } from "@repo/ui";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { useGetGoals } from "@/features/goals/hooks/useGetGoals";
import { taskFormSchema, type TaskFormValues } from "./schema";

export type TaskFormProps = {
  mode: "create" | "edit";
  taskId?: string;
};

export const TaskForm = ({ mode, taskId }: TaskFormProps) => {
  const { data: goalsData, isLoading: isGoalsLoading } = useGetGoals();
  const goalOptions = useMemo<FormSelectOption[]>(
    () =>
      (goalsData?.data ?? []).map((goal) => ({
        label: goal.title,
        value: goal.id,
      })),
    [goalsData?.data],
  );

  const { control, handleSubmit } = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: "",
      description: "",
      dueDate: "",
      goalId: "",
    },
  });

  // TODO: wire create and edit endpoints
  const onSubmit = () => {};

  return (
    <YStack gap="$4">
      <View
        bg="$backgroundSoft"
        rounded="$10"
        borderWidth={1}
        borderColor="$borderColor"
        p="$4"
      >
        <Text color="$outlineColor">TaskForm</Text>
        <Text color="$colorMuted">Mode: {mode}</Text>
        {taskId ? <Text color="$colorMuted">Task ID: {taskId}</Text> : null}
      </View>

      <YStack gap="$4" maxW="100%">
        <FormInput
          control={control}
          name="title"
          label="Title"
          placeholder="Task title"
          required
        />
        <FormTextArea
          control={control}
          name="description"
          label="Description"
          placeholder="Task description"
        />
        <FormDateInput
          control={control}
          name="dueDate"
          label="Due Date"
          placeholder="YYYY-MM-DD"
          required
        />
        <FormSelect
          control={control}
          name="goalId"
          label="Goal"
          placeholder={isGoalsLoading ? "Loading goals..." : "Select goal"}
          options={goalOptions}
          emptyOptionLabel="No goal"
          disabled={isGoalsLoading}
        />
        <Button variant="outlined" onPress={handleSubmit(onSubmit)}>
          Save task
        </Button>
      </YStack>
    </YStack>
  );
};
