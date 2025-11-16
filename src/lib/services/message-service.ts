import { prisma } from "@/lib/database/prisma";
import {
  triggerMessageNew,
  triggerMessageRead,
  triggerTyping,
} from "@/lib/pusher/server";

/**
 * Message Service
 *
 * Handles all conversation and message operations for the chat system.
 * - Manages conversation lifecycle (creation, unlocking, closing)
 * - Handles message CRUD operations
 * - Enforces access control and permissions
 * - Provides pagination for message history
 * - Triggers real-time Pusher events
 */

// ============================================================================
// CONVERSATION OPERATIONS
// ============================================================================

/**
 * Create a new conversation for a booking
 * Called automatically when booking is created
 * Status starts as LOCKED (no chat until payment)
 */
export async function createConversation(
  bookingId: string,
  anglerId: string,
  charterId: string,
  ownerId: string
) {
  return prisma.conversation.create({
    data: {
      bookingId,
      anglerId,
      charterId,
      ownerId,
      status: "LOCKED", // Chat disabled until payment
    },
  });
}

/**
 * Get a single conversation with permission check
 * Ensures user is either angler or captain owner
 */
export async function getConversation(conversationId: string, userId: string) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: { messages: true },
  });

  if (!conversation) {
    throw new Error("Conversation not found");
  }

  // Access control: must be participant
  if (conversation.anglerId !== userId && conversation.ownerId !== userId) {
    throw new Error("Unauthorized access to conversation");
  }

  return conversation;
}

/**
 * Get user's conversations (both angler and captain views)
 * Returns paginated conversations sorted by last message
 */
export async function getUserConversations(
  userId: string,
  role: "angler" | "captain",
  limit: number = 20,
  cursor?: string
) {
  const where = role === "angler" ? { anglerId: userId } : { ownerId: userId };

  const conversations = await prisma.conversation.findMany({
    where,
    orderBy: { lastMessageAt: "desc" },
    take: limit + 1, // Get one extra to check if there's a next page
    ...(cursor && { skip: 1, cursor: { id: cursor } }),
    select: {
      id: true,
      bookingId: true,
      charterId: true,
      ownerId: true,
      anglerId: true,
      status: true,
      lastMessageAt: true,
      lastMessagePreview: true,
      lastMessageBy: true,
      anglerUnreadCount: true,
      captainUnreadCount: true,
      createdAt: true,
    },
  });

  const hasMore = conversations.length > limit;
  const items = conversations.slice(0, limit);
  const nextCursor = hasMore ? items[items.length - 1]?.id : null;

  // Calculate total unread
  const totalUnread = items.reduce((sum: number, conv) => {
    if (role === "angler") {
      return sum + conv.anglerUnreadCount;
    } else {
      return sum + conv.captainUnreadCount;
    }
  }, 0);

  return {
    conversations: items,
    nextCursor,
    hasMore,
    totalUnread,
  };
}

/**
 * Unlock conversation when payment is received
 * Called when booking status changes to PAID
 * Changes status from LOCKED to ACTIVE
 */
export async function unlockConversation(conversationId: string) {
  return prisma.conversation.update({
    where: { id: conversationId },
    data: { status: "ACTIVE" },
  });
}

/**
 * Close a conversation
 * Called after trip completion (24h grace period) or by user
 */
export async function closeConversation(
  conversationId: string,
  closedBy: string = "system"
) {
  return prisma.conversation.update({
    where: { id: conversationId },
    data: {
      status: "CLOSED",
      closedAt: new Date(),
      closedBy,
    },
  });
}

// ============================================================================
// MESSAGE OPERATIONS
// ============================================================================

/**
 * Send a message in a conversation
 * Validates conversation status and access
 * System messages bypass locked state
 */
export async function sendMessage(
  conversationId: string,
  senderId: string,
  content: string,
  senderType: "angler" | "captain" | "system",
  options?: {
    contentType?: "text" | "system" | "booking_card";
    systemType?: string;
    bookingSnapshot?: Record<string, unknown>;
    isQuickReply?: boolean;
  }
) {
  // Get conversation with booking data to check status
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      booking: {
        select: {
          status: true,
        },
      },
    },
  });

  if (!conversation) {
    throw new Error("Conversation not found");
  }

  // Check access: must be participant
  if (
    senderType !== "system" &&
    senderId !== conversation.anglerId &&
    senderId !== conversation.ownerId
  ) {
    throw new Error("Unauthorized: not a participant");
  }

  // Check if chat is locked based on booking status (system messages bypass this)
  if (senderType !== "system" && conversation.booking) {
    const bookingStatus = conversation.booking.status;

    // Chat is LOCKED for PENDING and AWAITING_PAYMENT bookings (before payment)
    // PAYMENT_AUTHORIZED has chat enabled (payment already received)
    if (bookingStatus === "PENDING" || bookingStatus === "AWAITING_PAYMENT") {
      throw new Error("Chat is locked until payment is received");
    }

    // Chat is CLOSED for CANCELLED, REJECTED, EXPIRED bookings
    if (
      bookingStatus === "CANCELLED" ||
      bookingStatus === "REJECTED" ||
      bookingStatus === "EXPIRED"
    ) {
      throw new Error("Conversation is closed");
    }

    // Chat is ACTIVE for PAID and COMPLETED bookings
    // Allow sending messages
  }

  // Also check conversation status for manually closed conversations
  if (senderType !== "system" && conversation.status === "CLOSED") {
    throw new Error("Conversation is closed");
  }

  // Get sender name for message snapshot
  let senderName = senderType;
  if (senderType !== "system") {
    if (senderType === "angler") {
      const user = await prisma.user.findUnique({
        where: { id: senderId },
        select: { name: true, firstName: true },
      });
      senderName = (user?.name || user?.firstName || "Angler") as any;
    }
  }

  // Create message
  const message = await prisma.message.create({
    data: {
      conversationId,
      senderId,
      senderType,
      senderName,
      content,
      contentType: options?.contentType || "text",
      systemType: options?.systemType,
      bookingSnapshot: (options?.bookingSnapshot as any) || undefined,
      isQuickReply: options?.isQuickReply || false,
      status: "SENT",
      deliveredAt: new Date(), // Assume delivered immediately
    },
  });

  // Update conversation's last message info
  const isAnglerSending = senderId === conversation.anglerId;
  await prisma.conversation.update({
    where: { id: conversationId },
    data: {
      lastMessageAt: new Date(),
      lastMessagePreview: content.substring(0, 200),
      lastMessageBy: senderId,
      // Increment unread count for recipient
      ...(isAnglerSending && {
        captainUnreadCount: { increment: 1 },
      }),
      ...(!isAnglerSending && {
        anglerUnreadCount: { increment: 1 },
      }),
    },
  });

  // Trigger real-time message event via Pusher
  await triggerMessageNew(conversationId, {
    id: message.id,
    senderId: message.senderId,
    senderType: message.senderType,
    senderName: message.senderName,
    content: message.content,
    contentType: message.contentType,
    systemType: message.systemType,
    createdAt: message.createdAt,
  });

  return message;
}

/**
 * Get paginated messages for a conversation
 * Returns cursor-based pagination (before timestamp)
 */
export async function getMessages(
  conversationId: string,
  userId: string,
  limit: number = 50,
  cursor?: string
) {
  // Verify access
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
  });

  if (!conversation) {
    throw new Error("Conversation not found");
  }

  if (conversation.anglerId !== userId && conversation.ownerId !== userId) {
    throw new Error("Unauthorized");
  }

  // Get messages
  const messages = await prisma.message.findMany({
    where: {
      conversationId,
      deletedAt: null, // Exclude soft-deleted
    },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(cursor && { skip: 1, cursor: { id: cursor } }),
  });

  const hasMore = messages.length > limit;
  const items = messages.slice(0, limit).reverse(); // Reverse for chronological order
  const nextCursor = hasMore ? messages[limit]?.id : null;

  return {
    messages: items,
    nextCursor,
    hasMore,
  };
}

/**
 * Mark all messages in a conversation as read
 * Updates the conversation's unread count for the user
 */
export async function markAsRead(conversationId: string, userId: string) {
  // Verify access
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
  });

  if (!conversation) {
    throw new Error("Conversation not found");
  }

  if (conversation.anglerId !== userId && conversation.ownerId !== userId) {
    throw new Error("Unauthorized");
  }

  // Update all messages to READ
  const readAt = new Date();
  await prisma.message.updateMany({
    where: {
      conversationId,
      senderId: { not: userId }, // Only mark received messages as read
      status: { not: "READ" },
      deletedAt: null,
    },
    data: {
      status: "READ",
      readAt,
    },
  });

  // Reset unread count for this user
  const isAngler = userId === conversation.anglerId;
  const updateData = isAngler
    ? { anglerUnreadCount: 0 }
    : { captainUnreadCount: 0 };

  const updatedConv = await prisma.conversation.update({
    where: { id: conversationId },
    data: updateData,
  });

  // Trigger real-time read receipt event via Pusher
  await triggerMessageRead(conversationId, userId, readAt);

  return updatedConv;
}

/**
 * Get total unread count for a user
 * Sums unread messages across all conversations
 */
export async function getUnreadCount(
  userId: string,
  role: "angler" | "captain"
) {
  const conversations = await prisma.conversation.findMany({
    where: role === "angler" ? { anglerId: userId } : { ownerId: userId },
    select: {
      ...(role === "angler" && { anglerUnreadCount: true }),
      ...(role === "captain" && { captainUnreadCount: true }),
    },
  });

  const countField =
    role === "angler" ? "anglerUnreadCount" : "captainUnreadCount";

  return conversations.reduce((sum: number, conv: any) => {
    return sum + (conv[countField] || 0);
  }, 0);
}

// ============================================================================
// SYSTEM MESSAGE HELPERS
// ============================================================================

/**
 * Send a system message for booking events
 */
export async function sendSystemMessage(
  conversationId: string,
  systemType: string,
  content: string,
  bookingSnapshot?: Record<string, unknown>
) {
  return sendMessage(conversationId, "system", content, "system", {
    contentType: systemType === "booking_card" ? "booking_card" : "system",
    systemType,
    bookingSnapshot,
  });
}

/**
 * Soft delete a message (for moderation)
 */
export async function deleteMessage(messageId: string, deletedBy: string) {
  return prisma.message.update({
    where: { id: messageId },
    data: {
      deletedAt: new Date(),
      deletedBy,
      content: "[Message deleted]",
    },
  });
}

/**
 * Send typing indicator
 * Called when user starts/stops typing
 */
export async function sendTypingIndicator(
  conversationId: string,
  userId: string,
  isTyping: boolean
) {
  // Verify user is participant
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
  });

  if (!conversation) {
    throw new Error("Conversation not found");
  }

  if (conversation.anglerId !== userId && conversation.ownerId !== userId) {
    throw new Error("Unauthorized");
  }

  // Trigger typing event via Pusher
  return triggerTyping(conversationId, userId, isTyping);
}

// ============================================================================
// ANGLER-SIDE ENRICHMENT FUNCTIONS
// ============================================================================

/**
 * Get enriched conversations with captain names, charter names, and trip details
 * Used for angler conversations list page
 */
export async function getAnglerConversationsEnriched(userId: string) {
  // Get conversations for this angler
  const conversations = await prisma.conversation.findMany({
    where: {
      anglerId: userId,
    },
    include: {
      booking: {
        select: {
          id: true,
          status: true,
          charterId: true,
          tripId: true,
          date: true,
          days: true,
          startTime: true,
          guests: true,
          finalPrice: true,
        },
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          content: true,
          createdAt: true,
          senderType: true,
        },
      },
    },
    orderBy: { lastMessageAt: "desc" },
    take: 50,
  });

  // Enrich with captain and charter data from captain DB
  const { prismaCaptain } = await import("@/lib/database/prisma-captain");

  const enrichedConversations = await Promise.all(
    conversations.map(async (conversation: (typeof conversations)[number]) => {
      let captainName = "Captain";
      let captainAvatar: string | null = null;
      let charterName = "Charter";
      let tripName = "Trip";
      let tripDurationHours = 0;

      if (conversation.booking && conversation.charterId) {
        // Get charter data from captain DB
        const charterData = await prismaCaptain.$queryRaw<
          Array<{
            name: string;
            ownerId: string;
          }>
        >`
          SELECT c.name, c."ownerId"
          FROM "Charter" c
          WHERE c.id = ${conversation.charterId}
          LIMIT 1
        `;

        if (charterData && charterData.length > 0) {
          charterName = charterData[0].name;

          // Get captain profile and user data from captain DB
          const captainProfile = await prismaCaptain.$queryRaw<
            Array<{
              displayName: string;
            }>
          >`
            SELECT cp."displayName"
            FROM "CaptainProfile" cp
            WHERE cp."userId" = ${charterData[0].ownerId}
            LIMIT 1
          `;

          // Always get user data for avatar
          const userData = await prismaCaptain.$queryRaw<
            Array<{
              name: string;
              image: string | null;
            }>
          >`
            SELECT u.name, u.image
            FROM "User" u
            WHERE u.id = ${charterData[0].ownerId}
            LIMIT 1
          `;

          if (userData && userData.length > 0) {
            captainAvatar = userData[0].image;

            // Use CaptainProfile displayName if available, otherwise fallback to User.name
            if (captainProfile && captainProfile.length > 0) {
              captainName = captainProfile[0].displayName;
            } else {
              captainName = userData[0].name || "Captain";
            }
          } else if (captainProfile && captainProfile.length > 0) {
            // CaptainProfile exists but no User data (unlikely)
            captainName = captainProfile[0].displayName;
          }
        }

        // Get trip data from captain DB using tripId
        if (conversation.booking.tripId) {
          const tripData = await prismaCaptain.$queryRaw<
            Array<{
              name: string;
              durationHours: number;
            }>
          >`
            SELECT t.name, t."durationHours"
            FROM "Trip" t
            WHERE t.id = ${conversation.booking.tripId}
            LIMIT 1
          `;

          if (tripData && tripData.length > 0) {
            tripName = tripData[0].name;
            tripDurationHours = tripData[0].durationHours;
          }
        }
      }

      // Parse guests
      let adults = 0;
      let children = 0;
      if (conversation.booking?.guests) {
        try {
          const guestsData =
            typeof conversation.booking.guests === "string"
              ? JSON.parse(conversation.booking.guests)
              : conversation.booking.guests;
          adults = guestsData?.adults || 0;
          children = guestsData?.children || 0;
        } catch (error) {
          console.error("Error parsing guests JSON:", error);
        }
      }

      return {
        ...conversation,
        captainName,
        captainAvatar,
        charterName,
        tripName,
        tripDurationHours,
        displayName: `${tripName} · ${charterName}`, // e.g., "Full-Day Trip · Port Dickson Charter"
        booking: conversation.booking
          ? {
              ...conversation.booking,
              adults,
              children,
            }
          : null,
      };
    })
  );

  return enrichedConversations;
}

/**
 * Get enriched conversation with captain details, charter info, and messages
 * Used for angler conversation detail page
 */
export async function getConversationEnriched(
  conversationId: string,
  userId: string
) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      booking: {
        select: {
          id: true,
          status: true,
          charterId: true,
          tripId: true,
          date: true,
          days: true,
          finalPrice: true,
          note: true,
          startTime: true,
          guests: true,
        },
      },
      messages: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          senderId: true,
          senderType: true,
          senderName: true,
          content: true,
          contentType: true,
          systemType: true,
          status: true,
          createdAt: true,
        },
      },
    },
  });

  if (!conversation) {
    return null;
  }

  // Access control
  if (conversation.anglerId !== userId && conversation.ownerId !== userId) {
    throw new Error("Unauthorized");
  }

  // Get charter and captain data from captain DB
  const { prismaCaptain } = await import("@/lib/database/prisma-captain");

  let captainName = "Captain";
  let captainEmail = "";
  let captainPhone = "";
  let captainAvatar: string | null = null;
  let charterName = "Charter";
  let tripName = "Trip";
  let tripDurationHours = 0;

  if (conversation.charterId) {
    // Get charter data
    const charterData = await prismaCaptain.$queryRaw<
      Array<{
        name: string;
        ownerId: string;
      }>
    >`
      SELECT c.name, c."ownerId"
      FROM "Charter" c
      WHERE c.id = ${conversation.charterId}
      LIMIT 1
    `;

    if (charterData && charterData.length > 0) {
      charterName = charterData[0].name;

      // Get captain profile
      const captainProfile = await prismaCaptain.$queryRaw<
        Array<{
          displayName: string;
          phone: string | null;
        }>
      >`
        SELECT cp."displayName", cp.phone
        FROM "CaptainProfile" cp
        WHERE cp."userId" = ${charterData[0].ownerId}
        LIMIT 1
      `;

      if (captainProfile && captainProfile.length > 0) {
        captainName = captainProfile[0].displayName;
        captainPhone = captainProfile[0].phone || "";
      }

      // Get captain user data (email, avatar)
      const userData = await prismaCaptain.$queryRaw<
        Array<{
          email: string;
          name: string;
          image: string | null;
        }>
      >`
        SELECT u.email, u.name, u.image
        FROM "User" u
        WHERE u.id = ${charterData[0].ownerId}
        LIMIT 1
      `;

      if (userData && userData.length > 0) {
        captainEmail = userData[0].email || "";
        captainAvatar = userData[0].image;
        // Use User.name as fallback if CaptainProfile not found
        if (captainName === "Captain") {
          captainName = userData[0].name || "Captain";
        }
      }
    }

    // Get trip data from captain DB using tripId
    if (conversation.booking && conversation.booking.tripId) {
      const tripData = await prismaCaptain.$queryRaw<
        Array<{
          name: string;
          durationHours: number;
        }>
      >`
        SELECT t.name, t."durationHours"
        FROM "Trip" t
        WHERE t.id = ${conversation.booking.tripId}
        LIMIT 1
      `;

      if (tripData && tripData.length > 0) {
        tripName = tripData[0].name;
        tripDurationHours = tripData[0].durationHours;
      }
    }
  }

  // Parse guests JSON
  let adults = 0;
  let children = 0;
  if (conversation.booking?.guests) {
    try {
      const guestsData =
        typeof conversation.booking.guests === "string"
          ? JSON.parse(conversation.booking.guests)
          : conversation.booking.guests;
      adults = guestsData?.adults || 0;
      children = guestsData?.children || 0;
    } catch (error) {
      console.error("Error parsing guests JSON:", error);
    }
  }

  return {
    id: conversation.id,
    anglerId: conversation.anglerId,
    charterId: conversation.charterId,
    ownerId: conversation.ownerId,
    status: conversation.status,
    captain: {
      name: captainName,
      email: captainEmail,
      phone: captainPhone,
      avatar: captainAvatar,
    },
    booking: conversation.booking
      ? {
          id: conversation.booking.id,
          status: conversation.booking.status,
          charterName,
          tripName,
          tripDurationHours,
          note: conversation.booking.note || undefined,
          date: conversation.booking.date.toISOString(),
          days: conversation.booking.days,
          adults,
          children,
          totalPrice: Number(conversation.booking.finalPrice),
          startTime: conversation.booking.startTime || undefined,
        }
      : null,
    messages: conversation.messages.map(
      (msg: (typeof conversation.messages)[number]) => ({
        id: msg.id,
        senderId: msg.senderId,
        senderType: msg.senderType,
        senderName: msg.senderName || "User",
        content: msg.content,
        contentType: msg.contentType,
        systemType: msg.systemType || undefined,
        status: (msg.status || "SENT") as "SENT" | "DELIVERED" | "READ",
        createdAt: msg.createdAt.toISOString(),
      })
    ),
  };
}
