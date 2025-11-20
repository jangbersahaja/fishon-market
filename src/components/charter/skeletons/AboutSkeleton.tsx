export function AboutSkeleton() {
  return (
    <div className="w-full animate-pulse space-y-3">
      {/* First line slightly wider/different to simulate paragraph start */}
      <div className="h-3 w-full rounded bg-gray-200" />
      <div className="h-3 w-11/12 rounded bg-gray-200" />
      <div className="h-3 w-full rounded bg-gray-200" />
      <div className="h-3 w-4/5 rounded bg-gray-200" />
      <div className="h-3 w-3/4 rounded bg-gray-200" />
    </div>
  );
}
