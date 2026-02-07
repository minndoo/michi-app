"use client";

import {
  TamaguiProvider as TamaguiProviderBase,
  type TamaguiProviderProps,
} from "tamagui";
import tamaguiConfig from "../tamagui.config";

export const UIProvider = ({ children, ...props }: TamaguiProviderProps) => {
  return (
    <TamaguiProviderBase config={tamaguiConfig} {...props}>
      {children}
    </TamaguiProviderBase>
  );
};
