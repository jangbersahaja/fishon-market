"use client";

import type { Conversation } from "@/lib/types/conversation";
import { MessageSquare } from "lucide-react";
import { ConversationListItem } from "./ConversationListItem";

interface ConversationListSidebarProps {
  conversations: Conversation[];
  selectedConversationId: string | null;
  loading: boolean;
  error: string | null;
  onSelectConversation: (id: string) => void;
}

/**
 * Conversation List Sidebar
 *
 * Shows all conversations for the user
 * - Lists conversations sorted by last message
 * - Shows unread count badge
 * - Highlights selected conversation
 * - Loading and error states
 */
export function ConversationListSidebar({
  conversations,
  selectedConversationId,
  loading,
  error,
  onSelectConversation,
}: ConversationListSidebarProps) {
  return (
    <div className="flex flex-col flex-1">
      {/* Header */}
      <div className="px-4 py-4 border-b border-gray-200">
        <h1 className="flex items-center gap-2 text-xl font-semibold text-gray-900">
          <MessageSquare className="w-5 h-5" />
          Messages
        </h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {error ? (
          // Error state
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-red-600">Failed to load conversations</p>
            <p className="mt-1 text-xs text-gray-500">{error}</p>
          </div>
        ) : loading ? (
          // Loading state
          <div className="px-2 py-4 space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-3 bg-gray-100 rounded-lg animate-pulse">
                <div className="w-24 h-4 mb-2 bg-gray-300 rounded" />
                <div className="w-32 h-3 bg-gray-300 rounded" />
              </div>
            ))}
          </div>
        ) : conversations.length === 0 ? (
          // Empty state
          <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
            <MessageSquare className="w-12 h-12 mb-3 text-gray-300" />
            <h3 className="font-medium text-gray-900">No conversations yet</h3>
            <p className="mt-1 text-sm text-gray-500">
              Your messages will appear here after booking a charter
            </p>
          </div>
        ) : (
          // Conversations list
          <div className="px-2 py-2 space-y-1">
            {conversations.map((conversation) => (
              <ConversationListItem
                key={conversation.id}
                conversation={conversation}
                isSelected={conversation.id === selectedConversationId}
                onClick={() => onSelectConversation(conversation.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
