import type { TamaguiBuildOptions } from "@repo/ui";

export default {
  components: ["@repo/ui"],
  config: "@repo/ui/config",
  outputCSS: "./public/tamagui.generated.css",
} satisfies TamaguiBuildOptions;
