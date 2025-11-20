import { RefObject, useEffect, useState } from "react";

interface UseLazyLoadResult {
  isVisible: boolean;
  isLoaded: boolean;
}

export function useLazyLoad(
  ref: RefObject<HTMLElement | null>
): UseLazyLoadResult {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!ref.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
        if (entry.isIntersecting) {
          setIsLoaded(true);
        }
      },
      {
        threshold: 0.1,
      }
    );

    observer.observe(ref.current);

    return () => {
      observer.disconnect();
    };
  }, [ref]);

  return { isVisible, isLoaded };
}
