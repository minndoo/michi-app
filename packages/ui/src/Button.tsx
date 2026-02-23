import {
  Button as TamaguiButton,
  GetProps,
  styled,
  withStaticProperties,
} from "tamagui";

const buttonVariantStyles = {
  outlined: {
    backgroundColor: "transparent",
    borderWidth: 1,
    color: "$color8",
    borderColor: "$color8",
    hoverStyle: {
      backgroundColor: "transparent",
      borderColor: "$color9",
      color: "$color9",
    },
    pressStyle: {
      backgroundColor: "transparent",
      borderColor: "$borderColorPress",
    },
  },
  primary: {
    backgroundColor: "$color8",
    borderColor: "$color8",
    color: "$white2",
    hoverStyle: {
      backgroundColor: "$color9",
      borderColor: "$color9",
    },
    pressStyle: {
      backgroundColor: "$color9",
      borderColor: "$color9",
    },
  },
  secondary: {
    backgroundColor: "$color2",
    borderColor: "$color2",
    color: "$color11",
    hoverStyle: {
      backgroundColor: "$color3",
      borderColor: "$color3",
    },
    pressStyle: {
      backgroundColor: "$color4",
      borderColor: "$color4",
    },
  },
  tertiary: {
    backgroundColor: "$color5",
    borderColor: "$color5",
    color: "$color11",
    hoverStyle: {
      backgroundColor: "$color6",
      borderColor: "$color6",
    },
    pressStyle: {
      backgroundColor: "$color7",
      borderColor: "$color7",
    },
  },
  strong: {
    backgroundColor: "$color0",
    borderColor: "$color0",
    color: "$color11",
    hoverStyle: {
      backgroundColor: "$color1",
      borderColor: "$color1",
    },
    pressStyle: {
      backgroundColor: "$color1",
      borderColor: "$color1",
    },
  },
} as const;

const ButtonFrame = styled(TamaguiButton.Frame, {
  variants: {
    variant: buttonVariantStyles,
  },
  defaultVariants: {
    variant: "primary",
  },
});

const ButtonComponent = styled(TamaguiButton, {
  variants: {
    variant: buttonVariantStyles,
  },
  defaultVariants: {
    variant: "primary",
  },
});

export const Button = withStaticProperties(ButtonComponent, {
  Apply: TamaguiButton.Apply,
  Frame: ButtonFrame,
  Text: TamaguiButton.Text,
  Icon: TamaguiButton.Icon,
});

export type ButtonProps = GetProps<typeof ButtonComponent>;
