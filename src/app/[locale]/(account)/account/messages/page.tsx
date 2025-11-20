import { auth } from "@/lib/auth/auth";
import { getAnglerConversationsEnriched } from "@/lib/services/message-service";
import { redirect } from "next/navigation";
import { ConversationsClient } from "./conversations-client";

// Force dynamic rendering for real-time updates
export const dynamic = "force-dynamic";

/**
 * Messages Page (Server Component)
 *
 * Lists all conversations for the current user with enriched data
 * Fetches captain names, charter names, and trip details
 */
export default async function MessagesPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  // Fetch enriched conversations
  const conversations = await getAnglerConversationsEnriched(session.user.id);

  // Calculate total unread
  const totalUnread = conversations.reduce(
    (sum, conv) => sum + conv.anglerUnreadCount,
    0
  );

  // Serialize data for client component
  const serializedConversations = conversations.map((conv) => ({
    id: conv.id,
    bookingId: conv.bookingId,
    charterId: conv.charterId,
    anglerId: conv.anglerId,
    ownerId: conv.ownerId,
    status: conv.status,
    lastMessageAt: conv.lastMessageAt?.toISOString() ?? null,
    lastMessagePreview: conv.lastMessagePreview,
    lastMessageBy: conv.lastMessageBy,
    anglerUnreadCount: conv.anglerUnreadCount,
    captainUnreadCount: conv.captainUnreadCount,
    createdAt: conv.createdAt.toISOString(),
    // Enriched data
    captainName: conv.captainName,
    captainAvatar: conv.captainAvatar,
    charterName: conv.charterName,
    tripName: conv.tripName,
    displayName: conv.displayName,
    booking: conv.booking
      ? {
          id: conv.booking.id,
          status: conv.booking.status,
          date: conv.booking.date.toISOString(),
          days: conv.booking.days,
          adults: conv.booking.adults,
          children: conv.booking.children,
        }
      : null,
  }));

  return (
    <ConversationsClient
      conversations={serializedConversations}
      totalUnread={totalUnread}
      userId={session.user.id}
    />
  );
}
