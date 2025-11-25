import { authOptions } from "@/lib/auth/auth-options";
import { campaignService } from "@/lib/services/campaign-service";
import type { InteractionAction, UserRole } from "@prisma/client";
import { getServerSession } from "next-auth";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

interface TrackingPayload {
  campaignId: string;
  placementKey: string;
  action: InteractionAction;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const cookieStore = await cookies();

    // Get or create session ID for tracking
    let sessionId = cookieStore.get("fishon_session_id")?.value;
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      cookieStore.set("fishon_session_id", sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });
    }

    const body = (await req.json()) as TrackingPayload;
    const { campaignId, placementKey, action } = body;

    // Validate required fields
    if (!campaignId || !placementKey || !action) {
      return NextResponse.json(
        { error: "Missing required fields: campaignId, placementKey, action" },
        { status: 400 }
      );
    }

    // Build context
    const context = {
      userId: session?.user?.id,
      sessionId,
      userRole: session?.user?.role as UserRole | undefined,
      currentPage: req.headers.get("referer") || "",
      device: getDeviceType(req.headers.get("user-agent") || ""),
      locale: req.headers.get("accept-language")?.split(",")[0] || "en",
    };

    // Track based on action type
    switch (action) {
      case "IMPRESSION":
        await campaignService.trackImpression(
          campaignId,
          placementKey,
          context
        );
        break;

      case "CLICK":
        await campaignService.trackClick(campaignId, placementKey, context);
        break;

      case "DISMISS":
        await campaignService.trackDismissal(campaignId, placementKey, context);
        break;

      case "CONVERSION":
        // Conversion tracking requires userId
        if (!context.userId) {
          return NextResponse.json(
            { error: "User ID required for conversion tracking" },
            { status: 400 }
          );
        }
        await campaignService.trackConversion(context.userId, sessionId);
        break;

      default:
        return NextResponse.json(
          { error: `Invalid action: ${action}` },
          { status: 400 }
        );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API] Campaign tracking error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * Detect device type from user agent
 */
function getDeviceType(userAgent: string): "DESKTOP" | "MOBILE" | "TABLET" {
  const ua = userAgent.toLowerCase();

  if (/mobile/i.test(ua) && !/tablet/i.test(ua)) {
    return "MOBILE";
  }

  if (/tablet|ipad/i.test(ua)) {
    return "TABLET";
  }

  return "DESKTOP";
}
