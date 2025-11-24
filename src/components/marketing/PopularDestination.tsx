"use client";

import { getDestinationImage } from "@/lib/helpers/image-helpers";
import { getPopularDestinations } from "@/lib/helpers/popularity-helpers";
import type { Charter } from "@fishon/ui";
import { useLocale } from "next-intl";
import Image from "next/image";
import Link from "next/link";

type Destination = {
  name: string;
  count: number;
  image?: string;
  state?: string;
  locale: string;
};

const Card = ({ name, count, image, locale }: Destination) => (
  <Link
    href={`/${locale}/search?destination=${encodeURIComponent(name)}`}
    className="flex flex-col gap-2 group"
    title={`Find charters in ${name}`}
  >
    <div className="h-48 bg-gray-200 relative rounded-lg overflow-hidden">
      {image ? (
        <Image
          src={image}
          alt={`${name} fishing destination`}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
          priority={false}
        />
      ) : (
        <div className="h-full w-full bg-gradient-to-br from-gray-100 to-gray-200" />
      )}
    </div>
    <div className="flex flex-col">
      <span className="text-sm font-bold">{name}</span>
      <span className="text-xs">
        {count} Charter{count === 1 ? "" : "s"} Available
      </span>
    </div>
  </Link>
);

interface PopularDestinationProps {
  charters: Charter[];
}

const PopularDestination = ({ charters }: PopularDestinationProps) => {
  const locale = useLocale();
  // Get all popular destinations
  const allDestinations = getPopularDestinations(charters, 50); // Get more to filter

  // Filter to only show destinations with available images, then limit to 10
  const destinationsWithImages = allDestinations
    .map((d) => ({
      ...d,
      image: getDestinationImage(d.name, d.state),
    }))
    .filter((d) => d.image) // Only show destinations with images
    .slice(0, 10); // Limit to top 10

  if (destinationsWithImages.length === 0) {
    return null;
  }

  return (
    <div className="flex px-2 md:px-0 w-full max-w-7xl items-center justify-center mx-auto">
      <div className="w-full flex flex-col px-5">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold">Popular Destinations</h2>
          <Link
            href={`/${locale}/categories/destinations`}
            className="hidden text-sm font-medium text-[#ec2227] hover:underline md:inline"
          >
            See all destinations
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
          {destinationsWithImages.map((d) => (
            <Card
              key={d.name}
              name={d.name}
              count={d.count}
              image={d.image}
              state={d.state}
              locale={locale}
            />
          ))}
        </div>
        <div className="mt-4 flex justify-start md:hidden">
          <Link
            href={`/${locale}/categories/destinations`}
            className="text-sm font-semibold text-[#ec2227] hover:underline"
          >
            See all destinations
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PopularDestination;
