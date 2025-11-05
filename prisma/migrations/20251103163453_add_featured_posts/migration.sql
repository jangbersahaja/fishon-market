-- AlterTable
ALTER TABLE "BlogPost" ADD COLUMN     "featured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "featuredAt" TIMESTAMP(3),
ADD COLUMN     "featuredOrder" INTEGER;

-- CreateIndex
CREATE INDEX "BlogPost_featured_featuredAt_idx" ON "BlogPost"("featured", "featuredAt");
