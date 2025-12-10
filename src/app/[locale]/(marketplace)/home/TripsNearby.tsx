"use client";

import BaseCharterCard from "@/components/charters/BaseCharterCard";
import type { Charter } from "@fishon/ui";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa6";
import { MdLocationOff, MdNearMe } from "react-icons/md";

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

function TripsNearbySkeleton() {
  return (
    <div className="flex gap-6 overflow-hidden py-4">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="h-[380px] w-[300px] shrink-0 animate-pulse rounded-2xl bg-white/10 md:w-[320px]"
        >
          <div className="h-48 w-full rounded-t-2xl bg-white/20" />
          <div className="p-4 space-y-3">
            <div className="h-6 w-3/4 rounded bg-white/20" />
            <div className="h-4 w-1/2 rounded bg-white/20" />
            <div className="mt-4 h-10 w-full rounded bg-white/20" />
          </div>
        </div>
      ))}
    </div>
  );
}

interface TripsNearbyProps {
  charters: Charter[];
  ratingsMap: Map<string, { averageRating: number | null; reviewCount: number }>;
}

export default function TripsNearby({ charters, ratingsMap }: TripsNearbyProps) {
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

  // Helper to get rating for a charter
  const getRating = (c: Charter): number | null => {
    const id = (c as any).backendId ?? String(c.id);
    return ratingsMap.get(id)?.averageRating ?? null;
  };

  // Helper to get review count for a charter
  const getReviewCount = (c: Charter): number => {
    const id = (c as any).backendId ?? String(c.id);
    return ratingsMap.get(id)?.reviewCount ?? 0;
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
    return unique.filter((c) => c._distance <= 50).slice(0, 20); // Increased radius to 50km
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
    return Math.round(rect.width + 24);
  }, []);

  const updateScrollState = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth);
    const left = Math.max(0, Math.round(el.scrollLeft));
    const EPS = 6;
    setCanScrollPrev(left > EPS);
    setCanScrollNext(left < maxScroll - EPS);

    const step = getStep();
    if (step > 0) {
      setActiveIndex(Math.round(left / step));
    }
  }, [getStep]);

  useEffect(() => {
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
    requestAnimationFrame(updateScrollState);
    setTimeout(updateScrollState, 220);
  };

  return (
    <section className="w-full">
      <div className="mx-auto w-full max-w-7xl px-4 md:px-6">
        {/* Header */}
        <div className="mb-8 flex items-end justify-between">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-white/80">
              <MdNearMe className="text-xl" />
              <span className="text-sm font-medium uppercase tracking-wider">
                Near You
              </span>
            </div>
            <h2 className="text-3xl font-bold text-white md:text-4xl">
              {t("title")}
            </h2>
          </div>

          {/* Desktop Controls */}
          {nearby.length > 0 && (
            <div className="hidden gap-3 md:flex">
              <button
                onClick={() => scrollToSnap("prev")}
                disabled={!canScrollPrev}
                className={`flex h-12 w-12 items-center justify-center rounded-full transition-all ${
                  canScrollPrev
                    ? "bg-white text-[#ec2227] shadow-lg hover:bg-gray-50 hover:scale-105"
                    : "bg-white/10 text-white/30 cursor-not-allowed"
                }`}
                aria-label="Previous"
              >
                <FaChevronLeft className="text-lg" />
              </button>
              <button
                onClick={() => scrollToSnap("next")}
                disabled={!canScrollNext}
                className={`flex h-12 w-12 items-center justify-center rounded-full transition-all ${
                  canScrollNext
                    ? "bg-white text-[#ec2227] shadow-lg hover:bg-gray-50 hover:scale-105"
                    : "bg-white/10 text-white/30 cursor-not-allowed"
                }`}
                aria-label="Next"
              >
                <FaChevronRight className="text-lg" />
              </button>
            </div>
          )}
        </div>

        {/* Status States */}
        {!coords && !error && (
          <div className="py-4">
            <div className="mb-4 flex items-center gap-3 text-white/80">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              <p className="text-sm font-medium">{t("detectingLocation")}</p>
            </div>
            <TripsNearbySkeleton />
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center rounded-2xl bg-white/10 py-12 text-center text-white backdrop-blur-sm">
            <MdLocationOff className="mb-3 text-4xl opacity-80" />
            <p className="font-medium">{t("locationError", { error })}</p>
            <p className="mt-1 text-sm opacity-80">
              {t("browseTripsBelowFallback")}
            </p>
          </div>
        )}

        {coords && nearby.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center rounded-2xl bg-white/10 py-12 text-white backdrop-blur-sm">
            <p className="text-lg font-medium">{t("noTripsNearby")}</p>
            <p className="mt-1 text-sm opacity-80">
              Try searching for a different location
            </p>
          </div>
        )}

        {/* Cards Carousel */}
        {nearby.length > 0 && (
          <div className="relative group">
            <div
              ref={trackRef}
              className="flex gap-6 overflow-x-auto pb-8 pt-2 snap-x snap-mandatory scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            >
              {nearby.map((c) => {
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
                    averageRating={getRating(c)}
                    reviewCount={getReviewCount(c)}
                    className="shrink-0 snap-start w-[300px] md:w-[320px] transition-transform hover:-translate-y-1"
                  />
                );
              })}
            </div>

            {/* Mobile Navigation Overlay Buttons */}
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center md:hidden">
              {canScrollPrev && (
                <button
                  onClick={() => scrollToSnap("prev")}
                  className="pointer-events-auto ml-2 flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#ec2227] shadow-lg opacity-90"
                >
                  <FaChevronLeft />
                </button>
              )}
            </div>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center md:hidden">
              {canScrollNext && (
                <button
                  onClick={() => scrollToSnap("next")}
                  className="pointer-events-auto mr-2 flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#ec2227] shadow-lg opacity-90"
                >
                  <FaChevronRight />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
