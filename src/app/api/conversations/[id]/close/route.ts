import { auth } from "@/lib/auth/auth";
import { closeConversation } from "@/lib/services/message-service";
import { NextRequest, NextResponse } from "next/server";

/**
 * PATCH /api/conversations/:id/close
 *
 * Close a conversation manually
 * Can be called by either participant or system
 *
 * Body (optional):
 * - reason: string - Optional reason for closing
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

    const conversation = await closeConversation(id, session.user.id);

    console.log("close_conversation", {
      userId: session.user.id,
      conversationId: id,
      reason: "manual",
    });

    return NextResponse.json({
      success: true,
      conversation,
    });
  } catch (error) {
    console.error("close_conversation_error", {
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
      { error: "Failed to close conversation" },
      { status: 500 }
    );
  }
}
