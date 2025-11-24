// components/shared/PriceTag.tsx
"use client";

import { useTranslations } from "next-intl";

/**
 * Unified price display component
 * @param price - Price in RM
 * @param variant - Display variant (from, total, per-day)
 * @param size - Size variant (sm, md, lg)
 */
type Props = {
  price: number;
  variant?: "from" | "total" | "per-day";
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  color?: "default" | "chrome";
};

export default function PriceTag({
  price,
  variant = "from",
  size = "md",
  className = "",
  color = "default",
}: Props) {
  const t = useTranslations("common");

  const sizeClasses = {
    sm: {
      label: "text-xs",
      price: "text-base",
      suffix: "text-xs",
    },
    md: {
      label: "text-sm",
      price: "text-xl",
      suffix: "text-sm",
    },
    lg: {
      label: "text-base",
      price: "text-2xl",
      suffix: "text-base",
    },
    xl: {
      label: "text-lg",
      price: "text-3xl",
      suffix: "text-lg",
    },
  };

  const currentSize = sizeClasses[size];

  // Get label for current variant
  const getLabel = () => {
    if (variant === "from") return t("from");
    if (variant === "total") return t("total");
    return "";
  };

  // Get suffix for current variant
  const getSuffix = () => {
    if (variant === "from" || variant === "per-day") return t("perTrip");
    return "";
  };

  const label = getLabel();
  const suffix = getSuffix();

  return (
    <div className={`flex items-end gap-1 ${className}`}>
      {label && (
        <span
          className={`${currentSize.label} ${color === "chrome" ? "text-gray-100" : "text-gray-500"}`}
        >
          {label}
        </span>
      )}
      <span
        className={`${currentSize.price} font-bold ${color === "chrome" ? "text-gray-100" : "text-[#ec2227] "}`}
      >
        RM{price}
      </span>
      {suffix && (
        <span
          className={`${currentSize.suffix} ${color === "chrome" ? "text-gray-100" : "text-gray-500"}`}
        >
          {suffix}
        </span>
      )}
    </div>
  );
}
