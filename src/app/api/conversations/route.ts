import { auth } from "@/lib/auth/auth";
import { getUserConversations } from "@/lib/services/message-service";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/conversations
 *
 * Get all conversations for the authenticated user
 * Supports pagination with cursor
 *
 * Query Parameters:
 * - role: "angler" | "captain" (required)
 * - limit: number (default: 20)
 * - cursor: string (for pagination)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const role = searchParams.get("role") as "angler" | "captain";
    const limit = parseInt(searchParams.get("limit") || "20");
    const cursor = searchParams.get("cursor") || undefined;

    if (!role || !["angler", "captain"].includes(role)) {
      return NextResponse.json(
        { error: "Invalid role parameter" },
        { status: 400 }
      );
    }

    console.log("get_conversations", {
      userId: session.user.id,
      role,
      limit,
    });

    const result = await getUserConversations(
      session.user.id,
      role,
      limit,
      cursor
    );

    return NextResponse.json({
      conversations: result.conversations,
      nextCursor: result.nextCursor,
      hasMore: result.hasMore,
      totalUnread: result.totalUnread,
    });
  } catch (error) {
    console.error("get_conversations_error", {
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(
      { error: "Failed to fetch conversations" },
      { status: 500 }
    );
  }
}
