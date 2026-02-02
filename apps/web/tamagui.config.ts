import { tamaguiConfig } from "@repo/ui-config";
import type { TamaguiConfig } from "@repo/ui-config";

declare module "tamagui" {
  interface TamaguiCustomConfig extends TamaguiConfig {}
}

export default tamaguiConfig;
