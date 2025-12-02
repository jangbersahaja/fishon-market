// src/app/components/SafeImage.tsx
"use client";

import Image, { ImageProps } from "next/image";
import { useState } from "react";

type Props = Omit<ImageProps, "src" | "alt"> & {
  src?: string | null | undefined;
  alt: string;
  placeholderSrc?: string;
};

/**
 * SafeImage – client-only wrapper around next/image that swaps to a placeholder
 * if the image fails to load. Works with `fill` or width/height props.
 *
 * ⚡ Performance: Uses Next.js image optimization by default.
 * Images are automatically converted to WebP/AVIF and resized.
 */
export default function SafeImage({
  src,
  alt,
  placeholderSrc = "/placeholder-1.jpg",
  ...rest
}: Props) {
  const [failed, setFailed] = useState(false);
  const finalSrc = !src || failed ? placeholderSrc : src;

  return (
    <Image {...rest} src={finalSrc} alt={alt} onError={() => setFailed(true)} />
  );
}
