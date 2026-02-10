import { GenericTamaguiConfig, isWeb } from "tamagui";
import { fonts as defaultFonts } from "@tamagui/config/v5";

export const fonts = {
  body: {
    ...defaultFonts.body,
    family: isWeb
      ? "Inter, Inter Fallback, -apple-system, system-ui, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
      : "System",
  },
  heading: {
    ...defaultFonts.heading,
    family: isWeb
      ? "Inter, Inter Fallback, -apple-system, system-ui, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
      : "System",
  },
} satisfies GenericTamaguiConfig["fonts"];
