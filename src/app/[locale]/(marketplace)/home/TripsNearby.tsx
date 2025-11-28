"use client";

import BaseCharterCard from "@/components/charters/BaseCharterCard";
import type { Charter } from "@fishon/ui";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa6";
import { MdLocationOff } from "react-icons/md";

// Haversine distance in km
function distanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
) {
  const R = 6371; // km
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h =
    sinDLat * sinDLat + Math.cos(la1) * Math.cos(la2) * sinDLng * sinDLng;
  return 2 * R * Math.asin(Math.sqrt(h));
}

type Nearby = Charter & { _distance: number };

export default function TripsNearby({ charters }: { charters: Charter[] }) {
  const t = useTranslations("home.tripsNearby");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // Read existing booking context so we can carry it into charter links
  const sp = useSearchParams();
  const date = sp.get("date") || undefined;
  const adults = sp.get("adults") ? Number(sp.get("adults")) : undefined;
  const children = sp.get("children") ? Number(sp.get("children")) : undefined;

  // Ask for geolocation on mount
  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setError("Location not available in this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setError(null);
      },
      (err) => {
        setError(err.message || "Location permission denied.");
      },
      { enableHighAccuracy: true, maximumAge: 60_000, timeout: 10_000 }
    );
  }, []);

  const getCharterKey = (c: { id: number } & Partial<Record<string, any>>) => {
    const backendId = (c as any).backendId as string | undefined;
    return backendId ? `b:${backendId}` : `d:${String(c.id)}`;
  };

  const nearby: Nearby[] = useMemo(() => {
    if (!coords) return [];
    const withCoords = charters.filter((c) => !!c.coordinates);
    const computed = withCoords.map((c) => ({
      ...c,
      _distance: distanceKm(coords, c.coordinates!),
    }));
    // Sort by distance then dedupe by stable key (backendId preferred over local id)
    const sorted = computed.sort((a, b) => a._distance - b._distance);
    const seen = new Set<string>();
    const unique: Nearby[] = [];
    for (const c of sorted) {
      const k = getCharterKey(c as any);
      if (!seen.has(k)) {
        seen.add(k);
        unique.push(c);
      }
    }
    return unique.filter((c) => c._distance <= 25).slice(0, 20);
  }, [coords, charters]);

  const trackRef = useRef<HTMLDivElement | null>(null);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const getStep = useCallback(() => {
    const el = trackRef.current;
    if (!el) return 0;
    const first = el.querySelector("article");
    if (!(first instanceof HTMLElement))
      return Math.round(el.clientWidth * 0.9); // Fallback if no card found
    const rect = first.getBoundingClientRect();
    // The gap in the flex container is 40px (gap-10), but it's not part of the element's margin.
    // We need to account for the gap.
    // However, the scroll snap usually aligns to the start of the element.
    // Let's just use the card width + gap (24px from gap-6) as the step.
    return Math.round(rect.width + 24);
  }, []);

  const updateScrollState = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth);
    const left = Math.max(0, Math.round(el.scrollLeft));
    // tolerate small sub-pixel scroll on mobile; hide prev at start
    const EPS = 6; // px
    setCanScrollPrev(left > EPS);
    setCanScrollNext(left < maxScroll - EPS);

    // Update active index
    const step = getStep();
    if (step > 0) {
      setActiveIndex(Math.round(left / step));
    }
  }, [getStep]);

  useEffect(() => {
    // run a few times after mount to catch image/font/layout shifts
    const ticks = [0, 60, 180, 360];
    const timers = ticks.map((t) => setTimeout(updateScrollState, t));
    const raf = requestAnimationFrame(() => updateScrollState());

    const el = trackRef.current;
    if (!el)
      return () => {
        timers.forEach(clearTimeout);
        cancelAnimationFrame(raf);
      };

    const onScroll = () => updateScrollState();
    el.addEventListener("scroll", onScroll, { passive: true });

    const ro = new ResizeObserver(() => updateScrollState());
    ro.observe(el);

    const onLoad = () => updateScrollState();
    window.addEventListener("load", onLoad);

    return () => {
      timers.forEach(clearTimeout);
      cancelAnimationFrame(raf);
      el.removeEventListener("scroll", onScroll);
      ro.disconnect();
      window.removeEventListener("load", onLoad);
    };
  }, [nearby.length, updateScrollState]);

  const scrollToSnap = (dir: "prev" | "next") => {
    const el = trackRef.current;
    if (!el) return;
    const step = getStep();
    if (!step) return;
    const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth);
    const current = Math.max(0, Math.round(el.scrollLeft));
    let target = current;
    if (dir === "next") {
      target = Math.min(maxScroll, Math.ceil((current + 1) / step) * step);
    } else {
      target = Math.max(0, Math.floor((current - 1) / step) * step);
    }
    el.scrollTo({ left: target, behavior: "smooth" });
    // refresh state during/after the scroll animation
    requestAnimationFrame(updateScrollState);
    setTimeout(updateScrollState, 220);
  };

  return (
    <section className="w-full">
      <div className="w-full px-5 mx-auto max-w-7xl">
        {/* Status */}
        {!coords && !error && (
          <div className="flex flex-col items-center justify-center py-10 text-white/80">
            <div className="w-6 h-6 mb-2 border-2 border-white rounded-full border-t-transparent animate-spin" />
            <p className="text-sm">{t("detectingLocation")}</p>
          </div>
        )}
        {error && (
          <div className="flex flex-col items-center justify-center py-8 text-center text-white">
            <MdLocationOff className="mb-2 text-4xl opacity-80" />
            <p className="font-medium">{t("locationError", { error })}</p>
            <p className="text-sm opacity-80">
              {t("browseTripsBelowFallback")}
            </p>
          </div>
        )}
        {coords && nearby.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center py-10 text-white">
            <p className="text-lg font-medium">{t("noTripsNearby")}</p>
            <p className="text-sm opacity-80">
              Try searching for a different location
            </p>
          </div>
        )}

        {/* Cards (carousel) */}
        {nearby.length > 0 && (
          <>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white md:text-3xl">
                {t("title")}
              </h2>
              <div className="hidden gap-2 md:flex">
                <button
                  onClick={() => scrollToSnap("prev")}
                  disabled={!canScrollPrev}
                  className={`flex items-center justify-center w-10 h-10 transition-all rounded-full ${
                    canScrollPrev
                      ? "bg-white text-[#ec2227] hover:bg-gray-100 shadow-lg"
                      : "bg-white/20 text-white/40 cursor-not-allowed"
                  }`}
                  aria-label="Previous"
                >
                  <FaChevronLeft className="text-lg" />
                </button>
                <button
                  onClick={() => scrollToSnap("next")}
                  disabled={!canScrollNext}
                  className={`flex items-center justify-center w-10 h-10 transition-all rounded-full ${
                    canScrollNext
                      ? "bg-white text-[#ec2227] hover:bg-gray-100 shadow-lg"
                      : "bg-white/20 text-white/40 cursor-not-allowed"
                  }`}
                  aria-label="Next"
                >
                  <FaChevronRight className="text-lg" />
                </button>
              </div>
            </div>

            <div className="relative group">
              {/* track */}
              <div
                ref={trackRef}
                className="flex gap-6 py-4 overflow-x-auto snap-x snap-mandatory scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
              >
                {nearby.map((c) => {
                  // Build booking context if present
                  const context = {
                    date: date || undefined,
                    adults:
                      typeof adults === "number" && !Number.isNaN(adults)
                        ? adults
                        : undefined,
                    children:
                      typeof children === "number" && !Number.isNaN(children)
                        ? children
                        : undefined,
                  };

                  return (
                    <BaseCharterCard
                      key={getCharterKey(c as any)}
                      charter={c}
                      variant="nearby"
                      imageAspect="square"
                      context={context}
                      distance={c._distance}
                      showFavoriteButton={true}
                      className="shrink-0 snap-start w-[300px] md:w-[320px]"
                    />
                  );
                })}
              </div>

              {/* Mobile Navigation Overlay Buttons */}
              <div className="absolute inset-y-0 left-0 flex items-center pointer-events-none md:hidden">
                {canScrollPrev && (
                  <button
                    onClick={() => scrollToSnap("prev")}
                    className="flex items-center justify-center w-8 h-8 ml-2 bg-white rounded-full shadow-lg pointer-events-auto text-[#ec2227] opacity-90"
                  >
                    <FaChevronLeft />
                  </button>
                )}
              </div>
              <div className="absolute inset-y-0 right-0 flex items-center pointer-events-none md:hidden">
                {canScrollNext && (
                  <button
                    onClick={() => scrollToSnap("next")}
                    className="flex items-center justify-center w-8 h-8 mr-2 bg-white rounded-full shadow-lg pointer-events-auto text-[#ec2227] opacity-90"
                  >
                    <FaChevronRight />
                  </button>
                )}
              </div>
            </div>

            {/* Progress Indicators */}
            <div className="flex justify-center gap-2 mt-6">
              {nearby.map((_, i) => (
                <button
                  key={i}
                  onClick={() => {
                    const el = trackRef.current;
                    if (el) {
                      const step = getStep();
                      el.scrollTo({ left: i * step, behavior: "smooth" });
                    }
                  }}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === activeIndex
                      ? "w-6 bg-white"
                      : "w-1.5 bg-white/30 hover:bg-white/50"
                  }`}
                  aria-label={`Go to item ${i + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
