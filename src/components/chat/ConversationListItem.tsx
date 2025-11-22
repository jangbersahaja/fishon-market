"use client";

import { useLocale } from "next-intl";
import Image from "next/image";
import Link from "next/link";

export interface ConversationListItemProps {
  conversationId: string;
  otherUserName: string;
  otherUserAvatar?: string | null;
  charterName: string;
  lastMessagePreview?: string | null;
  lastMessageTime?: string | null;
  unreadCount: number;
  bookingStatus?: string;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
}

/**
 * ConversationListItem Component
 *
 * Displays a single conversation in the conversations list
 * Shows charter info, last message preview, and unread badge
 */
export function ConversationListItem({
  conversationId,
  otherUserName,
  otherUserAvatar,
  charterName,
  lastMessagePreview,
  lastMessageTime,
  unreadCount,
  bookingStatus,
  isSelected = false,
  onSelect,
}: ConversationListItemProps) {
  const locale = useLocale();
  // Format time relative to now
  const formatTime = (dateString?: string | null) => {
    if (!dateString) return "";

    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const handleClick = () => {
    onSelect?.(conversationId);
  };

  return (
    <Link href={`/${locale}/account/messages/${conversationId}`}>
      <div
        onClick={handleClick}
        className={`px-4 py-3 border-b cursor-pointer transition-colors ${
          isSelected
            ? "bg-blue-50 border-l-4 border-l-blue-500"
            : "hover:bg-gray-50"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          {/* Avatar */}
          {otherUserAvatar ? (
            <Image
              src={otherUserAvatar}
              alt={`${otherUserName}'s avatar`}
              width={48}
              height={48}
              className="flex-shrink-0 rounded-full"
            />
          ) : (
            <div className="flex items-center justify-center flex-shrink-0 w-12 h-12 text-lg font-semibold text-gray-600 bg-gray-300 rounded-full">
              {otherUserName[0]?.toUpperCase()}
            </div>
          )}

          {/* Left: User and Charter Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-gray-900 truncate">
                {otherUserName}
              </h3>
              {bookingStatus && (
                <span
                  className={`text-xs px-2 py-0.5 rounded ${
                    bookingStatus === "PAID" || bookingStatus === "COMPLETED"
                      ? "bg-green-100 text-green-800"
                      : bookingStatus === "PENDING" ||
                          bookingStatus === "APPROVED"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {bookingStatus}
                </span>
              )}
              {unreadCount > 0 && (
                <span
                  className="text-xs font-semibold text-white px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: "#ec2227" }}
                >
                  {unreadCount}
                </span>
              )}
            </div>

            <p className="mb-1 text-xs text-gray-500 truncate">{charterName}</p>

            <p className="text-sm text-gray-600 truncate line-clamp-2">
              {lastMessagePreview || "No messages yet"}
            </p>
          </div>

          {/* Right: Time */}
          <div className="flex-shrink-0 text-xs text-gray-500">
            {formatTime(lastMessageTime)}
          </div>
        </div>
      </div>
    </Link>
  );
}
