'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import {
  ChatHeader,
  MessageList,
  ChatInput,
  BookingDetailsCard,
} from '@/components/chat';
import { useConversation } from '@/hooks/useConversation';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

interface BookingDetails {
  id: string;
  charterName: string;
  charterDate: string;
  guestCount: number;
  totalPrice: number;
  captainName: string;
  captainPhone: string;
  captainEmail: string;
}

/**
 * Chat Detail Page
 *
 * Displays the full conversation interface with:
 * - Message history and real-time updates
 * - Chat input with typing indicators
 * - Booking details card
 * - Header with captain info
 */
export default function ChatDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const conversationId = params.id as string;

  const [bookingDetails, setBookingDetails] = useState<BookingDetails | null>(
    null
  );
  const [isLoadingBooking, setIsLoadingBooking] = useState(true);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [showBookingDetails, setShowBookingDetails] = useState(false);

  const {
    messages,
    conversation,
    typingUsers,
    isConnected,
    isLoadingMessages,
    isLoadingConversation,
    messagesError,
    sendMessage,
    sendTypingIndicator,
  } = useConversation(conversationId, session?.user?.id || '');

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  // Fetch booking details
  useEffect(() => {
    if (conversation?.bookingId) {
      fetchBookingDetails(conversation.bookingId);
    }
  }, [conversation?.bookingId]);

  const fetchBookingDetails = async (bookingId: string) => {
    try {
      setIsLoadingBooking(true);
      setBookingError(null);

      const response = await fetch(`/api/bookings/${bookingId}`);

      if (!response.ok) {
        throw new Error('Failed to fetch booking details');
      }

      const data: BookingDetails = await response.json();
      setBookingDetails(data);
    } catch (err) {
      console.error('Error fetching booking details:', err);
      setBookingError(
        err instanceof Error ? err.message : 'Failed to load booking details'
      );
    } finally {
      setIsLoadingBooking(false);
    }
  };

  const handleSendMessage = async (content: string) => {
    try {
      await sendMessage(content);
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  const handleTyping = (isTyping: boolean) => {
    sendTypingIndicator(isTyping).catch((err) => {
      console.error('Error sending typing indicator:', err);
    });
  };

  // Loading state
  if (status === 'loading' || isLoadingConversation) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500">Loading conversation...</div>
      </div>
    );
  }

  // Error state - no conversation found
  if (messagesError && messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <AlertCircle className="w-12 h-12 text-red-500" />
        <h2 className="text-lg font-semibold text-gray-900">
          Conversation Not Found
        </h2>
        <p className="text-gray-600">This conversation may have been deleted.</p>
        <Button onClick={() => router.push('/account/messages')}>
          Back to Messages
        </Button>
      </div>
    );
  }

  // Main layout - responsive design
  return (
    <div className="flex h-screen bg-white overflow-hidden">
      {/* Left Sidebar - Booking Details */}
      {showBookingDetails && (
        <div className="w-80 border-r border-gray-200 p-4 overflow-y-auto hidden lg:block">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Booking Details</h3>
            <button
              onClick={() => setShowBookingDetails(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          {isLoadingBooking ? (
            <div className="text-sm text-gray-500">Loading booking...</div>
          ) : bookingError ? (
            <div className="text-sm text-red-500">Error: {bookingError}</div>
          ) : bookingDetails ? (
            <BookingDetailsCard
              booking={{
                charterName: bookingDetails.charterName,
                date: bookingDetails.charterDate,
                guests: bookingDetails.guestCount,
                id: bookingDetails.id,
                days: 1,
                totalPrice: bookingDetails.totalPrice,
              }}
              captainContact={{
                name: bookingDetails.captainName,
                phone: bookingDetails.captainPhone,
                email: bookingDetails.captainEmail,
              }}
              isExpanded={true}
              onToggle={() => {}}
            />
          ) : null}
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <ChatHeader
          otherUserName={bookingDetails?.captainName || 'Captain'}
          isOnline={isConnected}
          onBack={() => router.push('/account/messages')}
        />

        {/* Messages */}
        <MessageList
          messages={messages}
          typingUsers={typingUsers}
          currentUserId={conversation?.anglerId || ''}
          isLoading={isLoadingMessages}
        />

        {/* Input */}
        <ChatInput
          onSendMessage={handleSendMessage}
          onTyping={handleTyping}
          isDisabled={isLoadingMessages || !!messagesError}
          isLocked={conversation?.status !== 'active'}
          placeholder={
            conversation?.status === 'active'
              ? 'Type a message...'
              : 'Chat locked until payment confirmed'
          }
        />
      </div>

      {/* Mobile Booking Details Toggle */}
      {bookingDetails && (
        <button
          onClick={() => setShowBookingDetails(!showBookingDetails)}
          className="absolute top-20 right-4 lg:hidden p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700"
        >
          ℹ️
        </button>
      )}
    </div>
  );
}
