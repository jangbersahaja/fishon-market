"use client";

import { Button } from "@/components/ui/button";
import type { Conversation } from "@/lib/types/conversation";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface ChatInterfaceProps {
  conversationId: string;
}

/**
 * Chat Interface
 *
 * Route: /account/messages/[conversationId]
 *
 * Complete chat interface showing:
 * - Chat header with booking details
 * - Message history
 * - Message input
 * - Quick replies
 */
export function ChatInterface({ conversationId }: ChatInterfaceProps) {
  const router = useRouter();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchConversation = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/conversations/${conversationId}`);

        if (!response.ok) {
          throw new Error("Failed to fetch conversation");
        }

        const data = await response.json();
        setConversation(data);
      } catch (error) {
        console.error("Failed to fetch conversation:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchConversation();
  }, [conversationId]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600 mx-auto" />
          <p className="text-gray-600">Loading chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/account/messages")}
              className="md:hidden"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h2 className="font-semibold text-gray-900">Chat</h2>
              <p className="text-xs text-gray-500">
                {conversation
                  ? `Booking #${conversation.bookingId.slice(0, 8)}`
                  : ""}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Messages - Placeholder */}
      <div className="flex-1 overflow-y-auto bg-gray-50 p-4">
        <div className="text-center text-gray-500 mt-8">
          <p>💬 Messages will appear here</p>
          <p className="text-sm mt-2">Implementation in progress...</p>
        </div>
      </div>

      {/* Input area - Placeholder */}
      <div className="border-t border-gray-200 bg-white p-4">
        <div className="rounded-lg bg-gray-100 px-4 py-3 text-gray-500">
          <p className="text-sm">Message input coming soon...</p>
        </div>
      </div>
    </div>
  );
}
