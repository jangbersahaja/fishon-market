/**
 * BookingCountdown Component
 *
 * Real-time countdown timer for booking expiration with urgency-based styling.
 * Updates every second and shows different colors based on time remaining.
 */

"use client";

import {
  formatExpirationTime,
  getUrgencyLevel,
  type UrgencyLevel,
} from "@/lib/helpers/booking-helpers";
import { cn } from "@/lib/utils";
import { Clock } from "lucide-react";
import { useEffect, useState } from "react";

interface BookingCountdownProps {
  /** Expiration date/time */
  expiresAt: Date;
  /** Optional callback when countdown reaches zero */
  onExpire?: () => void;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Show icon */
  showIcon?: boolean;
  /** Custom className */
  className?: string;
}

/**
 * Get Tailwind classes for urgency level
 */
function getUrgencyStyles(urgency: UrgencyLevel | null): {
  container: string;
  icon: string;
  text: string;
} {
  switch (urgency) {
    case "expired":
      return {
        container: "bg-gray-100 border-gray-300",
        icon: "text-gray-600",
        text: "text-gray-900 font-medium",
      };
    case "high":
      return {
        container: "bg-red-50 border-red-300 animate-pulse",
        icon: "text-red-600",
        text: "text-red-900 font-semibold",
      };
    case "medium":
      return {
        container: "bg-amber-50 border-amber-300",
        icon: "text-amber-600",
        text: "text-amber-900 font-medium",
      };
    case "low":
      return {
        container: "bg-green-50 border-green-300",
        icon: "text-green-600",
        text: "text-green-900",
      };
    default:
      return {
        container: "bg-gray-50 border-gray-300",
        icon: "text-gray-600",
        text: "text-gray-900",
      };
  }
}

/**
 * Get size classes
 */
function getSizeClasses(size: "sm" | "md" | "lg"): {
  container: string;
  icon: string;
  text: string;
} {
  switch (size) {
    case "sm":
      return {
        container: "px-2 py-1",
        icon: "w-3 h-3",
        text: "text-xs",
      };
    case "md":
      return {
        container: "px-3 py-1.5",
        icon: "w-4 h-4",
        text: "text-sm",
      };
    case "lg":
      return {
        container: "px-4 py-2",
        icon: "w-5 h-5",
        text: "text-base",
      };
  }
}

export function BookingCountdown({
  expiresAt,
  onExpire,
  size = "md",
  showIcon = true,
  className,
}: BookingCountdownProps) {
  const [timeRemaining, setTimeRemaining] = useState<string>("");
  const [urgency, setUrgency] = useState<UrgencyLevel | null>(null);

  useEffect(() => {
    // Initial calculation
    const updateCountdown = () => {
      const newUrgency = getUrgencyLevel(expiresAt);
      setUrgency(newUrgency);

      if (newUrgency === "expired") {
        setTimeRemaining("Expired");
        if (onExpire) {
          onExpire();
        }
        return false; // Stop interval
      }

      setTimeRemaining(formatExpirationTime(expiresAt));
      return true; // Continue interval
    };

    // Run immediately
    const shouldContinue = updateCountdown();

    // Only set interval if not expired
    if (!shouldContinue) return;

    // Update every second
    const interval = setInterval(() => {
      const shouldContinue = updateCountdown();
      if (!shouldContinue) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, onExpire]);

  const urgencyStyles = getUrgencyStyles(urgency);
  const sizeClasses = getSizeClasses(size);

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full border",
        urgencyStyles.container,
        sizeClasses.container,
        className
      )}
    >
      {showIcon && (
        <Clock className={cn(urgencyStyles.icon, sizeClasses.icon)} />
      )}
      <span className={cn(urgencyStyles.text, sizeClasses.text)}>
        {urgency === "expired" ? "Expired" : `Expires in ${timeRemaining}`}
      </span>
    </div>
  );
}

/**
 * Simpler variant: Shows countdown without container/styling
 */
export function BookingCountdownText({
  expiresAt,
  className,
}: {
  expiresAt: Date;
  className?: string;
}) {
  const [timeRemaining, setTimeRemaining] = useState<string>("");

  useEffect(() => {
    const updateCountdown = () => {
      const urgency = getUrgencyLevel(expiresAt);
      if (urgency === "expired") {
        setTimeRemaining("Expired");
        return false;
      }
      setTimeRemaining(formatExpirationTime(expiresAt));
      return true;
    };

    const shouldContinue = updateCountdown();
    if (!shouldContinue) return;

    const interval = setInterval(() => {
      const shouldContinue = updateCountdown();
      if (!shouldContinue) clearInterval(interval);
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  return <span className={className}>{timeRemaining}</span>;
}
