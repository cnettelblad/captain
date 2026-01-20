-- CreateTable
CREATE TABLE "UserEncounter" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userA" TEXT NOT NULL,
    "userB" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "UserEncounter_userA_userB_key" ON "UserEncounter"("userA", "userB");
