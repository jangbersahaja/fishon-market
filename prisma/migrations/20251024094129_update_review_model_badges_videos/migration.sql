/*
  Warnings:

  - You are about to drop the column `accuracyRating` on the `Review` table. All the data in the column will be lost.
  - You are about to drop the column `cleanlinessRating` on the `Review` table. All the data in the column will be lost.
  - You are about to drop the column `communicationRating` on the `Review` table. All the data in the column will be lost.
  - You are about to drop the column `valueRating` on the `Review` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Review" DROP COLUMN "accuracyRating",
DROP COLUMN "cleanlinessRating",
DROP COLUMN "communicationRating",
DROP COLUMN "valueRating",
ADD COLUMN     "badges" TEXT[],
ADD COLUMN     "videos" TEXT[];
