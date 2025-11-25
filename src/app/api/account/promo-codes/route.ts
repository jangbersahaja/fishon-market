/**
 * GET /api/account/promo-codes
 *
 * Get user's available promo codes
 */

import { authOptions } from "@/lib/auth/auth-options";
import { getUserPromoCodes } from "@/lib/services/promo-service";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const promoCodes = await getUserPromoCodes(session.user.id);

    return NextResponse.json({
      promoCodes: promoCodes.map((assignment) => ({
        id: assignment.promoCode.id,
        code: assignment.promoCode.code,
        name: assignment.promoCode.name,
        description: assignment.promoCode.description,
        type: assignment.promoCode.type,
        percentage: assignment.promoCode.percentage,
        fixedAmount: assignment.promoCode.fixedAmount,
        validFrom: assignment.promoCode.startDate,
        validUntil: assignment.promoCode.endDate,
        assignedAt: assignment.assignedAt,
        usedAt: assignment.usedAt,
      })),
    });
  } catch (error) {
    console.error("[PromoCodesAPI] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch promo codes" },
      { status: 500 }
    );
  }
}
