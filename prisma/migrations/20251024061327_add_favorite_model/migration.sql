-- CreateTable
CREATE TABLE "Favorite" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "captainCharterId" TEXT NOT NULL,
    "charterName" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "charterData" JSONB,
    "notes" TEXT,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Favorite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Favorite_userId_idx" ON "Favorite"("userId");

-- CreateIndex
CREATE INDEX "Favorite_addedAt_idx" ON "Favorite"("addedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Favorite_userId_captainCharterId_key" ON "Favorite"("userId", "captainCharterId");

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
