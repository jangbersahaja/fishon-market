import { auth } from "@/lib/auth/auth";
import { getConversation } from "@/lib/services/message-service";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/conversations/:id
 *
 * Get a single conversation with permission check
 *
 * Returns: Conversation object with participants
 */
export async function GET(
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

    const conversation = await getConversation(id, session.user.id);

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    console.log("get_conversation", {
      userId: session.user.id,
      conversationId: id,
    });

    return NextResponse.json(conversation);
  } catch (error) {
    console.error("get_conversation_error", {
      error: error instanceof Error ? error.message : "Unknown error",
    });

    // Check if it's an authorization error
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    return NextResponse.json(
      { error: "Failed to fetch conversation" },
      { status: 500 }
    );
  }
}
