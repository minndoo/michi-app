import { createTamagui } from "tamagui";
import { defaultConfig } from "@tamagui/config/v5";
import { darkTheme, lightTheme } from "./src/theme/theme";

const config = createTamagui({
  ...defaultConfig,
  themes: {
    ...defaultConfig.themes,
    dark: {
      ...defaultConfig.themes.dark,
      ...darkTheme,
    },
    light: {
      ...defaultConfig.themes.light,
      ...lightTheme,
    },
  },
  settings: {
    ...defaultConfig.settings,
    shouldAddPrefersColorThemes: false,
    disableRootThemeClass: true,
  },
});

export type TamaguiConfig = typeof config;

export default config;
