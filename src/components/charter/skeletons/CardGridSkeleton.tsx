interface CardGridSkeletonProps {
  columnCount?: number;
  cardCount?: number;
}

export function CardGridSkeleton({
  columnCount = 2,
  cardCount = 3,
}: CardGridSkeletonProps) {
  // Map column count to Tailwind classes
  const gridColsClass =
    {
      1: "grid-cols-1",
      2: "grid-cols-1 md:grid-cols-2",
      3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
      4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
    }[columnCount] || "grid-cols-1 md:grid-cols-2";

  return (
    <div className={`grid gap-4 ${gridColsClass} animate-pulse`}>
      {Array.from({ length: cardCount }).map((_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-lg border border-gray-200"
        >
          {/* Image placeholder */}
          <div className="h-48 w-full bg-gray-200" />
          {/* Content placeholder */}
          <div className="p-4 space-y-3">
            <div className="h-4 w-3/4 rounded bg-gray-200" />
            <div className="h-3 w-1/2 rounded bg-gray-200" />
          </div>
        </div>
      ))}
    </div>
  );
}
