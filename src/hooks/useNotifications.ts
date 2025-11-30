/**
 * useNotifications Hook
 *
 * Manages notification state and real-time updates via Pusher.
 * Provides notification list, unread count, and actions (mark read, fetch more, etc.)
 *
 * Usage:
 * ```tsx
 * const { notifications, unreadCount, markAsRead, markAllAsRead, fetchMore } = useNotifications();
 * ```
 */

import {
  isNotificationSoundEnabled,
  playNotificationSound,
} from "@/lib/notification-sound";
import { useSession } from "next-auth/react";
import Pusher from "pusher-js";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

// Global singleton to prevent duplicate toasts across multiple hook instances
const shownToastIds = new Set<string>();

export interface Notification {
  id: string;
  type: string;
  status: "UNREAD" | "READ" | "ARCHIVED";
  title: string;
  message: string;
  actionUrl?: string | null;
  actionLabel?: string | null;
  bookingId?: string | null;
  charterId?: string | null;
  reviewId?: string | null;
  metadata?: Record<string, any> | null;
  createdAt: string;
  readAt?: string | null;
}

interface UseNotificationsOptions {
  limit?: number;
  unreadOnly?: boolean;
  autoConnect?: boolean; // Auto-connect to Pusher on mount
  reconnectOnVisibility?: boolean; // Reconnect when tab becomes visible
}

export function useNotifications(options: UseNotificationsOptions = {}) {
  const {
    limit = 20,
    unreadOnly = false,
    autoConnect = true,
    reconnectOnVisibility = true,
  } = options;
  const { data: session } = useSession();
  const userId = session?.user?.id;

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const pusherRef = useRef<Pusher | null>(null);
  const channelRef = useRef<any>(null);

  /**
   * Fetch notifications from API
   */
  const fetchNotifications = useCallback(
    async (cursor?: string) => {
      if (!userId) return;

      try {
        setIsLoading(true);
        const params = new URLSearchParams({
          limit: limit.toString(),
          ...(unreadOnly && { unreadOnly: "true" }),
          ...(cursor && { cursor }),
        });

        const response = await fetch(`/api/notifications?${params}`);
        if (!response.ok) throw new Error("Failed to fetch notifications");

        const data = await response.json();

        if (cursor) {
          // Append to existing notifications (pagination)
          setNotifications((prev) => [...prev, ...data.notifications]);
        } else {
          // Replace notifications (initial load or refresh)
          setNotifications(data.notifications);
        }

        setHasMore(data.hasMore);
        setNextCursor(data.nextCursor);
        setError(null);
      } catch (err) {
        console.error("Failed to fetch notifications:", err);
        setError("Failed to load notifications");
      } finally {
        setIsLoading(false);
      }
    },
    [userId, limit, unreadOnly]
  );

  /**
   * Fetch unread count from API
   */
  const fetchUnreadCount = useCallback(async () => {
    if (!userId) return;

    try {
      const response = await fetch("/api/notifications/unread-count");
      if (!response.ok) throw new Error("Failed to fetch unread count");

      const data = await response.json();
      setUnreadCount(data.count);
    } catch (err) {
      console.error("Failed to fetch unread count:", err);
    }
  }, [userId]);

  /**
   * Mark a notification as read
   */
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: "PATCH",
      });
      if (!response.ok) throw new Error("Failed to mark as read");

      // Optimistically update local state
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId
            ? {
                ...n,
                status: "READ" as const,
                readAt: new Date().toISOString(),
              }
            : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  }, []);

  /**
   * Mark all notifications as read
   */
  const markAllAsRead = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications/read-all", {
        method: "PATCH",
      });
      if (!response.ok) throw new Error("Failed to mark all as read");

      // Update local state
      setNotifications((prev) =>
        prev.map((n) => ({
          ...n,
          status: "READ" as const,
          readAt: new Date().toISOString(),
        }))
      );
      setUnreadCount(0);
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  }, []);

  /**
   * Archive a notification
   */
  const archiveNotification = useCallback(async (notificationId: string) => {
    try {
      const response = await fetch(
        `/api/notifications/${notificationId}/archive`,
        { method: "POST" }
      );
      if (!response.ok) throw new Error("Failed to archive");

      // Remove from local state
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    } catch (err) {
      console.error("Failed to archive notification:", err);
    }
  }, []);

  /**
   * Fetch more notifications (pagination)
   */
  const fetchMore = useCallback(() => {
    if (nextCursor && !isLoading) {
      fetchNotifications(nextCursor);
    }
  }, [nextCursor, isLoading, fetchNotifications]);

  /**
   * Refresh notifications
   */
  const refresh = useCallback(() => {
    fetchNotifications();
    fetchUnreadCount();
  }, [fetchNotifications, fetchUnreadCount]);

  /**
   * Initialize Pusher connection and subscribe to user's private channel
   */
  useEffect(() => {
    if (!userId || !autoConnect) return;

    // Initialize Pusher
    if (!pusherRef.current) {
      pusherRef.current = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
        authEndpoint: "/api/pusher/auth",
      });

      // Log connection state changes
      pusherRef.current.connection.bind("state_change", (states: any) => {
        console.log(
          `[Pusher] Connection state: ${states.previous} -> ${states.current}`
        );
      });

      // Handle connection errors
      pusherRef.current.connection.bind("error", (err: any) => {
        console.error("[Pusher] Connection error:", err);
      });
    }

    // Subscribe to user's private channel
    const channelName = `private-user.${userId}`;
    if (!channelRef.current) {
      channelRef.current = pusherRef.current.subscribe(channelName);

      // Listen for new notifications
      channelRef.current.bind("notification", (data: Notification) => {
        console.log("[useNotifications] New notification received:", data);

        // Add to top of notifications list
        setNotifications((prev) => [data, ...prev]);

        // Show toast notification only once per notification (global singleton)
        if (!shownToastIds.has(data.id)) {
          shownToastIds.add(data.id);

          toast(data.title, {
            description: data.message,
            action: data.actionUrl
              ? {
                  label: data.actionLabel || "View",
                  onClick: () => {
                    window.location.href = data.actionUrl!;
                  },
                }
              : {
                  label: "Settings",
                  onClick: () => {
                    window.location.href = "/ms/account/notifications/settings";
                  },
                },
            duration: 5000,
          });

          // Play notification sound if enabled (only once)
          if (isNotificationSoundEnabled()) {
            playNotificationSound();
          }

          // Clean up old toast IDs after 10 seconds
          setTimeout(() => {
            shownToastIds.delete(data.id);
          }, 10000);
        }
      });

      // Listen for unread count updates
      channelRef.current.bind(
        "notification-count",
        (data: { count: number }) => {
          console.log("[useNotifications] Unread count update:", data.count);
          setUnreadCount(data.count);
        }
      );
    }

    // Handle page visibility change (reconnect when tab becomes visible)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && reconnectOnVisibility) {
        console.log("[Pusher] Tab visible, refreshing data...");
        fetchNotifications();
        fetchUnreadCount();
      }
    };

    if (reconnectOnVisibility) {
      document.addEventListener("visibilitychange", handleVisibilityChange);
    }

    // Cleanup on unmount
    return () => {
      if (channelRef.current) {
        channelRef.current.unbind_all();
        pusherRef.current?.unsubscribe(channelName);
        channelRef.current = null;
      }

      if (reconnectOnVisibility) {
        document.removeEventListener(
          "visibilitychange",
          handleVisibilityChange
        );
      }
    };
  }, [
    userId,
    autoConnect,
    reconnectOnVisibility,
    fetchNotifications,
    fetchUnreadCount,
  ]);

  /**
   * Initial data fetch
   */
  useEffect(() => {
    if (userId) {
      fetchNotifications();
      fetchUnreadCount();
    }
  }, [userId, fetchNotifications, fetchUnreadCount]);

  return {
    // State
    notifications,
    unreadCount,
    isLoading,
    error,
    hasMore,

    // Actions
    markAsRead,
    markAllAsRead,
    archiveNotification,
    fetchMore,
    refresh,
  };
}
