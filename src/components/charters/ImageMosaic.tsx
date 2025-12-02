// components/charters/ImageMosaic.tsx
"use client";

import SafeImage from "@/components/shared/SafeImage";
import { Images } from "lucide-react";
import { useState } from "react";

export interface ImageMosaicProps {
  images: string[];
  alt: string;
  onImageClick?: (index: number) => void;
  className?: string;
}

/**
 * ImageMosaic - Multi-image layout for charter cards
 *
 * Desktop Layout (3+ images):
 * ┌─────────────────┬───────┐
 * │                 │ [2]   │
 * │                 │       │
 * │     [1]         ├───────┤
 * │   (Main)        │ [3]   │
 * │                 │       │
 * └─────────────────┴───────┘
 *
 * Mobile: Single image carousel with dots
 * Fallback: Single image if < 3 images
 */
export default function ImageMosaic({
  images,
  alt,
  onImageClick,
  className = "",
}: ImageMosaicProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Single image fallback
  if (images.length === 1) {
    return (
      <div
        className={`relative w-full h-full overflow-hidden bg-gray-100 ${className}`}
        onClick={() => onImageClick?.(0)}
      >
        <SafeImage
          src={images[0]}
          alt={alt}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover transition-transform duration-300 cursor-pointer hover:scale-105"
        />
      </div>
    );
  }

  // Two images - simple side-by-side
  if (images.length === 2) {
    return (
      <div
        className={`relative w-full h-full grid grid-cols-2 gap-1 ${className}`}
      >
        {images.slice(0, 2).map((img, idx) => (
          <div
            key={idx}
            className="relative w-full h-full overflow-hidden bg-gray-100 cursor-pointer group"
            onClick={() => onImageClick?.(idx)}
          >
            <SafeImage
              src={img}
              alt={`${alt} - Image ${idx + 1}`}
              fill
              sizes="(max-width: 640px) 50vw, 25vw"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          </div>
        ))}

        {/* Image count overlay */}
        <div className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-black/70 text-white px-2.5 py-1.5 rounded-lg text-xs font-medium backdrop-blur-sm">
          <Images className="w-3.5 h-3.5" />
          <span>{images.length} photos</span>
        </div>
      </div>
    );
  }

  // Three or more images - mosaic layout (desktop) / carousel (mobile)
  return (
    <>
      {/* Desktop: Mosaic Layout */}
      <div
        className={`hidden md:block relative w-full h-full rounded-t-xl overflow-hidden ${className}`}
      >
        <div className="grid h-full grid-cols-3 gap-1">
          {/* Main image - 2/3 width */}
          <div
            className="relative col-span-2 overflow-hidden bg-gray-100 cursor-pointer group"
            onClick={() => onImageClick?.(0)}
          >
            <SafeImage
              src={images[0]}
              alt={`${alt} - Main`}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 33vw, 22vw"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          </div>

          {/* Side images - 1/3 width, stacked */}
          <div className="flex flex-col gap-1">
            <div
              className="relative flex-1 overflow-hidden bg-gray-100 cursor-pointer group"
              onClick={() => onImageClick?.(1)}
            >
              <SafeImage
                src={images[1]}
                alt={`${alt} - Image 2`}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 17vw, 11vw"
                className="object-cover transition-transform duration-300 group-hover:scale-105"
              />
            </div>
            <div
              className="relative flex-1 overflow-hidden bg-gray-100 cursor-pointer group"
              onClick={() => onImageClick?.(2)}
            >
              <SafeImage
                src={images[2]}
                alt={`${alt} - Image 3`}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 17vw, 11vw"
                className="object-cover transition-transform duration-300 group-hover:scale-105"
              />

              {/* Show "+N more" overlay if more than 3 images */}
              {images.length > 3 && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <span className="text-lg font-semibold text-white">
                    +{images.length - 3} more
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Image count indicator */}
        <div className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-black/70 text-white px-2.5 py-1.5 rounded-lg text-xs font-medium backdrop-blur-sm">
          <Images className="w-3.5 h-3.5" />
          <span>{images.length} photos</span>
        </div>
      </div>

      {/* Mobile: Simple Carousel */}
      <div className={`md:hidden relative w-full h-full ${className}`}>
        {/* Current image */}
        <div
          className="relative w-full h-full overflow-hidden bg-gray-100"
          onClick={() => onImageClick?.(currentIndex)}
        >
          <SafeImage
            src={images[currentIndex]}
            alt={`${alt} - Image ${currentIndex + 1}`}
            fill
            sizes="100vw"
            className="object-cover"
          />
        </div>

        {/* Navigation dots */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-black/70 px-3 py-2 rounded-full backdrop-blur-sm">
          {images.slice(0, 5).map((_, idx) => (
            <button
              key={idx}
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIndex(idx);
              }}
              className={`w-1.5 h-1.5 rounded-full transition-all ${
                idx === currentIndex
                  ? "bg-white w-4"
                  : "bg-white/50 hover:bg-white/75"
              }`}
              aria-label={`View image ${idx + 1}`}
            />
          ))}
          {images.length > 5 && (
            <span className="ml-1 text-xs text-white">
              +{images.length - 5}
            </span>
          )}
        </div>

        {/* Swipe hint (touch events) */}
        <div className="absolute bottom-4 right-3 flex items-center gap-1 bg-black/70 text-white px-2.5 py-1.5 rounded-lg text-xs font-medium backdrop-blur-sm">
          <Images className="w-3.5 h-3.5" />
          <span>{images.length}</span>
        </div>

        {/* Touch navigation areas */}
        {currentIndex > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setCurrentIndex(currentIndex - 1);
            }}
            className="absolute top-0 bottom-0 left-0 w-1/3 cursor-pointer"
            aria-label="Previous image"
          />
        )}
        {currentIndex < images.length - 1 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setCurrentIndex(currentIndex + 1);
            }}
            className="absolute top-0 bottom-0 right-0 w-1/3 cursor-pointer"
            aria-label="Next image"
          />
        )}
      </div>
    </>
  );
}
