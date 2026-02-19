"use client";

import Link from "next/link";
import { Anchor, H1, Text, View, XStack, YStack } from "@repo/ui";
import {
  Accessibility,
  ArrowRight,
  Check,
  Dumbbell,
  Leaf,
} from "@repo/ui/icons";
import { LinkButton } from "@/components/LinkButton";
import { FloatingIconCard } from "./components/FloatingIconCard";
import styles from "./animations.module.css";

const Logo = () => (
  <XStack items="center" justify="center" gap="$2" mt="$2">
    <Leaf size={34} color="$primary" />
    <Text color="$primary" fontSize="$10" fontWeight="700" letterSpacing={0.4}>
      Michi
    </Text>
  </XStack>
);

export const HomepageScreen = () => {
  return (
    <YStack minH="100vh" bg="$background" justify="center" px="$4" py="$6">
      <YStack
        maxW={640}
        width="100%"
        mx="auto"
        gap="$7"
        $md={{ gap: "$8" }}
        style={{ alignSelf: "center" }}
      >
        <Logo />
        <View
          position="relative"
          overflow="hidden"
          rounded="$12"
          bg="$strong"
          borderWidth={1}
          borderColor="$secondary"
          minH={315}
          maxH={315}
          minW={315}
          maxW={315}
          $md={{ minH: 460, maxH: 460, minW: 460, maxW: 460 }}
          $xl={{ minH: 500, maxH: 500, minW: 500, maxW: 500 }}
          style={{ alignSelf: "center" }}
        >
          <View
            position="absolute"
            b={-400}
            l={-120}
            minW={560}
            minH={560}
            $md={{ minH: 605, minW: 605, l: -75 }}
            $xl={{ minH: 645, minW: 645 }}
            style={{ borderRadius: "50%" }}
            bg="$white3"
          />
          <View
            position="absolute"
            b={-125}
            r={-400}
            minW={600}
            minH={250}
            rounded={100}
            $md={{ r: -350 }}
            $xl={{ r: -300, b: -100 }}
            bg="$borderColor"
            opacity={0.35}
          />

          <FloatingIconCard t={72} l={35} className={styles.bounceDelayHalf}>
            <Dumbbell size={30} color="$outlineColor" />
          </FloatingIconCard>
          <FloatingIconCard t={126} r={10} className={styles.bounceDelayNone}>
            <Accessibility size={30} color="$outlineColor" />
          </FloatingIconCard>

          <View
            position="absolute"
            t={200}
            l="50%"
            ml={-39}
            minW={78}
            minH={78}
            bg="$primaryHover"
            rounded="$8"
            items="center"
            justify="center"
            shadowColor="$shadowColor"
            shadowOpacity={0.16}
            shadowRadius={12}
            shadowOffset={{ width: 0, height: 6 }}
            className={styles.bounceDelay1}
          >
            <Check size={34} color="$white2" />
          </View>
        </View>

        <YStack gap="$4" items="center" px="$2">
          <H1 text="center" whiteSpace="pre-line">
            Small steps,{"\n"}big changes.
          </H1>

          <Text
            text="center"
            color="$primary"
            maxW="$20"
            fontSize="$6"
            lineHeight="$6"
          >
            Michi helps you track habits and reach your goals with mindful
            simplicity.
          </Text>
        </YStack>

        <YStack gap="$3" grow={1}>
          <LinkButton
            href="/auth/login?returnTo=/dashboard"
            buttonProps={{
              variant: "primary",
              rounded: "$6",
            }}
          >
            <Text fontSize="$6" fontWeight="500" color="$white2">
              Get started
            </Text>
            <ArrowRight size={24} color="$white2" />
          </LinkButton>

          <LinkButton
            href="/auth/login?returnTo=/dashboard"
            buttonProps={{
              variant: "outlined",
              gap: "$2",
              rounded: "$6",
            }}
          >
            <Text fontSize="$6" fontWeight="500" color="inherit">
              Log in
            </Text>
          </LinkButton>
        </YStack>

        <Text color="$primary" fontSize="$4" text="center" px="$2">
          By continuing, you agree to our{" "}
          <Anchor asChild color="$primary">
            <Link href="/terms" style={{ textDecoration: "underline" }}>
              Terms
            </Link>
          </Anchor>{" "}
          & Privacy Policy.
        </Text>
      </YStack>
    </YStack>
  );
};
