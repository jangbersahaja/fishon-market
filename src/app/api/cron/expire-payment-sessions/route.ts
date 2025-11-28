/**
 * Expire Payment Sessions Cron Job
 *
 * Cleans up expired PaymentSessions that were never completed.
 * These sessions are created for AUTO + DIRECT flow (FPX/E-wallet) payments
 * and have a 30-minute expiration window.
 *
 * Actions:
 * - Mark PENDING sessions as EXPIRED after expiresAt
 * - Delete old expired/failed sessions (older than 7 days) to keep DB clean
 *
 * Usage:
 * - Vercel Cron: Configure in vercel.json (every 15 minutes)
 * - Manual trigger: POST /api/cron/expire-payment-sessions with CRON_SECRET header
 */

import { prisma } from "@/lib/database/prisma";
import { NextResponse } from "next/server";

export const maxDuration = 30;

/**
 * POST /api/cron/expire-payment-sessions
 *
 * Protected by CRON_SECRET environment variable
 */
export async function POST(req: Request) {
  // Verify cron secret
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error("[EXPIRE_SESSIONS] CRON_SECRET not configured");
    return NextResponse.json(
      { error: "Cron job not configured" },
      { status: 500 }
    );
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    console.error("[EXPIRE_SESSIONS] Invalid authorization header");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  console.log("[EXPIRE_SESSIONS] Starting session cleanup...");

  try {
    const now = new Date();

    // 1. Mark expired PENDING sessions as EXPIRED
    const expiredResult = await prisma.paymentSession.updateMany({
      where: {
        status: "PENDING",
        expiresAt: {
          lt: now,
        },
      },
      data: {
        status: "EXPIRED",
      },
    });

    console.log(
      `[EXPIRE_SESSIONS] Marked ${expiredResult.count} sessions as EXPIRED`
    );

    // 2. Delete old sessions (older than 7 days) to keep DB clean
    // Only delete EXPIRED, FAILED, or COMPLETED sessions
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const deletedResult = await prisma.paymentSession.deleteMany({
      where: {
        status: {
          in: ["EXPIRED", "FAILED", "COMPLETED"],
        },
        createdAt: {
          lt: sevenDaysAgo,
        },
      },
    });

    console.log(
      `[EXPIRE_SESSIONS] Deleted ${deletedResult.count} old sessions (7+ days)`
    );

    return NextResponse.json({
      ok: true,
      expired: expiredResult.count,
      deleted: deletedResult.count,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error("[EXPIRE_SESSIONS] Fatal error:", error);
    return NextResponse.json(
      {
        error: "Failed to process payment sessions",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cron/expire-payment-sessions
 *
 * Returns stats about payment sessions (for monitoring)
 */
export async function GET() {
  try {
    const now = new Date();

    const [pending, expired, failed, completed] = await Promise.all([
      prisma.paymentSession.count({ where: { status: "PENDING" } }),
      prisma.paymentSession.count({ where: { status: "EXPIRED" } }),
      prisma.paymentSession.count({ where: { status: "FAILED" } }),
      prisma.paymentSession.count({ where: { status: "COMPLETED" } }),
    ]);

    // Count how many PENDING sessions are actually expired but not yet updated
    const pendingExpired = await prisma.paymentSession.count({
      where: {
        status: "PENDING",
        expiresAt: { lt: now },
      },
    });

    return NextResponse.json({
      ok: true,
      stats: {
        pending,
        pendingExpired, // These will be marked EXPIRED on next cron run
        expired,
        failed,
        completed,
        total: pending + expired + failed + completed,
      },
    });
  } catch (error) {
    console.error("[EXPIRE_SESSIONS] Failed to get stats:", error);
    return NextResponse.json(
      { error: "Failed to get session stats" },
      { status: 500 }
    );
  }
}
