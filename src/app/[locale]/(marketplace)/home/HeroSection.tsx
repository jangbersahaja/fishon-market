"use client";

import SearchBox from "@/components/charters/SearchBox";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { Suspense } from "react";

export default function HeroSection() {
  const t = useTranslations("home");

  return (
    <section className="relative w-full h-[80vh] bg-gradient-to-b from-[#ec2227] to-[#ec2227] z-20">
      {/* Background Image Container with Overflow Hidden */}
      <div className="absolute inset-0 w-full h-full overflow-hidden">
        {/* Background Image with Zoom Effect */}
        <div className="absolute inset-0 w-full h-[50vh] animate-slow-zoom">
          <Image
            src="/images/hero/hero-wallpaper.png"
            alt="Fishing wallpaper"
            className="object-cover"
            priority
            sizes="100vw"
            fill
          />
          {/* Dark Overlay for Text Readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
          {/* Gradient Overlay at Bottom */}
          <div className="absolute bottom-0 h-1/3 w-full bg-gradient-to-t from-[#ec2227] via-[#ec2227]/60 to-transparent" />
        </div>
      </div>

      {/* Content Container */}
      <div className="relative flex flex-col items-center justify-end w-full h-full px-5 text-center pb-15 ">
        <div className="max-w-4xl mb-8 space-y-2 md:space-y-4 md:mb-12">
          <h1 className="text-4xl font-extrabold tracking-tight text-white drop-shadow-xl sm:text-5xl md:text-7xl">
            {t("discoverTitle")} <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-200">
              {t("discoverTitleBreak")}
            </span>
          </h1>
          <p className="max-w-2xl mx-auto text-lg font-medium text-white/90 drop-shadow-md md:text-2xl">
            {t("bookYourNext")}
          </p>
        </div>

        {/* Search Box Container - Floating Effect */}
        <div className="w-full max-w-5xl px-5 transition-transform duration-500 text-start hover:-translate-y-1">
          <Suspense
            fallback={
              <div className="w-full h-20 animate-pulse rounded-xl bg-white/20 backdrop-blur-md" />
            }
          >
            <div className="shadow-2xl rounded-2xl shadow-black/20">
              <SearchBox />
            </div>
          </Suspense>
        </div>
      </div>
    </section>
  );
}
