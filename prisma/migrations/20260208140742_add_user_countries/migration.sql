-- CreateTable
CREATE TABLE "UserCountry" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "note" TEXT,
    "visitedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "UserCountry_userId_countryCode_key" ON "UserCountry"("userId", "countryCode");
