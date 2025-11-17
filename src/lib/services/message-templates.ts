/**
 * Message Templates
 *
 * Pre-defined system messages for booking lifecycle events.
 * Sent automatically by the system when booking status changes.
 */

export interface MessageTemplate {
  content: string;
  systemType: string;
}

export interface BookingCardData {
  bookingId: string;
  charterName: string;
  tripName: string;
  tripDate: string;
  tripDays: number;
  adults: number;
  children: number;
  startTime?: string;
  totalPrice: string;
  meetingPoint?: string;
}

/**
 * Message sent when angler creates a booking request
 * Includes booking details card
 */
export const bookingCreatedMessage = (
  booking: BookingCardData
): MessageTemplate & { bookingSnapshot?: BookingCardData } => ({
  content: `📦 Booking Request\n\n${booking.charterName}\n📅 ${booking.tripDate} (${booking.tripDays} day${booking.tripDays > 1 ? "s" : ""})\n👥 ${booking.adults} adult${booking.adults > 1 ? "s" : ""}${booking.children > 0 ? `, ${booking.children} child${booking.children > 1 ? "ren" : ""}` : ""}\n💰 ${booking.totalPrice}\n\nWaiting for captain's approval...`,
  systemType: "booking_created",
  bookingSnapshot: booking,
});

/**
 * Message sent when captain approves booking
 */
export const bookingApprovedMessage = (): MessageTemplate => ({
  content: `✅ Booking Approved!\nYour booking has been approved by the captain.\nPlease complete payment to confirm your trip.`,
  systemType: "booking_approved",
});

/**
 * Message sent when captain rejects booking with reason
 */
export const bookingRejectedMessage = (reason?: string): MessageTemplate => ({
  content: `❌ Booking Rejected\n${reason ? `Reason: ${reason}` : "The captain is unable to accommodate your request at this time."}`,
  systemType: "booking_rejected",
});

/**
 * Message sent when payment is received
 */
export const paymentConfirmedMessage = (
  booking: BookingCardData
): MessageTemplate => ({
  content: `💳 Payment Confirmed\nYour payment has been received! Your trip is now confirmed.\n\n📅 Trip: ${booking.charterName}\n📍 Date: ${booking.tripDate}\n🚩 Meeting Point: ${booking.meetingPoint || "TBD"}\n\nYou can now chat with the captain for any questions or coordination.`,
  systemType: "payment_confirmed",
});

/**
 * Message sent when booking is cancelled
 */
export const bookingCancelledMessage = (
  cancelledBy?: "angler" | "captain",
  reason?: string
): MessageTemplate => ({
  content: `❌ Booking ${cancelledBy === "angler" ? "Cancelled" : "Cancelled"}\n${reason ? `Reason: ${reason}` : "The booking has been cancelled."}`,
  systemType: "booking_cancelled",
});

/**
 * Message sent when booking expires (no response from captain)
 */
export const bookingExpiredMessage = (): MessageTemplate => ({
  content: `⏰ Booking Expired\nThe captain did not respond within the hold period. Your booking request has expired.`,
  systemType: "booking_expired",
});

/**
 * Message sent when payment is received (AUTO flow)
 * Payment already captured, awaiting captain acknowledgment
 */
export const paymentReceivedMessage = (): MessageTemplate => ({
  content: `💳 Payment Received!\nYour booking is confirmed. Payment has been received and the captain will acknowledge your booking shortly. You can now chat with the captain to discuss trip details.`,
  systemType: "payment_received_auto",
});

/**
 * Message sent when trip completes - review prompt
 */
export const tripCompletedMessage = (charterName: string): MessageTemplate => ({
  content: `✨ Trip Completed\nThank you for booking with us! We'd love to hear about your experience.\n\nPlease take a moment to leave a review for ${charterName}.`,
  systemType: "trip_completed",
});

/**
 * Message sent when conversation is closing (24h after trip)
 */
export const conversationClosingMessage = (): MessageTemplate => ({
  content: `⏳ Chat Closing Soon\nThis conversation will close 24 hours after your trip ends. Feel free to reach out to the captain if you have any final questions.`,
  systemType: "conversation_closing",
});

/**
 * Message sent when conversation is fully closed
 */
export const conversationClosedMessage = (): MessageTemplate => ({
  content: `🔒 Conversation Closed\nThis conversation has been closed after your trip completed. You can still view the message history. To contact the captain, visit their charter listing.`,
  systemType: "conversation_closed",
});

/**
 * Message sent after review is submitted
 */
export const reviewThanksMessage = (): MessageTemplate => ({
  content: `⭐ Thank You for Your Review!\nYour review helps other anglers make great choices. We appreciate your feedback!`,
  systemType: "review_submitted",
});
