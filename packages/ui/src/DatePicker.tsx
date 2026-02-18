"use client";

import type { ComponentProps } from "react";
import { Input } from "tamagui";

export type DatePickerProps = Omit<
  ComponentProps<typeof Input>,
  "value" | "onChangeText" | "type"
> & {
  value: string;
  onValueChange?: (value: string) => void;
};

export const DatePicker = ({
  value,
  onValueChange,
  ...props
}: DatePickerProps) => {
  return (
    <Input type="date" value={value} onChangeText={onValueChange} {...props} />
  );
};
