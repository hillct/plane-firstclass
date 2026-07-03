"use client";

import { FC, useMemo } from "react";
import { E_PASSWORD_STRENGTH } from "@plane/constants";
import { cn, getPasswordStrength } from "@plane/utils";

type TMobilePasswordStrengthMeter = {
  password: string;
  isFocused?: boolean;
};

export const MobilePasswordStrengthMeter: FC<TMobilePasswordStrengthMeter> = (props) => {
  const { password, isFocused = false } = props;

  // derived values
  const strength = useMemo(() => getPasswordStrength(password), [password]);
  const strengthBars = useMemo(() => {
    switch (strength) {
      case E_PASSWORD_STRENGTH.EMPTY: {
        return {
          bars: [`bg-custom-text-100`, `bg-custom-text-100`, `bg-custom-text-100`],
          text: `Please enter your password`,
          textColor: `text-custom-text-100`,
        };
      }
      case E_PASSWORD_STRENGTH.LENGTH_NOT_VALID: {
        return {
          bars: [`bg-red-500`, `bg-custom-text-100`, `bg-custom-text-100`],
          text: `Password length should me more than 8 characters`,
          textColor: `text-red-500`,
        };
      }
      case E_PASSWORD_STRENGTH.STRENGTH_NOT_VALID: {
        return {
          bars: [`bg-red-500`, `bg-custom-text-100`, `bg-custom-text-100`],
          text: `Password is weak`,
          textColor: `text-red-500`,
        };
      }
      case E_PASSWORD_STRENGTH.STRENGTH_VALID: {
        return {
          bars: [`bg-green-500`, `bg-green-500`, `bg-green-500`],
          text: `Password is strong`,
          textColor: `text-green-500`,
        };
      }
      default: {
        return {
          bars: [`bg-custom-text-100`, `bg-custom-text-100`, `bg-custom-text-100`],
          text: `Please enter your password`,
          textColor: `text-custom-text-100`,
        };
      }
    }
  }, [strength]);

  return (
    <div className={cn("relative", isFocused ? "" : "")}>
      <div className="flex items-center gap-1 mt-1.5">
        <div
          className={`h-1.5 w-full rounded-md ${strengthBars.bars[0]} ${!isFocused ? "opacity-100" : ""}`}
        />
        <div
          className={`h-1.5 w-full rounded-md ${strengthBars.bars[1]} ${!isFocused ? "opacity-100" : ""}`}
        />
        <div
          className={`h-1.5 w-full rounded-md ${strengthBars.bars[2]} ${!isFocused ? "opacity-100" : ""}`}
        />
      </div>
      <div className={`flex items-center gap-1 mt-0.5 text-xs ${strengthBars.textColor}`}>
        <span>{strengthBars.text}</span>
      </div>
    </div>
  );
};
