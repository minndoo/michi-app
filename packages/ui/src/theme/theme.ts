import { paletteLight, paletteDark } from "./palette";
import { defaultConfig } from "@tamagui/config/v5";

const lightTheme = {
  // Surfaces
  background: paletteLight.color1, // app/page background (soft)
  backgroundHover: paletteLight.color3,
  backgroundPress: paletteLight.color4,
  backgroundFocus: paletteLight.color4,
  backgroundStrong: paletteLight.color2, // cards / elevated surfaces (white)

  // “Soft” surfaces (optional but super useful)
  backgroundSoft: paletteLight.color3,
  backgroundSoftHover: paletteLight.color4,
  backgroundSoftPress: paletteLight.color5,

  // "Hard" surfaces (optional but super useful)
  backgroundHard: paletteLight.color9,
  backgroundHardHover: paletteLight.color10,
  backgroundHardPress: paletteLight.color8,
  backgroundHardFocus: paletteLight.color8,

  // Text
  color: paletteLight.color11, // primary text
  colorHover: paletteLight.color12,
  colorPress: paletteLight.color12,
  colorFocus: paletteLight.color12,
  colorMuted: paletteLight.color8, // secondary text
  colorSubtle: paletteLight.color8,
  colorDisabled: paletteLight.color8,

  // Secondary text
  colorHard: paletteLight.color9,

  // Borders / separators
  borderColor: paletteLight.color6,
  borderColorHover: paletteLight.color7,
  borderColorPress: paletteLight.color7,
  borderColorFocus: paletteLight.color9, // focus border uses accent

  // Inputs
  placeholderColor: paletteLight.color8,

  // Focus ring / outlines
  outlineColor: paletteLight.color9, // accent focus ring

  // Shadow
  shadowColor: paletteLight.color12,
  shadowColorHover: paletteLight.color12,
  shadowColorPress: paletteLight.color12,
  shadowColorFocus: paletteLight.color12,

  // Error states
  colorDanger: paletteLight.color13,
  borderColorDanger: paletteLight.color14,
  backgroundDanger: paletteLight.color15,
  focusDanger: paletteLight.color16,
};

const darkTheme = {
  // Surfaces
  background: paletteDark.color1, // app/page background
  backgroundHover: paletteDark.color2,
  backgroundPress: paletteDark.color3,
  backgroundFocus: paletteDark.color3,
  backgroundStrong: paletteDark.color2, // cards / elevated surfaces

  // Soft surfaces
  backgroundSoft: paletteDark.color2,
  backgroundSoftHover: paletteDark.color3,
  backgroundSoftPress: paletteDark.color4,

  // "Hard" surfaces (optional but super useful)
  backgroundHard: paletteDark.color9,
  backgroundHardHover: paletteDark.color10,
  backgroundHardPress: paletteDark.color8,
  backgroundHardFocus: paletteDark.color8,

  // Text
  color: paletteDark.color11, // primary text (light)
  colorHover: paletteDark.color12,
  colorPress: paletteDark.color12,
  colorFocus: paletteDark.color12,
  colorMuted: paletteDark.color8, // muted text (your paletteDark has a nice gray-green here)
  colorSubtle: paletteDark.color8,
  colorDisabled: paletteDark.color7,

  // Secondary Text
  colorHard: paletteDark.color9,

  // Borders / separators
  borderColor: paletteDark.color5,
  borderColorHover: paletteDark.color6,
  borderColorPress: paletteDark.color6,
  borderColorFocus: paletteDark.color9, // focus border uses accent

  // Inputs
  placeholderColor: paletteDark.color8,

  // Focus ring / outlines
  outlineColor: paletteDark.color9,

  // Shadow
  shadowColor: paletteDark.color1, // base
  shadowColorHover: paletteDark.color1,
  shadowColorPress: paletteDark.color1,
  shadowColorFocus: paletteDark.color1,

  // Error states
  colorDanger: paletteDark.color13,
  borderColorDanger: paletteDark.color14,
  backgroundDanger: paletteDark.color15,
  focusDanger: paletteDark.color16,
};

// TODO: Replace this temporary light/dark-only extraction with a proper theme object setup
// that keeps intended custom styling behavior without relying on subtheme removal.
// explicitly extract only 2 themes as
// default config imports multiple themes that could "override" and affect root theme
// e. g. light_Button/dark_Button -> Button has it's own theme context, using $outlineColor will not resolve from your root theme
// but will be resolved from this theme
const { light: defaultConfigLight, dark: defaultConfigDark } =
  defaultConfig.themes;

export const themes = {
  light: {
    ...defaultConfigLight,
    ...lightTheme,
  },
  dark: {
    ...defaultConfigDark,
    ...darkTheme,
  },
};
