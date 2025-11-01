"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const PLACEHOLDER = "/placeholder-1.jpg";

export type Media =
  | string
  | {
      src: string;
      alt?: string;
    };

function normalizeMedia(list: Media[], title: string) {
  if (!Array.isArray(list) || list.length === 0) {
    return [{ src: PLACEHOLDER, alt: `${title} photo` }];
  }
  return list.map((item, i) => {
    if (typeof item === "string") {
      return {
        src: item || PLACEHOLDER,
        alt: `${title} photo ${i + 1}`,
      } as const;
    }
    return {
      src: item.src || PLACEHOLDER,
      alt: item.alt || `${title} photo ${i + 1}`,
    } as const;
  });
}

function clsx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export function PhotoGallery({
  images,
  title,
}: {
  images?: Media[];
  title: string;
}) {
  const safeImages =
    Array.isArray(images) && images.length > 0 ? images : undefined;
  const media = useMemo(
    () => normalizeMedia(safeImages ?? [], title),
    [safeImages, title]
  );
  const [activeIdx, setActiveIdx] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  const openAt = useCallback((idx: number) => {
    setActiveIdx(idx);
    setIsOpen(true);
  }, []);

  // scroll lock when modal open
  useEffect(() => {
    if (!isOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [isOpen]);

  // keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
      if (e.key === "ArrowRight")
        setActiveIdx((i: number) => (i + 1) % media.length);
      if (e.key === "ArrowLeft")
        setActiveIdx((i: number) => (i - 1 + media.length) % media.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, media.length]);

  const main = media[activeIdx] ?? media[0];
  const tiles = media.slice(0, Math.min(5, media.length));

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,3fr)_minmax(0,1fr)] sm:auto-rows-[minmax(0,1fr)]">
        {/* Main tile (left) */}
        <button
          type="button"
          onClick={() => openAt(0)}
          className="relative w-full h-64 overflow-hidden bg-gray-100 group rounded-xl sm:row-span-2 sm:h-auto sm:min-h-[500px]"
          aria-label="Open gallery"
        >
          <Image
            src={main?.src || PLACEHOLDER}
            alt={main?.alt || `${title} main image`}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            sizes="(max-width: 768px) 100vw, 66vw"
            priority
          />
          {/* Overlay top bar with title + count */}
          <div className="absolute top-0 left-0 z-10 w-full p-3 pointer-events-none bg-gradient-to-b from-black/30 to-transparent sm:p-4">
            <div className="flex items-center justify-between gap-2 text-white">
              <div className="min-w-0 text-sm font-semibold truncate drop-shadow">
                {title}
              </div>
              <div className="rounded-full bg-black/40 px-2 py-0.5 text-xs backdrop-blur">
                {media.length} {media.length === 1 ? "item" : "items"}
              </div>
            </div>
          </div>
          {/* View all button (bottom-right) */}
          <div className="absolute bottom-0 right-0 z-10 m-3 pointer-events-none sm:m-4">
            <span className="inline-flex items-center gap-2 px-3 py-1 text-sm font-medium text-gray-900 transition rounded-full shadow pointer-events-auto bg-white/80 backdrop-blur hover:bg-white">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="feather feather-image"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="M21 15l-5-5L5 21" />
              </svg>
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  openAt(activeIdx);
                }}
              >
                View all
              </span>
            </span>
          </div>
        </button>

        {/* Desktop right column (up to 4 extra tiles) */}
        <div className="hidden sm:grid sm:row-span-2 sm:grid-cols-1 sm:grid-rows-4 sm:gap-3 sm:h-full">
          {tiles.slice(1).map((m: (typeof media)[number], i: number) => {
            const idx = i + 1;
            const isLast =
              idx === tiles.length - 1 && media.length > tiles.length;
            return (
              <button
                key={m.src + idx}
                type="button"
                onClick={() => openAt(idx)}
                className="relative flex w-full h-full overflow-hidden bg-gray-100 group rounded-xl"
                aria-label={`Open item ${idx + 1}`}
              >
                <Image
                  src={m.src || PLACEHOLDER}
                  alt={m.alt || `${title} thumbnail ${idx + 1}`}
                  fill
                  className="object-cover"
                  sizes="25vw"
                />
                {/* "See all" overlay on last visible tile when more items exist */}
                {isLast && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40">
                    <span className="px-3 py-1 text-sm font-semibold text-gray-900 rounded-full shadow bg-white/90">
                      +{media.length - tiles.length} more
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Mobile horizontal scroller */}
      <div className="flex gap-2 mt-2 overflow-x-auto sm:hidden">
        {media.map((m: (typeof media)[number], idx: number) => (
          <button
            key={m.src + idx}
            type="button"
            onClick={() => openAt(idx)}
            aria-label={`Open item ${idx + 1}`}
            className={clsx(
              "relative h-16 w-28 shrink-0 overflow-hidden rounded-lg border bg-gray-100",
              idx === activeIdx ? "border-[#ec2227]" : "border-transparent"
            )}
          >
            <Image
              src={m.src || PLACEHOLDER}
              alt={m.alt || `${title} thumbnail ${idx + 1}`}
              fill
              className="object-cover"
              sizes="112px"
            />
          </button>
        ))}
      </div>

      {/* LIGHTBOX / MODAL */}
      {isOpen && (
        <Lightbox
          title={title}
          media={media}
          index={activeIdx}
          onClose={() => setIsOpen(false)}
          onIndexChange={setActiveIdx}
        />
      )}
    </>
  );
}

// Lightbox modal for PhotoGallery
function Lightbox({
  title,
  media,
  index,
  onClose,
  onIndexChange,
}: {
  title: string;
  media: ReturnType<typeof normalizeMedia>;
  index: number;
  onClose: () => void;
  onIndexChange: (idx: number) => void;
}) {
  const [current, setCurrent] = useState(index);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    setCurrent(index);
  }, [index]);

  useEffect(() => {
    onIndexChange(current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, media.length]);

  const prev = useCallback(() => {
    setCurrent((c) => (c - 1 + media.length) % media.length);
  }, [media.length]);
  const next = useCallback(() => {
    setCurrent((c) => (c + 1) % media.length);
  }, [media.length]);

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touch.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touch.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touch.current.x;
    if (Math.abs(dx) > 50) {
      if (dx < 0) next();
      else prev();
    }
    touch.current = null;
  };

  const fsRef = useRef<HTMLDivElement | null>(null);
  const requestFs = () => {
    const el = fsRef.current as HTMLElement & {
      requestFullscreen?: () => void;
    };
    if (el && typeof el.requestFullscreen === "function")
      el.requestFullscreen();
  };

  const m = media[current];

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[1000]"
      role="dialog"
      aria-modal="true"
      ref={containerRef}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }}
    >
      {/* Top bar */}
      <div
        className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-3 mx-auto text-white pointer-events-none max-w-7xl"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 text-sm rounded-full pointer-events-auto bg-white/10">
          <span className="truncate">{title}</span>
        </div>
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            className="px-3 py-1 text-sm rounded-full bg-white/10 hover:bg-white/20"
            onClick={requestFs}
            aria-label="Enter fullscreen"
          >
            Fullscreen
          </button>
          <button
            className="px-3 py-1 text-sm rounded-full bg-white/10 hover:bg-white/20"
            onClick={onClose}
            aria-label="Close gallery"
          >
            Close
          </button>
        </div>
      </div>

      {/* Media viewer */}
      <div
        ref={fsRef}
        className="absolute inset-0 flex items-center justify-center px-4 mx-auto max-w-7xl"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div className="relative w-full max-w-full aspect-video">
          <Image
            src={m.src || PLACEHOLDER}
            alt={m.alt || title}
            fill
            className="object-contain rounded-lg"
            sizes="100vw"
          />
        </div>

        {/* Prev/Next controls */}
        {media.length > 1 && (
          <>
            <button
              className="absolute p-3 text-white -translate-y-1/2 rounded-full left-2 top-1/2 bg-white/10 hover:bg-white/20"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                prev();
              }}
              aria-label="Previous"
            >
              <ArrowLeft />
            </button>
            <button
              className="absolute p-3 text-white -translate-y-1/2 rounded-full right-2 top-1/2 bg-white/10 hover:bg-white/20"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                next();
              }}
              aria-label="Next"
            >
              <ArrowRight />
            </button>
          </>
        )}

        {/* Counter */}
        <div className="absolute px-3 py-1 text-sm text-white -translate-x-1/2 rounded-full bottom-4 left-1/2 bg-white/10">
          {current + 1} / {media.length}
        </div>
      </div>

      {/* Filmstrip thumbnails (desktop) */}
      {media.length > 1 && (
        <div
          className="absolute bottom-0 left-0 right-0 hidden py-3 overflow-x-auto max-h-28 bg-black/40 sm:block"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex gap-2 px-4 mx-auto max-w-7xl">
            {media.map((mm, i) => (
              <button
                key={mm.src + i}
                className={clsx(
                  "relative h-20 w-32 shrink-0 overflow-hidden rounded-md border",
                  i === current ? "border-white" : "border-white/30"
                )}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setCurrent(i);
                }}
                aria-label={`Go to item ${i + 1}`}
              >
                <Image
                  src={mm.src || PLACEHOLDER}
                  alt={mm.alt || `${title} thumbnail ${i + 1}`}
                  fill
                  className="object-cover"
                  sizes="128px"
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ArrowLeft() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M15 6l-6 6 6 6"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}
function ArrowRight() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M9 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}
