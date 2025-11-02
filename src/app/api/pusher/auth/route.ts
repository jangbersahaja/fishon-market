/**
 * POST /api/pusher/auth
 * Pusher authentication endpoint for private channels
 */

import { auth } from "@/lib/auth/auth";
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

    // Verify user can access this channel
    // Private channels are prefixed with "private-user-{userId}"
    if (channelName !== `private-user-${userId}`) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get Pusher instance
    const pusherServer = getPusherServer();

    if (!pusherServer) {
      return NextResponse.json(
        { error: "Pusher not configured" },
        { status: 503 }
      );
    }

    // Authenticate the user for this channel
    const authResponse = pusherServer.authorizeChannel(socketId, channelName);

    return NextResponse.json(authResponse);
  } catch (error) {
    console.error("[pusher/auth] Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
