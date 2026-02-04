"use client";

import * as React from "react";
import PhoneInputWithCountry from "react-phone-number-input";
import flags from "react-phone-number-input/flags";

import type { CountryCode } from "libphonenumber-js";
import "react-phone-number-input/style.css";
import { cn } from "@/lib/utils";

export interface PhoneInputProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    "onChange" | "value"
  > {
  value?: string;
  onChange?: (value: string | undefined) => void;
  defaultCountry?: CountryCode;
  countries?: CountryCode[];
}

const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ className, defaultCountry = "IE", countries, onChange, ...props }, ref) => {
    return (
      <PhoneInputWithCountry
        {...props}
        ref={ref as any}
        international
        defaultCountry={defaultCountry}
        countries={countries}
        flags={flags}
        onChange={onChange}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background text-sm ring-offset-background placeholder:text-muted-foreground focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        numberInputProps={{
          className:
            "flex-1 border-none outline-none bg-transparent px-3 py-2 placeholder:text-muted-foreground disabled:cursor-not-allowed",
        }}
        countrySelectProps={{
          className: "pl-3 pr-1 border-none outline-none bg-transparent",
        }}
      />
    );
  }
);

PhoneInput.displayName = "PhoneInput";

export { PhoneInput };
