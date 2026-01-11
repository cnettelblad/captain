-- CreateTable
CREATE TABLE "Birthday" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" TEXT NOT NULL,
    "date" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Birthday_userId_key" ON "Birthday"("userId");
