import type { BookingStatus } from "@/lib/services/booking-service";
import { Check, Clock, CreditCard, Send, X } from "lucide-react";

interface BookingTimelineProps {
  status: BookingStatus;
  createdAt?: Date | null;
  captainDecisionAt?: Date | null;
  paidAt?: Date | null;
  expiresAt?: Date | null;
}

export function BookingTimeline({
  status,
  createdAt,
  captainDecisionAt,
  paidAt,
  expiresAt,
}: BookingTimelineProps) {
  const steps = [
    {
      id: "sent",
      label: "Request Sent",
      icon: Send,
      date: createdAt,
      isComplete:
        status === "PENDING" ||
        status === "AWAITING_PAYMENT" ||
        status === "PAYMENT_AUTHORIZED" ||
        status === "PAID" ||
        status === "REJECTED" ||
        status === "EXPIRED" ||
        status === "CANCELLED",
      isCurrent: status === "PENDING",
      isError: false,
    },
    {
      id: "review",
      label: "Captain Review",
      icon: Clock,
      date: captainDecisionAt,
      isComplete:
        status === "AWAITING_PAYMENT" ||
        status === "PAYMENT_AUTHORIZED" ||
        status === "PAID",
      isCurrent: false,
      isError: status === "REJECTED" || status === "EXPIRED",
    },
    {
      id: "payment",
      label: "Payment",
      icon: CreditCard,
      date: null,
      isComplete: status === "PAID" || status === "PAYMENT_AUTHORIZED",
      isCurrent:
        status === "AWAITING_PAYMENT" || status === "PAYMENT_AUTHORIZED",
      isError: false,
    },
    {
      id: "confirmed",
      label: "Confirmed",
      icon: Check,
      date: paidAt,
      isComplete: status === "PAID",
      isCurrent: false,
      isError: false,
    },
  ];

  // Filter out steps for rejected/expired/cancelled bookings
  const filteredSteps =
    status === "REJECTED" || status === "EXPIRED" || status === "CANCELLED"
      ? steps.filter((s) => s.id === "sent" || s.id === "review")
      : steps;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h2 className="mb-4 text-base font-semibold sm:text-lg">
        Booking Timeline
      </h2>

      <div className="relative">
        {filteredSteps.map((step, index) => {
          const Icon = step.isError ? X : step.icon;
          const isLast = index === filteredSteps.length - 1;

          return (
            <div key={step.id} className="relative pb-8 last:pb-0">
              {/* Connector line */}
              {!isLast && (
                <div
                  className={`absolute left-[19px] top-10 w-0.5 h-[calc(100%-2.5rem)] ${
                    step.isComplete && !step.isError
                      ? "bg-green-500"
                      : step.isError
                        ? "bg-red-300"
                        : "bg-gray-200"
                  }`}
                />
              )}

              {/* Step content */}
              <div className="relative flex items-start gap-3">
                {/* Icon circle */}
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all ${
                    step.isError
                      ? "bg-red-50 border-red-500 text-red-600"
                      : step.isComplete
                        ? "bg-green-500 border-green-500 text-white"
                        : step.isCurrent
                          ? "bg-white border-[#ec2227] text-[#ec2227]"
                          : "bg-white border-gray-200 text-gray-400"
                  }`}
                >
                  {step.isComplete && !step.isError ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <Icon className="w-5 h-5" />
                  )}
                </div>

                {/* Label and description */}
                <div className="flex-1 pt-1">
                  <p
                    className={`text-sm font-medium ${
                      step.isComplete || step.isCurrent
                        ? "text-gray-900"
                        : "text-gray-500"
                    }`}
                  >
                    {step.label}
                  </p>

                  {/* Timestamp */}
                  {step.date && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      {new Date(step.date).toLocaleString("en-MY", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  )}

                  {/* Status-specific messages */}
                  {step.isCurrent && step.id === "review" && (
                    <p className="mt-1 text-xs text-gray-600">
                      Waiting for captain approval
                      {expiresAt && (
                        <span className="block mt-0.5 text-gray-500">
                          Hold expires:{" "}
                          {new Intl.DateTimeFormat(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          }).format(expiresAt)}
                        </span>
                      )}
                    </p>
                  )}

                  {step.isCurrent && step.id === "payment" && (
                    <p className="mt-1 text-xs text-gray-600">
                      Complete payment to confirm your booking
                    </p>
                  )}

                  {step.isComplete && step.id === "confirmed" && (
                    <p className="mt-1 text-xs text-green-600">
                      Your booking is confirmed!
                    </p>
                  )}

                  {step.isError && (
                    <p className="text-xs text-red-600 mt-0.5">
                      {status === "REJECTED"
                        ? "Request rejected"
                        : status === "EXPIRED"
                          ? "Request expired"
                          : "Request cancelled"}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Status-specific alerts */}
      {status === "REJECTED" && (
        <div className="p-3 mt-4 text-sm border rounded-lg bg-red-50 border-red-200 text-red-800">
          Your booking request was declined by the captain. Please try a
          different date or charter.
        </div>
      )}

      {status === "EXPIRED" && (
        <div className="p-3 mt-4 text-sm border rounded-lg bg-orange-50 border-orange-200 text-orange-800">
          This booking hold has expired. Please create a new booking request.
        </div>
      )}

      {status === "CANCELLED" && (
        <div className="p-3 mt-4 text-sm border rounded-lg bg-gray-50 border-gray-200 text-gray-700">
          This booking has been cancelled.
        </div>
      )}
    </div>
  );
}
