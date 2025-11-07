/**
 * Conversation Types
 *
 * Shared types for messaging system
 */

export enum ConversationStatus {
  LOCKED = "LOCKED", // Before payment
  ACTIVE = "ACTIVE", // After payment
  RESTRICTED = "RESTRICTED", // Trip in progress
  CLOSING_SOON = "CLOSING_SOON", // 24h grace period
  CLOSED = "CLOSED", // After grace period
  ARCHIVED = "ARCHIVED", // Manually archived
}

export enum MessageStatus {
  SENT = "SENT",
  DELIVERED = "DELIVERED",
  READ = "READ",
}

export interface Conversation {
  id: string;
  bookingId: string;
  charterId: string;
  ownerId: string;
  anglerId: string;
  status: ConversationStatus;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  lastMessageBy: string | null;
  anglerUnreadCount: number;
  captainUnreadCount: number;
  closedAt: string | null;
  closedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderType: "angler" | "captain" | "system";
  senderName: string;
  content: string;
  contentType: "text" | "system" | "booking_card";
  systemType: string | null;
  bookingSnapshot: Record<string, unknown> | null;
  isQuickReply: boolean;
  status: MessageStatus;
  deliveredAt: string | null;
  readAt: string | null;
  metadata: Record<string, unknown> | null;
  deletedAt: string | null;
  deletedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationListResponse {
  conversations: Conversation[];
  nextCursor: string | null;
  hasMore: boolean;
  totalUnread: number;
}

export interface MessagesResponse {
  messages: Message[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface SendMessagePayload {
  content: string;
  contentType?: "text" | "system" | "booking_card";
  isQuickReply?: boolean;
}
