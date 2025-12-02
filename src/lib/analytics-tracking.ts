/**
 * Client-Side Analytics Tracking Utility
 *
 * Use this in fishon-market pages to track user events.
 * Automatically handles session IDs, referrers, and error handling.
 */

"use client";

import type { AnalyticsEventType } from "@prisma/client";

export interface TrackEventParams {
  eventType: AnalyticsEventType;
  charterId?: string;
  ownerId?: string;
  userId?: string;
  metadata?: Record<string, any>;
}

// Session ID management
let sessionId: string | null = null;

function getOrCreateSessionId(): string {
  if (sessionId) return sessionId;

  // Check localStorage
  if (typeof window !== "undefined" && window.localStorage) {
    const stored = localStorage.getItem("fishon_session_id");
    if (stored) {
      sessionId = stored;
      return stored;
    }

    // Create new session ID
    const newId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    localStorage.setItem("fishon_session_id", newId);
    sessionId = newId;
    return newId;
  }

  // Fallback for SSR or no localStorage
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Track an analytics event
 *
 * @example
 * ```tsx
 * // Track a charter view
 * trackEvent({
 *   eventType: 'CHARTER_VIEW',
 *   charterId: charter.id,
 *   captainId: charter.captainId,
 * });
 *
 * // Track a booking start
 * trackEvent({
 *   eventType: 'BOOKING_STARTED',
 *   charterId: charter.id,
 *   metadata: { tripId: trip.id },
 * });
 * ```
 */
export async function trackEvent(params: TrackEventParams): Promise<void> {
  try {
    // Don't track in development
    if (process.env.NODE_ENV === "development") {
      console.log("[Analytics] Skipped (dev):", params.eventType);
      return;
    }

    const sessionId = getOrCreateSessionId();
    const referrer = typeof window !== "undefined" ? document.referrer : "";

    // Send to API (fire and forget - don't await)
    fetch("/api/analytics/track", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...params,
        sessionId,
        referrer,
      }),
      // Don't block the main thread
      keepalive: true,
    }).catch((error) => {
      // Silently fail - analytics shouldn't break the app
      console.error("[Analytics] Tracking failed:", error);
    });
  } catch (error) {
    // Silently fail - analytics shouldn't break the app
    console.error("[Analytics] Tracking error:", error);
  }
}

/**
 * Track multiple events in batch
 *
 * @example
 * ```tsx
 * trackEventsBatch([
 *   { eventType: 'CHARTER_VIEW', charterId: '123' },
 *   { eventType: 'PHOTO_VIEW', charterId: '123', metadata: { photoIndex: 0 } },
 * ]);
 * ```
 */
export async function trackEventsBatch(
  events: TrackEventParams[]
): Promise<void> {
  // For now, just track individually
  // TODO: Implement batch endpoint for better performance
  for (const event of events) {
    await trackEvent(event);
  }
}

/**
 * Hook to track page views
 * Use this in page components to automatically track views
 *
 * @example
 * ```tsx
 * 'use client';
 * import { useTrackPageView } from '@/lib/analytics-tracking';
 *
 * export default function CharterPage({ charter }) {
 *   useTrackPageView({
 *     eventType: 'CHARTER_VIEW',
 *     charterId: charter.id,
 *     captainId: charter.captainId,
 *   });
 *
 *   return <div>...</div>;
 * }
 * ```
 */
export function useTrackPageView(params: TrackEventParams): void {
  // Track on mount
  if (typeof window !== "undefined") {
    // Use setTimeout to avoid blocking the initial render
    setTimeout(() => {
      trackEvent(params);
    }, 0);
  }
}

/**
 * React component to track events when rendered
 * Use this for tracking specific UI interactions
 *
 * @example
 * ```tsx
 * <TrackEvent
 *   eventType="CONTACT_CLICK"
 *   charterId={charter.id}
 *   metadata={{ contactMethod: 'whatsapp' }}
 * />
 * ```
 */
export function TrackEvent(params: TrackEventParams): null {
  useTrackPageView(params);
  return null;
}
