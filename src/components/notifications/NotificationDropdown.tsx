"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNotifications } from "@/hooks/useNotifications";
import Link from "next/link";
import { NotificationItem } from "./NotificationItem";
import { NotificationSkeleton } from "./NotificationSkeleton";

interface NotificationDropdownProps {
  children: React.ReactNode;
}

export function NotificationDropdown({ children }: NotificationDropdownProps) {
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead } =
    useNotifications();

  // Show recent 5 notifications
  const recentNotifications = notifications.slice(0, 5);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-80 sm:w-96 max-h-[80vh] sm:max-h-96 overflow-y-auto"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b sticky top-0 bg-white z-10">
          <h3 className="font-semibold text-sm">Notifications</h3>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium min-h-[44px] min-w-[44px] flex items-center justify-center -mr-2"
              aria-label="Mark all notifications as read"
            >
              Mark all as read
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="divide-y">
            {[1, 2, 3].map((i) => (
              <NotificationSkeleton key={i} />
            ))}
          </div>
        ) : recentNotifications.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p className="text-sm">No notifications yet</p>
          </div>
        ) : (
          <>
            <div className="divide-y">
              {recentNotifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={markAsRead}
                />
              ))}
            </div>

            <div className="border-t px-4 py-3 sticky bottom-0 bg-white">
              <Link
                href="/account/notifications"
                className="text-sm text-blue-600 hover:text-blue-800 font-medium text-center min-h-[44px] flex items-center justify-center"
                aria-label="View all notifications"
              >
                View all notifications
              </Link>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
