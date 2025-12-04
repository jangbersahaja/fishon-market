"use client";

import { useAuthModal } from "@/components/auth/AuthModalContext";
import {
  GuestBookingVerificationModal,
  PromoCodeInput,
} from "@/components/booking";
import { useBookingStorage } from "@/hooks/useBookingStorage";
import {
  calculateBlockedDates,
  type PartialAvailability,
} from "@/lib/helpers/availability-helpers";
import { calculateDays } from "@/lib/helpers/date-range-helpers";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSession } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import BookingSummaryCard from "./BookingSummaryCard";
import DateGuestsCard from "./DateGuestsCard";
import EmergencyContactCard from "./EmergencyContactCard";
import ParticipantListCard from "./ParticipantListCard";
import NoteToCaptainCard from "./StartConversationCard";
import StartTimeSelection from "./StartTimeSelection";
import StepHeader from "./StepHeader";
import TripSelectionCard from "./TripSelectionCard";
import YourDetailsCard from "./YourDetailsCard";
import type { BookingFormData } from "./types";

// Zod validation schema for booking form
// Base schema without payment validation
const baseBookingSchema = z
  .object({
    charterId: z.string().min(1, "Charter ID is required"),
    tripId: z.string().min(1, "Trip ID is required"),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
    days: z.number().int().min(1).max(14, "Days must be between 1 and 14"),
    adults: z.number().int().min(1, "At least one adult is required"),
    children: z.number().int().min(0),
    startTime: z.string().min(1, "Start time is required"),
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    email: z.string().email("Invalid email address"),
    phone: z
      .string()
      .min(1, "Phone number is required")
      .regex(
        /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/,
        "Please enter a valid phone number"
      ),
    note: z.string().optional(),
    // Emergency contact fields
    emergencyName: z.string().min(1, "Emergency contact name is required"),
    emergencyPhone: z.string().min(1, "Emergency contact phone is required"),
    emergencyRelation: z
      .string()
      .min(1, "Emergency contact relation is required"),
    // Participants list
    participants: z
      .array(
        z.object({
          name: z.string().min(1, "At least one participant name is required"),
          phone: z.string().min(1, "Phone is required"),
          isBooker: z.boolean().optional(),
        })
      )
      .min(1, "At least one participant is required"),
  })
  .refine(
    (data) => {
      const totalGuests = data.adults + data.children;
      return data.participants.length <= totalGuests;
    },
    {
      message: "Number of participants cannot exceed total guests",
      path: ["participants"],
    }
  ) satisfies z.ZodType<BookingFormData>;

function toInt(v: string | null, fallback: number) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.floor(n) : fallback;
}

type Trip = {
  id?: string; // Trip ID from captain DB
  name: string;
  duration?: string;
  description?: string;
  price: number;
  maxAnglers?: number;
  startTimes?: string[];
  targetSpecies?: string[];
  techniques?: string[];
};

interface Boat {
  name?: string;
  type?: string;
  features?: string[];
  capacity?: number;
}

interface Captain {
  name: string;
  avatarUrl?: string;
  yearsExperience: number;
  crewCount: number;
  intro?: string;
}

type CharterData = {
  id?: string;
  name?: string;
  charterType?: string;
  address?: string;
  location?: string;
  images?: string[];
  boat?: Boat;
  includes?: string[];
  coordinates?: { lat: number; lng: number };
  captain?: Captain | null;
  species?: string[];
  techniques?: string[];
  schedule?: {
    type: "EVERYDAY" | "WEEKDAYS" | "WEEKENDS" | "CUSTOM";
    operationalDays: number[];
  };
  unavailability?: Array<{
    startDate: string | Date;
    endDate: string | Date;
    reason?: string | null;
    isAllDay?: boolean;
    startTime?: string;
    endTime?: string;
  }>;
};

export default function CheckoutForm({
  startTimes,
  defaultStartTime,
  trips,
  selectedTripIndex,
  charter,
  defaultUser,
  charterFlowType = "MANUAL",
}: {
  startTimes?: string[];
  defaultStartTime?: string;
  trips?: Trip[];
  selectedTripIndex?: number;
  charter?: CharterData;
  defaultUser?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    emergencyName?: string;
    emergencyPhone?: string;
    emergencyRelation?: string;
  };
  charterFlowType?: "MANUAL" | "AUTO";
}) {
  const t = useTranslations("booking.checkout");
  const locale = useLocale();
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();
  const { openModal } = useAuthModal();
  const { addBooking } = useBookingStorage();
  const isLoggedIn = !!session?.user;

  // Helper function to translate Zod error messages
  const translateErrorMessage = (message: string): string => {
    const errorMap: Record<string, string> = {
      "Start time is required": t("validation.errorMessages.startTimeRequired"),
      "First name is required": t("validation.errorMessages.firstNameRequired"),
      "Last name is required": t("validation.errorMessages.lastNameRequired"),
      "Invalid email address": t("validation.errorMessages.emailInvalid"),
      "Phone number is required": t("validation.errorMessages.phoneRequired"),
      "Please enter a valid phone number": t(
        "validation.errorMessages.phoneInvalid"
      ),
      "Emergency contact name is required": t(
        "validation.errorMessages.emergencyNameRequired"
      ),
      "Emergency contact phone is required": t(
        "validation.errorMessages.emergencyPhoneRequired"
      ),
      "Emergency contact relation is required": t(
        "validation.errorMessages.emergencyRelationRequired"
      ),
      "At least one participant name is required": t(
        "validation.errorMessages.participantNameRequired"
      ),
      "Phone is required": t(
        "validation.errorMessages.participantPhoneRequired"
      ),
      "At least one participant is required": t(
        "validation.errorMessages.participantsRequired"
      ),
      "Number of participants cannot exceed total guests": t(
        "validation.errorMessages.participantsExceedGuests"
      ),
    };
    return errorMap[message] || message;
  };

  // Get current pathname to preserve it when updating search params
  const currentPath = pathname;

  const charterId = charter?.id || sp.get("charterId");
  const date = sp.get("date") || "";
  const days = toInt(sp.get("days"), 1);
  const adults = toInt(sp.get("adults"), 2);
  const children = toInt(sp.get("children"), 0);
  const tripIndexParam = toInt(sp.get("trip_index"), selectedTripIndex ?? 0);

  const [tripIndex, setTripIndex] = useState<number>(tripIndexParam);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [partialAvailability, setPartialAvailability] = useState<
    Map<string, PartialAvailability>
  >(new Map());

  // Note: bookedDates fetching removed - DateGuestsCard now handles this via onPartialAvailabilityChange callback

  // Calculate blocked dates
  const blockedDatesSet = useMemo(() => {
    if (!charter?.schedule) return new Set<string>();

    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 3);

    const result = calculateBlockedDates(
      charter.schedule,
      charter.unavailability,
      null, // CheckoutForm doesn't fetch booked dates, let DateGuestsCard handle it
      startDate,
      endDate
    );
    // Always return a Set<string>
    return result instanceof Set
      ? new Set(
          Array.from(result).filter((v): v is string => typeof v === "string")
        )
      : new Set(
          (result as any[]).filter((v): v is string => typeof v === "string")
        );
  }, [charter?.schedule, charter?.unavailability]);

  // Note: partialAvailability is now a state variable (line 220) populated by DateGuestsCard callback
  // Removed duplicate useMemo calculation

  // Validate if selected date is blocked
  const isDateBlocked = useCallback(
    (dateStr: string) => {
      if (!dateStr) return false;
      return blockedDatesSet.has(dateStr);
    },
    [blockedDatesSet]
  );

  // Validate date range
  const isDateRangeValid = useCallback(
    (dateStr: string, daysCount: number) => {
      if (!dateStr || daysCount < 1) return false;

      // Parse YYYY-MM-DD string to local date
      const [year, month, day] = dateStr.split("-").map(Number);
      const startDate = new Date(year, month - 1, day);

      for (let i = 0; i < daysCount; i++) {
        const checkDate = new Date(startDate);
        checkDate.setDate(checkDate.getDate() + i);
        // Format in local time
        const y = checkDate.getFullYear();
        const m = String(checkDate.getMonth() + 1).padStart(2, "0");
        const d = String(checkDate.getDate()).padStart(2, "0");
        const checkDateStr = `${y}-${m}-${d}`;

        if (blockedDatesSet.has(checkDateStr)) {
          return false;
        }
      }
      return true;
    },
    [blockedDatesSet]
  );

  // Initialize React Hook Form with Zod validation (dynamic schema based on flow type)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
    trigger,
    setError: setFormError,
    clearErrors,
    control,
  } = useForm<BookingFormData>({
    resolver: zodResolver(baseBookingSchema),
    defaultValues: {
      charterId: charterId || "",
      tripId: "",
      date,
      days,
      adults,
      children,
      startTime: defaultStartTime,
      firstName: defaultUser?.firstName || "",
      lastName: defaultUser?.lastName || "",
      email: defaultUser?.email || "",
      phone: defaultUser?.phone || "",
      note: "",
      emergencyName: defaultUser?.emergencyName || "",
      emergencyPhone: defaultUser?.emergencyPhone || "",
      emergencyRelation: defaultUser?.emergencyRelation || "",
      participants: [
        {
          name: "",
          phone: "",
          isBooker: false,
        },
      ],
    },
  });

  // Watch form fields for UI updates
  const firstName = watch("firstName");
  const lastName = watch("lastName");
  const email = watch("email");
  const phone = watch("phone");
  const startTime = watch("startTime");
  const selectedDate = watch("date");
  const selectedDays = watch("days");

  // Promo code state
  const [appliedPromo, setAppliedPromo] = useState<{
    code: string;
    discount: number;
    promoCodeId: string;
  } | null>(null);

  // Normalize URL params on mount: support both date+days and startDate+endDate formats
  useEffect(() => {
    const startDateParam = sp.get("startDate");
    const endDateParam = sp.get("endDate");
    const dateParam = sp.get("date");

    // If we have startDate+endDate but not date+days, convert and redirect
    if (startDateParam && endDateParam && !dateParam) {
      const calculatedDays = calculateDays(startDateParam, endDateParam);
      const params = new URLSearchParams(sp as any);
      params.set("date", startDateParam);
      params.set("days", String(calculatedDays));
      params.delete("startDate");
      params.delete("endDate");
      router.replace(`${currentPath}?${params.toString()}`, { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount - sp/router/currentPath are stable

  // Prefill after in-page login if fields are still blank
  // Only run when session changes, not when form fields change
  const sessionEmail = session?.user?.email;
  const sessionName = session?.user?.name;
  useEffect(() => {
    if (!sessionEmail && !sessionName) return;

    // Only set if currently empty (check current form values directly)
    const currentEmail = watch("email");
    const currentFirstName = watch("firstName");
    const currentLastName = watch("lastName");

    if (!currentEmail && sessionEmail) setValue("email", sessionEmail);
    if (!currentFirstName && sessionName) {
      const [fn, ...rest] = (sessionName || "").split(" ");
      setValue("firstName", fn || "");
      const ln = rest.join(" ").trim();
      if (!currentLastName && ln) setValue("lastName", ln);
    }
    // Pre-fill emergency contact from defaultUser (fetched from User model)
    if (defaultUser?.emergencyName)
      setValue("emergencyName", defaultUser.emergencyName);
    if (defaultUser?.emergencyPhone)
      setValue("emergencyPhone", defaultUser.emergencyPhone);
    if (defaultUser?.emergencyRelation)
      setValue("emergencyRelation", defaultUser.emergencyRelation);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionEmail, sessionName, defaultUser]);

  const effectiveStartTimes = useMemo(() => {
    const t = trips?.[tripIndex];
    const tripStartTimes = t?.startTimes;
    const result =
      Array.isArray(tripStartTimes) && tripStartTimes.length > 0
        ? (tripStartTimes as string[])
        : startTimes;

    return result;
  }, [trips, tripIndex, startTimes]);

  // Calculate disabled start times based on partial availability for selected date
  // For multi-day bookings, check ALL dates in the range
  const disabledStartTimes = useMemo(() => {
    if (!date || !partialAvailability || !effectiveStartTimes) {
      return [];
    }

    // Generate all dates in the booking range
    const getDatesInRange = (startDate: string, numDays: number): string[] => {
      const dates: string[] = [];
      const [year, month, day] = startDate.split("-").map(Number);
      const start = new Date(year, month - 1, day);

      for (let i = 0; i < numDays; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const dayStr = String(d.getDate()).padStart(2, "0");
        dates.push(`${y}-${m}-${dayStr}`);
      }
      return dates;
    };

    const datesToCheck = getDatesInRange(date, days);

    // Helper: Check if a time falls within unavailable ranges
    const isTimeInConflict = (
      time: string,
      ranges: { startTime: string; endTime: string }[]
    ): boolean => {
      const [hour, min] = time.split(":").map(Number);
      const timeMinutes = hour * 60 + min;

      return ranges.some((range) => {
        const [startHour, startMin] = range.startTime.split(":").map(Number);
        const [endHour, endMin] = range.endTime.split(":").map(Number);
        const startMinutes = startHour * 60 + startMin;
        const endMinutes = endHour * 60 + endMin;

        return timeMinutes >= startMinutes && timeMinutes < endMinutes;
      });
    };

    // Check first day for time conflicts
    const firstDayPartial = partialAvailability.get(date);

    // Filter start times that conflict with ANY date in the range
    const disabled = effectiveStartTimes.filter((time) => {
      // Check first day time conflict
      if (firstDayPartial?.unavailableTimeRanges?.length) {
        if (isTimeInConflict(time, firstDayPartial.unavailableTimeRanges)) {
          return true;
        }
      }

      // For multi-day: check if THIS SPECIFIC start time is booked on any other day
      // Only block if the same trip slot is already booked
      if (days > 1) {
        for (let i = 1; i < datesToCheck.length; i++) {
          const dayPartial = partialAvailability.get(datesToCheck[i]);
          if (dayPartial?.unavailableTimeRanges?.length) {
            // Check if this specific start time is booked on this day
            const hasConflictingSlot = dayPartial.unavailableTimeRanges.some(
              (range) => range.bookedStartTime === time
            );
            if (hasConflictingSlot) return true;
          }
        }
      }

      return false;
    });

    return disabled;
  }, [date, days, partialAvailability, effectiveStartTimes]);

  const canSubmit = useMemo(() => {
    // Start time is always required for all charters
    const startTimeOk = Boolean(startTime);

    // Check if date is valid (not blocked)
    const dateIsValid =
      selectedDate && selectedDays > 0
        ? !isDateBlocked(selectedDate) &&
          isDateRangeValid(selectedDate, selectedDays)
        : false;

    // No payment validation on checkout form - payment is handled on preview page for AUTO flow
    return Boolean(
      charterId &&
        date &&
        days > 0 &&
        adults >= 1 &&
        firstName &&
        lastName &&
        email &&
        phone &&
        startTimeOk &&
        dateIsValid
    );
  }, [
    charterId,
    date,
    days,
    adults,
    firstName,
    lastName,
    email,
    phone,
    startTime,
    selectedDate,
    selectedDays,
    isDateBlocked,
    isDateRangeValid,
  ]);

  function handleTripSelect(idx: number) {
    setTripIndex(idx);
    const params = new URLSearchParams(sp as any);
    params.set("trip_index", String(idx));
    if (startTime) params.set("start_time", startTime);
    router.replace(`${currentPath}?${params.toString()}`, { scroll: false });
    // reset start time when switching trips
    setValue("startTime", "");
    // reset promo code when switching trips (discount is calculated based on trip price)
    setAppliedPromo(null);
  }

  const updateSearchParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(sp as any);
      params.set(key, value);
      router.replace(`${currentPath}?${params.toString()}`, { scroll: false });
    },
    [sp, router, currentPath]
  );

  // Update form when URL params change
  useEffect(() => {
    setValue("date", date);
    setValue("days", days);
    setValue("adults", adults);
    setValue("children", children);
  }, [date, days, adults, children, setValue]);

  // Update tripId when trip selection changes
  useEffect(() => {
    const selectedTrip = trips?.[tripIndex];
    const tripId = (selectedTrip as any)?.id;
    if (tripId) {
      setValue("tripId", tripId);
    }
  }, [tripIndex, trips, setValue]);

  // Update charterId when charter changes
  useEffect(() => {
    if (charterId) {
      setValue("charterId", charterId);
    }
  }, [charterId, setValue]);

  // Validate selected date against blocked dates
  useEffect(() => {
    if (!selectedDate || !selectedDays) {
      clearErrors("date");
      return;
    }

    // Check if single date is blocked
    if (isDateBlocked(selectedDate)) {
      setFormError("date", {
        type: "manual",
        message: t("validation.dateNotAvailable"),
      });
      return;
    }

    // Check if date range overlaps with any blocked dates
    if (!isDateRangeValid(selectedDate, selectedDays)) {
      setFormError("date", {
        type: "manual",
        message: t("validation.dateRangeInvalid"),
      });
      return;
    }

    // Clear date errors if validation passes
    clearErrors("date");
  }, [
    selectedDate,
    selectedDays,
    isDateBlocked,
    isDateRangeValid,
    setFormError,
    clearErrors,
    t,
  ]);

  const onSubmit = handleSubmit(
    async (formData) => {
      // Authenticated user flow
      if (isLoggedIn) {
        try {
          // Manual flow: Create PENDING booking without payment
          if (charterFlowType === "MANUAL") {
            const res = await fetch("/api/bookings/create", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                charterId: formData.charterId,
                tripId: formData.tripId,
                date: formData.date,
                days: formData.days,
                adults: formData.adults,
                children: formData.children,
                startTime: formData.startTime,
                note: formData.note,
                phone: formData.phone,
                emergencyName: formData.emergencyName,
                emergencyPhone: formData.emergencyPhone,
                emergencyRelation: formData.emergencyRelation,
                participants: formData.participants,
                promoCode: appliedPromo?.code,
              }),
            });

            if (!res.ok) {
              const data = await res.json().catch(() => ({}));
              setFormError("root", {
                type: "manual",
                message: data?.error || "Failed to create booking request",
              });
              return;
            }

            const data = await res.json();
            const bookingId = data?.booking?.id;

            if (bookingId) {
              addBooking({
                id: bookingId,
                charterName: charter?.name || "Charter Trip",
                date: formData.date,
                status: "PENDING",
              });
              router.push(
                `/${locale}/book/confirm?id=${encodeURIComponent(bookingId)}`
              );
            } else {
              setFormError("root", {
                type: "manual",
                message: "Missing booking id",
              });
            }
            return;
          }

          // Auto flow: Redirect to payment preview
          if (charterFlowType === "AUTO") {
            // Encode booking data for payment preview
            const bookingData = {
              charterId: formData.charterId,
              tripId: formData.tripId,
              date: formData.date,
              days: formData.days,
              startTime: formData.startTime || "",
              adults: formData.adults,
              children: formData.children,
              firstName: formData.firstName,
              lastName: formData.lastName,
              email: formData.email,
              phone: formData.phone || "",
              emergencyName: formData.emergencyName || "",
              emergencyPhone: formData.emergencyPhone || "",
              emergencyRelation: formData.emergencyRelation || "",
              note: formData.note || "",
              participants: formData.participants,
              promoCode: appliedPromo?.code,
              sessionStart: Date.now(),
            };

            const encoded = Buffer.from(JSON.stringify(bookingData)).toString(
              "base64"
            );
            router.push(`/${locale}/book/payment/preview?data=${encoded}`);
            return;
          }
        } catch (err: any) {
          setFormError("root", {
            type: "manual",
            message: err?.message || String(err),
          });
        }
        return;
      }

      // Guest flow (Manual + Auto) always goes through verification modal first
      setShowVerificationModal(true);
      return;
    },
    () => {
      // Validation failed - errors are shown in UI
    }
  );

  // Handle guest booking after email verification
  async function handleGuestVerified(verificationData: {
    userId: string;
    email: string;
  }) {
    setShowVerificationModal(false);

    // Trigger validation and get form values
    const isValid = await trigger();
    if (!isValid) {
      setFormError("root", {
        type: "manual",
        message: "Please fill in all required fields correctly",
      });
      return;
    }

    const formData = watch();

    try {
      if (charterFlowType === "AUTO") {
        const bookingData = {
          charterId: formData.charterId,
          tripId: formData.tripId,
          date: formData.date,
          days: formData.days,
          startTime: formData.startTime || "",
          adults: formData.adults,
          children: formData.children,
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone || "",
          emergencyName: formData.emergencyName || "",
          emergencyPhone: formData.emergencyPhone || "",
          emergencyRelation: formData.emergencyRelation || "",
          note: formData.note || "",
          participants: formData.participants,
          promoCode: appliedPromo?.code,
          guestVerification: {
            userId: verificationData.userId,
            email: verificationData.email,
          },
          sessionStart: Date.now(),
        };

        const encoded = Buffer.from(JSON.stringify(bookingData)).toString(
          "base64"
        );
        router.push(`/${locale}/book/payment/preview?data=${encoded}`);
        return;
      }

      const res = await fetch("/api/bookings/create-guest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          verifiedEmail: verificationData.email,
          verifiedUserId: verificationData.userId,
          ...formData,
          promoCode: appliedPromo?.code,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setFormError("root", {
          type: "manual",
          message: data?.error || "Failed to create booking",
        });
        return;
      }

      const data = await res.json();
      const bookingId = data?.booking?.id;

      if (bookingId) {
        // Save to local storage for guest tracking
        addBooking({
          id: bookingId,
          charterName: charter?.name || "Charter Trip",
          date: formData.date,
          status: "PENDING",
        });

        // Check if payment requires redirect (FPX/E-wallet DIRECT flow)
        if (data.requiresRedirect && data.redirectUrl) {
          window.location.href = data.redirectUrl;
        } else {
          // TOKENIZED flow (Card) or MOCK - go to confirmation
          router.push(
            `/${locale}/book/confirm?id=${encodeURIComponent(bookingId)}`
          );
        }
      } else {
        setFormError("root", {
          type: "manual",
          message: "Missing booking id",
        });
      }
    } catch (err: any) {
      setFormError("root", {
        type: "manual",
        message: err?.message || String(err),
      });
    }
  }

  const chosenTrip = trips?.[tripIndex];
  const maxGuests = useMemo(() => {
    const tripMax =
      chosenTrip?.maxAnglers && chosenTrip.maxAnglers > 0
        ? chosenTrip.maxAnglers
        : undefined;
    const boatCap =
      charter?.boat?.capacity && charter.boat.capacity > 0
        ? charter.boat.capacity
        : undefined;
    return tripMax ?? boatCap;
  }, [chosenTrip?.maxAnglers, charter?.boat?.capacity]);

  // Clamp adults/children when maxGuests changes
  // Use refs to track previous values and prevent loops
  const prevClampedRef = useRef<{ adults: number; children: number } | null>(
    null
  );

  useEffect(() => {
    if (!maxGuests) return;
    const total = adults + children;
    if (total <= maxGuests) {
      prevClampedRef.current = null;
      return;
    }

    // Calculate clamped values
    const excess = total - maxGuests;
    const newChildren = Math.max(0, children - excess);
    const rem = excess - (children - newChildren);
    const newAdults = Math.max(1, adults - rem);

    // Only update if different from previous clamped values (prevent loop)
    if (
      prevClampedRef.current?.adults === newAdults &&
      prevClampedRef.current?.children === newChildren
    ) {
      return;
    }

    prevClampedRef.current = { adults: newAdults, children: newChildren };

    // Batch updates to minimize re-renders
    const params = new URLSearchParams(sp as any);
    params.set("children", String(newChildren));
    params.set("adults", String(newAdults));
    router.replace(`${currentPath}?${params.toString()}`, { scroll: false });
  }, [maxGuests, adults, children, sp, router, currentPath]);
  // Calculate complete pricing breakdown
  const tripPrice =
    (chosenTrip as any)?.priceOverride ?? chosenTrip?.price ?? 0;
  const promoDiscount = appliedPromo?.discount ?? 0;

  const pricingBreakdown = useMemo(() => {
    // Use priceOverride if available, otherwise fall back to price
    if (tripPrice === 0) return null;

    // Import and use the same pricing calculation as backend
    const subtotal = tripPrice * Math.max(1, days);
    const commission = Math.min(subtotal * 0.1, 100); // 10% cap at RM100
    const platformFee = Math.round(commission * 100) / 100;
    const discount = promoDiscount;
    const displayPrice = subtotal + platformFee; // Trip price shown to angler (includes commission)
    const amountBeforeGateway = displayPrice - discount;
    const serviceFee = Math.round(amountBeforeGateway * 0.02 * 100) / 100; // Updated to 2%
    const sst = 0; // Future
    const finalPrice =
      Math.round((amountBeforeGateway + serviceFee + sst) * 100) / 100;
    const captainEarnings = Math.round(subtotal * 100) / 100; // Captain earns base price only

    return {
      tripPrice,
      days: Math.max(1, days),
      subtotal,
      platformFee,
      discount,
      displayPrice,
      serviceFee,
      sst,
      finalPrice,
      captainEarnings,
    };
  }, [tripPrice, days, promoDiscount]);

  // Get query params for payment status messages
  const paymentStatus = sp.get("payment");
  const errorType = sp.get("error");
  const messageParam = sp.get("message");

  return (
    <form onSubmit={onSubmit} className="">
      {/* Payment cancelled or session expired message */}
      {(paymentStatus === "cancelled" || errorType === "session_expired") && (
        <div className="p-4 mb-6 border rounded-lg border-amber-200 bg-amber-50">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <svg
                className="w-5 h-5 text-amber-600"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-amber-900">
                {errorType === "session_expired"
                  ? t("sessionExpiredTitle")
                  : t("paymentCancelledTitle")}
              </h3>
              <p className="mt-1 text-sm text-amber-700">
                {messageParam ||
                  (errorType === "session_expired"
                    ? t("sessionExpiredMessage")
                    : t("paymentCancelledMessage"))}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error display */}
      {errors.root && (
        <div className="p-4 mb-6 border border-red-200 rounded-lg bg-red-50">
          <p className="text-sm text-red-800">{errors.root.message}</p>
        </div>
      )}

      {charterFlowType === "MANUAL" && (
        <div className="p-4 mb-6 border rounded-lg border-amber-200 bg-amber-50">
          <p className="text-sm font-medium text-amber-900">
            {t("manualNoticeTitle")}
          </p>
          <p className="mt-1 text-sm text-amber-900">
            {t("manualNoticeDescription")}
          </p>
          {!isLoggedIn ? (
            <p className="mt-2 text-xs text-amber-800">
              {t("manualNoticeGuestNote")}
            </p>
          ) : (
            <p className="mt-2 text-xs text-amber-800">
              {t("manualNoticeAuthNote")}
            </p>
          )}
        </div>
      )}

      {/* Main grid */}
      <section className="grid gap-3 sm:gap-5 lg:grid-cols-3 ">
        {/* Left column: Form sections */}
        <div className="space-y-3 lg:col-span-2 ">
          {/* STEP 1: Trip Details */}
          <div className="p-3 space-y-3 bg-white border rounded-lg border-black/10 sm:p-5">
            <StepHeader
              step={1}
              title={t("steps.tripDetails")}
              description={t("steps.tripDetailsDesc")}
            />

            {/* Date + Guests (Search box style) */}
            <DateGuestsCard
              schedule={charter?.schedule}
              unavailability={charter?.unavailability}
              charterId={charterId || undefined}
              charterType={charter?.charterType}
              date={date}
              onDateChange={(d) => updateSearchParam("date", d)}
              days={days}
              onDaysChange={(v) => updateSearchParam("days", String(v))}
              adults={adults}
              onAdultsChange={(nextAdults) => {
                const max = maxGuests ?? Infinity;
                const clampedAdults = Math.max(
                  1,
                  Math.min(nextAdults, max - children)
                );
                updateSearchParam("adults", String(clampedAdults));
              }}
              childrenCount={children}
              onChildrenChange={(nextChildren) => {
                const max = maxGuests ?? Infinity;
                const clampedChildren = Math.max(
                  0,
                  Math.min(nextChildren, max - adults)
                );
                updateSearchParam("children", String(clampedChildren));
              }}
              maxGuests={maxGuests}
              onPartialAvailabilityChange={setPartialAvailability}
              dateError={errors.date?.message}
            />

            {/* Trip Selection */}
            <TripSelectionCard
              trips={trips || []}
              selectedIndex={tripIndex}
              days={days}
              selectedDate={date}
              partialAvailability={partialAvailability}
              charterSpecies={charter?.species || []}
              charterTechniques={charter?.techniques || []}
              onTripSelect={handleTripSelect}
            />

            {/* Start Time Selection - Always show to prevent layout shift */}
            <StartTimeSelection
              startTimes={effectiveStartTimes}
              startTime={startTime}
              disabledTimes={disabledStartTimes}
              onStartTimeChange={(v) => setValue("startTime", v)}
              tripSelected={tripIndex >= 0}
            />
          </div>

          {/* STEP 2: Your Information */}
          <div className="p-3 space-y-3 bg-white border rounded-lg border-black/10 sm:p-5">
            <StepHeader
              step={2}
              title={t("steps.yourInformation")}
              description={t("steps.yourInformationDesc")}
            />

            {/* Your Details */}
            <YourDetailsCard
              register={register}
              errors={errors}
              control={control}
              firstName={firstName}
              lastName={lastName}
              email={email}
              phone={phone || ""}
            />

            {/* Participant List */}
            <ParticipantListCard
              register={register}
              errors={errors}
              watch={watch}
              setValue={setValue}
              control={control}
              guests={adults + (children || 0)}
            />
          </div>

          {/* STEP 3: Additional Info */}
          <div className="p-3 space-y-3 bg-white border rounded-lg border-black/10 sm:p-5">
            <StepHeader
              step={3}
              title={t("steps.additionalInfo")}
              description={t("steps.additionalInfoDesc")}
            />

            {/* Note to Captain */}
            <NoteToCaptainCard
              captain={charter?.captain}
              charterName={charter?.name}
              register={register}
              errors={errors}
            />

            {/* Emergency Contact */}
            <EmergencyContactCard
              register={register}
              errors={errors}
              control={control}
              emergencyName={watch("emergencyName")}
              emergencyPhone={watch("emergencyPhone")}
              emergencyRelation={watch("emergencyRelation")}
            />
          </div>

          {/* Promo Code - Mobile/Tablet (only for logged-in users) */}
          {isLoggedIn && pricingBreakdown && (
            <div className="flex flex-col p-3 space-y-3 bg-white border rounded-lg lg:hidden border-black/10 sm:p-5">
              <PromoCodeInput
                key={`promo-mobile-${tripIndex}`}
                charterId={charterId || ""}
                tripId={chosenTrip?.id}
                subtotal={pricingBreakdown.subtotal}
                onPromoApplied={(promo) =>
                  setAppliedPromo({
                    code: promo.code,
                    discount: promo.discount,
                    promoCodeId: promo.promoCodeId,
                  })
                }
                onPromoRemoved={() => setAppliedPromo(null)}
              />
            </div>
          )}

          {/* Submit Button */}
          <div className="flex flex-col gap-3">
            {/* Show validation errors */}
            {Object.keys(errors).length > 0 && !errors.root && (
              <div className="p-4 border border-red-200 rounded-lg bg-red-50">
                <div className="flex items-start gap-3">
                  <svg
                    className="flex-shrink-0 w-5 h-5 text-red-600 mt-0.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                  <div className="flex-1">
                    <p className="mb-2 text-sm font-semibold text-red-800">
                      {t("validation.fixErrors")}
                    </p>
                    <ul className="space-y-1.5 text-sm text-red-700">
                      {Object.entries(errors).map(
                        ([field, error]: [string, any]) => {
                          if (field === "root") return null;

                          // Get field label from translations
                          const fieldLabel = t(
                            `validation.fieldLabels.${field}` as any,
                            { default: field }
                          );

                          // Special handling for participants field
                          if (field === "participants") {
                            // If error.message exists, show it (e.g. min participants)
                            if (error?.message) {
                              return (
                                <li
                                  key={field}
                                  className="flex items-start gap-2"
                                >
                                  <span className="font-bold mt-0.5">•</span>
                                  <span>
                                    <strong>{fieldLabel}:</strong>{" "}
                                    {translateErrorMessage(error.message)}
                                  </span>
                                </li>
                              );
                            }
                            // If error is an array (field errors for each participant)
                            if (Array.isArray(error)) {
                              // Find first error in the array
                              for (let i = 0; i < error.length; i++) {
                                const participantError = error[i];
                                if (
                                  participantError &&
                                  typeof participantError === "object"
                                ) {
                                  for (const [pField, pErr] of Object.entries(
                                    participantError
                                  )) {
                                    if (
                                      pErr &&
                                      typeof pErr === "object" &&
                                      "message" in pErr &&
                                      typeof (pErr as any).message === "string"
                                    ) {
                                      return (
                                        <li
                                          key={`participants-${i}-${pField}`}
                                          className="flex items-start gap-2"
                                        >
                                          <span className="font-bold mt-0.5">
                                            •
                                          </span>
                                          <span>
                                            <strong>
                                              {t(
                                                "validation.participantError",
                                                {
                                                  number: i + 1,
                                                  field:
                                                    pField
                                                      .charAt(0)
                                                      .toUpperCase() +
                                                    pField.slice(1),
                                                }
                                              )}
                                            </strong>{" "}
                                            {translateErrorMessage(
                                              (pErr as any).message
                                            )}
                                          </span>
                                        </li>
                                      );
                                    }
                                  }
                                }
                              }
                            }
                            return null;
                          }

                          if (!error?.message) return null;
                          return (
                            <li key={field} className="flex items-start gap-2">
                              <span className="font-bold mt-0.5">•</span>
                              <span>
                                <strong>{fieldLabel}:</strong>{" "}
                                {translateErrorMessage(error.message)}
                              </span>
                            </li>
                          );
                        }
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="hidden lg:block w-full rounded-lg bg-[#ec2227] text-white px-8 py-3.5 text-base font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#d01f24] transition-colors"
            >
              {isSubmitting
                ? t("buttons.submitting")
                : charterFlowType === "MANUAL"
                  ? t("buttons.requestBooking")
                  : t("buttons.proceedToPayment")}
            </button>

            {!isLoggedIn && canSubmit && (
              <div className="pt-3 space-y-3 border-t border-gray-200">
                <p className="text-sm font-medium text-gray-700">
                  {t("guestBenefits.title")}
                </p>
                <ul className="space-y-1.5 text-sm text-gray-600">
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 mt-0.5">✓</span>
                    <span>{t("guestBenefits.autofill")}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 mt-0.5">✓</span>
                    <span>{t("guestBenefits.trackBookings")}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 mt-0.5">✓</span>
                    <span>{t("guestBenefits.saveFavorites")}</span>
                  </li>
                </ul>
                <div className="flex items-center gap-2 text-sm">
                  <button
                    type="button"
                    className="font-semibold text-[#ec2227] underline underline-offset-2 hover:text-[#d01f24] transition-colors"
                    onClick={() =>
                      openModal("signin", undefined, { showHomeButton: true })
                    }
                  >
                    {t("guestBenefits.signIn")}
                  </button>
                  <span className="text-gray-400">{t("guestBenefits.or")}</span>
                  <button
                    type="button"
                    className="font-semibold text-[#ec2227] underline underline-offset-2 hover:text-[#d01f24] transition-colors"
                    onClick={() =>
                      openModal("register", undefined, { showHomeButton: true })
                    }
                  >
                    {t("guestBenefits.createAccount")}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right column: Summary (desktop only) */}
        <div className="hidden lg:block ">
          <div className="">
            <BookingSummaryCard
              charter={charter}
              captain={charter?.captain}
              pricingBreakdown={pricingBreakdown}
            />
          </div>

          {/* Promo Code (only for logged-in users) */}
          {isLoggedIn && pricingBreakdown && (
            <div className="p-3 mt-5 space-y-3 bg-white border rounded-lg border-black/10 sm:p-5">
              <PromoCodeInput
                key={`promo-desktop-${tripIndex}`}
                charterId={charterId || ""}
                tripId={chosenTrip?.id}
                subtotal={pricingBreakdown.subtotal}
                onPromoApplied={(promo) =>
                  setAppliedPromo({
                    code: promo.code,
                    discount: promo.discount,
                    promoCodeId: promo.promoCodeId,
                  })
                }
                onPromoRemoved={() => setAppliedPromo(null)}
              />
            </div>
          )}
        </div>
      </section>

      {/* Mobile Sticky Submit Button */}
      <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-white border-t border-gray-200 shadow-lg lg:hidden">
        <div className="flex items-center justify-between max-w-lg gap-4 mx-auto">
          {/* Price summary */}
          {pricingBreakdown && (
            <div className="flex-shrink-0">
              <p className="text-xs text-gray-500">{t("summary.total")}</p>
              <p className="text-lg font-bold text-[#ec2227]">
                RM{pricingBreakdown.finalPrice.toFixed(2)}
              </p>
            </div>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 rounded-lg bg-[#ec2227] text-white px-6 py-3 text-base font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#d01f24] transition-colors"
          >
            {isSubmitting
              ? t("buttons.submitting")
              : charterFlowType === "MANUAL"
                ? t("buttons.requestBooking")
                : t("buttons.proceedToPayment")}
          </button>
        </div>
      </div>

      {/* Spacer for mobile sticky button */}
      <div className="h-24 lg:hidden" />

      {/* Guest Booking Verification Modal */}
      <GuestBookingVerificationModal
        isOpen={showVerificationModal}
        onClose={() => setShowVerificationModal(false)}
        onVerified={handleGuestVerified}
        email={email}
        firstName={firstName}
        lastName={lastName}
        phone={phone || ""}
      />
    </form>
  );
}
