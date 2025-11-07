'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { ConversationListItem } from '@/components/chat/ConversationListItem';
import { Button } from '@/components/ui/button';
import { MessageCircle } from 'lucide-react';

interface Conversation {
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
}

interface ConversationsResponse {
  conversations: Conversation[];
  nextCursor: string | null;
  hasMore: boolean;
  totalUnread: number;
}

/**
 * Messages Page
 *
 * Lists all conversations for the current user
 * Shows unread badges, last message preview, and timestamps
 */
export default function MessagesPage() {
  const { status } = useSession();
  const router = useRouter();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [totalUnread, setTotalUnread] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  // Fetch conversations on mount
  useEffect(() => {
    if (status === 'authenticated') {
      fetchConversations();
    }
  }, [status]);

  const fetchConversations = async (cursor?: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const url = new URL('/api/conversations', window.location.origin);
      url.searchParams.set('role', 'angler');
      url.searchParams.set('limit', '20');
      if (cursor) {
        url.searchParams.set('cursor', cursor);
      }

      const response = await fetch(url.toString());

      if (!response.ok) {
        throw new Error(`Failed to fetch conversations: ${response.statusText}`);
      }

      const data: ConversationsResponse = await response.json();

      if (cursor) {
        // Append to existing conversations for pagination
        setConversations((prev) => [...prev, ...data.conversations]);
      } else {
        // Replace for initial load
        setConversations(data.conversations);
      }

      setHasMore(data.hasMore);
      setTotalUnread(data.totalUnread);
    } catch (err) {
      console.error('Error fetching conversations:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to load conversations'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadMore = () => {
    if (conversations.length > 0 && hasMore) {
      const lastId = conversations[conversations.length - 1].id;
      fetchConversations(lastId);
    }
  };

  // Loading state
  if (status === 'loading' || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Loading conversations...</div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <div className="text-red-500">Error: {error}</div>
        <Button onClick={() => fetchConversations()}>Retry</Button>
      </div>
    );
  }

  // Empty state
  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <MessageCircle className="w-12 h-12 text-gray-300" />
        <h2 className="text-lg font-semibold text-gray-700">
          No messages yet
        </h2>
        <p className="text-gray-500 text-center max-w-sm">
          Start booking charters to begin chatting with captains
        </p>
        <Button onClick={() => router.push('/charters')}>
          Browse Charters
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <div className="border-b px-4 py-4 bg-gray-50">
        <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
        {totalUnread > 0 && (
          <p className="text-sm text-gray-600 mt-1">
            {totalUnread} unread message{totalUnread !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {conversations.map((conversation) => {
          // Get captain name (this would normally come from a related query)
          // For now, use a placeholder or fetch from booking
          const otherUserName = `Captain`; // TODO: Get actual captain name from booking
          const unreadCount = conversation.anglerUnreadCount;

          return (
            <ConversationListItem
              key={conversation.id}
              conversationId={conversation.id}
              otherUserName={otherUserName}
              charterName="Charter" // TODO: Get actual charter name
              lastMessagePreview={conversation.lastMessagePreview}
              lastMessageTime={conversation.lastMessageAt}
              unreadCount={unreadCount}
              isSelected={selectedId === conversation.id}
              onSelect={setSelectedId}
            />
          );
        })}

        {/* Load More Button */}
        {hasMore && (
          <div className="px-4 py-4 text-center border-t">
            <Button
              variant="outline"
              onClick={handleLoadMore}
              disabled={isLoading}
            >
              {isLoading ? 'Loading...' : 'Load More'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
