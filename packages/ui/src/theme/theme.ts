import { createV5Theme } from "@tamagui/themes/v5";
import { lightPalette } from "./palette";

const generatedThemes = createV5Theme({
  lightPalette,
});

const componentThemeSuffixes = new Set([
  "Button",
  "Input",
  "Progress",
  "ProgressIndicator",
  "Slider",
  "SliderActive",
  "SliderThumb",
  "Switch",
  "SwitchThumb",
  "TextArea",
  "Tooltip",
]);

const filteredThemes = Object.fromEntries(
  Object.entries(generatedThemes).filter(([name]) => {
    const suffix = name.split("_").pop() ?? "";
    return !componentThemeSuffixes.has(suffix);
  }),
);

export const themes = Object.fromEntries(
  Object.entries(filteredThemes).map(([name, theme]) => [
    name,
    {
      ...theme,
      strong: theme.color0,
      strongHover: theme.color1,
      secondary: theme.color2,
      secondaryHover: theme.color3,
      secondaryActive: theme.color4,
      tertiary: theme.color5,
      tertiaryHover: theme.color6,
      tertiaryActive: theme.color7,
      primary: theme.color8,
      primaryHover: theme.color9,
      subtleText: theme.color10,
      text: theme.color11,
      primaryText: theme.color8,
      strongText: theme.color0,
    },
  ]),
);
