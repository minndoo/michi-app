import {type TamaguiConfig} from "@repo/ui";

declare module "tamagui" {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface TamaguiCustomConfig extends TamaguiConfig {}
}