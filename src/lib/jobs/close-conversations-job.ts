import { prisma } from "@/lib/database/prisma";
import { closeConversation, sendMessage } from "@/lib/services/message-service";
import { conversationClosedMessage } from "@/lib/services/message-templates";

/**
 * Closes conversations 24 hours after trip completion.
 * Trip end is calculated as: booking.date + booking.days
 * Closure happens when: tripEnd + 24h < now
 *
 * @returns Statistics about the operation
 */
export async function closeExpiredConversations() {
  const results = {
    processed: 0,
    closed: 0,
    errors: 0,
    errorDetails: [] as { conversationId: string; error: string }[],
  };

  try {
    console.log("close_conversations_job_start");

    // Find all ACTIVE conversations where trip ended > 24 hours ago
    // Trip end date = booking.date + booking.days
    const conversationsToClose = await prisma.conversation.findMany({
      where: {
        status: "ACTIVE",
        booking: {
          // Only close conversations for paid bookings with trips that ended
          status: "PAID",
        },
      },
      include: {
        booking: {
          select: {
            id: true,
            date: true,
            days: true,
            charterId: true,
          },
        },
      },
    });

    console.log(
      `close_conversations_query_result: found ${conversationsToClose.length} ACTIVE conversations for PAID bookings`
    );

    // Filter to only those where trip ended > 24 hours ago
    const eligibleForClosure = conversationsToClose.filter((conv) => {
      const tripEndDate = new Date(conv.booking.date);
      tripEndDate.setDate(tripEndDate.getDate() + conv.booking.days);

      const tripEndPlus24h = new Date(
        tripEndDate.getTime() + 24 * 60 * 60 * 1000
      );

      return tripEndPlus24h < new Date();
    });

    console.log(
      `close_conversations_eligible: ${eligibleForClosure.length} conversations eligible for closure`
    );

    // Close each conversation
    for (const conversation of eligibleForClosure) {
      results.processed++;

      try {
        // Close the conversation
        const closed = await closeConversation(conversation.id);

        if (!closed) {
          throw new Error("Failed to close conversation");
        }

        // Send closure system message
        const closureMessage = conversationClosedMessage();
        await sendMessage(
          conversation.id,
          "system",
          closureMessage.content,
          "system",
          {
            contentType: "system",
            systemType: closureMessage.systemType,
          }
        );

        results.closed++;

        console.log(
          `conversation_closed: ${conversation.id} for booking ${conversation.booking.id} (charter: ${conversation.booking.charterId})`
        );
      } catch (error) {
        results.errors++;
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";

        results.errorDetails.push({
          conversationId: conversation.id,
          error: errorMessage,
        });

        console.error(
          `close_conversation_error: ${conversation.id} - ${errorMessage}`
        );
      }
    }

    console.log("close_conversations_job_complete", results);

    return results;
  } catch (error) {
    console.error(
      "close_conversations_job_error",
      error instanceof Error ? error.message : "Unknown error"
    );

    throw error;
  }
}
