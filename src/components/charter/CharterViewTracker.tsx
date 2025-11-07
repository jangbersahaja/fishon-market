"use client";

import { useTrackPageView } from "@/lib/analytics-tracking";

interface CharterViewTrackerProps {
  charterId: string;
  ownerId?: string;
  userId?: string;
}

/**
 * Client component that tracks charter page views
 * Use this in server components to track page views without making the entire page client-side
 */
export function CharterViewTracker({
  charterId,
  ownerId,
  userId,
}: CharterViewTrackerProps) {
  useTrackPageView({
    eventType: "CHARTER_VIEW",
    charterId,
    ownerId,
    userId,
  });

  return null;
}
