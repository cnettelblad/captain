-- CreateTable
CREATE TABLE "TankSentence" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" TEXT NOT NULL,
    "tankedBy" TEXT NOT NULL,
    "reason" TEXT,
    "expiresAt" DATETIME,
    "freedAt" DATETIME,
    "freedBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
