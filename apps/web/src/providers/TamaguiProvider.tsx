"use client";

import { TamaguiProvider as TamaguiProviderBase } from "tamagui";
import tamaguiConfig from "../../tamagui.config";

export default function TamaguiProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <TamaguiProviderBase defaultTheme="light" config={tamaguiConfig}>
      {children}
    </TamaguiProviderBase>
  );
}
