import { checkDateAvailability } from "@/lib/helpers/availability-helpers";
import { calculatePricing } from "@/lib/services/pricing-service";
import { getTripById } from "@/lib/services/trip-service";

interface BookingPreviewData {
  charterId: string;
  tripId: string;
  date: string;
  days: number;
  startTime: string;
  adults: number;
  children: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  emergencyName: string;
  emergencyPhone: string;
  emergencyRelation: string;
  note?: string;
  sessionStart: number;
}

interface ValidationResult {
  valid: boolean;
  error?: string;
  code?: string;
  newPrice?: number;
}

const PAYMENT_SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Validate session timeout, availability, and pricing before payment
 * This prevents stale data and race conditions
 */
export async function validateSessionAndAvailability(
  data: BookingPreviewData
): Promise<ValidationResult> {
  const now = Date.now();

  // 1. Check session timeout
  const sessionExpiresAt = data.sessionStart + PAYMENT_SESSION_TIMEOUT_MS;
  if (now > sessionExpiresAt) {
    return {
      valid: false,
      error: "Payment session expired. Please start again.",
      code: "SESSION_EXPIRED",
    };
  }

  // 2. Re-check availability
  try {
    const availability = await checkDateAvailability({
      charterId: data.charterId,
      tripId: data.tripId,
      date: new Date(data.date),
      days: data.days,
      startTime: data.startTime,
    });

    if (!availability.isAvailable) {
      return {
        valid: false,
        error: "Selected date is no longer available.",
        code: "DATE_UNAVAILABLE",
      };
    }
  } catch (error) {
    console.error("Error checking availability:", error);
    return {
      valid: false,
      error: "Failed to verify availability. Please try again.",
      code: "AVAILABILITY_CHECK_FAILED",
    };
  }

  // 3. Re-validate pricing
  try {
    const trip = await getTripById(data.tripId);
    if (!trip) {
      return {
        valid: false,
        error: "Trip not found.",
        code: "TRIP_NOT_FOUND",
      };
    }

    const currentPricing = calculatePricing({
      tripPrice: trip.price,
      days: data.days,
    });

    // Allow small floating point differences (< 0.01)
    const priceDiff = Math.abs(
      currentPricing.finalPrice - (data as any).finalPrice
    );
    if (priceDiff > 0.01) {
      return {
        valid: false,
        error: "Pricing has changed. Please review the updated price.",
        code: "PRICE_CHANGED",
        newPrice: currentPricing.finalPrice,
      };
    }
  } catch (error) {
    console.error("Error validating pricing:", error);
    // Allow payment to proceed if pricing check fails (non-critical)
    console.warn("Pricing validation failed, allowing payment to proceed");
  }

  return { valid: true };
}

/**
 * Format time remaining for display
 */
export function formatTimeRemaining(ms: number): string {
  if (ms <= 0) return "0:00";

  const minutes = Math.floor(ms / (1000 * 60));
  const seconds = Math.floor((ms % (1000 * 60)) / 1000);

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
