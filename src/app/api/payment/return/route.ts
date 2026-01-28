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
    msg: msg ? msg.substring(0, 50) : undefined,
    hash: hash ? hash.substring(0, 16) + "..." : undefined,
  });

  // Detect user's locale from cookies or use default
  const localeCookie = request.cookies.get("NEXT_LOCALE");
  const allowedLocales = ["ms", "en"];
  const localeValue = localeCookie?.value || "ms";
  const locale = allowedLocales.includes(localeValue) ? localeValue : "ms"; // Validate locale

  // Build redirect URL with locale prefix using request origin
  const origin = request.nextUrl.origin;
  const redirectUrl = new URL(`/${locale}/book/payment/return`, origin);
  
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

/**
 * POST handler for payment return
 * Some payment gateways may POST the return callback instead of GET
 */
export async function POST(request: NextRequest) {
  return GET(request);
}
