"use client";

import { ConversationListItem } from "@/components/chat/ConversationListItem";
import { Button } from "@/components/ui/button";
import { getPusherClient } from "@/lib/pusher/client";
import { MessageCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface ConversationData {
  id: string;
  bookingId: string;
  charterId: string;
  anglerId: string;
  ownerId: string;
  status: string;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  lastMessageBy: string | null;
  anglerUnreadCount: number;
  captainUnreadCount: number;
  createdAt: string;
  // Enriched data
  captainName: string;
  captainAvatar: string | null;
  charterName: string;
  tripName: string;
  displayName: string;
  booking: {
    id: string;
    status: string;
    date: string;
    days: number;
    adults: number;
    children: number;
  } | null;
}

interface ConversationsClientProps {
  conversations: ConversationData[];
  totalUnread: number;
  userId: string;
}

/**
 * Conversations Client Component
 *
 * Handles client-side interactivity:
 * - Real-time updates via Pusher
 * - Conversation selection
 * - Local state management
 */
export function ConversationsClient({
  conversations: initialConversations,
  totalUnread: initialTotalUnread,
  userId,
}: ConversationsClientProps) {
  const router = useRouter();
  const t = useTranslations("account.messages");
  const [conversations, setConversations] =
    useState<ConversationData[]>(initialConversations);
  const [totalUnread, setTotalUnread] = useState(initialTotalUnread);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Subscribe to real-time conversation updates
  useEffect(() => {
    const pusher = getPusherClient();

    if (!pusher) {
      console.warn("Pusher client not available");
      return;
    }

    // Subscribe to user's private channel for conversation updates
    const channelName = `private-user.${userId}`;
    const channel = pusher.subscribe(channelName);

    // Wait for subscription to succeed before binding events
    channel.bind("pusher:subscription_succeeded", () => {
      console.log("[Pusher] Successfully subscribed to", channelName);
    });

    channel.bind("pusher:subscription_error", (error: any) => {
      console.error("[Pusher] Subscription error:", error);
    });

    // Handle conversation.updated event (new message, unread count change)
    channel.bind("conversation.updated", (data: any) => {
      setConversations((prev) => {
        const updated = prev.map((conv) => {
          if (conv.id === data.conversationId) {
            return {
              ...conv,
              lastMessageAt: data.lastMessageAt,
              lastMessagePreview: data.lastMessagePreview,
              anglerUnreadCount:
                data.anglerUnreadCount ?? conv.anglerUnreadCount,
            };
          }
          return conv;
        });

        // Sort by lastMessageAt (most recent first)
        return updated.sort((a, b) => {
          const aTime = a.lastMessageAt
            ? new Date(a.lastMessageAt).getTime()
            : 0;
          const bTime = b.lastMessageAt
            ? new Date(b.lastMessageAt).getTime()
            : 0;
          return bTime - aTime;
        });
      });

      // Recalculate total unread
      setTotalUnread((prev) => {
        if (data.anglerUnreadCount !== undefined) {
          const oldConv = conversations.find(
            (c) => c.id === data.conversationId
          );
          const oldUnread = oldConv?.anglerUnreadCount ?? 0;
          return prev - oldUnread + data.anglerUnreadCount;
        }
        return prev;
      });
    });

    return () => {
      channel.unbind_all();
      channel.unsubscribe();
    };
  }, [userId, conversations]);

  // Empty state
  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <MessageCircle className="w-12 h-12 text-gray-300" />
        <h2 className="text-lg font-semibold text-gray-700">
          {t("noMessages")}
        </h2>
        <p className="max-w-sm text-center text-gray-500">
          {t("noMessagesDescription")}
        </p>
        <Button onClick={() => router.push("/search")}>
          {t("browseCharters")}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <div className="px-4 py-4 border-b bg-gray-50">
        <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
        {totalUnread > 0 && (
          <p className="mt-1 text-sm text-gray-600">
            {totalUnread === 1
              ? t("unreadMessage")
              : t("unreadMessages", { count: totalUnread })}
          </p>
        )}
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {conversations.map((conversation) => {
          return (
            <ConversationListItem
              key={conversation.id}
              conversationId={conversation.id}
              otherUserName={conversation.captainName}
              otherUserAvatar={conversation.captainAvatar}
              charterName={conversation.displayName} // e.g., "Full-Day Trip · Port Dickson Charter"
              lastMessagePreview={conversation.lastMessagePreview}
              lastMessageTime={conversation.lastMessageAt}
              unreadCount={conversation.anglerUnreadCount}
              bookingStatus={conversation.booking?.status}
              isSelected={selectedId === conversation.id}
              onSelect={setSelectedId}
            />
          );
        })}
      </div>
    </div>
  );
}
