import { prisma } from "@/lib/database/prisma";
import { logger } from "@/lib/logger";
import { triggerPaymentSideEffects } from "@/lib/payment/payment-side-effects";
import { verifyReturnHash } from "@/lib/payment/senangpay";
import { setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    status_id?: string;
    order_id?: string;
    transaction_id?: string;
    msg?: string;
    hash?: string;
  }>;
}

export default async function PaymentReturnPage({
  params,
  searchParams,
}: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  
  const searchParamsData = await searchParams;
  const { status_id, order_id, transaction_id, msg, hash } = searchParamsData;

  logger.info("User returned from Senang Pay", {
    component: "payment-return",
    status_id,
    order_id,
    transaction_id,
    msg: msg ? msg.substring(0, 50) : undefined,
    hash: hash ? hash.substring(0, 16) + "..." : undefined,
  });

  // Validate required parameters
  if (!status_id || !order_id || !transaction_id || !msg || !hash) {
    logger.error("Missing required parameters", {
      component: "payment-return",
      has_status_id: !!status_id,
      has_order_id: !!order_id,
      has_transaction_id: !!transaction_id,
      has_msg: !!msg,
      has_hash: !!hash,
    });
    redirect(`/${locale}/book/confirm?error=invalid_payment_response`);
  }

  // Verify hash to prevent tampering
  const merchantId = process.env.SENANGPAY_MERCHANT_ID;
  const secretKey = process.env.SENANGPAY_SECRET_KEY;

  if (!merchantId || !secretKey) {
    logger.error("Senang Pay not configured", { component: "payment-return" });
    redirect(`/${locale}/book/confirm?error=payment_gateway_error`);
  }

  const isValid = verifyReturnHash(
    { status_id, order_id, transaction_id, msg, hash },
    secretKey,
    merchantId
  );

  if (!isValid) {
    logger.error("Invalid hash detected - possible tampering", {
      component: "payment-return",
      orderId: order_id,
      receivedHash: hash.substring(0, 16) + "...",
    });
    redirect(`/${locale}/book/confirm?error=invalid_payment_hash`);
  }

  logger.info("Hash verified successfully", { component: "payment-return" });

  // Check if this is a PaymentSession (AUTO + DIRECT flow) or a Booking (TOKENIZED flow)
  // For AUTO + DIRECT, order_id is a PaymentSession.id, booking is created after successful payment
  logger.info("Looking up PaymentSession", {
    component: "payment-return",
    order_id,
  });

  const paymentSession = await prisma.paymentSession.findUnique({
    where: { id: order_id },
    select: {
      id: true,
      status: true,
      bookingData: true,
      expiresAt: true,
    },
  });

  logger.info("PaymentSession lookup result", {
    component: "payment-return",
    found: !!paymentSession,
    sessionId: paymentSession?.id,
    status: paymentSession?.status,
  });

  // If it's a PaymentSession and payment failed/cancelled
  if (paymentSession) {
    if (status_id !== "1") {
      // Payment failed or cancelled - update session status
      logger.warn("Payment cancelled/failed for session", {
        component: "payment-return",
        sessionId: order_id,
        reason: msg,
      });

      await prisma.paymentSession.update({
        where: { id: order_id },
        data: { status: "FAILED" },
      });

      // Clean up message from Senang Pay (they use underscores instead of spaces)
      const cleanMessage = (
        msg || "Payment was cancelled. You can try again when ready."
      ).replace(/_/g, " ");

      // Check if session is still valid (not expired)
      const now = new Date();
      const isSessionValid = now < paymentSession.expiresAt;

      if (isSessionValid) {
        // Session still valid - redirect to payment preview to retry
        // User can choose different payment method or retry same one
        logger.info("Redirecting to payment preview for retry", {
          component: "payment-return",
          sessionId: order_id,
          expiresAt: paymentSession.expiresAt,
        });
        redirect(
          `/${locale}/book/payment/preview?session=${order_id}&message=${encodeURIComponent(cleanMessage)}`
        );
      } else {
        // Session expired - redirect to home with message
        logger.warn("Session expired, redirecting to home", {
          component: "payment-return",
          sessionId: order_id,
          expiresAt: paymentSession.expiresAt,
        });
        redirect(
          `/${locale}/home?payment=expired&message=${encodeURIComponent(
            "Your booking session has expired. Please start a new booking."
          )}`
        );
      }
    }

    // Payment successful for PaymentSession - callback webhook should handle booking creation
    // Just redirect to a holding page that will show success once callback processes
    logger.info("Payment successful for session, awaiting callback", {
      component: "payment-return",
      sessionId: order_id,
      transactionId: transaction_id,
    });

    // Check if callback already created the booking
    // Look for a booking created from this session (by matching transaction ID)
    const createdBooking = await prisma.booking.findFirst({
      where: {
        paymentTransactionId: transaction_id,
      },
      select: { id: true },
    });

    if (createdBooking) {
      redirect(
        `/${locale}/book/confirm?id=${createdBooking.id}&payment=success`
      );
    }

    // Callback hasn't processed yet - redirect to a waiting state
    // The confirm page will poll for the booking
    redirect(
      `/${locale}/book/payment/processing?session=${order_id}&tx=${transaction_id}`
    );
  }

  // Check if booking exists (MANUAL flow or TOKENIZED flow)
  logger.info("Looking up Booking", {
    component: "payment-return",
    order_id,
  });

  const booking = await prisma.booking.findUnique({
    where: { id: order_id },
    select: {
      id: true,
      status: true,
      paidAt: true,
      paymentTransactionId: true,
      charterId: true,
      finalPrice: true,
      bookingFlowType: true,
      paymentDeadline: true,
    },
  });

  logger.info("Booking lookup result", {
    component: "payment-return",
    found: !!booking,
    bookingId: booking?.id,
    status: booking?.status,
    bookingFlowType: booking?.bookingFlowType,
  });

  if (!booking) {
    logger.error("Neither booking nor session found", {
      component: "payment-return",
      orderId: order_id,
      orderIdLength: order_id.length,
      orderIdType: typeof order_id,
      transactionId: transaction_id,
      statusId: status_id,
    });

    // Last resort: try to find by transaction ID (in case order_id was corrupted)
    const bookingByTx = await prisma.booking.findFirst({
      where: { paymentTransactionId: transaction_id },
      select: { id: true, charterId: true },
    });

    if (bookingByTx) {
      logger.info("Found booking by transaction ID", {
        component: "payment-return",
        bookingId: bookingByTx.id,
      });
      if (status_id === "1") {
        redirect(
          `/${locale}/book/confirm?id=${bookingByTx.id}&payment=success`
        );
      } else {
        redirect(`/${locale}/book/confirm?id=${bookingByTx.id}&payment=failed`);
      }
    }

    // If payment was cancelled (status_id !== "1"), redirect to home with message
    if (status_id !== "1") {
      logger.warn("Payment was cancelled, no matching records found", {
        component: "payment-return",
      });
      const cleanMsg = (
        msg || "Payment was cancelled. You can try again when ready."
      ).replace(/_/g, " ");
      redirect(
        `/${locale}/home?payment=cancelled&message=${encodeURIComponent(cleanMsg)}`
      );
    }

    // Payment was successful but we can't find the booking - this is a problem
    redirect(
      `/${locale}/home?payment=error&message=${encodeURIComponent(
        "We couldn't find your booking. If you were charged, please contact support with transaction ID: " +
          transaction_id
      )}`
    );
  }

  // --- MANUAL FLOW: Handle payment cancellation/failure ---
  // For MANUAL flow, booking exists in AWAITING_PAYMENT status
  // If payment failed/cancelled, redirect back to payment page to retry
  if (
    booking.bookingFlowType === "MANUAL" &&
    booking.status === "AWAITING_PAYMENT"
  ) {
    if (status_id !== "1") {
      // Payment failed or cancelled for MANUAL flow
      const cleanMessage = (
        msg || "Payment was cancelled. You can try again when ready."
      ).replace(/_/g, " ");

      // Check if payment deadline has passed
      const now = new Date();
      const isDeadlineValid =
        booking.paymentDeadline && now < booking.paymentDeadline;

      if (isDeadlineValid) {
        // Deadline still valid - redirect back to payment page to retry
        logger.info("MANUAL flow payment cancelled, redirecting to retry", {
          component: "payment-return",
          bookingId: order_id,
          paymentDeadline: booking.paymentDeadline,
        });

        // Record the failed attempt
        await prisma.booking.update({
          where: { id: order_id },
          data: {
            paymentNote: `Payment attempt failed: ${cleanMessage}`,
          },
        });

        redirect(
          `/${locale}/book/payment/${order_id}?payment=cancelled&message=${encodeURIComponent(cleanMessage)}`
        );
      } else {
        // Payment deadline passed - booking should be expired
        logger.warn("MANUAL flow payment deadline passed", {
          component: "payment-return",
          bookingId: order_id,
          paymentDeadline: booking.paymentDeadline,
        });

        redirect(
          `/${locale}/book/confirm?id=${order_id}&payment=expired&message=${encodeURIComponent(
            "Your payment deadline has passed. Please contact support if you still want to book."
          )}`
        );
      }
    }
    // If status_id === "1", fall through to process the successful payment below
  }

  // IDEMPOTENCY: Check if already processed by callback webhook
  // The callback webhook is the authoritative source; this is just for UX
  if (booking.status === "PAID" && booking.paidAt) {
    logger.info("Already processed by callback webhook", {
      component: "payment-return",
      bookingId: order_id,
      transactionId: booking.paymentTransactionId,
    });

    // Callback already processed payment and triggered revalidation
    // Just redirect to confirmation page
    redirect(`/${locale}/book/confirm?id=${order_id}&payment=success`);
  }

  // Check if booking is in PAYMENT_AUTHORIZED status (AUTO flow with FPX/E-wallet)
  // In this case, the callback webhook should process it soon, so just redirect
  if (booking.status === "PAYMENT_AUTHORIZED" && status_id === "1") {
    logger.info("Booking in PAYMENT_AUTHORIZED, callback will process", {
      component: "payment-return",
      bookingId: order_id,
      transactionId: transaction_id,
      msg: "Waiting for callback webhook to complete processing",
    });

    // Redirect to confirmation page - callback will update status to PAID
    // The confirmation page will show the current status
    redirect(`/${locale}/book/confirm?id=${order_id}&payment=success`);
  }

  // Process payment update (if callback hasn't processed it yet)
  // This is a fallback in case callback fails or is delayed
  if (status_id === "1") {
    // Payment successful
    logger.info("Processing successful payment", {
      component: "payment-return",
      orderId: order_id,
      transactionId: transaction_id,
      msg,
      note: "Callback may have failed - processing as fallback",
    });

    try {
      // Calculate financial breakdown
      const { prismaCaptain } = await import("@/lib/database/prisma-captain");

      const charter = await (prismaCaptain as any).charter.findUnique({
        where: { id: booking.charterId },
        select: { pricingPlan: true },
      });

      const commissionRate =
        charter?.pricingPlan === "GOLD"
          ? 0.05
          : charter?.pricingPlan === "SILVER"
            ? 0.08
            : 0.1; // BASIC

      const finalPrice = Number(booking.finalPrice);
      const platformFee = Math.round(finalPrice * commissionRate * 100) / 100;
      const captainEarnings = finalPrice - platformFee;

      await prisma.booking.update({
        where: { id: order_id },
        data: {
          status: "PAID",
          paidAt: new Date(),
          paymentTransactionId: transaction_id,
          paymentMethod: "SENANGPAY",
          paymentNote: msg,
          platformFee,
          captainEarnings,
          payoutStatus: "PENDING",
        },
      });

      logger.info("Booking updated to PAID", {
        component: "payment-return",
        bookingId: order_id,
        transactionId: transaction_id,
        platformFee,
        captainEarnings,
      });

      // Trigger all payment side effects (captain webhook, angler notification, page revalidation)
      // Note: This may run before callback webhook, but both are idempotent
      await triggerPaymentSideEffects({
        bookingId: order_id,
        source: "return",
      });

      redirect(`/${locale}/book/confirm?id=${order_id}&payment=success`);
    } catch (error) {
      logger.error("Failed to update booking", {
        component: "payment-return",
        orderId: order_id,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      // Despite error, payment was likely successful on Senang Pay side
      // Callback webhook should have processed it or will process it
      // Redirect to booking page so user can see their booking
      logger.warn(
        "Redirecting to booking despite error - callback should have processed",
        { component: "payment-return", orderId: order_id }
      );
      redirect(`/${locale}/book/confirm?id=${order_id}&payment=processing`);
    }
  } else {
    // Payment failed
    logger.warn("Payment failed", {
      component: "payment-return",
      orderId: order_id,
      reason: msg,
    });

    try {
      // Clean up message from Senang Pay (they use underscores instead of spaces)
      const cleanMsg = msg.replace(/_/g, " ");

      await prisma.booking.update({
        where: { id: order_id },
        data: {
          paymentNote: `Payment Failed: ${cleanMsg}`,
        },
      });

      logger.info("Payment failure note recorded", {
        component: "payment-return",
        bookingId: order_id,
      });

      redirect(
        `/${locale}/book/confirm?id=${order_id}&payment=failed&reason=${encodeURIComponent(cleanMsg)}`
      );
    } catch (error) {
      logger.error("Failed to record payment failure", {
        component: "payment-return",
        orderId: order_id,
        error,
      });
      redirect(`/${locale}/book/confirm?id=${order_id}&payment=failed`);
    }
  }
}
