import { auth } from "@/lib/auth/auth";
import { getPusherServer } from "@/lib/pusher/server";
import { getConversation, sendMessage } from "@/lib/services/message-service";
import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/conversations/:id/messages
 *
 * Get paginated messages for a conversation
 * Returns cursor-based pagination (most recent first)
 *
 * Query Parameters:
 * - limit: number (default: 50)
 * - cursor: string (for pagination)
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

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const cursor = searchParams.get("cursor") || undefined;

    const { getMessages } = await import("@/lib/services/message-service");

    const result = await getMessages(id, session.user.id, limit, cursor);

    console.log("get_messages", {
      userId: session.user.id,
      conversationId: id,
      messageCount: result.messages.length,
    });

    return NextResponse.json({
      messages: result.messages,
      nextCursor: result.nextCursor,
      hasMore: result.hasMore,
    });
  } catch (error) {
    console.error("get_messages_error", {
      error: error instanceof Error ? error.message : "Unknown error",
    });

    // Check if it's an authorization error
    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/conversations/:id/messages
 *
 * Send a new message in a conversation
 * Validates conversation status and access permissions
 *
 * Body:
 * - content: string (required, 1-1000 chars)
 * - contentType: "text" | "system" | "booking_card" (default: "text")
 * - isQuickReply: boolean (default: false)
 */
export async function POST(
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

    const body = await request.json();
    const { content, contentType = "text", isQuickReply = false } = body;

    // Validate content
    if (!content || typeof content !== "string") {
      return NextResponse.json(
        { error: "Message content is required" },
        { status: 400 }
      );
    }

    if (content.length < 1 || content.length > 1000) {
      return NextResponse.json(
        { error: "Message must be between 1 and 1000 characters" },
        { status: 400 }
      );
    }

    // Validate contentType
    if (!["text", "system", "booking_card"].includes(contentType)) {
      return NextResponse.json(
        { error: "Invalid content type" },
        { status: 400 }
      );
    }

    // Send message
    const message = await sendMessage(id, session.user.id, content, "angler", {
      contentType,
      isQuickReply,
    });

    // Get updated conversation for metadata
    const conversation = await getConversation(id, session.user.id);

    // Trigger conversation.updated event for sidebar updates
    const pusher = getPusherServer();
    if (pusher && conversation.ownerId) {
      await pusher.trigger(
        `private-user.${conversation.ownerId}`,
        "conversation.updated",
        {
          conversationId: id,
          lastMessageAt: conversation.lastMessageAt,
          lastMessagePreview: conversation.lastMessagePreview,
          captainUnreadCount: conversation.captainUnreadCount,
        }
      );
    }

    // Revalidate messages page for Server Component refresh (all locales)
    const locales = ["my", "en"];
    for (const locale of locales) {
      revalidatePath(`/${locale}/account/messages`);
      revalidatePath(`/${locale}/account/messages/${id}`);
    }

    console.log("send_message", {
      userId: session.user.id,
      conversationId: id,
      messageId: message.id,
      contentType,
    });

    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    console.error("send_message_error", {
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
      if (error.message.includes("locked")) {
        return NextResponse.json(
          { error: "Chat is locked. Payment required to send messages." },
          { status: 400 }
        );
      }
      if (error.message.includes("closed")) {
        return NextResponse.json(
          { error: "Conversation is closed" },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}
