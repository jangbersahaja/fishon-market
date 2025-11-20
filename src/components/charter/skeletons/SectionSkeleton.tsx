interface SectionSkeletonProps {
  heading?: boolean;
  lines?: number;
}

export function SectionSkeleton({
  heading = true,
  lines = 3,
}: SectionSkeletonProps) {
  return (
    <div className="w-full animate-pulse space-y-4">
      {heading && <div className="h-4 w-1/3 rounded bg-gray-200" />}
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={`h-3 rounded bg-gray-200 ${
              i === lines - 1 ? "w-2/3" : "w-full"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
