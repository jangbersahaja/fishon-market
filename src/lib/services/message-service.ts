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
  // Get conversation and check status
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
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

  // Check if conversation is locked (user messages only - system can always send)
  if (senderType !== "system" && conversation.status === "LOCKED") {
    throw new Error("Chat is locked until payment is received");
  }

  // Check if conversation is closed
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
