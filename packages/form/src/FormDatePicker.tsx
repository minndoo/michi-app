"use client";

import { DatePicker } from "@repo/ui";
import type { ComponentProps } from "react";
import type { FieldValues, Path } from "react-hook-form";
import { FormField } from "./FormField";
import type { FormControlProps, FormManagedControlPropKeys } from "./types";

export type FormDatePickerProps<
  TFieldValues extends FieldValues,
  TName extends Path<TFieldValues>,
> = FormControlProps<TFieldValues, TName> &
  Omit<ComponentProps<typeof DatePicker>, FormManagedControlPropKeys>;

export const FormDatePicker = <
  TFieldValues extends FieldValues,
  TName extends Path<TFieldValues>,
>({
  control,
  name,
  label,
  placeholder = "YYYY-MM-DD",
  disabled,
  required,
  grow,
  ...datePickerProps
}: FormDatePickerProps<TFieldValues, TName>) => {
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
        ariaInvalid,
        ariaDescribedBy,
        placeholder: fieldPlaceholder,
        disabled: fieldDisabled,
        required: fieldRequired,
      }) => (
        <DatePicker
          {...datePickerProps}
          id={id}
          name={fieldName}
          value={typeof field.value === "string" ? field.value : ""}
          onBlur={field.onBlur}
          onValueChange={field.onChange}
          placeholder={fieldPlaceholder}
          disabled={fieldDisabled}
          required={fieldRequired}
          aria-invalid={ariaInvalid}
          aria-describedby={ariaDescribedBy}
        />
      )}
    </FormField>
  );
};
