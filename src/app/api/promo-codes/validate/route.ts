/**
 * POST /api/promo-codes/validate
 *
 * Validate a promo code for a booking
 * Requires authentication (only registered users can use promo codes)
 */

import { authOptions } from "@/lib/auth/auth-options";
import { validatePromoCode } from "@/lib/services/promo-service";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { valid: false, error: "Authentication required to use promo codes" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { code, charterId, subtotal } = body;

    if (!code || !charterId || !subtotal) {
      return NextResponse.json(
        {
          valid: false,
          error: "Missing required fields: code, charterId, subtotal",
        },
        { status: 400 }
      );
    }

    const validation = await validatePromoCode({
      code: code.trim().toUpperCase(),
      userId: session.user.id,
      charterId,
      subtotal: Number(subtotal),
    });

    if (!validation.valid) {
      return NextResponse.json(
        { valid: false, error: validation.error },
        { status: 200 } // 200 to allow client to display error message
      );
    }

    return NextResponse.json({
      valid: true,
      discount: validation.discount,
      promoCodeId: validation.promoCodeId,
    });
  } catch (error) {
    console.error("[PromoValidateAPI] Error:", error);
    return NextResponse.json(
      { valid: false, error: "Failed to validate promo code" },
      { status: 500 }
    );
  }
}
