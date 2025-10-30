/*
  Warnings:

  - You are about to drop the column `bookingUpdates` on the `notification_preferences` table. All the data in the column will be lost.
  - You are about to drop the column `emailEnabled` on the `notification_preferences` table. All the data in the column will be lost.
  - You are about to drop the column `inAppEnabled` on the `notification_preferences` table. All the data in the column will be lost.
  - You are about to drop the column `systemUpdates` on the `notification_preferences` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "notification_preferences" DROP COLUMN "bookingUpdates",
DROP COLUMN "emailEnabled",
DROP COLUMN "inAppEnabled",
DROP COLUMN "systemUpdates",
ADD COLUMN     "emailAccountVerified" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "emailBookingApproved" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "emailBookingCancelled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "emailBookingCreated" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "emailBookingPaid" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "emailBookingRejected" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "emailPaymentFailed" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "emailReviewApproved" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "emailReviewRejected" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "emailReviewSubmitted" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "emailSystemAnnouncement" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "pushAccountVerified" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "pushBookingApproved" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "pushBookingCancelled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "pushBookingCreated" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "pushBookingPaid" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "pushBookingRejected" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "pushPaymentFailed" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "pushReviewApproved" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "pushReviewRejected" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "pushReviewSubmitted" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "pushSystemAnnouncement" BOOLEAN NOT NULL DEFAULT true;
