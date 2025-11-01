// components/shared/PriceTag.tsx
/**
 * Unified price display component
 * @param price - Price in RM
 * @param variant - Display variant (from, total, per-day)
 * @param size - Size variant (sm, md, lg)
 */
type Props = {
  price: number;
  variant?: "from" | "total" | "per-day";
  size?: "sm" | "md" | "lg";
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
  };

  const currentSize = sizeClasses[size];

  const labels = {
    from: "From",
    total: "Total",
    "per-day": "",
  };

  const suffixes = {
    from: "/Day",
    total: "",
    "per-day": "/Day",
  };

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {labels[variant] && (
        <span
          className={`${currentSize.label} ${color === "chrome" ? "text-gray-100" : "text-gray-500"}`}
        >
          {labels[variant]}
        </span>
      )}
      <span
        className={`${currentSize.price} font-bold ${color === "chrome" ? "text-gray-100" : "text-[#ec2227] "}`}
      >
        RM{price}
      </span>
      {suffixes[variant] && (
        <span
          className={`${currentSize.suffix} ${color === "chrome" ? "text-gray-100" : "text-gray-500"}`}
        >
          {suffixes[variant]}
        </span>
      )}
    </div>
  );
}
