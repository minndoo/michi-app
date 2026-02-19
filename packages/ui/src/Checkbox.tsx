import { Check } from "@tamagui/lucide-icons";
import {
  Checkbox as TamaguiCheckbox,
  GetProps,
  Spinner,
  withStaticProperties,
} from "tamagui";

type BaseCheckboxProps = GetProps<typeof TamaguiCheckbox>;

export type CheckboxProps = BaseCheckboxProps & {
  loading?: boolean;
};

const CheckboxComponent = ({
  loading,
  bg,
  borderColor,
  checked,
  ...props
}: CheckboxProps) => {
  const resolvedBackground = bg ?? (checked ? "$primary" : "transparent");

  const resolvedBorderColor =
    borderColor ?? (checked ? "$outlineColor" : "$borderColor");

  console.log("resolved", resolvedBackground, resolvedBorderColor, checked);

  return (
    <TamaguiCheckbox
      bg={resolvedBackground}
      borderColor={resolvedBorderColor}
      checked={checked}
      {...props}
      role="checkbox"
      hoverStyle={{
        cursor: "pointer",
      }}
    >
      <TamaguiCheckbox.Indicator>
        {loading ? (
          <Spinner color="$white2" />
        ) : (
          <Check size="$1" color="$white2" />
        )}
      </TamaguiCheckbox.Indicator>
    </TamaguiCheckbox>
  );
};

export const Checkbox = withStaticProperties(CheckboxComponent, {
  Indicator: TamaguiCheckbox.Indicator,
});
