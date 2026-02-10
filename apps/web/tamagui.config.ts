import tamaguiConfig, { type TamaguiConfig } from "@repo/ui/config";

declare module "tamagui" {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface TamaguiCustomConfig extends TamaguiConfig {}
}

export default tamaguiConfig;
