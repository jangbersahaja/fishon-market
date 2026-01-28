/**
 * Payment Return Redirect Handler
 * 
 * This API route handles SenangPay return callbacks and redirects to the localized payment return page.
 * 
 * SenangPay Configuration:
 * - Return URL: https://www.fishon.my/api/payment/return
 * 
 * Flow:
 * 1. Receive callback from SenangPay with query parameters
 * 2. Detect user's locale from cookies or default to 'ms'
 * 3. Redirect to /{locale}/book/payment/return with all query parameters preserved
 * 
 * Query Parameters (from SenangPay):
 * - status_id: "1" = success, "0" = failed
 * - order_id: Booking ID or PaymentSession ID
 * - transaction_id: SenangPay transaction ID
 * - msg: Payment message
 * - hash: Security hash for verification
 */

import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  
  // Extract SenangPay callback parameters
  const status_id = searchParams.get("status_id");
  const order_id = searchParams.get("order_id");
  const transaction_id = searchParams.get("transaction_id");
  const msg = searchParams.get("msg");
  const hash = searchParams.get("hash");

  logger.info("Payment return redirect handler", {
    component: "payment-return-redirect",
    status_id,
    order_id,
    transaction_id,
    msg: msg?.substring(0, 50),
    hash: hash?.substring(0, 16) + "...",
  });

  // Detect user's locale from cookies or use default
  const localeCookie = request.cookies.get("NEXT_LOCALE");
  const locale = localeCookie?.value || "ms"; // Default to Malay

  // Build redirect URL with locale prefix
  const base = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || "";
  const redirectUrl = new URL(`/${locale}/book/payment/return`, base);
  
  // Preserve all query parameters
  if (status_id) redirectUrl.searchParams.set("status_id", status_id);
  if (order_id) redirectUrl.searchParams.set("order_id", order_id);
  if (transaction_id) redirectUrl.searchParams.set("transaction_id", transaction_id);
  if (msg) redirectUrl.searchParams.set("msg", msg);
  if (hash) redirectUrl.searchParams.set("hash", hash);

  logger.info("Redirecting to localized payment return page", {
    component: "payment-return-redirect",
    locale,
    redirectTo: `/${locale}/book/payment/return`,
  });

  // Redirect to the localized payment return page
  return NextResponse.redirect(redirectUrl.toString(), { status: 302 });
}
