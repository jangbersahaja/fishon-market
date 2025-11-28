"use client";

import { trackEvent } from "@/lib/analytics-tracking";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export interface VideoGalleryItem {
  url: string;
  name?: string;
  thumbnailUrl?: string | null;
}

interface VideoGalleryProps {
  videos: VideoGalleryItem[];
  className?: string;
  charterId?: string;
  ownerId?: string;
  userId?: string;
}

function cx(...parts: Array<string | undefined | null | false>) {
  return parts.filter(Boolean).join(" ");
}

function isIframe(url: string) {
  return /youtube.com|youtu.be|vimeo.com/.test(url);
}

function IframePlayer({ src }: { src: string }) {
  let embed = src;
  if (src.includes("youtube.com") || src.includes("youtu.be")) {
    const id =
      src.match(/(?:v=|\/)([0-9A-Za-z_-]{11})(?:\?|&|$)/)?.[1] ||
      src.split("/").pop();
    embed = `https://www.youtube.com/embed/${id}?autoplay=1&rel=0&modestbranding=1`;
  } else if (src.includes("vimeo.com")) {
    const id = src.split("/").filter(Boolean).pop();
    embed = `https://player.vimeo.com/video/${id}?autoplay=1`;
  }
  return (
    <iframe
      className="w-full h-full rounded-lg"
      src={embed}
      allow="autoplay; encrypted-media"
      allowFullScreen
      title="Video"
    />
  );
}

export function VideoGallery({
  videos,
  className,
  charterId,
  ownerId,
  userId,
}: VideoGalleryProps) {
  const items = useMemo(() => {
    const filtered = videos.filter((v) => !!v.url);
    return filtered;
  }, [videos]);

  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const isMobile = typeof window !== "undefined" && window.innerWidth < 640;

  const open = useCallback(
    (idx: number) => {
      setOpenIndex(idx);

      // Track video view when video is opened
      if (charterId) {
        trackEvent({
          eventType: "VIDEO_VIEW",
          charterId,
          ownerId,
          userId,
          metadata: { videoIndex: idx },
        });
      }
    },
    [charterId, ownerId, userId]
  );
  const close = useCallback(() => setOpenIndex(null), []);

  if (!items.length) return null;

  return (
    <div
      className={cx(
        "w-full overflow-hidden rounded-2xl bg-white shadow-lg border-3 border-white/20",
        className
      )}
    >
      <div className="flex gap-1 overflow-x-auto overflow-y-hidden h-[200px] sm:h-[240px] items-stretch no-scrollbar overscroll-x-contain overscroll-y-none snap-x snap-mandatory min-w-0 carousel-scroll">
        {items.map((v, i) => (
          <button
            key={v.url + i}
            type="button"
            aria-label={`Play video ${i + 1}`}
            onClick={() => open(i)}
            className="relative h-full overflow-hidden group w-44 shrink-0 bg-slate-200 snap-start"
          >
            {/* Thumbnail */}
            <VideoThumb src={v.thumbnailUrl} />
            <div className="absolute inset-0 grid place-items-center">
              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-white rounded-full shadow bg-black/60">
                ▶ Play
              </span>
            </div>
          </button>
        ))}
      </div>
      <style>{`
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .carousel-scroll {
          -webkit-overflow-scrolling: touch;
          overscroll-behavior-x: contain;
        }
      `}</style>
      {openIndex !== null && (
        <VideoLightbox
          index={openIndex}
          items={items}
          onClose={close}
          onIndexChange={setOpenIndex}
          fullscreenMobile={isMobile}
        />
      )}
    </div>
  );
}

interface VideoThumbProps {
  src?: string | null;
}
function VideoThumb({ src }: VideoThumbProps) {
  const [errored, setErrored] = useState(false);
  if (!src || errored) {
    return (
      <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-slate-400 to-slate-500 text-slate-700">
        <div className="flex flex-col items-center gap-1">
          <svg
            className="w-12 h-12 text-white/80"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
          <span className="text-xs font-medium text-white/90">Video</span>
        </div>
      </div>
    );
  }
  return (
    <Image
      src={src}
      alt="Video thumbnail"
      fill
      style={{ objectFit: "cover" }}
      className="object-cover"
      onError={() => setErrored(true)}
      sizes="(max-width: 640px) 176px, 128px"
      priority
    />
  );
}

interface VideoLightboxProps {
  items: VideoGalleryItem[];
  index: number;
  onClose: () => void;
  onIndexChange: (i: number) => void;
  fullscreenMobile: boolean;
}

function VideoLightbox({
  items,
  index,
  onClose,
  onIndexChange,
  fullscreenMobile,
}: VideoLightboxProps) {
  const [current, setCurrent] = useState(index);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [progress, setProgress] = useState<number[]>(() =>
    Array(items.length).fill(0)
  );
  const [durations, setDurations] = useState<number[]>(() =>
    Array(items.length).fill(0)
  );

  useEffect(() => {
    onIndexChange(current);
  }, [current, onIndexChange]);

  useEffect(() => {
    setCurrent(index);
  }, [index]);

  const next = useCallback(() => {
    setCurrent((c) => (c + 1 < items.length ? c + 1 : 0));
  }, [items.length]);
  const prev = useCallback(() => {
    setCurrent((c) => (c - 1 >= 0 ? c - 1 : items.length - 1));
  }, [items.length]);

  const handleEnded = useCallback(() => {
    setProgress((p) => {
      const copy = [...p];
      copy[current] = 1;
      return copy;
    });
    next();
  }, [next, current]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, onClose]);

  const touch = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touch.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touch.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touch.current.x;
    const dy = t.clientY - touch.current.y;
    if (Math.abs(dy) > 70 && Math.abs(dy) > Math.abs(dx)) {
      onClose();
      touch.current = null;
      return;
    }
    if (Math.abs(dx) > 50) {
      if (dx < 0) next();
      else prev();
    }
    touch.current = null;
  };

  const cur = items[current];

  useEffect(() => {
    setProgress((p) => {
      const copy = [...p];
      if (copy[current] !== 1) copy[current] = 0;
      return copy;
    });
  }, [current]);

  useEffect(() => {
    if (!isIframe(cur.url)) return;
    const d = durations[current] || 8;
    const t = setTimeout(() => handleEnded(), d * 1000);
    return () => clearTimeout(t);
  }, [cur.url, current, durations, handleEnded]);

  const handleMetadata = () => {
    const el = videoRef.current;
    if (!el) return;
    const d = Number.isFinite(el.duration) ? el.duration : 0;
    setDurations((prev) => {
      if (prev[current] === d) return prev;
      const copy = [...prev];
      copy[current] = d;
      return copy;
    });
  };

  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, []);

  const desktop = !fullscreenMobile;
  const videoDuration = durations[current] || (isIframe(cur.url) ? 8 : 8);
  const progressKey = `${current}-${cur.url}-${videoDuration}-${progress[current]}`;
  const viewerWrapperClass = desktop
    ? "w-[960px] min-h-[540px] max-w-full"
    : "aspect-[9/16] max-h-full";

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/85 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className={cx(
          "relative flex w-full flex-col",
          desktop ? "max-w-5xl px-4" : "h-full"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-2 py-3 text-white">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 text-sm rounded-full bg-white/10 hover:bg-white/20"
            aria-label="Close"
          >
            Close
          </button>
          <div className="text-xs opacity-80">
            {current + 1} / {items.length}
          </div>
        </div>
        <div
          className={cx(
            "relative mx-auto flex w-full flex-1 items-center justify-center",
            viewerWrapperClass
          )}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          {/* Video */}
          {isIframe(cur.url) ? (
            <IframePlayer src={cur.url} />
          ) : (
            <div className="relative flex items-center justify-center w-full h-full bg-black rounded-lg">
              <video
                key={cur.url}
                ref={videoRef}
                className="max-h-full sm:max-h-[540px] max-w-full object-contain"
                autoPlay
                playsInline
                controls
                onEnded={handleEnded}
                onLoadedMetadata={handleMetadata}
              >
                <source src={cur.url} />
                Your browser does not support the video tag.
              </video>
            </div>
          )}
          {/* Tap zones (mobile only) */}
          {!desktop && items.length > 1 && (
            <div className="absolute inset-0 z-10 flex select-none touch-none">
              <button
                type="button"
                aria-label="Previous"
                onClick={prev}
                className="w-1/2 h-full bg-transparent cursor-pointer"
              />
              <button
                type="button"
                aria-label="Next"
                onClick={next}
                className="w-1/2 h-full bg-transparent cursor-pointer"
              />
            </div>
          )}
          {/* Prev / Next (desktop only) */}
          {desktop && items.length > 1 && (
            <>
              <button
                type="button"
                onClick={prev}
                className="absolute p-3 text-white -translate-y-1/2 rounded-full left-2 top-1/2 bg-white/10 hover:bg-white/20"
                aria-label="Previous"
              >
                ←
              </button>
              <button
                type="button"
                onClick={next}
                className="absolute p-3 text-white -translate-y-1/2 rounded-full right-2 top-1/2 bg-white/10 hover:bg-white/20"
                aria-label="Next"
              >
                →
              </button>
            </>
          )}
        </div>
        {/* Film strip (desktop) */}
        {desktop && items.length > 1 && (
          <div className="mt-3 overflow-hidden">
            <div className="flex gap-2 h-[120px] items-stretch overflow-x-auto overflow-y-hidden pb-3 no-scrollbar overscroll-x-contain snap-x snap-mandatory carousel-scroll">
              {items.map((v, i) => (
                <button
                  type="button"
                  key={v.url + i}
                  onClick={() => setCurrent(i)}
                  className={cx(
                    "relative h-full w-32 shrink-0 overflow-hidden rounded-md border snap-start",
                    i === current ? "border-white" : "border-white/30"
                  )}
                  aria-label={`Select video ${i + 1}`}
                >
                  <VideoThumb src={v.thumbnailUrl} />
                  {i === current && (
                    <div className="absolute inset-0 ring-2 ring-white/70" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
        {/* Progress Bars (stories style, CSS animation driven) */}
        {items.length > 0 && (
          <div className="absolute top-0 left-0 right-0 z-20 flex gap-1 px-3 pt-2 pointer-events-none">
            {items.map((_, i) => {
              const isPrev = i < current;
              const isActive = i === current;
              const isDone = progress[i] === 1;
              const width = isPrev || isDone ? "100%" : isActive ? "0%" : "0%";
              const duration = isActive ? videoDuration : 0;
              return (
                <div
                  key={`${i}-${isActive}-${progressKey}`}
                  className="flex-1 h-1 overflow-hidden rounded-full bg-white/30"
                >
                  <div
                    className={cx(
                      "h-full rounded-full bg-white",
                      isActive && !isDone ? "animate-none" : ""
                    )}
                    style={
                      isActive && !isDone
                        ? {
                            animation: `storyFill ${duration}s linear forwards`,
                          }
                        : { width }
                    }
                  />
                </div>
              );
            })}
          </div>
        )}
        <style>{`
            @keyframes storyFill {
              from {
                width: 0%;
              }
              to {
                width: 100%;
              }
            }
          `}</style>
      </div>
    </div>
  );
}
