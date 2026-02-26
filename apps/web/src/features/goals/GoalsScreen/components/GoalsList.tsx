"use client";

import { useState } from "react";
import { Select, Text, View, XStack, YStack } from "@repo/ui";
import { ChevronDown } from "@repo/ui/icons";
import {
  GoalOrder,
  type GetGoalsParams,
  type GoalStatus,
} from "@/lib/api/generated/model";
import { useGetGoals } from "../../hooks/useGetGoals";
import { GoalItem } from "./GoalItem";

export interface GoalsListProps {
  status: GoalStatus;
}

type GoalsListOrder = NonNullable<GetGoalsParams["order"]>;

const ORDER_OPTIONS: { label: string; value: GoalsListOrder }[] = [
  { label: "Recent", value: GoalOrder.Recent },
  { label: "Relevant", value: GoalOrder.Relevant },
];

export const GoalsList = ({ status }: GoalsListProps) => {
  const [order, setOrder] = useState<GoalsListOrder>(GoalOrder.Recent);
  const { data, isLoading, isError, error } = useGetGoals(status, order);
  const goals = data?.data ?? [];

  const orderSelect = (
    <XStack justify="flex-end">
      <Select
        value={order}
        onValueChange={(nextValue) => setOrder(nextValue as GoalsListOrder)}
      >
        <Select.Trigger
          iconAfter={ChevronDown}
          borderRadius={9}
          borderWidth={1}
          borderColor="$borderColor"
          backgroundColor="$background"
          minW={120}
        >
          <Select.Value placeholder="Order" />
        </Select.Trigger>
        <Select.Content zIndex={200000}>
          <Select.Viewport
            background="$background"
            borderWidth={1}
            borderColor="$borderColor"
            overflow="hidden"
            style={{ borderRadius: 9 }}
          >
            {ORDER_OPTIONS.map((option, index) => (
              <Select.Item
                key={option.value}
                index={index}
                value={option.value}
                borderTopWidth={index === 0 ? 0 : 1}
                borderColor="$borderColor"
                style={{
                  paddingTop: 10,
                  paddingBottom: 10,
                  paddingLeft: 13,
                  paddingRight: 13,
                }}
              >
                <Select.ItemText>{option.label}</Select.ItemText>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select>
    </XStack>
  );

  if (isLoading) {
    return (
      <YStack gap="$3" grow={1}>
        {orderSelect}
        <View
          bg="$white3"
          rounded="$10"
          borderWidth={1}
          borderColor="$borderColor"
          p="$4"
        >
          <Text color="$color8">Loading goals...</Text>
        </View>
      </YStack>
    );
  }

  if (isError) {
    return (
      <YStack gap="$3" grow={1}>
        {orderSelect}
        <View
          bg="$white3"
          rounded="$10"
          borderWidth={1}
          borderColor="$borderColor"
          p="$4"
        >
          <Text color="$color8">
            {error instanceof Error ? error.message : "Failed to load goals"}
          </Text>
        </View>
      </YStack>
    );
  }

  if (goals.length === 0) {
    return (
      <YStack gap="$3" grow={1}>
        {orderSelect}
        <View
          bg="$white3"
          rounded="$10"
          borderWidth={1}
          borderColor="$borderColor"
          p="$4"
        >
          <Text color="$color8">No goals found.</Text>
        </View>
      </YStack>
    );
  }

  return (
    <YStack gap="$3" grow={1}>
      {orderSelect}
      {goals.map((goal) => (
        <GoalItem key={goal.id} goal={goal} />
      ))}
    </YStack>
  );
};
