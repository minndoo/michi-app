import {
  GetProps,
  SizableText,
  styled,
  withStaticProperties,
  themeableVariants,
  getElevation,
  getTokenValue,
  type Token,
  SizeTokens,
  ColorTokens,
  createStyledContext,
  View,
} from "tamagui";
import { getButtonSized } from "@tamagui/get-button-sized";

type AnchorVariant = "outlined";

const context = createStyledContext<{
  size?: SizeTokens;
  variant?: AnchorVariant;
  color?: ColorTokens | string;
  elevation?: SizeTokens | number;
}>({
  size: undefined,
  variant: undefined,
  color: undefined,
  elevation: undefined,
});

const LinkButtonFrame = styled(View, {
  context,
  name: "LinkButton",
  variants: {
    unstyled: {
      false: {
        rounded: "$3",
        px: "$5",
        py: "$3",
        justify: "center",
        items: "center",
        flexWrap: "nowrap",
        flexDirection: "row",
        cursor: "pointer",
        bg: "$background",
        borderWidth: 1,
        borderColor: "transparent",

        hoverStyle: {
          bg: "$backgroundHover",
          borderColor: "$borderColorHover",
        },

        pressStyle: {
          bg: "$backgroundPress",
          borderColor: "$borderColorHover",
        },

        focusVisibleStyle: {
          outlineColor: "$outlineColor",
          outlineStyle: "solid",
          outlineWidth: 2,
        },
      },
    },

    variant: {
      outlined: {
        bg: "transparent",
        borderWidth: 1,
        borderColor: "$borderColor",

        hoverStyle: {
          bg: "transparent",
          borderColor: "$borderColorHover",
        },

        pressStyle: {
          bg: "transparent",
          borderColor: "$borderColorPress",
        },
      },
      soft: {
        bg: "$backgroundSoft",

        hoverStyle: {
          bg: "$backgroundSoftHover",
        },

        pressStyle: {
          bg: "$backgroundSoftPress",
        },
      },

      hard: {
        bg: "$backgroundHard",

        hoverStyle: {
          bg: "$backgroundHardHover",
        },

        pressStyle: {
          bg: "$backgroundHardPress",
        },
      },
    },

    circular: themeableVariants.circular,

    size: {
      "...size": (val, extras) => {
        const buttonStyle = getButtonSized(val, extras);
        const gap = getTokenValue(val as Token);
        return {
          ...buttonStyle,
          gap,
        };
      },
      ":number": (val, extras) => {
        const buttonStyle = getButtonSized(val, extras);
        const gap = val * 0.4;
        return {
          ...buttonStyle,
          gap,
        };
      },
    },

    elevation: {
      "...size": getElevation,
      ":number": getElevation,
    },

    disabled: {
      true: {
        pointerEvents: "none",
        "aria-disabled": true,
      },
    },
  } as const,

  defaultVariants: {
    unstyled: false,
  },
});

export const LinkButtonText = styled(SizableText, {
  name: "LinkButtonText",
  color: "$color",
});

export type LinkButtonProps = GetProps<typeof LinkButtonFrame>;

export type LinkButtonTextProps = GetProps<typeof LinkButtonText>;

export const LinkButton = withStaticProperties(LinkButtonFrame, {
  Text: LinkButtonText,
});
