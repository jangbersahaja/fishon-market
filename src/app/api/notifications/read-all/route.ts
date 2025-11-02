/**
 * PATCH /api/notifications/read-all
 * Mark all user's notifications as read
 */

import { auth } from "@/lib/auth/auth";
import { markAllNotificationsRead } from "@/lib/services/notification-service";
import { NextResponse } from "next/server";

export async function PATCH() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await markAllNotificationsRead(session.user.id);

    return NextResponse.json({
      success: true,
      count: result.count,
    });
  } catch (error) {
    console.error("[Notifications Read All API] Error:", error);
    return NextResponse.json(
      { error: "Failed to mark notifications as read" },
      { status: 500 }
    );
  }
}
