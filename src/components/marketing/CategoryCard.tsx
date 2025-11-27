// src/components/CategoryCard.tsx
import Image from "next/image";
import Link from "next/link";

export type CategoryCardProps = {
  href: string;
  label: string;
  count: number;
  subtitle?: string;
  image?: string;
  alt?: string;
  className?: string;
};

export default function CategoryCard({
  href,
  label,
  count,
  image,
  alt,
  className = "",
}: CategoryCardProps) {
  return (
    <Link
      href={href}
      className={`group relative block overflow-hidden rounded-xl border border-black/10 bg-white transition hover:shadow-md ${className}`}
    >
      <div className="relative w-full h-36 sm:h-44">
        {image ? (
          <Image
            src={image}
            alt={alt || label}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            priority={false}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200" />
        )}
        <div className="absolute inset-0 transition-opacity bg-gradient-to-t from-black/60 via-black/30 to-transparent group-hover:from-black/70 group-hover:via-black/40" />
        <div className="absolute inset-x-0 bottom-0 p-3">
          <h4 className="text-base font-semibold text-white drop-shadow-md">
            {label}
          </h4>
          <div className="inline-flex items-center gap-2 mt-2">
            <span className="px-2 py-1 text-xs font-medium text-gray-900 rounded-full bg-white/90 backdrop-blur">
              {count.toLocaleString("en-MY")} charter{count === 1 ? "" : "s"}
            </span>
            <span className="text-xs text-white/95 group-hover:underline">
              Browse
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export function CategoryCardSkeleton() {
  return (
    <div className="relative block overflow-hidden bg-gray-100 border animate-pulse rounded-xl border-black/10">
      <div className="w-full bg-gray-200 h-36 sm:h-44" />
      <div className="absolute inset-x-0 bottom-0 p-3">
        <div className="w-24 h-4 mb-2 bg-gray-300 rounded" />
        <div className="w-32 h-3 mb-2 bg-gray-200 rounded" />
        <div className="w-20 h-6 bg-gray-300 rounded" />
      </div>
    </div>
  );
}
