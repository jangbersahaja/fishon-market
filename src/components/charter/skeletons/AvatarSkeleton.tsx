export function AvatarSkeleton() {
  return (
    <div className="flex items-center space-x-4 animate-pulse">
      <div className="h-12 w-12 rounded-full bg-gray-200" />
      <div className="space-y-2">
        <div className="h-4 w-32 rounded bg-gray-200" />
        <div className="h-3 w-24 rounded bg-gray-200" />
      </div>
    </div>
  );
}
