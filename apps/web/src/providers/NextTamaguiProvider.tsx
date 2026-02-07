"use client";

import { NextThemeProvider, useRootTheme } from "@tamagui/next-theme";
import { UIProvider } from "@repo/ui";
import tamaguiConfig from "@repo/ui/config";

export const NextTamaguiProvider = ({ children }: React.PropsWithChildren) => {
  const [theme, setTheme] = useRootTheme();
  return (
    <NextThemeProvider
      skipNextHead
      onChangeTheme={(next) => {
        setTheme(next as "light" | "dark");
      }}
    >
      <UIProvider config={tamaguiConfig} defaultTheme={theme}>
        {children}
      </UIProvider>
    </NextThemeProvider>
  );
};
