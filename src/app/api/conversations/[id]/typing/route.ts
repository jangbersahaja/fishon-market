import { auth } from "@/lib/auth/auth";
import { sendTypingIndicator } from "@/lib/services/message-service";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: conversationId } = await params;
    const { isTyping } = await req.json();

    if (typeof isTyping !== "boolean") {
      return NextResponse.json(
        { error: "isTyping must be a boolean" },
        { status: 400 }
      );
    }

    // Send typing indicator
    await sendTypingIndicator(conversationId, session.user.id, isTyping);

    return NextResponse.json({
      success: true,
      conversationId,
      userId: session.user.id,
      isTyping,
    });
  } catch (error) {
    console.error("[conversations/typing] Error:", error);

    if (error instanceof Error) {
      if (error.message.includes("Conversation not found")) {
        return NextResponse.json(
          { error: "Conversation not found" },
          { status: 404 }
        );
      }
      if (error.message.includes("Unauthorized")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }
    }

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
