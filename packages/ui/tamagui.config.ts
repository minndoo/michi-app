import { createTamagui } from "tamagui";
import { defaultConfig } from "@tamagui/config/v5";

const config = createTamagui(defaultConfig);

export type TamaguiConfig = typeof config;

export default config;
