"use client";

import BaseCharterCard from "@/components/charters/BaseCharterCard";
import type { Charter } from "@fishon/ui";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { MdError } from "react-icons/md";

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

  const updateScrollState = () => {
    const el = trackRef.current;
    if (!el) return;
    const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth);
    const left = Math.max(0, Math.round(el.scrollLeft));
    // tolerate small sub-pixel scroll on mobile; hide prev at start
    const EPS = 6; // px
    setCanScrollPrev(left > EPS);
    setCanScrollNext(left < maxScroll - EPS);
  };

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
  }, [nearby.length]);

  const getStep = () => {
    const el = trackRef.current;
    if (!el) return 0;
    const first = el.querySelector("article");
    if (!(first instanceof HTMLElement))
      return Math.round(el.clientWidth * 0.9);
    const rect = first.getBoundingClientRect();
    const styles = window.getComputedStyle(first);
    const margin =
      parseFloat(styles.marginLeft || "0") +
      parseFloat(styles.marginRight || "0");
    return Math.round(rect.width + margin);
  };

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
          <div className="text-sm text-white">{t("detectingLocation")}</div>
        )}
        {error && (
          <div className="flex items-center gap-2 text-sm text-white">
            <MdError className="text-3xl" />
            <p>
              {t("locationError", { error })}
              <br /> {t("browseTripsBelowFallback")}
            </p>
          </div>
        )}
        {coords && nearby.length === 0 && !error && (
          <div className="text-sm text-white">{t("noTripsNearby")}</div>
        )}

        {/* Cards (carousel) */}
        {nearby.length > 0 && (
          <>
            <h2 className="text-3xl font-bold text-center text-white">
              {t("title")}
            </h2>
            <div className="relative">
              {/* track */}
              <div
                ref={trackRef}
                className="flex gap-10 py-10 overflow-x-auto snap-x snap-mandatory scroll-smooth"
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
                      className="w-80 shrink-0 snap-start"
                    />
                  );
                })}
              </div>

              {/* arrows: shown on mobile and larger; hidden if cannot scroll in that direction */}
              {canScrollPrev && (
                <button
                  type="button"
                  aria-label="Previous"
                  onClick={() => scrollToSnap("prev")}
                  onTouchStart={(e) => {
                    e.preventDefault();
                    scrollToSnap("prev");
                  }}
                  onTouchEnd={(e) => e.preventDefault()}
                  className="absolute z-10 flex items-center justify-center -translate-y-1/2 border rounded-full shadow pointer-events-auto left-2 top-1/2 h-9 w-9 border-black/10 bg-white/90"
                >
                  ‹
                </button>
              )}
              {canScrollNext && (
                <button
                  type="button"
                  aria-label="Next"
                  onClick={() => scrollToSnap("next")}
                  className="absolute z-10 flex items-center justify-center -translate-y-1/2 border rounded-full shadow pointer-events-auto right-2 top-1/2 h-9 w-9 border-black/10 bg-white/90"
                >
                  ›
                </button>
              )}

              {/* mobile position indicators (optional) */}
              <div className="flex justify-center gap-1 mt-2 lg:hidden">
                {/* Dots are approximate (chunks of ~2 cards per viewport) */}
                {Array.from({
                  length: Math.max(1, Math.ceil(nearby.length / 2)),
                }).map((_, i) => (
                  <span
                    key={i}
                    className="h-1.5 w-1.5 rounded-full bg-black/20"
                  />
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
