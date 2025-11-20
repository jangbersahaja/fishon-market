"use client";

import { useLazyLoad } from "@/lib/hooks/useLazyLoad";
import { useRef } from "react";

interface LazySectionProps {
  children: React.ReactNode;
  fallback: React.ReactNode;
  id?: string;
}

export function LazySection({ children, fallback, id }: LazySectionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { isLoaded } = useLazyLoad(ref);

  return (
    <div ref={ref} id={id}>
      {isLoaded ? children : fallback}
    </div>
  );
}
