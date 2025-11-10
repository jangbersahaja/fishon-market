/**
 * POST /api/pusher/auth
 * Pusher authentication endpoint for private channels
 */

import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/database/prisma";
import { getPusherServer } from "@/lib/pusher/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.text();
    const params = new URLSearchParams(body);
    const socketId = params.get("socket_id");
    const channelName = params.get("channel_name");

    if (!socketId || !channelName) {
      return NextResponse.json({ error: "Bad Request" }, { status: 400 });
    }

    const userId = session.user.id;

    // Handle private user notifications channel (with dot separator)
    if (channelName === `private-user.${userId}`) {
      const pusherServer = getPusherServer();
      if (!pusherServer) {
        return NextResponse.json(
          { error: "Pusher not configured" },
          { status: 503 }
        );
      }
      const authResponse = pusherServer.authorizeChannel(socketId, channelName);
      return NextResponse.json(authResponse);
    }

    // Handle conversation channels: private-conversation.{conversationId}
    if (channelName.startsWith("private-conversation.")) {
      const conversationId = channelName.replace("private-conversation.", "");

      // Verify user is a participant in this conversation
      const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
        select: { anglerId: true, ownerId: true },
      });

      if (!conversation) {
        return NextResponse.json(
          { error: "Conversation not found" },
          { status: 404 }
        );
      }

      // Check if user is either the angler or captain owner
      if (conversation.anglerId !== userId && conversation.ownerId !== userId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const pusherServer = getPusherServer();
      if (!pusherServer) {
        return NextResponse.json(
          { error: "Pusher not configured" },
          { status: 503 }
        );
      }

      const authResponse = pusherServer.authorizeChannel(socketId, channelName);
      return NextResponse.json(authResponse);
    }

    // Unknown channel type
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  } catch (error) {
    console.error("[pusher/auth] Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
