/*
  Warnings:

  - You are about to drop the column `adults` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the column `captainCharterId` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the column `charterName` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the column `children` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the column `durationHour` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the column `location` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the column `totalPrice` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the column `tripName` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the column `unitPrice` on the `Booking` table. All the data in the column will be lost.
  - Added the required column `charterId` to the `Booking` table without a default value. This is not possible if the table is not empty.
  - Added the required column `finalPrice` to the `Booking` table without a default value. This is not possible if the table is not empty.
  - Added the required column `guests` to the `Booking` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tripId` to the `Booking` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tripPrice` to the `Booking` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "BookingStatus" ADD VALUE 'COMPLETED';

-- DropIndex
DROP INDEX "public"."Booking_captainCharterId_idx";

-- AlterTable
ALTER TABLE "Booking" DROP COLUMN "adults",
DROP COLUMN "captainCharterId",
DROP COLUMN "charterName",
DROP COLUMN "children",
DROP COLUMN "durationHour",
DROP COLUMN "location",
DROP COLUMN "totalPrice",
DROP COLUMN "tripName",
DROP COLUMN "unitPrice",
ADD COLUMN     "captainResponse" TEXT,
ADD COLUMN     "charterId" TEXT NOT NULL,
ADD COLUMN     "chatId" TEXT,
ADD COLUMN     "discount" JSONB,
ADD COLUMN     "finalPrice" DECIMAL(10,2) NOT NULL,
ADD COLUMN     "guests" JSONB NOT NULL,
ADD COLUMN     "tax" JSONB,
ADD COLUMN     "tripId" TEXT NOT NULL,
ADD COLUMN     "tripPrice" DECIMAL(10,2) NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "firstName" TEXT,
ADD COLUMN     "lastName" TEXT;

-- CreateIndex
CREATE INDEX "Booking_tripId_idx" ON "Booking"("tripId");

-- CreateIndex
CREATE INDEX "Booking_charterId_idx" ON "Booking"("charterId");

-- CreateIndex
CREATE INDEX "Booking_date_idx" ON "Booking"("date");
