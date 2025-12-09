import { auth } from "@/lib/auth/auth";
import { getUnreadCount } from "@/lib/services/message-service";
import { connection, NextRequest, NextResponse } from "next/server";

/**
 * GET /api/conversations/unread-count
 *
 * Get total unread message count for the authenticated user
 *
 * Query Parameters:
 * - role: "angler" | "captain" (default: "angler")
 */
export async function GET(request: NextRequest) {
  await connection();
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const role = (searchParams.get("role") as "angler" | "captain") || "angler";

    if (!["angler", "captain"].includes(role)) {
      return NextResponse.json(
        { error: "Invalid role parameter" },
        { status: 400 }
      );
    }

    const count = await getUnreadCount(session.user.id, role);

    return NextResponse.json({ count });
  } catch (error) {
    console.error("get_unread_count_error", {
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(
      { error: "Failed to fetch unread count" },
      { status: 500 }
    );
  }
}
