"use client";

import React from "react";
import { TamaguiProvider as TamaguiProviderBase } from "tamagui";
import tamaguiConfig from "../tamagui.config";

export const UIProvider = ({ children }: React.PropsWithChildren) => {
  return (
    <TamaguiProviderBase defaultTheme="light" config={tamaguiConfig}>
      {children}
    </TamaguiProviderBase>
  );
};
