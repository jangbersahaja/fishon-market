import type { TripData } from "@/lib/services/trip-service";
import type { Charter } from "@fishon/ui";
import { convert24to12Hour, formatBookingDate } from "./booking-helpers";

export interface BookingPreviewParticipant {
  name: string;
  phone?: string;
  isBooker?: boolean;
}

export interface BookingPreviewPayload {
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
  participants?: BookingPreviewParticipant[];
  guestVerification?: { userId: string; email: string };
  sessionStart: number;
}

export interface BookingPreviewSummaryParticipant {
  name: string;
  phone?: string;
  isBooker: boolean;
}

export interface BookingPreviewSummary {
  charter: {
    name: string;
    location: string;
    tripName: string;
  };
  schedule: {
    primaryDateLabel: string;
    multiDayRangeLabel?: string;
    daysLabel: string;
    startTimeLabel?: string;
  };
  guests: {
    totalGuests: number;
    totalLabel: string;
    breakdownLabel: string;
    adults: number;
    children: number;
  };
  participants: BookingPreviewSummaryParticipant[];
  note?: string;
}

export function buildBookingPreviewSummary(params: {
  booking: BookingPreviewPayload;
  charter: Charter;
  trip: TripData;
}): BookingPreviewSummary {
  const { booking, charter, trip } = params;
  const tripStartDate = new Date(booking.date);
  const formattedStartDate = formatBookingDate(tripStartDate);
  const totalGuests = booking.adults + booking.children;
  const dayCount = booking.days || 1;

  const schedule: BookingPreviewSummary["schedule"] = {
    primaryDateLabel: formattedStartDate,
    daysLabel: `${dayCount} ${dayCount === 1 ? "day" : "days"}`,
    startTimeLabel: booking.startTime
      ? `Starts at ${convert24to12Hour(booking.startTime)}`
      : undefined,
  };

  if (dayCount > 1) {
    const tripEndDate = new Date(tripStartDate);
    tripEndDate.setDate(tripEndDate.getDate() + (dayCount - 1));
    schedule.multiDayRangeLabel = `${formattedStartDate} - ${formatBookingDate(tripEndDate)}`;
  }

  const adultsLabel = `${booking.adults} ${booking.adults === 1 ? "adult" : "adults"}`;
  const childrenLabel = booking.children
    ? `${booking.children} ${booking.children === 1 ? "child" : "children"}`
    : undefined;

  const participants = normalizeParticipants(booking);

  const trimmedNote = booking.note?.trim();

  return {
    charter: {
      name: charter.name,
      location: charter.location,
      tripName: trip.name,
    },
    schedule,
    guests: {
      totalGuests,
      totalLabel: `${totalGuests} ${totalGuests === 1 ? "guest" : "guests"}`,
      breakdownLabel: childrenLabel
        ? `${adultsLabel}, ${childrenLabel}`
        : adultsLabel,
      adults: booking.adults,
      children: booking.children,
    },
    participants,
    note: trimmedNote ? trimmedNote : undefined,
  };
}

function normalizeParticipants(
  booking: BookingPreviewPayload
): BookingPreviewSummaryParticipant[] {
  const providedParticipants = booking.participants?.map((participant) => ({
    name: participant.name,
    phone: participant.phone,
    isBooker: Boolean(participant.isBooker),
  }));

  if (providedParticipants && providedParticipants.length > 0) {
    const ordered = [...providedParticipants];
    let bookerIndex = ordered.findIndex((participant) => participant.isBooker);

    if (bookerIndex === -1) {
      bookerIndex = 0;
    }

    const booker = {
      ...ordered[bookerIndex],
      isBooker: true,
    };

    ordered.splice(bookerIndex, 1);

    const rest = ordered.map((participant) => ({
      ...participant,
      isBooker: false,
    }));

    return [booker, ...rest];
  }

  const fallbackName = [booking.firstName, booking.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return [
    {
      name: fallbackName || booking.firstName || "Primary Guest",
      phone: booking.phone,
      isBooker: true,
    },
  ];
}
