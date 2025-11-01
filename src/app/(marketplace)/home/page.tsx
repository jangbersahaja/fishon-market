import SearchBox from "@/components/charters/SearchBox";
import PopularDestination from "@/components/marketing/PopularDestination";
import { getCharters } from "@/lib/services/charter-service";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import BrowseByType from "./BrowseByType";
import TopTechniques from "./TopTechniques";
import TripsNearby from "./TripsNearby";

export default async function Home() {
  const charters = await getCharters();
  return (
    <div className="flex flex-col items-center min-h-screen font-sans">
      <main className="flex flex-col items-center w-full gap-8 mb-24 sm:items-start md:gap-10 ">
        {/* Home page with hero section */}
        <section className="relative w-full h-[40vh] md:h-[50vh] lg:h-[60vh]">
          {/* wallpaper */}
          <Image
            src="/images/hero/hero-wallpaper.png"
            alt="Fishing wallpaper"
            className="object-cover"
            priority
            sizes="100vw"
            fill
          />
          <div className="absolute bottom-0 w-full bg-gradient-to-t from-[#ec2227] to-white/0 h-1/4"></div>
          <div className="absolute flex justify-center w-full bottom-10">
            <div className="flex flex-col w-full p-5 max-w-7xl">
              <h2 className="text-4xl font-bold text-white md:text-7xl drop-shadow-lg">
                Discover top-rated <br /> fishing charters
              </h2>
              <h3 className="text-xl font-bold text-white md:text-3xl drop-shadow-lg">
                Book your next fishing trip
              </h3>
            </div>
          </div>
          {/* overlayed search box */}
          <div className="absolute inset-x-0 px-3 py-3 mx-auto -bottom-10 lg:-bottom-10 max-w-7xl">
            <Suspense
              fallback={
                <div className="flex flex-col w-full gap-3 p-3 bg-white rounded-lg shadow-lg min-h-16" />
              }
            >
              <SearchBox />
            </Suspense>
          </div>
        </section>
        <div className="flex w-full -mt-10 pt-20 pb-10 justify-center mx-auto bg-gradient-to-b from-[#ec2227] via-[#d11f24] to-[#b01a1f]">
          <Suspense
            fallback={
              <div className="w-full px-5 mx-auto max-w-7xl py-7 text-white/80">
                Loading nearby trips…
              </div>
            }
          >
            <TripsNearby charters={charters} />
          </Suspense>
        </div>
        <PopularDestination charters={charters} />

        {/* Brand explainer + CTA */}
        <section className="w-full bg-gray-100">
          <div className="flex flex-col items-center w-full gap-10 p-5 mx-auto max-w-7xl md:flex-row">
            <div className="flex-1">
              <h3 className="text-lg font-bold">
                Fishon.my — Malaysia&apos;s first online fishing booking
                platform
              </h3>
              <p className="mt-1 text-sm text-gray-700">
                Fishon.my is Malaysia&apos;s first online fishing booking
                platform and marketplace helping anglers find and book fishing
                charters. Explore trips across lakes, rivers, inshore and
                offshore destinations around Malaysia — plan, book, fish.
              </p>
            </div>

            <div className="flex items-center gap-5">
              <div className="relative w-40 h-40 ml-auto md:h-56 md:w-56">
                <Image
                  src="/Fishon-logo.png"
                  alt="Fishon brand graphic"
                  fill
                  className="object-contain"
                  sizes="(max-width: 768px) 160px, 224px"
                  priority
                />
              </div>

              <div className="flex flex-col justify-center">
                <h3 className="font-bold">List your business on Fishon</h3>
                <p className="text-sm text-gray-700">
                  Find customers and earn more
                </p>
                <Link
                  href="/list-your-business"
                  className="mt-5 w-full rounded-md bg-[#ec2227] p-2 text-center font-bold text-white transition hover:bg-red-700"
                >
                  List With Us
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Browse by type */}
        <BrowseByType charters={charters} />

        {/* Top fishing techniques */}
        <TopTechniques charters={charters} />
      </main>
    </div>
  );
}
