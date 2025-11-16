import type { BookingStatus } from "@/lib/services/booking-service";
import { Check, CheckCircle2, CreditCard, Edit, X } from "lucide-react";

interface BookingProgressTimelineProps {
  /**
   * Current step in the booking flow
   * - 'details': User is filling out booking form (/book/[id])
   * - 'PENDING': Manual flow - Waiting for captain approval (no payment yet)
   * - 'PAYMENT_AUTHORIZED': Auto flow - Payment authorized/received, awaiting captain acknowledgment
   * - 'AWAITING_PAYMENT': Manual flow - Captain approved, waiting for payment
   * - 'PAID': Payment completed (confirmed booking)
   * - 'completed': Trip finished
   * - 'REJECTED': Captain rejected
   * - 'EXPIRED': Booking hold expired
   * - 'CANCELLED': Booking cancelled
   */
  currentStep: "details" | BookingStatus | "completed";
  /**
   * Payment flow type (only relevant for PAYMENT_AUTHORIZED status)
   * - 'TOKENIZED': Card authorized but not charged (charge on captain approval)
   * - 'DIRECT': Payment received immediately (refund if captain rejects)
   */
  paymentFlow?: "TOKENIZED" | "DIRECT" | null;
}

export function BookingProgressTimeline({
  currentStep,
  paymentFlow,
}: BookingProgressTimelineProps) {
  // Helper to check if status is error state
  function isErrorState(
    status: BookingStatus | "details" | "completed"
  ): boolean {
    return (
      status === "REJECTED" || status === "EXPIRED" || status === "CANCELLED"
    );
  }

  // Determine if using Auto flow (PAYMENT_AUTHORIZED) or Manual flow (PENDING)
  const isAutoFlow = currentStep === "PAYMENT_AUTHORIZED";
  const isManualFlow =
    currentStep === "PENDING" || currentStep === "AWAITING_PAYMENT";

  // Define main timeline steps
  const steps = [
    {
      id: "details",
      label: "Enter Details",
      icon: Edit,
      color: "orange",
      isActive: currentStep === "details",
      isComplete: currentStep !== "details",
      isError: false,
      hidden: false,
    },
    // Auto flow: Payment authorization step (PAYMENT_AUTHORIZED)
    {
      id: "payment-authorization",
      label:
        paymentFlow === "TOKENIZED"
          ? "Card Authorized"
          : paymentFlow === "DIRECT"
            ? "Payment Received"
            : "Payment Processing",
      icon: CreditCard,
      color: paymentFlow === "TOKENIZED" ? "blue" : "green",
      isActive: currentStep === "PAYMENT_AUTHORIZED",
      isComplete:
        currentStep === "PAID" ||
        currentStep === "PAYMENT_AUTHORIZED" ||
        currentStep === "completed",
      isError:
        currentStep === "REJECTED" ||
        currentStep === "EXPIRED" ||
        currentStep === "CANCELLED",
      // Only show this step for auto flow
      hidden:
        !isAutoFlow && currentStep !== "PAID" && currentStep !== "completed",
    },
    {
      id: "captain-review",
      label: "Captain Review",
      icon: CheckCircle2,
      color: "yellow",
      isActive:
        (currentStep === "PENDING" || currentStep === "PAYMENT_AUTHORIZED") &&
        !isErrorState(currentStep),
      isComplete:
        currentStep === "AWAITING_PAYMENT" ||
        currentStep === "PAID" ||
        currentStep === "completed",
      isError:
        currentStep === "REJECTED" ||
        currentStep === "EXPIRED" ||
        currentStep === "CANCELLED",
      hidden: false,
    },
    // Manual flow: Payment step (AWAITING_PAYMENT waiting for payment)
    {
      id: "payment",
      label: "Make Payment",
      icon: CreditCard,
      color: "yellow",
      isActive: currentStep === "AWAITING_PAYMENT",
      isComplete: currentStep === "PAID" || currentStep === "completed",
      isError: currentStep === "EXPIRED" || currentStep === "CANCELLED",
      // Only show this step for manual flow
      hidden:
        isAutoFlow ||
        (currentStep !== "AWAITING_PAYMENT" &&
          currentStep !== "PAID" &&
          currentStep !== "completed"),
    },
    {
      id: "confirmed",
      label: "Confirmed",
      icon: Check,
      color: "green",
      isActive: currentStep === "PAID",
      isComplete: currentStep === "PAID" || currentStep === "completed",
      isError: false,
      hidden: false,
    },
  ];

  // Filter steps based on error states and flow type
  const visibleSteps = steps.filter((step) => {
    // Hide steps marked as hidden
    if (step.hidden) return false;

    // For error states, only show completed steps
    if (isErrorState(currentStep)) {
      return (
        step.isComplete || step.id === "details" || step.id === "reservation"
      );
    }

    return true;
  });

  // Get color classes
  const getColorClasses = (
    color: string,
    isActive: boolean,
    isComplete: boolean,
    isError: boolean
  ) => {
    if (isError) {
      return {
        bg: "bg-red-500",
        border: "border-red-500",
        text: "text-white",
        line: "bg-red-300",
      };
    }

    if (isComplete) {
      const colorMap: Record<string, any> = {
        yellow: {
          bg: "bg-yellow-500",
          border: "border-yellow-500",
          text: "text-white",
          line: "bg-yellow-300",
        },
        orange: {
          bg: "bg-orange-500",
          border: "border-orange-500",
          text: "text-white",
          line: "bg-orange-300",
        },
        blue: {
          bg: "bg-blue-500",
          border: "border-blue-500",
          text: "text-white",
          line: "bg-blue-300",
        },
        green: {
          bg: "bg-green-500",
          border: "border-green-500",
          text: "text-white",
          line: "bg-green-300",
        },
      };
      return colorMap[color] || colorMap.yellow;
    }

    if (isActive) {
      const colorMap: Record<string, any> = {
        yellow: {
          bg: "bg-yellow-50",
          border: "border-yellow-500",
          text: "text-yellow-600",
          line: "bg-yellow-300",
        },
        orange: {
          bg: "bg-orange-50",
          border: "border-orange-500",
          text: "text-orange-600",
          line: "bg-orange-300",
        },
        blue: {
          bg: "bg-blue-50",
          border: "border-blue-500",
          text: "text-blue-600",
          line: "bg-blue-300",
        },
        green: {
          bg: "bg-green-50",
          border: "border-green-500",
          text: "text-green-600",
          line: "bg-green-300",
        },
      };
      return colorMap[color] || colorMap.yellow;
    }

    return {
      bg: "bg-gray-50",
      border: "border-gray-200",
      text: "text-gray-400",
      line: "bg-gray-200",
    };
  };

  // Get gradient for connector line
  const getGradient = (fromColor: string, toColor: string) => {
    const gradientMap: Record<string, string> = {
      "orange-yellow": "bg-gradient-to-r from-orange-500 to-yellow-500",
      "orange-blue": "bg-gradient-to-r from-orange-500 to-blue-500",
      "orange-green": "bg-gradient-to-r from-orange-500 to-green-500",
      "yellow-yellow": "bg-gradient-to-r from-yellow-500 to-yellow-500",
      "yellow-blue": "bg-gradient-to-r from-yellow-500 to-blue-500",
      "yellow-green": "bg-gradient-to-r from-yellow-500 to-green-500",
      "blue-yellow": "bg-gradient-to-r from-blue-500 to-yellow-500",
      "blue-green": "bg-gradient-to-r from-blue-500 to-green-500",
      "green-green": "bg-gradient-to-r from-green-500 to-green-500",
    };
    return gradientMap[`${fromColor}-${toColor}`] || "bg-gray-200";
  };

  return (
    <div className="flex items-center justify-between w-full">
      {visibleSteps.map((step, index) => {
        const isLast = index === visibleSteps.length - 1;
        const Icon = step.icon;
        const colors = getColorClasses(
          step.color,
          step.isActive,
          step.isComplete,
          step.isError
        );

        return (
          <div
            key={step.id}
            className={`flex items-center ${isLast ? "" : "flex-1"}`}
          >
            {/* Step indicator */}
            <div className="z-10 flex items-center flex-shrink-0">
              <div
                className={`flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 transition-all ${colors.bg} ${colors.border}`}
              >
                {step.isError ? (
                  <X className={`w-5 h-5 sm:w-6 sm:h-6 ${colors.text}`} />
                ) : (
                  <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${colors.text}`} />
                )}
              </div>
            </div>

            {/* Connector line */}
            {!isLast && (
              <div className="flex-1">
                {step.isComplete ? (
                  <div
                    className={`h-10 sm:h-12 justify-center -mx-5 sm:-mx-6 flex items-center ${getGradient(
                      step.color,
                      visibleSteps[index + 1].color
                    )}`}
                  >
                    <p
                      className={`text-xs sm:text-sm font-medium text-center text-white ${
                        step.isActive || step.isComplete
                          ? "text-gray-600"
                          : "text-gray-400"
                      } `}
                    >
                      {step.label}
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-10 -mx-5 bg-gray-200 sm:h-12 sm:-mx-6">
                    <p
                      className={`text-xs sm:text-sm font-medium text-center ${
                        step.isActive || step.isComplete
                          ? "text-gray-600"
                          : "text-gray-400"
                      } `}
                    >
                      {step.label}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
