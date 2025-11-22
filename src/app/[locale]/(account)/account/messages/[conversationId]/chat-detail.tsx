"use client";

import {
  ChatHeader,
  ChatInput,
  MessageList,
  QuickReplies,
  TypingIndicator,
} from "@/components/chat";
import { useConversation } from "@/hooks/useConversation";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { useCallback, useMemo } from "react";

interface ConversationData {
  id: string;
  anglerId: string;
  charterId: string;
  ownerId: string;
  status: string;
  captain: {
    name: string;
    email: string;
    phone: string;
    avatar: string | null;
  };
  booking: {
    id: string;
    status: string;
    charterName: string;
    tripName: string;
    tripDurationHours: number;
    note?: string;
    date: string;
    days: number;
    adults: number;
    children: number;
    totalPrice: number;
    startTime?: string;
  } | null;
  messages: Array<{
    id: string;
    senderId: string;
    senderType: string;
    senderName: string;
    content: string;
    contentType: string;
    systemType?: string;
    status: "SENT" | "DELIVERED" | "READ";
    createdAt: string;
  }>;
}

interface ChatDetailProps {
  conversation: ConversationData;
  userId: string;
}

/**
 * Chat Detail Client Component
 *
 * Handles client-side interactivity:
 * - Real-time messages via Pusher
 * - Message sending
 * - Typing indicators
 */
export function ChatDetail({ conversation, userId }: ChatDetailProps) {
  const locale = useLocale();
  const router = useRouter();

  const { messages, typingUsers, isConnected, sendMessage } = useConversation(
    conversation.id,
    userId,
    conversation.messages
  );

  const isLocked = useMemo(() => {
    // Check booking status to determine lock state
    if (!conversation.booking) return true;

    // LOCKED: Before payment (PENDING, APPROVED)
    if (
      conversation.booking.status === "PENDING" ||
      conversation.booking.status === "APPROVED"
    ) {
      return true;
    }

    // CLOSED: Conversation explicitly closed
    if (conversation.status === "CLOSED") {
      return true;
    }

    // ACTIVE: After payment (PAID, COMPLETED)
    return false;
  }, [conversation.booking, conversation.status]);

  const handleSend = useCallback(
    async (content: string) => {
      if (!content.trim()) return;
      await sendMessage(content);
    },
    [sendMessage]
  );

  const handleQuickReply = useCallback(
    async (reply: string) => {
      await sendMessage(reply, { isQuickReply: true });
    },
    [sendMessage]
  );

  // Angler quick replies
  const quickReplies = useMemo(
    () => [
      "Thank you! 😊",
      "Got it, thanks!",
      "Can you provide more details?",
      "I have a question about the meeting point",
      "Sounds good!",
    ],
    []
  );

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Fixed Header */}
      <div className="sticky top-0 z-10 flex-shrink-0 bg-white border-b shadow-sm">
        <ChatHeader
          otherUserName={conversation.captain.name}
          otherUserAvatar={conversation.captain.avatar}
          onBack={() => router.push(`/${locale}/account/messages`)}
          isOnline={isConnected}
          // Pass booking details for display
          booking={
            conversation.booking
              ? {
                  id: conversation.booking.id,
                  charterName: conversation.booking.charterName,
                  tripName: conversation.booking.tripName,
                  tripDurationHours: conversation.booking.tripDurationHours,
                  date: conversation.booking.date,
                  days: conversation.booking.days,
                  adults: conversation.booking.adults,
                  children: conversation.booking.children,
                  totalPrice: conversation.booking.totalPrice,
                  startTime: conversation.booking.startTime,
                  status: conversation.booking.status,
                }
              : undefined
          }
          captainContact={
            conversation.captain
              ? {
                  email: conversation.captain.email,
                  phone: conversation.captain.phone,
                }
              : undefined
          }
        />
      </div>

      {/* Scrollable Messages Area */}
      <div className="flex-1 overflow-y-auto">
        <MessageList
          messages={messages}
          typingUsers={typingUsers}
          currentUserId={userId}
          captainAvatar={conversation.captain.avatar}
        />
        {typingUsers.length > 0 && (
          <div className="px-4 py-2">
            <TypingIndicator senderName={conversation.captain.name} />
          </div>
        )}
      </div>

      {/* Fixed Footer */}
      <div className="sticky bottom-0 z-10 flex-shrink-0 bg-white border-t shadow-lg">
        {/* Quick replies */}
        {!isLocked && (
          <div className="px-4 py-3 border-b bg-gray-50">
            <QuickReplies
              replies={quickReplies}
              onReplyClick={handleQuickReply}
              isLoading={!isConnected}
            />
          </div>
        )}

        {/* Chat input */}
        <div className="px-4 py-4">
          <ChatInput
            onSendMessage={handleSend}
            isDisabled={!isConnected}
            isLocked={isLocked}
            placeholder={
              isLocked
                ? conversation.booking?.status === "PENDING" ||
                  conversation.booking?.status === "APPROVED"
                  ? "Chat unlocks after payment"
                  : "This conversation is closed"
                : "Type a message..."
            }
          />
        </div>
      </div>
    </div>
  );
}
