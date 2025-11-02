import { Badge } from "@/components/ui/badge";
import {
  getBookingStatusColor,
  getBookingStatusLabel,
} from "@/lib/helpers/booking-helpers";
import type { BookingStatus } from "@/lib/services/booking-service";

interface BookingStatusBadgeProps {
  status: BookingStatus;
  isCompleted?: boolean; // For PAID past trips, show as "Completed"
  className?: string;
}

export function BookingStatusBadge({
  status,
  isCompleted = false,
  className,
}: BookingStatusBadgeProps) {
  const colorClass = getBookingStatusColor(status);
  let label = getBookingStatusLabel(status);

  // Override label for completed trips
  if (status === "PAID" && isCompleted) {
    label = "Completed";
  }

  return (
    <Badge
      className={`${colorClass} border ${className || ""}`}
      variant="outline"
    >
      {label}
    </Badge>
  );
}
