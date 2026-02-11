"use client";

import { H1, H2, Text, View, XStack, YStack } from "@repo/ui";
import { Accessibility, BookOpen, Dumbbell, Moon, Plus } from "@repo/ui/icons";

const goals = [
  {
    title: "Exercise Regularly",
    progressText: "4 / 5 Days This Week",
    note: "Keep it up!",
    progress: 80,
    icon: Dumbbell,
  },
  {
    title: "Read More Books",
    progressText: "2 / 3 Books This Month",
    note: "Almost there!",
    progress: 65,
    icon: BookOpen,
  },
  {
    title: "Practice Meditation",
    progressText: "6 / 7 Sessions This Week",
    note: "Stay centered.",
    progress: 85,
    icon: Accessibility,
  },
];

export const GoalsScreen = () => {
  return (
    <YStack>
      <YStack gap="$3" pb="$2">
        <H1 color="$outlineColor">My Goals</H1>
        <XStack
          items="center"
          gap="$4"
          borderBottomWidth={1}
          borderColor="$borderColor"
          pb="$1.5"
        >
          <View bg="$backgroundSoft" px="$4" py="$2" rounded="$6">
            <Text color="$outlineColor">Active</Text>
          </View>
          <Text color="$colorMuted">Completed</Text>
        </XStack>
      </YStack>

      <YStack gap="$4" pb="$3">
        {goals.map(({ title, progressText, note, progress, icon: Icon }) => (
          <YStack
            key={title}
            bg="$backgroundSoft"
            rounded="$11"
            p="$4"
            borderWidth={1}
            borderColor="$borderColor"
            gap="$3"
          >
            <XStack items="center" gap="$3">
              <View
                minW={72}
                minH={72}
                rounded={36}
                bg="$background"
                items="center"
                justify="center"
              >
                <Icon color="$outlineColor" size={30} />
              </View>
              <YStack gap="$1">
                <Text color="$color" fontWeight="bold">
                  {title}
                </Text>
                <Text color="$color">{progressText}</Text>
              </YStack>
            </XStack>

            <View
              minH={18}
              rounded="$6"
              bg="$backgroundStrong"
              overflow="hidden"
            >
              <View
                minH={18}
                rounded="$6"
                bg="$backgroundHard"
                style={{ width: `${progress}%` }}
              />
            </View>

            <XStack items="center" justify="space-between">
              <Text color="$colorMuted" fontStyle="italic">
                {note}
              </Text>
              <View
                bg="$backgroundStrong"
                borderWidth={1}
                borderColor="$borderColor"
                rounded="$6"
                px="$4"
                py="$2"
              >
                <Text color="$color">View Details</Text>
              </View>
            </XStack>
          </YStack>
        ))}
      </YStack>

      <View
        bg="$backgroundHard"
        rounded="$10"
        py="$3"
        px="$4"
        items="center"
        justify="center"
        shadowColor="$shadowColor"
        shadowOpacity={0.15}
        shadowRadius={10}
        shadowOffset={{ width: 0, height: 4 }}
      >
        <XStack items="center" gap="$2">
          <Plus color="$backgroundStrong" />
          <H2 color="$backgroundStrong">Set New Goal</H2>
        </XStack>
      </View>

      <View
        position="fixed"
        b={24}
        r={24}
        minW={88}
        minH={88}
        rounded={44}
        bg="$color"
        items="center"
        justify="center"
      >
        <Moon color="$backgroundStrong" />
      </View>
    </YStack>
  );
};
