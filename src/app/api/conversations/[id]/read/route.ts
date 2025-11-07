import { auth } from "@/lib/auth/auth";
import { markAsRead } from "@/lib/services/message-service";
import { NextRequest, NextResponse } from "next/server";

/**
 * PATCH /api/conversations/:id/read
 *
 * Mark all messages in a conversation as read
 * Updates conversation unread count for the user
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Conversation ID is required" },
        { status: 400 }
      );
    }

    const conversation = await markAsRead(id, session.user.id);

    console.log("mark_as_read", {
      userId: session.user.id,
      conversationId: id,
    });

    return NextResponse.json({
      success: true,
      conversation,
    });
  } catch (error) {
    console.error("mark_as_read_error", {
      error: error instanceof Error ? error.message : "Unknown error",
    });

    // Check error types
    if (error instanceof Error) {
      if (error.message.includes("Unauthorized")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }
      if (error.message.includes("not found")) {
        return NextResponse.json(
          { error: "Conversation not found" },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      { error: "Failed to mark as read" },
      { status: 500 }
    );
  }
}
