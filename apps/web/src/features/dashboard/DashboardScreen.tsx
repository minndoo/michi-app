"use client";

import { H1, H2, Text, View, XStack, YStack } from "@repo/ui";
import {
  Accessibility,
  Bell,
  BookOpen,
  ChevronRight,
  Droplets,
  Leaf,
  Menu,
  Check,
} from "@repo/ui/icons";
import { Section } from "./components/Section";

const tasks = [
  { label: "Read for 20 minutes", done: false },
  { label: "Meditate for 10 minutes", done: false },
  { label: "Morning stretching", done: true },
  { label: "Go for a walk", done: false },
];

const goals = [
  {
    title: "Weekly Cardio",
    subtitle: "4 / 5 sessions completed",
    progress: 80,
    icon: Accessibility,
  },
  {
    title: "Reading",
    subtitle: "90 / 200 pages read",
    progress: 45,
    icon: BookOpen,
  },
  {
    title: "Hydration",
    subtitle: "600 / 2000 ml consumed",
    progress: 30,
    icon: Droplets,
  },
];

export const DashboardScreen = () => {
  return (
    <YStack minH="100vh" bg="$background" justify="space-between">
      <YStack px="$4" gap="$4" maxW="$screen.xl" mx="auto" width="100%">
        <XStack items="center" justify="space-between" py="$4">
          <XStack items="center" gap="$2">
            <Leaf size={34} color="$outlineColor" />
            <Text color="$outlineColor" fontWeight="bold">
              Michi
            </Text>
          </XStack>
          <XStack items="center" gap="$4">
            <Bell size={34} color="$colorMuted" />
            <Menu size={34} color="$colorMuted" />
          </XStack>
        </XStack>

        <YStack maxW="$screen.xl" gap="$3">
          <YStack gap="$1.5" py="$2">
            <H1 color="$color" fontWeight="700">
              Good Morning, Sarah
            </H1>
            <Text color="$colorMuted">
              Here&apos;s to a positive day ahead.
            </Text>
          </YStack>
          <View
            bg="$backgroundSoft"
            rounded="$radius.6"
            p="$5"
            borderWidth={1}
            borderColor="$borderColor"
          >
            <XStack justify="space-between" items="center" mb="$2">
              <Text color="$outlineColor" fontWeight="600" letterSpacing={1}>
                TODAY&apos;S FOCUS
              </Text>
              <ChevronRight size={28} color="$outlineColor" />
            </XStack>
            <YStack gap="$1">
              <H2 color="$color">Mindful Morning Routine</H2>
              <Text color="$colorMuted">
                Take 10 minutes for a mindful start.
              </Text>
            </YStack>
          </View>

          <Section title="Today's Tasks" contentGap="$3">
            <YStack gap="$3">
              {tasks.map((task) => (
                <XStack key={task.label} items="center" gap="$3">
                  <View
                    minW={40}
                    minH={40}
                    rounded="$4"
                    borderWidth={2}
                    borderColor={task.done ? "$outlineColor" : "$borderColor"}
                    bg={task.done ? "$outlineColor" : "transparent"}
                    items="center"
                    justify="center"
                  >
                    {task.done ? (
                      <Check size={23} color="$backgroundStrong" />
                    ) : null}
                  </View>
                  <Text
                    color={task.done ? "$colorMuted" : "$color"}
                    textDecorationLine={task.done ? "line-through" : "none"}
                  >
                    {task.label}
                  </Text>
                </XStack>
              ))}
            </YStack>
          </Section>

          <Section title="Goal Progress" contentGap="$4">
            <YStack gap="$4">
              {goals.map(({ title, subtitle, progress, icon: Icon }) => (
                <YStack key={title} gap="$1.5">
                  <XStack justify="space-between" items="center">
                    <XStack items="center" gap="$2">
                      <Icon size={30} color="$outlineColor" />
                      <Text color="$color">{title}</Text>
                    </XStack>
                    <Text color="$outlineColor" fontWeight="600">
                      {progress}%
                    </Text>
                  </XStack>
                  <View
                    minH={16}
                    rounded="$6"
                    bg="$backgroundSoft"
                    overflow="hidden"
                  >
                    <View
                      minH={16}
                      bg="$backgroundHard"
                      rounded="$6"
                      style={{ width: `${progress}%` }}
                    />
                  </View>
                  <Text color="$colorMuted">{subtitle}</Text>
                </YStack>
              ))}
            </YStack>
          </Section>
        </YStack>
      </YStack>
    </YStack>
  );
};
