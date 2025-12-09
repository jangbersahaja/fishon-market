import { auth } from "@/lib/auth/auth";
import { getConversationEnriched } from "@/lib/services/message-service";
import { getLocale, setRequestLocale } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { ChatDetail } from "./chat-detail";

// Note: With cacheComponents, dynamic rendering is automatic when using auth()

type PageProps = {
  params: Promise<{ conversationId: string; locale: string }>;
};

/**
 * Conversation Detail Page (Server Component)
 *
 * Fetches enriched conversation data with captain info and booking details
 * Passes data to client component for rendering
 *
 * Note: This page breaks out of the account layout to provide fullscreen chat experience
 */
export default async function ConversationDetailPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();

  if (!session?.user?.id) {
    const locale = await getLocale();
    redirect(`/${locale}/login`);
  }

  const { conversationId } = await params;

  // Fetch enriched conversation
  const conversation = await getConversationEnriched(
    conversationId,
    session.user.id
  );

  if (!conversation) {
    notFound();
  }

  return (
    <div className="fixed inset-0 bg-white z-50">
      <ChatDetail conversation={conversation} userId={session.user.id} />
    </div>
  );
}
