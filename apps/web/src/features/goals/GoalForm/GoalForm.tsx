import { zodResolver } from "@hookform/resolvers/zod";
import { FormDatePicker, FormInput, FormTextArea } from "@repo/form";
import { Button, Spinner, Text, View, XStack, YStack } from "@repo/ui";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { goalFormSchema, type GoalFormValues } from "./schema";

export type GoalFormProps = {
  defaultValues: GoalFormValues;
  onSubmit: (values: GoalFormValues) => void;
  isSubmitting?: boolean;
  submitLabel?: string;
};

export const GoalForm = ({
  defaultValues,
  onSubmit,
  isSubmitting = false,
  submitLabel = "Save goal",
}: GoalFormProps) => {
  const { control, handleSubmit, reset } = useForm<GoalFormValues>({
    resolver: zodResolver(goalFormSchema),
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
        <Text color="$outlineColor">GoalForm</Text>
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
            placeholder="Goal title"
            required
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
          placeholder="Goal description"
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
