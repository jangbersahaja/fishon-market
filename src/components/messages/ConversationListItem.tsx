"use client";

import { Badge } from "@/components/ui/badge";
import type { Conversation } from "@/lib/types/conversation";
import { formatDistanceToNow } from "date-fns";

interface ConversationListItemProps {
  conversation: Conversation;
  isSelected: boolean;
  onClick: () => void;
}

/**
 * Conversation List Item
 *
 * Individual conversation card showing:
 * - Captain/charter name (from context)
 * - Last message preview
 * - Timestamp
 * - Unread badge
 */
export function ConversationListItem({
  conversation,
  isSelected,
  onClick,
}: ConversationListItemProps) {
  const hasUnread = conversation.anglerUnreadCount > 0;

  // Format timestamp
  const timestamp = conversation.lastMessageAt
    ? formatDistanceToNow(new Date(conversation.lastMessageAt), {
        addSuffix: false,
      })
    : "No messages";

  return (
    <button
      onClick={onClick}
      className={`w-full rounded-lg p-3 text-left transition-colors ${
        isSelected ? "bg-blue-50" : "hover:bg-gray-50"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        {/* Left side: name and preview */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p
              className={`truncate font-medium ${
                hasUnread ? "text-gray-900" : "text-gray-700"
              }`}
            >
              Charter #{conversation.charterId.slice(0, 8)}
            </p>
            {hasUnread && (
              <Badge className="bg-blue-600 text-white text-xs">
                {conversation.anglerUnreadCount}
              </Badge>
            )}
          </div>

          {/* Last message preview */}
          <p
            className={`mt-1 truncate text-sm ${
              hasUnread ? "text-gray-700" : "text-gray-500"
            }`}
          >
            {conversation.lastMessagePreview || "No messages yet"}
          </p>
        </div>

        {/* Right side: timestamp */}
        <div className="flex-shrink-0">
          <p className="text-xs text-gray-500">{timestamp}</p>
        </div>
      </div>

      {/* Status indicator line */}
      <div
        className={`mt-2 h-0.5 w-full rounded ${
          isSelected ? "bg-blue-600" : "bg-transparent"
        }`}
      />
    </button>
  );
}
