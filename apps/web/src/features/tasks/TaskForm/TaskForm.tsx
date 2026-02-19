"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  FormDatePicker,
  FormInput,
  FormSelect,
  FormTextArea,
  type FormSelectOption,
} from "@repo/form";
import { Button, Spinner, Text, View, XStack, YStack } from "@repo/ui";
import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { useGetGoals } from "@/features/goals/hooks/useGetGoals";
import { taskFormSchema, type TaskFormValues } from "./schema";

export type TaskFormProps = {
  defaultValues: TaskFormValues;
  onSubmit: (values: TaskFormValues) => void;
  isSubmitting?: boolean;
  submitLabel?: string;
};

export const TaskForm = ({
  defaultValues,
  onSubmit,
  isSubmitting = false,
  submitLabel = "Save task",
}: TaskFormProps) => {
  const { data: goalsData, isLoading: isGoalsLoading } = useGetGoals();
  const goalOptions = useMemo<FormSelectOption[]>(
    () =>
      (goalsData?.data ?? []).map((goal) => ({
        label: goal.title,
        value: goal.id,
      })),
    [goalsData?.data],
  );

  const { control, handleSubmit, reset } = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues,
  });

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  return (
    <YStack gap="$4">
      <View
        bg="$white3"
        rounded="$10"
        borderWidth={1}
        borderColor="$borderColor"
        p="$4"
      >
        <Text color="$outlineColor">TaskForm</Text>
      </View>

      <YStack gap="$4" maxW="100%">
        <YStack
          gap="$4"
          $md={{
            flexDirection: "row",
            flexWrap: "nowrap",
            justify: "space-between",
          }}
        >
          <FormInput
            control={control}
            name="title"
            label="Title"
            placeholder="Task title"
            grow={1}
          />

          <FormDatePicker
            control={control}
            name="dueAt"
            label="Due Date"
            placeholder="YYYY-MM-DD"
            required
            grow={1}
          />
        </YStack>
        <FormTextArea
          control={control}
          name="description"
          label="Description"
          placeholder="Task description"
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
        <Button
          variant="outlined"
          onPress={handleSubmit(onSubmit)}
          disabled={isSubmitting}
        >
          <XStack items="center" gap="$2">
            {isSubmitting ? <Spinner color="$outlineColor" /> : null}
            <Text color="$outlineColor">{submitLabel}</Text>
          </XStack>
        </Button>
      </YStack>
    </YStack>
  );
};
