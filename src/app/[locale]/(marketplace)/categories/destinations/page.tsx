import CategoryCard from "@/components/marketing/CategoryCard";
import { getCharters } from "@/lib/services/charter-service";
import { getDestinationImage } from "@/lib/helpers/image-helpers";
import { getPopularDestinations } from "@/lib/helpers/popularity-helpers";
import Link from "next/link";
import { Suspense } from "react";

export const metadata = {
  title: "Popular Fishing Destinations | Fishon.my",
  description:
    "Discover the most popular fishing destinations across Malaysia. Find charters in your favorite locations.",
};

async function DestinationsContent() {
  const charters = await getCharters();
  // Get more destinations to filter
  const allDestinations = getPopularDestinations(charters, 100);

  // Filter to only show destinations with images
  const destinationsWithImages = allDestinations
    .map((dest) => ({
      ...dest,
      image: getDestinationImage(dest.name, dest.state),
    }))
    .filter((dest) => dest.image); // Only include destinations with available images

  if (destinationsWithImages.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No destinations found</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {destinationsWithImages.map((dest) => (
        <CategoryCard
          key={dest.name}
          href={`/search?destination=${encodeURIComponent(dest.name)}`}
          label={dest.name}
          count={dest.count}
          subtitle={`${dest.count} charter${
            dest.count === 1 ? "" : "s"
          } available`}
          image={dest.image}
          alt={`${dest.name} fishing destination`}
        />
      ))}
    </div>
  );
}

function DestinationsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse relative block overflow-hidden rounded-xl border border-black/10 bg-gray-100"
        >
          <div className="h-36 w-full sm:h-44 bg-gray-200" />
          <div className="absolute inset-x-0 bottom-0 p-3">
            <div className="h-4 w-24 bg-gray-300 rounded mb-2" />
            <div className="h-3 w-32 bg-gray-200 rounded mb-2" />
            <div className="h-6 w-20 bg-gray-300 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function PopularDestinationsPage() {
  return (
    <div className="flex flex-col min-h-screen font-sans">
      <main className="flex-1 w-full">
        <div className="bg-gradient-to-b from-gray-50 to-white border-b border-gray-200">
          <div className="mx-auto max-w-7xl px-5 py-8 md:py-12">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
                  Popular Destinations
                </h1>
                <p className="mt-2 text-gray-600">
                  Explore fishing charters across Malaysia&apos;s top locations
                </p>
              </div>
              <Link
                href="/home"
                className="text-sm font-medium text-[#ec2227] hover:underline"
              >
                ← Back to search
              </Link>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-5 py-8">
          <Suspense fallback={<DestinationsSkeleton />}>
            <DestinationsContent />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
