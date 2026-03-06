import {
  Button as TamaguiButton,
  GetProps,
  styled,
  withStaticProperties,
} from "tamagui";

const buttonVariantStyles = {
  outlined: {
    backgroundColor: "$white1",
    borderWidth: 1,
    color: "$color10",
    borderColor: "$color6",
    hoverStyle: {
      backgroundColor: "$white1",
      borderColor: "$color9",
      color: "$color9",
    },
    pressStyle: {
      backgroundColor: "$white1",
      borderColor: "$color6",
    },
  },
  primary: {
    backgroundColor: "$color9",
    borderColor: "$color9",
    color: "$white2",
    hoverStyle: {
      backgroundColor: "$color10",
      borderColor: "$color10",
    },
    pressStyle: {
      backgroundColor: "$color10",
      borderColor: "$color10",
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
    backgroundColor: "$white1",
    borderColor: "$color6",
    color: "$color11",
    hoverStyle: {
      backgroundColor: "$white1",
      borderColor: "$color7",
    },
    pressStyle: {
      backgroundColor: "$white1",
      borderColor: "$color6",
    },
  },
} as const;

export const ButtonFrame = styled(TamaguiButton.Frame, {
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

export const ButtonText = TamaguiButton.Text;
export const ButtonIcon = TamaguiButton.Icon;

export const Button = withStaticProperties(ButtonComponent, {
  Apply: TamaguiButton.Apply,
  Frame: ButtonFrame,
  Text: ButtonText,
  Icon: ButtonIcon,
});

export type ButtonProps = GetProps<typeof ButtonComponent>;
