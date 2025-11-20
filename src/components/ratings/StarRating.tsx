// components/ratings/StarRating.tsx
/**
 * Unified StarRating component
 * @param value - Rating value (0-5)
 * @param size - Star size in pixels (default: 16)
 * @param reviewCount - Number of reviews (optional)
 * @param showValue - Show numeric rating value (default: false)
 * @param textSize - Text size class for review count/value (default: 'text-xs')
 */
type Props = {
  value?: number;
  size?: number;
  reviewCount?: number;
  showValue?: boolean;
  textSize?: string;
  variant?: "default" | "chrome" | "light";
};

export default function StarRating({
  value = 0,
  size = 16,
  reviewCount,
  showValue = false,
  textSize = "text-xs",
  variant = "default",
}: Props) {
  const full = Math.floor(value);
  const half = value - full >= 0.5;
  const total = 5;

  const textColorClass = {
    default: "text-gray-600",
    chrome: "text-gray-100",
    light: "text-white",
  };

  // If no rating, show "Just Listed"
  if (value === 0) {
    return (
      <span className={`${textSize} ${textColorClass[variant]}`}>
        Just Listed
      </span>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <span
        className="inline-flex items-center align-middle"
        aria-label={`Rating ${value.toFixed(1)} out of 5`}
      >
        {Array.from({ length: total }, (_, i) => {
          const filled = i < full;
          const showHalf = !filled && i === full && half;
          return (
            <svg
              key={i}
              width={size}
              height={size}
              viewBox="0 0 24 24"
              aria-hidden="true"
              className="inline-block"
            >
              <defs>
                <linearGradient id={`half-${i}`} x1="0" x2="1" y1="0" y2="0">
                  <stop offset="50%" stopColor="#f59e0b" />
                  <stop offset="50%" stopColor="transparent" />
                </linearGradient>
              </defs>
              <path
                d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"
                fill={
                  filled ? "#f59e0b" : showHalf ? `url(#half-${i})` : "none"
                }
                stroke="#f59e0b"
                strokeWidth="1"
              />
            </svg>
          );
        })}
      </span>

      {/* Show review count or rating value */}
      {reviewCount !== undefined && reviewCount > 0 && (
        <span className={`${textSize} ${textColorClass[variant]}`}>
          {reviewCount} {reviewCount === 1 ? "review" : "reviews"}
        </span>
      )}
      {showValue && (
        <span className={`${textSize} ${textColorClass[variant]}`}>
          {value.toFixed(1)}
        </span>
      )}
    </div>
  );
}
