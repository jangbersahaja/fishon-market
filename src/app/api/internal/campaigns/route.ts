import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/database/prisma";
import { NextResponse } from "next/server";

// Shared secret for internal API calls from fishon-captain
// Uses the same CAPTAIN_API_SECRET as other cross-app integrations
const CAPTAIN_API_SECRET = process.env.CAPTAIN_API_SECRET;

/**
 * Verify internal API request (either via session or shared secret)
 */
async function verifyInternalRequest(req: Request): Promise<{
  authorized: boolean;
  userId?: string;
  error?: string;
}> {
  // Check for captain API secret header (for server-to-server calls)
  const apiSecret = req.headers.get("x-captain-api-secret");
  if (apiSecret && CAPTAIN_API_SECRET && apiSecret === CAPTAIN_API_SECRET) {
    // Server-to-server call with userId in header
    const userId = req.headers.get("x-user-id");
    return { authorized: true, userId: userId || undefined };
  }

  // Fallback to session-based auth
  const session = await auth();
  const userRole = (session?.user as any)?.role;

  if (!session?.user?.id || !["ADMIN", "STAFF"].includes(userRole)) {
    return { authorized: false, error: "Unauthorized. Admin access required." };
  }

  return { authorized: true, userId: session.user.id };
}

/**
 * GET /api/internal/campaigns
 * Get all campaigns for admin management
 */
export async function GET(req: Request) {
  try {
    const verification = await verifyInternalRequest(req);
    if (!verification.authorized) {
      return NextResponse.json({ error: verification.error }, { status: 401 });
    }

    const campaigns = await prisma.promotionalCampaign.findMany({
      include: {
        placements: true,
      },
      orderBy: [{ status: "asc" }, { priority: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({ success: true, campaigns });
  } catch (error) {
    console.error("[internal/campaigns] GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch campaigns" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/internal/campaigns
 * Create a new campaign
 */
export async function POST(req: Request) {
  try {
    const verification = await verifyInternalRequest(req);
    if (!verification.authorized) {
      return NextResponse.json({ error: verification.error }, { status: 401 });
    }

    const data = await req.json();

    // Validate required fields
    if (!data.code || !data.type || !data.status) {
      return NextResponse.json(
        { error: "Missing required fields: code, type, or status" },
        { status: 400 }
      );
    }

    if (
      !data.contentEn?.title ||
      !data.contentEn?.subtitle ||
      !data.contentEn?.cta
    ) {
      return NextResponse.json(
        { error: "English content is incomplete" },
        { status: 400 }
      );
    }

    if (
      !data.contentMy?.title ||
      !data.contentMy?.subtitle ||
      !data.contentMy?.cta
    ) {
      return NextResponse.json(
        { error: "Malay content is incomplete" },
        { status: 400 }
      );
    }

    if (!data.allowedPages?.length || !data.allowedDevices?.length) {
      return NextResponse.json(
        { error: "At least one page and one device must be selected" },
        { status: 400 }
      );
    }

    // Check if code already exists
    const existing = await prisma.promotionalCampaign.findUnique({
      where: { code: data.code },
    });

    if (existing) {
      return NextResponse.json(
        { error: `Campaign with code "${data.code}" already exists` },
        { status: 409 }
      );
    }

    // Create campaign with placements
    const campaign = await prisma.promotionalCampaign.create({
      data: {
        code: data.code,
        type: data.type,
        status: data.status,
        priority: data.priority || 50,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        targetGuests: data.targetGuests ?? true,
        targetRegistered: data.targetRegistered ?? false,
        excludeRoles: data.excludeRoles || [],
        allowedPages: data.allowedPages,
        allowedDevices: data.allowedDevices,
        contentEn: data.contentEn,
        contentMy: data.contentMy,
        dismissalStrategy: data.dismissalStrategy || "SESSION_ONLY",
        cooldownDays: data.cooldownDays,
        maxDismissals: data.maxDismissals,
        createdBy: verification.userId,
        placements: {
          create: (data.placements || []).map((placement: any) => ({
            placementKey: placement.placementKey,
            devices: placement.devices || [],
            position: placement.position,
            sticky: placement.sticky || false,
            displayRules: placement.displayRules || {},
            layoutConfig: placement.layoutConfig || {},
          })),
        },
      },
      include: {
        placements: true,
      },
    });

    return NextResponse.json({ success: true, campaign });
  } catch (error) {
    console.error("[internal/campaigns] POST error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to create campaign",
      },
      { status: 500 }
    );
  }
}
