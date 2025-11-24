import type { BookingStatus } from "@/lib/services/booking-service";

type TranslationFunction = (key: string) => string;
type RichTranslationFunction = (
  key: string,
  values: Record<string, any>
) => string | any;

/**
 * Payment Status Configuration
 */
interface PaymentStatusConfig {
  type: "success" | "warning" | "info";
  colorClasses: {
    container: string;
    icon: string;
    title: string;
    message: string;
  };
}

export function getPaymentStatusConfig(
  paymentFlow: "TOKENIZED" | "DIRECT"
): PaymentStatusConfig {
  const isTokenized = paymentFlow === "TOKENIZED";

  return {
    type: isTokenized ? "info" : "success",
    colorClasses: {
      container: isTokenized
        ? "border-blue-200 bg-blue-50"
        : "border-green-200 bg-green-50",
      icon: isTokenized ? "text-blue-600" : "text-green-600",
      title: isTokenized ? "text-blue-900" : "text-green-900",
      message: isTokenized ? "text-blue-700" : "text-green-700",
    },
  };
}

export function getPaymentStatusContent(
  paymentFlow: "TOKENIZED" | "DIRECT",
  amount: number,
  locale: string,
  paymentAuthorizedAt: Date | null
): {
  titleKey: string;
  messageKey: string;
  messageValues: Record<string, any>;
  showExpiry: boolean;
  expiryDate?: string;
} {
  const isTokenized = paymentFlow === "TOKENIZED";

  const result = {
    titleKey: isTokenized
      ? "paymentStatus.cardAuthorized"
      : "paymentStatus.paymentReceived",
    messageKey: isTokenized
      ? "paymentStatus.tokenizedAuthMessage"
      : "paymentStatus.directPaymentMessage",
    messageValues: {
      amount: amount.toFixed(2),
    },
    showExpiry: isTokenized && !!paymentAuthorizedAt,
    expiryDate: undefined as string | undefined,
  };

  if (result.showExpiry && paymentAuthorizedAt) {
    result.expiryDate = new Date(
      paymentAuthorizedAt.getTime() + 7 * 24 * 60 * 60 * 1000
    ).toLocaleDateString(locale, {
      dateStyle: "medium",
    });
  }

  return result;
}

/**
 * What Happens Next Configuration
 */
export function getWhatHappensNextSteps(
  paymentFlow: "TOKENIZED" | "DIRECT",
  amount: number
): Array<{
  icon: string;
  key: string;
  values?: Record<string, any>;
}> {
  const isTokenized = paymentFlow === "TOKENIZED";
  const iconColor = isTokenized ? "text-blue-600" : "text-green-600";
  const flowType = isTokenized ? "tokenized" : "direct";

  return [
    {
      icon: iconColor,
      key: `whatHappensNext.${flowType}.step1`,
      values: {
        amount: amount.toFixed(2),
      },
    },
    {
      icon: iconColor,
      key: `whatHappensNext.${flowType}.step2`,
      values: {},
    },
    {
      icon: iconColor,
      key: `whatHappensNext.${flowType}.step3`,
    },
    {
      icon: iconColor,
      key: `whatHappensNext.${flowType}.step4`,
      values: {},
    },
  ];
}

/**
 * Hero Section Content Helper
 * Maps booking status and trip state to translated text
 * Returns the actual translated strings, not keys
 *
 * @param status - Current booking status
 * @param paymentFlow - Payment flow type (TOKENIZED or DIRECT)
 * @param tripInProgress - Whether the trip is currently in progress
 * @param tripCompleted - Whether the trip has been completed
 * @param t - Translation function from next-intl
 * @returns Object containing translated title and description
 */
export function getBookingHeroContent(
  status: BookingStatus,
  paymentFlow: string | null,
  tripInProgress: boolean,
  tripCompleted: boolean,
  t: (key: string) => string
): { title: string; description: string } {
  if (status === "COMPLETED") {
    return {
      title: t("pageTitle.tripCompleted"),
      description: t("pageDescription.tripCompleted"),
    };
  }

  if (status === "PAID") {
    if (tripInProgress) {
      return {
        title: t("pageTitle.tripInProgress"),
        description: t("pageDescription.tripInProgress"),
      };
    }
    return {
      title: t("pageTitle.confirmed"),
      description: t("pageDescription.confirmed"),
    };
  }

  if (status === "PAYMENT_AUTHORIZED") {
    if (paymentFlow === "TOKENIZED") {
      return {
        title: t("pageTitle.cardAuthorized"),
        description: t("pageDescription.cardAuthorized"),
      };
    }
    return {
      title: t("pageTitle.paymentReceived"),
      description: t("pageDescription.paymentReceived"),
    };
  }

  // Simple status mapping
  const statusMap: Record<string, { title: string; description: string }> = {
    AWAITING_PAYMENT: {
      title: t("pageTitle.approvedPaymentDue"),
      description: t("pageDescription.approvedPaymentDue"),
    },
    PENDING: {
      title: t("pageTitle.pending"),
      description: t("pageDescription.pending"),
    },
    REJECTED: {
      title: t("pageTitle.rejected"),
      description: t("pageDescription.rejected"),
    },
    EXPIRED: {
      title: t("pageTitle.expired"),
      description: t("pageDescription.expired"),
    },
    CANCELLED: {
      title: t("pageTitle.cancelled"),
      description: t("pageDescription.cancelled"),
    },
  };

  return (
    statusMap[status] || {
      title: t("pageTitle.bookingStatus"),
      description: t("pageDescription.default"),
    }
  );
}
