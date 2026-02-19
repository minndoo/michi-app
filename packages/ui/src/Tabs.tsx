"use client";

import { useState, type ReactNode } from "react";
import { Tabs as TamaguiTabs, Text, View } from "tamagui";
import { XStack, YStack } from "./Stack";

export type TabEntry = {
  tabTitle: string;
  tabContent: ReactNode;
};

export type TabsContentMap<TTabs extends readonly string[]> = Record<
  TTabs[number],
  TabEntry
>;

export type AppTabsProps<TTabs extends readonly string[]> = {
  tabs: TTabs;
  tabsContent: TabsContentMap<TTabs>;
  defaultValue?: TTabs[number];
  value?: TTabs[number];
  onValueChange?: (value: TTabs[number]) => void;
};

export const AppTabs = <TTabs extends readonly string[]>({
  tabs,
  tabsContent,
  defaultValue,
  value,
  onValueChange,
}: AppTabsProps<TTabs>) => {
  type TabKey = TTabs[number];
  const initialValue = (defaultValue ?? tabs[0] ?? "") as TabKey;
  const [internalValue, setInternalValue] = useState<TabKey>(initialValue);
  const isControlled = value !== undefined;
  const selectedValue = (isControlled ? value : internalValue) as TabKey;

  const handleValueChange = (nextValue: string) => {
    const next = nextValue as TabKey;
    if (!isControlled) {
      setInternalValue(next);
    }
    onValueChange?.(next);
  };

  return (
    <TamaguiTabs
      defaultValue={initialValue}
      value={isControlled ? selectedValue : undefined}
      onValueChange={handleValueChange}
      orientation="horizontal"
      flexDirection="column"
      gap="$4"
    >
      <TamaguiTabs.List unstyled asChild aria-label="Tabs">
        <XStack
          alignItems="center"
          borderBottomWidth={1}
          borderColor="$borderColor"
        >
          {tabs.map((tabKey) => {
            const key = tabKey as TabKey;
            const isActive = selectedValue === key;
            return (
              <TamaguiTabs.Tab key={key} value={key} asChild>
                <YStack gap="$1" hoverStyle={{ cursor: "pointer" }}>
                  <Text
                    color={isActive ? "$subtleText" : "$primary"}
                    hoverStyle={{ color: "$primaryHover" }}
                  >
                    {tabsContent[key].tabTitle}
                  </Text>
                  <View
                    bg={isActive ? "$subtleText" : "transparent"}
                    minH="$0.25"
                    style={{
                      borderRadius: 7,
                    }}
                  />
                </YStack>
              </TamaguiTabs.Tab>
            );
          })}
        </XStack>
      </TamaguiTabs.List>

      {tabs.map((tabKey) => {
        const key = tabKey as TabKey;
        return (
          <TamaguiTabs.Content key={key} value={key}>
            {tabsContent[key].tabContent}
          </TamaguiTabs.Content>
        );
      })}
    </TamaguiTabs>
  );
};
