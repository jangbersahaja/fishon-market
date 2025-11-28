import { prisma } from "@/lib/database/prisma";
import { triggerPaymentSideEffects } from "@/lib/payment/payment-side-effects";
import { verifyReturnHash } from "@/lib/payment/senangpay";
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
  const searchParamsData = await searchParams;
  const { status_id, order_id, transaction_id, msg, hash } = searchParamsData;

  console.log("🔙 [PAYMENT RETURN] User returned from Senang Pay", {
    status_id,
    order_id,
    transaction_id,
    msg: msg?.substring(0, 50),
    hash: hash?.substring(0, 16) + "...",
  });

  // Validate required parameters
  if (!status_id || !order_id || !transaction_id || !msg || !hash) {
    console.error("❌ [PAYMENT RETURN] Missing required parameters", {
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
    console.error("❌ [PAYMENT RETURN] Senang Pay not configured");
    redirect(`/${locale}/book/confirm?error=payment_gateway_error`);
  }

  const isValid = verifyReturnHash(
    { status_id, order_id, transaction_id, msg, hash },
    secretKey,
    merchantId
  );

  if (!isValid) {
    console.error(
      "❌ [PAYMENT RETURN] Invalid hash detected - possible tampering",
      {
        orderId: order_id,
        receivedHash: hash.substring(0, 16) + "...",
      }
    );
    redirect(`/${locale}/book/confirm?error=invalid_payment_hash`);
  }

  console.log("✅ [PAYMENT RETURN] Hash verified successfully");

  // Check if this is a PaymentSession (AUTO + DIRECT flow) or a Booking (TOKENIZED flow)
  // For AUTO + DIRECT, order_id is a PaymentSession.id, booking is created after successful payment
  console.log(
    "🔍 [PAYMENT RETURN] Looking up PaymentSession with ID:",
    order_id
  );

  const paymentSession = await prisma.paymentSession.findUnique({
    where: { id: order_id },
    select: {
      id: true,
      status: true,
      bookingData: true,
    },
  });

  console.log("🔍 [PAYMENT RETURN] PaymentSession lookup result:", {
    found: !!paymentSession,
    sessionId: paymentSession?.id,
    status: paymentSession?.status,
  });

  // If it's a PaymentSession and payment failed/cancelled
  if (paymentSession) {
    if (status_id !== "1") {
      // Payment failed or cancelled - update session status
      console.log("❌ [PAYMENT RETURN] Payment cancelled/failed for session", {
        sessionId: order_id,
        reason: msg,
      });

      await prisma.paymentSession.update({
        where: { id: order_id },
        data: { status: "FAILED" },
      });

      // Get charterId from booking data to redirect back to booking page
      const bookingData = paymentSession.bookingData as any;
      const charterId = bookingData?.charterId;

      if (charterId) {
        // Redirect back to charter booking page with message
        redirect(
          `/${locale}/book/${charterId}?payment=cancelled&message=${encodeURIComponent(
            msg || "Payment was cancelled. You can try again when ready."
          )}`
        );
      } else {
        // Fallback to home if no charterId
        redirect(
          `/${locale}/home?payment=cancelled&message=${encodeURIComponent(
            msg || "Payment was cancelled."
          )}`
        );
      }
    }

    // Payment successful for PaymentSession - callback webhook should handle booking creation
    // Just redirect to a holding page that will show success once callback processes
    console.log(
      "✅ [PAYMENT RETURN] Payment successful for session, awaiting callback",
      {
        sessionId: order_id,
        transactionId: transaction_id,
      }
    );

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

  // Check if booking exists (TOKENIZED flow where booking was created before payment)
  console.log("🔍 [PAYMENT RETURN] Looking up Booking with ID:", order_id);

  const booking = await prisma.booking.findUnique({
    where: { id: order_id },
    select: {
      id: true,
      status: true,
      paidAt: true,
      paymentTransactionId: true,
      charterId: true,
      finalPrice: true,
    },
  });

  console.log("🔍 [PAYMENT RETURN] Booking lookup result:", {
    found: !!booking,
    bookingId: booking?.id,
    status: booking?.status,
  });

  if (!booking) {
    console.error("❌ [PAYMENT RETURN] Neither booking nor session found", {
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
      console.log(
        "🔍 [PAYMENT RETURN] Found booking by transaction ID:",
        bookingByTx.id
      );
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
      console.log(
        "❌ [PAYMENT RETURN] Payment was cancelled, no matching records found"
      );
      redirect(
        `/${locale}/home?payment=cancelled&message=${encodeURIComponent(
          msg || "Payment was cancelled. You can try again when ready."
        )}`
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

  // IDEMPOTENCY: Check if already processed by callback webhook
  // The callback webhook is the authoritative source; this is just for UX
  if (booking.status === "PAID" && booking.paidAt) {
    console.log("✅ [PAYMENT RETURN] Already processed by callback webhook", {
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
    console.log(
      "✅ [PAYMENT RETURN] Booking in PAYMENT_AUTHORIZED, callback will process",
      {
        bookingId: order_id,
        transactionId: transaction_id,
        msg: "Waiting for callback webhook to complete processing",
      }
    );

    // Redirect to confirmation page - callback will update status to PAID
    // The confirmation page will show the current status
    redirect(`/${locale}/book/confirm?id=${order_id}&payment=success`);
  }

  // Process payment update (if callback hasn't processed it yet)
  // This is a fallback in case callback fails or is delayed
  if (status_id === "1") {
    // Payment successful
    console.log("✅ [PAYMENT RETURN] Processing successful payment", {
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

      console.log("✅ [PAYMENT RETURN] Booking updated to PAID", {
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
      console.error("❌ [PAYMENT RETURN] Failed to update booking", {
        orderId: order_id,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      // Despite error, payment was likely successful on Senang Pay side
      // Callback webhook should have processed it or will process it
      // Redirect to booking page so user can see their booking
      console.log(
        "⚠️ [PAYMENT RETURN] Redirecting to booking despite error - callback should have processed",
        { orderId: order_id }
      );
      redirect(`/${locale}/book/confirm?id=${order_id}&payment=processing`);
    }
  } else {
    // Payment failed
    console.log("❌ [PAYMENT RETURN] Payment failed", {
      orderId: order_id,
      reason: msg,
    });

    try {
      await prisma.booking.update({
        where: { id: order_id },
        data: {
          paymentNote: `Payment Failed: ${msg}`,
        },
      });

      console.log("📝 [PAYMENT RETURN] Payment failure note recorded", {
        bookingId: order_id,
      });

      redirect(
        `/${locale}/book/confirm?id=${order_id}&payment=failed&reason=${encodeURIComponent(msg)}`
      );
    } catch (error) {
      console.error("❌ [PAYMENT RETURN] Failed to record payment failure", {
        orderId: order_id,
        error,
      });
      redirect(`/${locale}/book/confirm?id=${order_id}&payment=failed`);
    }
  }
}
