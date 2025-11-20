/**
 * Smart Refresh Component for Booking Status Pages
 *
 * This component provides intelligent status refresh based on booking status:
 *
 * Features:
 * 1. **Tab Focus Refresh**: Auto-refreshes when user returns to the tab (PENDING/PAYMENT_PENDING/APPROVED)
 * 2. **Continuous Polling**: For PAYMENT_PENDING status, polls every 30 seconds for captain approval
 * 3. **One-Time Delayed Check**: For legacy PENDING bookings, checks once after 30 seconds
 * 4. **Manual Refresh Button**: User can manually check status anytime
 *
 * Performance Impact:
 * - PAYMENT_PENDING: Active polling (30s interval) for real-time captain approval updates
 * - PENDING: One-time delayed check + focus refresh
 * - APPROVED: Focus refresh only
 * - Other statuses: No auto-refresh
 *
 * Usage:
 * ```tsx
 * <BookingStatusRefresh
 *   status="PAYMENT_PENDING"
 *   showButton={true}  // Optional: hide button for silent mode
 * />
 * ```
 *
 * Works in conjunction with Next.js revalidatePath() on the server side:
 * - Captain approves booking → calls revalidatePath()
 * - Next user refresh gets fresh data from cache
 * - This component triggers those refreshes intelligently
 */
"use client";

import { Button } from "@/components/ui/button";
import { convert24to12Hour } from "@/lib/helpers/booking-helpers";
import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface BookingStatusRefreshProps {
  /** Current booking status - only auto-refresh if PENDING or APPROVED */
  status: string;
  /** Optional: Show the button */
  showButton?: boolean;
  /** Optional: Custom className for the button */
  className?: string;
}

export function BookingStatusRefresh({
  status,
  showButton = true,
  className = "",
}: BookingStatusRefreshProps) {
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);

  // Only enable auto-refresh for statuses that can change
  const shouldAutoRefresh =
    status === "PENDING" ||
    status === "PAYMENT_PENDING" ||
    status === "APPROVED";

  // Auto-refresh when user returns to tab (only for pending/payment_pending/approved bookings)
  useEffect(() => {
    if (!shouldAutoRefresh) return;

    const onFocus = () => {
      console.log("[BookingStatusRefresh] Tab focused, refreshing data...");
      router.refresh();
      setLastRefreshTime(new Date());
    };

    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [router, shouldAutoRefresh]);

  // Continuous polling for PAYMENT_PENDING status (every 30 seconds)
  useEffect(() => {
    if (status !== "PAYMENT_PENDING") return;

    console.log(
      "[BookingStatusRefresh] Starting 30s polling for PAYMENT_PENDING status..."
    );

    // Initial refresh
    router.refresh();
    setLastRefreshTime(new Date());

    // Set up interval for continuous polling
    const interval = setInterval(() => {
      console.log("[BookingStatusRefresh] Polling PAYMENT_PENDING status...");
      router.refresh();
      setLastRefreshTime(new Date());
    }, 30000); // 30 seconds

    return () => {
      console.log("[BookingStatusRefresh] Cleaning up polling interval");
      clearInterval(interval);
    };
  }, [router, status]);

  // Optional: One-time delayed check after 30 seconds for legacy PENDING bookings
  useEffect(() => {
    if (status !== "PENDING") return;

    console.log("[BookingStatusRefresh] Scheduling one-time check in 30s...");
    const timer = setTimeout(() => {
      console.log("[BookingStatusRefresh] Performing delayed status check...");
      router.refresh();
      setLastRefreshTime(new Date());
    }, 30000); // 30 seconds

    return () => clearTimeout(timer);
  }, [router, status]);

  const handleManualRefresh = () => {
    console.log("[BookingStatusRefresh] Manual refresh triggered");
    setIsRefreshing(true);
    router.refresh();
    setLastRefreshTime(new Date());

    // Reset spinner after a short delay
    setTimeout(() => setIsRefreshing(false), 500);
  };

  if (!showButton) {
    // Silent mode - only auto-refresh on focus, no button
    return null;
  }

  return (
    <div className={`flex flex-col items-end gap-2 ${className}`}>
      {lastRefreshTime && (
        <span className="text-xs text-gray-500">
          Updated {convert24to12Hour(lastRefreshTime.toLocaleTimeString())}
        </span>
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={handleManualRefresh}
        disabled={isRefreshing}
        className="gap-2"
      >
        <RefreshCw
          className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
        />
        Check Status
      </Button>
    </div>
  );
}
