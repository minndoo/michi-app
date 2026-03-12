"use client";

import { NextThemeProvider } from "@tamagui/next-theme";
import { UIProvider } from "@repo/ui";
import tamaguiConfig from "@repo/ui/config";

export const NextTamaguiProvider = ({ children }: React.PropsWithChildren) => {
  return (
    <NextThemeProvider skipNextHead defaultTheme="light">
      <UIProvider config={tamaguiConfig} defaultTheme="light">
        {children}
      </UIProvider>
    </NextThemeProvider>
  );
};
