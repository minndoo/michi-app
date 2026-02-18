"use client";

import { Select } from "@repo/ui";
import { ChevronDown } from "@repo/ui/icons";
import type { ComponentProps } from "react";
import type { FieldValues, Path } from "react-hook-form";
import { FormField } from "./FormField";
import type {
  FormControlProps,
  FormManagedControlPropKeys,
  FormSelectOption,
} from "./types";

const NO_SELECTION_VALUE = "__no_selection__";

export type FormSelectProps<
  TFieldValues extends FieldValues,
  TName extends Path<TFieldValues>,
> = FormControlProps<TFieldValues, TName> & {
  options: FormSelectOption[];
  emptyOptionLabel?: string;
  selectProps?: Omit<
    ComponentProps<typeof Select>,
    FormManagedControlPropKeys | "onValueChange"
  >;
  triggerProps?: Omit<
    ComponentProps<typeof Select.Trigger>,
    "children" | "disabled" | "iconAfter"
  >;
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
  grow,
  options,
  emptyOptionLabel = "No selection",
  selectProps,
  triggerProps,
}: FormSelectProps<TFieldValues, TName>) => {
  return (
    <FormField
      control={control}
      label={label}
      name={name}
      placeholder={placeholder}
      disabled={disabled}
      required={required}
      grow={grow}
    >
      {({
        id,
        name: fieldName,
        field,
        placeholder: fieldPlaceholder,
        ariaInvalid,
        ariaDescribedBy,
      }) => {
        const value = typeof field.value === "string" ? field.value : "";
        const selectValue: string = value === "" ? NO_SELECTION_VALUE : value;

        return (
          <Select
            {...selectProps}
            id={id}
            name={fieldName}
            value={selectValue}
            onValueChange={(nextValue) => {
              if (disabled) {
                return;
              }
              field.onChange(nextValue === NO_SELECTION_VALUE ? "" : nextValue);
            }}
          >
            <Select.Trigger
              {...triggerProps}
              iconAfter={ChevronDown}
              disabled={disabled}
              aria-invalid={ariaInvalid}
              aria-describedby={ariaDescribedBy}
              borderRadius={9}
              borderWidth={1}
              borderColor="$borderColor"
              backgroundColor="$background"
            >
              <Select.Value placeholder={fieldPlaceholder} />
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
        );
      }}
    </FormField>
  );
};
