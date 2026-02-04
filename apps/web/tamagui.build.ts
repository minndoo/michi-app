import type { TamaguiBuildOptions } from "tamagui";

export default {
  components: ["tamagui", "@repo/ui"],
  config: "./tamagui.config.ts",
  outputCSS: "./public/tamagui.generated.css",
} satisfies TamaguiBuildOptions;
