"use client";

import { UIProvider as UIProviderBase } from "@repo/ui";

export const UIProvider = ({ children }: React.PropsWithChildren) => {
  return <UIProviderBase>{children}</UIProviderBase>;
};
