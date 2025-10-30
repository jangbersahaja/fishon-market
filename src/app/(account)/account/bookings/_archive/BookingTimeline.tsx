import type { BookingStatus } from "@/lib/services/booking-service";
import { Check, Clock, CreditCard, Send, X } from "lucide-react";

interface BookingTimelineProps {
  status: BookingStatus;
  createdAt: Date;
  captainDecisionAt?: Date | null;
  paidAt?: Date | null;
}

export function BookingTimeline({
  status,
  createdAt,
  captainDecisionAt,
  paidAt,
}: BookingTimelineProps) {
  const steps = [
    {
      id: "sent",
      label: "Request Sent",
      icon: Send,
      date: createdAt,
      isComplete:
        status === "PENDING" ||
        status === "APPROVED" ||
        status === "PAID" ||
        status === "REJECTED" ||
        status === "CANCELLED",
      isCurrent: status === "PENDING",
      isError: false,
    },
    {
      id: "review",
      label: "Captain Review",
      icon: Clock,
      date: captainDecisionAt,
      isComplete: status === "APPROVED" || status === "PAID",
      isCurrent: false,
      isError: status === "REJECTED",
    },
    {
      id: "payment",
      label: "Payment",
      icon: CreditCard,
      date: null,
      isComplete: status === "PAID",
      isCurrent: status === "APPROVED",
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

  // Filter out steps for rejected/cancelled bookings
  const filteredSteps =
    status === "REJECTED" || status === "CANCELLED"
      ? steps.filter((s) => s.id === "sent" || s.id === "review")
      : steps;

  return (
    <div className="py-6">
      <div className="relative">
        {filteredSteps.map((step, index) => {
          const Icon = step.isError ? X : step.icon;
          const isLast = index === filteredSteps.length - 1;

          return (
            <div key={step.id} className="relative pb-8 last:pb-0">
              {/* Line */}
              {!isLast && (
                <div
                  className={`absolute left-5 top-10 h-full w-0.5 ${
                    step.isComplete && !step.isError
                      ? "bg-green-500"
                      : "bg-gray-200"
                  }`}
                />
              )}

              {/* Step */}
              <div className="relative flex items-start">
                {/* Icon */}
                <div
                  className={`relative flex h-10 w-10 items-center justify-center rounded-full border-2 ${
                    step.isError
                      ? "border-red-500 bg-red-50"
                      : step.isComplete
                      ? "border-green-500 bg-green-50"
                      : step.isCurrent
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-300 bg-white"
                  }`}
                >
                  <Icon
                    className={`h-5 w-5 ${
                      step.isError
                        ? "text-red-600"
                        : step.isComplete
                        ? "text-green-600"
                        : step.isCurrent
                        ? "text-blue-600"
                        : "text-gray-400"
                    }`}
                  />
                </div>

                {/* Content */}
                <div className="flex-1 ml-4">
                  <p
                    className={`text-sm font-medium ${
                      step.isComplete || step.isCurrent
                        ? "text-gray-900"
                        : "text-gray-500"
                    }`}
                  >
                    {step.label}
                  </p>
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
                  {step.isCurrent && (
                    <p className="text-xs text-blue-600 mt-0.5">
                      In progress...
                    </p>
                  )}
                  {step.isError && (
                    <p className="text-xs text-red-600 mt-0.5">
                      {status === "REJECTED"
                        ? "Request rejected"
                        : "Request cancelled"}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
