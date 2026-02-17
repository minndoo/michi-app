"use client";

import { Select } from "@repo/ui";
import { ChevronDown } from "@repo/ui/icons";
import { useController, type FieldValues, type Path } from "react-hook-form";
import { FormField } from "./FormField";
import type { FormControlProps, FormSelectOption } from "./types";

const NO_SELECTION_VALUE = "__no_selection__";

export type FormSelectProps<
  TFieldValues extends FieldValues,
  TName extends Path<TFieldValues>,
> = FormControlProps<TFieldValues, TName> & {
  options: FormSelectOption[];
  emptyOptionLabel?: string;
};

export const FormSelect = <
  TFieldValues extends FieldValues,
  TName extends Path<TFieldValues>,
>({
  control,
  name,
  label,
  placeholder,
  disabled,
  required,
  options,
  emptyOptionLabel = "No selection",
}: FormSelectProps<TFieldValues, TName>) => {
  const { field, fieldState } = useController({ control, name });
  const value = typeof field.value === "string" ? field.value : "";
  const selectValue: string = value === "" ? NO_SELECTION_VALUE : value;

  return (
    <FormField
      label={label}
      name={name}
      required={required}
      error={fieldState.error?.message}
    >
      <Select
        id={name}
        name={name}
        value={selectValue}
        onValueChange={(nextValue) => {
          if (disabled) {
            return;
          }
          field.onChange(nextValue === NO_SELECTION_VALUE ? "" : nextValue);
        }}
      >
        <Select.Trigger
          iconAfter={ChevronDown}
          disabled={disabled}
          borderRadius={9}
          borderWidth={1}
          borderColor="$borderColor"
          backgroundColor="$background"
        >
          <Select.Value placeholder={placeholder} />
        </Select.Trigger>
        <Select.Content zIndex={200000}>
          <Select.Viewport
            background="$background"
            borderWidth={1}
            borderColor="$borderColor"
            overflow="hidden"
            style={{ borderRadius: 9 }}
          >
            <Select.Item
              index={0}
              value={NO_SELECTION_VALUE}
              style={{
                paddingTop: 10,
                paddingBottom: 10,
                paddingLeft: 13,
                paddingRight: 13,
              }}
            >
              <Select.ItemText>{emptyOptionLabel}</Select.ItemText>
            </Select.Item>
            {options.map((option, index) => (
              <Select.Item
                key={option.value}
                index={index + 1}
                value={option.value}
                borderTopWidth={1}
                borderColor="$borderColor"
                style={{
                  paddingTop: 10,
                  paddingBottom: 10,
                  paddingLeft: 13,
                  paddingRight: 13,
                }}
              >
                <Select.ItemText>{option.label}</Select.ItemText>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select>
    </FormField>
  );
};
