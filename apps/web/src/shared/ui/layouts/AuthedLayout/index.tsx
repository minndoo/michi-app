"use client";

import { Button, Nav, Text, View, XStack, YStack } from "@repo/ui";
import { Menu } from "@repo/ui/icons";
import Link from "next/link";
import { useState } from "react";

export const AuthedLayout = ({ children }: { children: React.ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const isOpacityOpen = isOpen ? 1 : 0;

  return (
    <XStack>
      <View shrink={0} overflow="hidden" width="auto" opacity={1}>
        <View
          position="fixed"
          $lg={{ position: "sticky" }}
          width={isOpen ? "$20" : "$3"}
          z="$zIndex.5"
        >
          <Nav
            position="fixed"
            l={0}
            borderColor="$black"
            borderRightWidth={1}
            height="100dvh"
            width="inherit"
            grow={1}
          >
            <XStack py="$2" position="relative">
              <Text opacity={isOpacityOpen}>Michi</Text>
              <Button
                icon={<Menu color="$black" />}
                onClick={() => setIsOpen(!isOpen)}
                position="absolute"
                t="$2"
                r="$2"
                background="transparent"
                p="$0.25"
                height="$1"
                borderColor="transparent"
              />
            </XStack>
            <YStack grow={1} opacity={isOpacityOpen}>
              <Link href="/dashboard">
                <Text>Dashboard</Text>
              </Link>
              <Link href="/goals">
                <Text>Goals</Text>
              </Link>
              <Link href="/tasks">
                <Text>Tasks</Text>
              </Link>
              <Link href="/ai/test">
                <Text>Assistant</Text>
              </Link>
            </YStack>
            <XStack opacity={isOpacityOpen}>
              <Text>UserProfile</Text>
              <Text>User</Text>
            </XStack>
          </Nav>
        </View>
      </View>
      {/* body */}
      <YStack pt="$10" px="$4" mx="auto" maxW="$screen.md" width="100%">
        {children}
      </YStack>
    </XStack>
  );
};
