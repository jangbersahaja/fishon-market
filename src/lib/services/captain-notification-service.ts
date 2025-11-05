/**
 * Service to send notifications to captains via their database
 *
 * When events happen in fishon-market that captains need to know about,
 * we write notifications directly to the captain's database.
 */

import { prismaCaptain } from "@/lib/database/prisma-captain";

/**
 * Notify captain when they receive a new review
 */
export async function notifyCaptainOfNewReview(params: {
  charterId: string; // Charter ID in captain DB
  charterName: string;
  anglerName: string;
  rating: number;
  reviewId: string;
}): Promise<void> {
  const { charterId, charterName, anglerName, rating, reviewId } = params;

  try {
    // Find the charter and captain using raw query (captain DB uses different schema)
    const charters = await prismaCaptain.$queryRaw<
      Array<{
        id: string;
        captainId: string;
        name: string;
      }>
    >`
      SELECT c.id, c."captainId", c.name, cp."userId"
      FROM "Charter" c
      INNER JOIN "CaptainProfile" cp ON c."captainId" = cp.id
      WHERE c.id = ${charterId}
      LIMIT 1
    `;

    if (!charters || charters.length === 0) {
      console.warn(
        `Charter ${charterId} not found in captain DB. Skipping notification.`
      );
      return;
    }

    const charter = charters[0];
    const captainUserId = (charter as any).userId;

    if (!captainUserId) {
      console.warn(`No user ID found for charter ${charterId}`);
      return;
    }

    const stars = "⭐".repeat(rating);

    // Create notification in captain's database using raw query
    await prismaCaptain.$executeRaw`
      INSERT INTO "Notification" (
        id, 
        "userId", 
        type, 
        status,
        title, 
        message, 
        "actionUrl", 
        "actionLabel", 
        "charterId", 
        metadata,
        "createdAt"
      )
      VALUES (
        gen_random_uuid()::text,
        ${captainUserId},
        'REVIEW_RECEIVED',
        'UNREAD',
        'New Review! 🎉',
        ${`${anglerName} left a ${rating}-star review for ${charter.name}. ${stars}`},
        ${`/captain/reviews?charter=${charterId}`},
        'View Review',
        ${charterId},
        ${JSON.stringify({ reviewId, charterName, anglerName, rating })}::jsonb,
        NOW()
      )
    `;

    console.log(
      `✅ Notification sent to captain ${captainUserId} for review ${reviewId}`
    );
  } catch (error) {
    console.error("Error sending review notification to captain:", error);
    // Don't throw - notification failure shouldn't fail review creation
  }
}
