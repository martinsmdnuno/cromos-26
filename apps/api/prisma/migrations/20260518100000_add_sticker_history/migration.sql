-- CreateTable
CREATE TABLE "StickerHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stickerNumber" INTEGER NOT NULL,
    "countBefore" INTEGER NOT NULL,
    "countAfter" INTEGER NOT NULL,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StickerHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StickerHistory_userId_createdAt_idx" ON "StickerHistory"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "StickerHistory_userId_stickerNumber_idx" ON "StickerHistory"("userId", "stickerNumber");

-- AddForeignKey
ALTER TABLE "StickerHistory" ADD CONSTRAINT "StickerHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
