import { createTamagui } from "tamagui";
import { defaultConfig } from "@tamagui/config/v5";
import { themes } from "./src/theme/theme";
import { fonts } from "./src/theme/fonts";
import { tokens } from "./src/theme/tokens";

const config = createTamagui({
  ...defaultConfig,
  settings: {
    ...defaultConfig.settings,
    disableRootThemeClass: true,
  },
  themes,
  fonts,
  tokens,
});

export type TamaguiConfig = typeof config;

export default config;
