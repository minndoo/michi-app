"use client";

import { H1, H2, H3, Text, View, XStack, YStack } from "@repo/ui";
import {
  Accessibility,
  BookOpenText,
  Check,
  Flower2,
  Plus,
  Sandwich,
} from "@repo/ui/icons";

const tasks = [
  {
    title: "Journal Entry",
    detail: "Daily reflection and gratitude.",
    tag: "MORNING",
    icon: BookOpenText,
  },
  {
    title: "Water Plants",
    detail: "Living room and balcony plants.",
    tag: "HOME",
    icon: Flower2,
  },
  {
    title: "Meal Prep",
    detail: "Prepare lunch for the week.",
    tag: "WEEKLY",
    icon: Sandwich,
  },
  {
    title: "Meditation",
    detail: "10 minutes mindfulness.",
    tag: "WELLNESS",
    icon: Accessibility,
  },
];

export const TasksScreen = () => {
  return (
    <YStack>
      <YStack gap="$1.5">
        <H1 color="$outlineColor">My Tasks</H1>
      </YStack>

      <YStack gap="$3" pb="$2">
        <XStack
          items="center"
          gap="$4"
          borderBottomWidth={1}
          borderColor="$borderColor"
          pb="$1.5"
        >
          <YStack gap="$1">
            <H2 color="$outlineColor">Active</H2>
            <View minH={4} bg="$outlineColor" rounded={2} />
          </YStack>
          <H2 color="$colorMuted">Completed</H2>
        </XStack>
      </YStack>

      <YStack gap="$3" grow={1}>
        {tasks.map(({ title, detail, tag, icon: Icon }) => (
          <YStack
            key={title}
            bg="$backgroundSoft"
            rounded="$10"
            borderWidth={1}
            borderColor="$borderColor"
            p="$4"
            gap="$3"
          >
            <XStack justify="space-between" items="flex-start">
              <XStack items="center" gap="$3" flex={1}>
                <View
                  minW={64}
                  minH={64}
                  rounded={32}
                  bg="$backgroundStrong"
                  items="center"
                  justify="center"
                >
                  <Icon color="$outlineColor" size={30} />
                </View>
                <YStack gap="$1" flex={1}>
                  <H2 color="$outlineColor">{title}</H2>
                  <Text color="$outlineColor">{detail}</Text>
                </YStack>
              </XStack>
              <View bg="$background" rounded="$7" px="$3" py="$1.5">
                <H3 color="$colorMuted">{tag}</H3>
              </View>
            </XStack>

            <XStack gap="$2">
              <View
                flex={1}
                bg="$backgroundStrong"
                rounded="$6"
                borderWidth={1}
                borderColor="$borderColor"
                items="center"
                justify="center"
                py="$2.5"
              >
                <XStack items="center" gap="$2">
                  <Check color="$outlineColor" />
                  <H3 color="$outlineColor">Complete</H3>
                </XStack>
              </View>
              <View
                flex={1}
                bg="transparent"
                rounded="$6"
                borderWidth={1}
                borderColor="$borderColor"
                items="center"
                justify="center"
                py="$2.5"
              >
                <H3 color="$colorMuted">View Details</H3>
              </View>
            </XStack>
          </YStack>
        ))}
      </YStack>

      <View
        bg="$backgroundHard"
        rounded="$9"
        py="$3"
        px="$4"
        items="center"
        justify="center"
        shadowColor="$shadowColor"
        shadowOpacity={0.16}
        shadowRadius={10}
        shadowOffset={{ width: 0, height: 4 }}
      >
        <XStack items="center" gap="$2">
          <Plus color="$backgroundStrong" />
          <H2 color="$backgroundStrong">Create New Task</H2>
        </XStack>
      </View>
    </YStack>
  );
};
