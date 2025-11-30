/**
 * useUnreadMessages Hook
 *
 * Fetches and maintains the unread message count for the current user.
 * Optionally subscribes to real-time updates via Pusher.
 */

import { useSession } from "next-auth/react";
import Pusher from "pusher-js";
import { useCallback, useEffect, useRef, useState } from "react";

interface UseUnreadMessagesOptions {
  autoConnect?: boolean;
  pollInterval?: number; // In milliseconds, 0 to disable polling
}

export function useUnreadMessages(options: UseUnreadMessagesOptions = {}) {
  const { autoConnect = true, pollInterval = 0 } = options;
  const { data: session } = useSession();
  const userId = session?.user?.id;

  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  const pusherRef = useRef<Pusher | null>(null);
  const channelRef = useRef<any>(null);

  /**
   * Fetch unread count from API
   */
  const fetchUnreadCount = useCallback(async () => {
    if (!userId) return;

    try {
      const response = await fetch(
        "/api/conversations/unread-count?role=angler"
      );
      if (!response.ok) throw new Error("Failed to fetch unread count");

      const data = await response.json();
      setUnreadCount(data.count);
    } catch (err) {
      console.error("Failed to fetch message unread count:", err);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  /**
   * Connect to Pusher for real-time updates
   */
  const connectPusher = useCallback(() => {
    if (!userId || pusherRef.current) return;

    const pusherKey = process.env.NEXT_PUBLIC_PUSHER_KEY;
    const pusherCluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

    if (!pusherKey || !pusherCluster) {
      console.warn("Pusher not configured for messages");
      return;
    }

    try {
      pusherRef.current = new Pusher(pusherKey, {
        cluster: pusherCluster,
      });

      // Subscribe to user's message channel
      const channelName = `user-messages-${userId}`;
      channelRef.current = pusherRef.current.subscribe(channelName);

      // Listen for new message events
      channelRef.current.bind("message:new", () => {
        // Increment unread count on new message
        setUnreadCount((prev) => prev + 1);
      });

      // Listen for read events (when user reads messages)
      channelRef.current.bind("message:read", () => {
        // Refetch to get accurate count
        fetchUnreadCount();
      });

      // Listen for direct count updates
      channelRef.current.bind("unread:update", (data: { count: number }) => {
        setUnreadCount(data.count);
      });
    } catch (err) {
      console.error("Failed to connect to Pusher for messages:", err);
    }
  }, [userId, fetchUnreadCount]);

  /**
   * Disconnect from Pusher
   */
  const disconnectPusher = useCallback(() => {
    if (channelRef.current) {
      channelRef.current.unbind_all();
      channelRef.current.unsubscribe();
      channelRef.current = null;
    }

    if (pusherRef.current) {
      pusherRef.current.disconnect();
      pusherRef.current = null;
    }
  }, []);

  // Initial fetch and Pusher connection
  useEffect(() => {
    if (userId) {
      fetchUnreadCount();

      if (autoConnect) {
        connectPusher();
      }
    }

    return () => {
      disconnectPusher();
    };
  }, [userId, autoConnect, fetchUnreadCount, connectPusher, disconnectPusher]);

  // Polling (if enabled)
  useEffect(() => {
    if (!userId || pollInterval <= 0) return;

    const interval = setInterval(fetchUnreadCount, pollInterval);
    return () => clearInterval(interval);
  }, [userId, pollInterval, fetchUnreadCount]);

  // Refetch on visibility change
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible" && userId) {
        fetchUnreadCount();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [userId, fetchUnreadCount]);

  return {
    unreadCount,
    isLoading,
    refresh: fetchUnreadCount,
  };
}
