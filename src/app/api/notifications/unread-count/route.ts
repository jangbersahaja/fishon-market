/**
 * GET /api/notifications/unread-count
 * Get user's unread notification count
 */

import { auth } from "@/lib/auth/auth";
import { getUnreadCount } from "@/lib/services/notification-service";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const count = await getUnreadCount(session.user.id);

    return NextResponse.json({ count });
  } catch (error) {
    console.error("[Notifications Count API] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch unread count" },
      { status: 500 }
    );
  }
}
