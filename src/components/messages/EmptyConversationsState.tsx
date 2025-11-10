"use client";

import { MessageSquare } from "lucide-react";

interface EmptyConversationsStateProps {
  hasConversations: boolean;
}

/**
 * Empty Conversations State
 *
 * Shown when:
 * - Desktop: No conversation selected from list
 * - Mobile: No conversations exist
 */
export function EmptyConversationsState({
  hasConversations,
}: EmptyConversationsStateProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-gray-50 p-6 text-center">
      <div className="rounded-full bg-gray-100 p-4">
        <MessageSquare className="h-12 w-12 text-gray-400" />
      </div>

      <h2 className="mt-4 text-xl font-semibold text-gray-900">
        {hasConversations ? "Select a conversation" : "No conversations yet"}
      </h2>

      <p className="mt-2 max-w-sm text-sm text-gray-600">
        {hasConversations
          ? "Choose a conversation from the list to start messaging with your captain"
          : "Your conversations with captains will appear here once you book a charter"}
      </p>
    </div>
  );
}
