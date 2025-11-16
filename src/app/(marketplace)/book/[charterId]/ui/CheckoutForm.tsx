"use client";

import { useAuthModal } from "@/components/auth/AuthModalContext";
import { GuestBookingVerificationModal } from "@/components/booking";
import { useBookingStorage } from "@/hooks/useBookingStorage";
import { calculateBlockedDates } from "@/lib/helpers/availability-helpers";
import { calculateDays } from "@/lib/helpers/date-range-helpers";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSession } from "next-auth/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import BookingSummaryCard from "./BookingSummaryCard";
import DateGuestsCard from "./DateGuestsCard";
import EmergencyContactCard from "./EmergencyContactCard";
import ParticipantListCard from "./ParticipantListCard";
import StartConversationCard from "./StartConversationCard";
import StartTimeSelection from "./StartTimeSelection";
import TripSelectionCard from "./TripSelectionCard";
import YourDetailsCard from "./YourDetailsCard";

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
    startTime: z.string().optional(),
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    email: z.string().email("Invalid email address"),
    phone: z.string().optional(),
    note: z.string().optional(),
    // Emergency contact fields
    emergencyName: z.string().optional(),
    emergencyPhone: z.string().optional(),
    emergencyRelation: z.string().optional(),
    // Participants list
    participants: z
      .array(
        z.object({
          name: z.string().min(1, "Name is required"),
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
  );

type BookingFormData = z.infer<typeof baseBookingSchema>;

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
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();
  const { openModal } = useAuthModal();
  const { addBooking } = useBookingStorage();
  const isLoggedIn = !!session?.user;

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
  const [bookedDates, setBookedDates] = useState<string[]>([]);

  // Fetch booked dates
  useEffect(() => {
    async function fetchBookedDates() {
      if (!charterId) return;

      try {
        const startDate = new Date();
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + 3);

        // Format dates in local time (YYYY-MM-DD) to avoid UTC conversion issues
        const formatLocalYMD = (d: Date) => {
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, "0");
          const day = String(d.getDate()).padStart(2, "0");
          return `${y}-${m}-${day}`;
        };

        const response = await fetch(
          `/api/charters/${charterId}/booked-dates?startDate=${formatLocalYMD(startDate)}&endDate=${formatLocalYMD(endDate)}`
        );

        if (response.ok) {
          const data = await response.json();
          setBookedDates(data.bookedDates || []);
        }
      } catch (error) {
        console.error("[CheckoutForm] Failed to fetch booked dates:", error);
      }
    }

    fetchBookedDates();
  }, [charterId]);

  // Calculate blocked dates
  const blockedDatesSet = useMemo(() => {
    if (!charter?.schedule) return new Set<string>();

    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 3);

    const result = calculateBlockedDates(
      charter.schedule,
      charter.unavailability,
      bookedDates,
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
  }, [charter?.schedule, charter?.unavailability, bookedDates]);

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
      emergencyName: "",
      emergencyPhone: "",
      emergencyRelation: "",
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
  useEffect(() => {
    if (!session?.user) return;
    if (!email && session.user.email) setValue("email", session.user.email);
    if (!firstName && session.user.name) {
      const [fn, ...rest] = (session.user.name || "").split(" ");
      setValue("firstName", fn || "");
      const ln = rest.join(" ").trim();
      if (!lastName && ln) setValue("lastName", ln);
    }
    // Pre-fill emergency contact from defaultUser (fetched from User model)
    if (defaultUser?.emergencyName)
      setValue("emergencyName", defaultUser.emergencyName);
    if (defaultUser?.emergencyPhone)
      setValue("emergencyPhone", defaultUser.emergencyPhone);
    if (defaultUser?.emergencyRelation)
      setValue("emergencyRelation", defaultUser.emergencyRelation);
  }, [session?.user, email, firstName, lastName, defaultUser, setValue]);

  const effectiveStartTimes = useMemo(() => {
    const t = trips?.[tripIndex];
    const tripStartTimes = t?.startTimes;
    const result =
      Array.isArray(tripStartTimes) && tripStartTimes.length > 0
        ? (tripStartTimes as string[])
        : startTimes;

    console.log(`[CheckoutForm] effectiveStartTimes:`, {
      tripIndex,
      tripName: t?.name,
      tripStartTimes,
      propStartTimes: startTimes,
      result,
      charterFlowType,
    });

    return result;
  }, [trips, tripIndex, startTimes, charterFlowType]);

  const canSubmit = useMemo(() => {
    const startTimeOk =
      Array.isArray(effectiveStartTimes) && effectiveStartTimes.length > 0
        ? Boolean(startTime)
        : true;

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
    startTime,
    effectiveStartTimes,
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
    setValue("startTime", undefined);
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
        message:
          "This date is not available. It may be outside operational days, marked as unavailable, or already fully booked.",
      });
      return;
    }

    // Check if date range overlaps with any blocked dates
    if (!isDateRangeValid(selectedDate, selectedDays)) {
      setFormError("date", {
        type: "manual",
        message: `The selected date range includes unavailable dates. Please select a different date or reduce the number of days.`,
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
  ]);

  const onSubmit = handleSubmit(
    async (formData) => {
      console.log("✅ Validation passed, submitting booking...");

      // Authenticated user flow
      if (isLoggedIn) {
        try {
          // Manual flow: Create PENDING booking without payment
          if (charterFlowType === "MANUAL") {
            const res = await fetch("/api/bookings/create-manual", {
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
              router.push(`/book/confirm?id=${encodeURIComponent(bookingId)}`);
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
              sessionStart: Date.now(),
            };

            const encoded = Buffer.from(JSON.stringify(bookingData)).toString(
              "base64"
            );
            router.push(`/book/payment/preview?data=${encoded}`);
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

      // Guest flow - Manual flow only (Auto flow requires authentication)
      if (charterFlowType === "AUTO") {
        // Redirect to login for Auto flow
        openModal();
        return;
      }

      // Guest Manual flow - show verification modal
      setShowVerificationModal(true);
    },
    (errors) => {
      // Validation failed - log errors for debugging
      console.error("❌ Form validation failed:", errors);
      console.log("Current form values:", watch());
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
      const res = await fetch("/api/bookings/create-guest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          verifiedEmail: verificationData.email,
          verifiedUserId: verificationData.userId,
          ...formData,
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
          console.log("🏦 Redirecting to payment gateway:", data.redirectUrl);
          window.location.href = data.redirectUrl;
        } else {
          // TOKENIZED flow (Card) or MOCK - go to confirmation
          router.push(`/book/confirm?id=${encodeURIComponent(bookingId)}`);
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
  useEffect(() => {
    if (!maxGuests) return;
    const total = adults + children;
    if (total > maxGuests) {
      // Prefer reducing children first
      const excess = total - maxGuests;
      const newChildren = Math.max(0, children - excess);
      const rem = excess - (children - newChildren);
      const newAdults = Math.max(1, adults - rem);
      updateSearchParam("children", String(newChildren));
      updateSearchParam("adults", String(newAdults));
    }
  }, [maxGuests, adults, children, updateSearchParam]);
  // Calculate complete pricing breakdown
  const pricingBreakdown = useMemo(() => {
    const tripPrice = chosenTrip?.price ?? 0;
    if (tripPrice === 0) return null;

    // Import and use the same pricing calculation as backend
    const subtotal = tripPrice * Math.max(1, days);
    const platformFee = Math.round(subtotal * 0.1 * 100) / 100;
    const discount = 0; // TODO: Promo code support
    const amountBeforeGateway = subtotal + platformFee - discount;
    const paymentGatewayFee =
      Math.round(amountBeforeGateway * 0.015 * 100) / 100;
    const sst = 0; // Future
    const finalPrice =
      Math.round((amountBeforeGateway + paymentGatewayFee + sst) * 100) / 100;
    const captainEarnings = Math.round((subtotal - platformFee) * 100) / 100;

    return {
      tripPrice,
      days: Math.max(1, days),
      subtotal,
      platformFee,
      discount,
      paymentGatewayFee,
      sst,
      finalPrice,
      captainEarnings,
    };
  }, [chosenTrip?.price, days]);

  return (
    <form onSubmit={onSubmit} className="">
      {/* Error display */}
      {errors.root && (
        <div className="p-4 mb-6 border border-red-200 rounded-lg bg-red-50">
          <p className="text-sm text-red-800">{errors.root.message}</p>
        </div>
      )}

      {/* Mobile: Summary first */}
      <div className="mb-3 lg:hidden">
        <BookingSummaryCard
          charter={charter}
          captain={charter?.captain}
          pricingBreakdown={pricingBreakdown}
        />
      </div>

      {/* Main grid */}
      <section className="grid gap-3 sm:gap-5 lg:grid-cols-3 ">
        {/* Left column: Form sections */}
        <div className="space-y-3 lg:col-span-2 ">
          <div className="p-3 space-y-3 bg-white border rounded-lg border-black/10 sm:p-5">
            {/* Your Details */}
            <YourDetailsCard
              register={register}
              errors={errors}
              firstName={firstName}
              lastName={lastName}
              email={email}
              phone={phone || ""}
            />

            {/* Emergency Contact */}
            <EmergencyContactCard
              register={register}
              errors={errors}
              emergencyName={watch("emergencyName")}
              emergencyPhone={watch("emergencyPhone")}
              emergencyRelation={watch("emergencyRelation")}
            />

            {/* Participant List */}
            <ParticipantListCard
              register={register}
              errors={errors}
              watch={watch}
              setValue={setValue}
              guests={adults + (children || 0)}
            />
          </div>

          <div className="p-3 space-y-3 bg-white border rounded-lg border-black/10 sm:p-5">
            {/* Trip Selection */}
            <TripSelectionCard
              trips={trips || []}
              selectedIndex={tripIndex}
              days={days}
              charterSpecies={charter?.species || []}
              charterTechniques={charter?.techniques || []}
              onTripSelect={handleTripSelect}
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
              blockedDatesSet={blockedDatesSet}
              dateError={errors.date?.message}
            />

            {/* Start Time Selection */}
            {effectiveStartTimes && effectiveStartTimes.length > 0 && (
              <StartTimeSelection
                startTimes={effectiveStartTimes}
                selectedTime={startTime}
                onTimeSelect={(v) => setValue("startTime", v)}
              />
            )}
          </div>

          <div className="p-3 space-y-3 bg-white border rounded-lg border-black/10 sm:p-5">
            {/* Start Conversation */}
            <StartConversationCard
              captain={charter?.captain}
              charterName={charter?.name}
              location={charter?.location}
              species={charter?.species || []}
              techniques={charter?.techniques || []}
              register={register}
              errors={errors}
            />
          </div>

          {/* Submit Button */}
          <div className="flex flex-col gap-3">
            {/* Show validation errors */}
            {Object.keys(errors).length > 0 && !errors.root && (
              <div className="p-3 border border-red-200 rounded-lg bg-red-50">
                <p className="mb-2 text-sm font-semibold text-red-800">
                  Please fix the following errors:
                </p>
                <ul className="space-y-1 text-sm text-red-700">
                  {Object.entries(errors).map(
                    ([field, error]: [string, any]) => {
                      if (field === "root" || !error?.message) return null;
                      return (
                        <li key={field} className="flex items-start gap-2">
                          <span className="mt-0.5">•</span>
                          <span>
                            <strong>{field}:</strong> {error.message}
                          </span>
                        </li>
                      );
                    }
                  )}
                </ul>
              </div>
            )}

            <button
              type="submit"
              disabled={!canSubmit || isSubmitting}
              className="w-full rounded-lg bg-[#ec2227] text-white px-8 py-3.5 text-base font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#d01f24] transition-colors"
            >
              {isSubmitting
                ? "Submitting..."
                : charterFlowType === "MANUAL"
                  ? "Request Booking"
                  : "Proceed to Payment"}
            </button>

            {!canSubmit && (
              <div className="text-sm text-gray-600">
                <p className="mb-2 font-medium text-center text-gray-700">
                  Please complete all required fields
                </p>
              </div>
            )}

            {!isLoggedIn && canSubmit && (
              <div className="pt-3 space-y-3 border-t border-gray-200">
                <p className="text-sm font-medium text-gray-700">
                  Have an account? Sign in for faster bookings
                </p>
                <ul className="space-y-1.5 text-sm text-gray-600">
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 mt-0.5">✓</span>
                    <span>Auto-fill your details</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 mt-0.5">✓</span>
                    <span>Track all your bookings in one place</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 mt-0.5">✓</span>
                    <span>Save favorites and preferences</span>
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
                    Sign in
                  </button>
                  <span className="text-gray-400">or</span>
                  <button
                    type="button"
                    className="font-semibold text-[#ec2227] underline underline-offset-2 hover:text-[#d01f24] transition-colors"
                    onClick={() =>
                      openModal("register", undefined, { showHomeButton: true })
                    }
                  >
                    Create account
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
        </div>
      </section>

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
