import SearchBox from "@/components/charters/SearchBox";
import Image from "next/image";

export default function SearchResultsHeader({
  title,
  count,
  subtitleSuffix = "trips",
}: {
  title: string; // e.g. "Jigging — Fishing Charters"
  count: number;
  subtitleSuffix?: string; // e.g. "trips" or "charters"
}) {
  return (
    <section className="relative w-full h-[400px]">
      <Image
        src="/images/hero/hero-wallpaper.png"
        alt="Fishing wallpaper"
        fill
        className="w-full h-[25vh] md:h-[30vh] object-cover"
        priority
      />
      <header className="flex justify-center w-full">
        <div className="flex flex-col w-full p-5 max-w-7xl">
          <h2 className="text-2xl font-bold text-white md:text-3xl drop-shadow-lg">
            {title}
          </h2>
          <p className="text-sm text-white drop-shadow-lg">
            Showing{" "}
            <span className="font-semibold text-white drop-shadow-lg">
              {count}
            </span>{" "}
            {subtitleSuffix}
          </p>
        </div>
      </header>
      <div className="absolute inset-x-0 px-3 py-3 mx-auto -bottom-10 lg:-bottom-10 max-w-7xl">
        <SearchBox />
      </div>
    </section>
  );
}
