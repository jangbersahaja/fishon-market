import { subscribeToConversation } from "@/lib/pusher/client";
import { useCallback, useEffect, useRef, useState } from "react";

export interface Message {
  id: string;
  senderId: string;
  senderType: string;
  senderName: string;
  content: string;
  contentType: string;
  systemType?: string | null;
  createdAt: string;
  status: "SENT" | "DELIVERED" | "READ";
  readAt?: string | null;
}

export interface Conversation {
  id: string;
  bookingId: string;
  anglerId: string;
  ownerId: string;
  charterId: string;
  status: string;
  lastMessageAt?: string | null;
  lastMessagePreview?: string | null;
  anglerUnreadCount: number;
  captainUnreadCount: number;
  createdAt: string;
}

/**
 * useConversation Hook
 *
 * Manages real-time conversation data with Pusher subscriptions.
 * Handles message sync, read receipts, and typing indicators.
 *
 * @param conversationId - ID of the conversation to manage
 * @param userId - Current user ID (for permission checks)
 * @param initialMessages - Initial messages from Server Component (optional)
 * @returns Object with messages, conversation data, and control functions
 */
export function useConversation(
  conversationId: string,
  userId: string,
  initialMessages?: Message[]
) {
  // Message state - initialize with server data if provided
  const [messages, setMessages] = useState<Message[]>(initialMessages || []);
  const [isLoadingMessages, setIsLoadingMessages] = useState(!initialMessages);
  const [messagesError, setMessagesError] = useState<string | null>(null);

  // Conversation state - no longer needed since data comes from Server Component
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [isLoadingConversation, setIsLoadingConversation] = useState(false);

  // Real-time state
  const [typingUsers, setTypingUsers] = useState<Map<string, boolean>>(
    new Map()
  );
  const [isConnected, setIsConnected] = useState(true);

  // Refs for managing subscriptions
  const subscriptionRef = useRef<{ unsubscribe: () => void } | null>(null);
  const typingTimeoutRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // ============================================================================
  // FETCH INITIAL DATA
  // ============================================================================

  /**
   * Fetch initial messages for the conversation
   */
  const fetchMessages = useCallback(async () => {
    try {
      setIsLoadingMessages(true);
      setMessagesError(null);

      const response = await fetch(
        `/api/conversations/${conversationId}/messages?limit=50`
      );

      // Handle 404 - conversation doesn't exist yet
      if (response.status === 404) {
        setMessages([]);
        setMessagesError(
          "Conversation not found. Please check if you have access to this conversation."
        );
        return;
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch messages: ${response.statusText}`);
      }

      const data = await response.json();
      setMessages(data.messages || []);
    } catch (error) {
      console.error("[useConversation] Error fetching messages:", error);
      setMessagesError(
        error instanceof Error ? error.message : "Failed to load messages"
      );
    } finally {
      setIsLoadingMessages(false);
    }
  }, [conversationId]);

  /**
   * Fetch conversation details
   */
  const fetchConversation = useCallback(async () => {
    try {
      setIsLoadingConversation(true);

      const response = await fetch(`/api/conversations/${conversationId}`);

      // Handle 404 - conversation doesn't exist yet
      if (response.status === 404) {
        console.warn(
          "[useConversation] Conversation not found:",
          conversationId
        );
        setConversation(null);
        return;
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch conversation: ${response.statusText}`);
      }

      const data = await response.json();
      setConversation(data);
    } catch (error) {
      console.error("[useConversation] Error fetching conversation:", error);
      setConversation(null);
    } finally {
      setIsLoadingConversation(false);
    }
  }, [conversationId]);

  // ============================================================================
  // SEND MESSAGE
  // ============================================================================

  /**
   * Send a message in the conversation
   */
  const sendMessage = useCallback(
    async (
      content: string,
      options?: {
        isQuickReply?: boolean;
      }
    ) => {
      try {
        const response = await fetch(
          `/api/conversations/${conversationId}/messages`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              content,
              contentType: "text",
              isQuickReply: options?.isQuickReply || false,
            }),
          }
        );

        // Handle 404 - conversation doesn't exist
        if (response.status === 404) {
          throw new Error(
            "This conversation is not available. Please check if you have an active booking."
          );
        }

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.error || `Failed to send message: ${response.statusText}`
          );
        }

        const message = await response.json();

        // Optimistically add message to local state
        // (Real-time update will be handled by Pusher)
        return message;
      } catch (error) {
        console.error("[useConversation] Error sending message:", error);
        throw error;
      }
    },
    [conversationId]
  );

  // ============================================================================
  // MARK AS READ
  // ============================================================================

  /**
   * Mark all messages in conversation as read
   */
  const markAsRead = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/conversations/${conversationId}/read`,
        {
          method: "PATCH",
        }
      );

      // Handle 404 - conversation doesn't exist yet (non-critical)
      if (response.status === 404) {
        console.warn(
          "[useConversation] Cannot mark as read - conversation not found"
        );
        return;
      }

      if (!response.ok) {
        throw new Error(`Failed to mark as read: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("[useConversation] Error marking as read:", error);
      // Don't throw - this is non-critical
    }
  }, [conversationId]);

  // ============================================================================
  // TYPING INDICATOR
  // ============================================================================

  /**
   * Send typing indicator
   */
  const sendTypingIndicator = useCallback(
    async (isTyping: boolean) => {
      try {
        await fetch(`/api/conversations/${conversationId}/typing`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isTyping }),
        });
      } catch (error) {
        console.error(
          "[useConversation] Error sending typing indicator:",
          error
        );
        // Non-critical, don't throw
      }
    },
    [conversationId]
  );

  // ============================================================================
  // REAL-TIME EVENTS
  // ============================================================================

  /**
   * Handle incoming message
   */
  const handleMessageNew = useCallback((message: Message) => {
    console.log("[useConversation] New message received:", message.id);
    setMessages((prev) => [...prev, message]);
  }, []);

  /**
   * Handle read receipt
   */
  const handleMessageRead = useCallback(
    (data: { userId: string; readAt: string }) => {
      console.log("[useConversation] Read receipt from:", data.userId);
      // Update message statuses for this user
      setMessages((prev) =>
        prev.map((msg) =>
          msg.senderId !== data.userId
            ? msg
            : { ...msg, status: "READ", readAt: data.readAt }
        )
      );
    },
    []
  );

  /**
   * Handle typing indicator
   */
  const handleTyping = useCallback(
    (data: { userId: string; isTyping: boolean }) => {
      // Don't show typing for current user
      if (data.userId === userId) {
        return;
      }

      console.log(
        `[useConversation] Typing indicator from ${data.userId}: ${data.isTyping}`
      );

      // Clear existing timeout for this user
      const existingTimeout = typingTimeoutRef.current.get(data.userId);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      if (data.isTyping) {
        // User started typing
        setTypingUsers((prev) => new Map(prev).set(data.userId, true));

        // Auto-clear typing indicator after 3 seconds of no update
        const timeout = setTimeout(() => {
          setTypingUsers((prev) => {
            const next = new Map(prev);
            next.delete(data.userId);
            return next;
          });
          typingTimeoutRef.current.delete(data.userId);
        }, 3000);

        typingTimeoutRef.current.set(data.userId, timeout);
      } else {
        // User stopped typing
        setTypingUsers((prev) => {
          const next = new Map(prev);
          next.delete(data.userId);
          return next;
        });
        typingTimeoutRef.current.delete(data.userId);
      }
    },
    [userId]
  );

  // ============================================================================
  // EFFECTS
  // ============================================================================

  /**
   * Initialize: fetch data and subscribe to real-time events
   */
  useEffect(() => {
    // Fetch initial data only if not provided
    if (!initialMessages) {
      fetchMessages();
    }
    // No longer need to fetch conversation - comes from Server Component
    markAsRead();

    // Subscribe to real-time events
    subscriptionRef.current = subscribeToConversation(conversationId, {
      onMessageNew: handleMessageNew,
      onMessageRead: handleMessageRead,
      onTyping: handleTyping,
      onError: (error) => {
        console.error("[useConversation] Subscription error:", error);
        setIsConnected(false);
      },
    });

    // Store ref values for cleanup
    const currentSubscription = subscriptionRef.current;
    const currentTypingTimeouts = typingTimeoutRef.current;

    return () => {
      // Cleanup subscriptions
      currentSubscription?.unsubscribe();

      // Clear typing timeouts
      currentTypingTimeouts.forEach((timeout) => clearTimeout(timeout));
      currentTypingTimeouts.clear();
    };
  }, [
    conversationId,
    fetchMessages,
    markAsRead,
    handleMessageNew,
    handleMessageRead,
    handleTyping,
    initialMessages,
  ]);

  // ============================================================================
  // RETURN
  // ============================================================================

  return {
    // Message data
    messages,
    isLoadingMessages,
    messagesError,

    // Conversation data (deprecated - use Server Component data instead)
    conversation,
    isLoadingConversation,

    // Real-time state
    typingUsers: Array.from(typingUsers.keys()),
    isConnected,

    // Actions
    sendMessage,
    markAsRead,
    sendTypingIndicator,

    // Refresh functions (now only refreshes messages)
    refetch: () => {
      if (!initialMessages) {
        fetchMessages();
      }
    },
  };
}
