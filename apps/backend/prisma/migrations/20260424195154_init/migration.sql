-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT,
    "isGuest" BOOLEAN NOT NULL DEFAULT true,
    "rating" INTEGER NOT NULL DEFAULT 1200,
    "gamesPlayed" INTEGER NOT NULL DEFAULT 0,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "draws" INTEGER NOT NULL DEFAULT 0,
    "puzzleRating" INTEGER NOT NULL DEFAULT 1200,
    "puzzlesSolved" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Puzzle" (
    "id" TEXT NOT NULL,
    "fen" TEXT NOT NULL,
    "solution" TEXT NOT NULL,
    "rating" INTEGER NOT NULL DEFAULT 1500,
    "themes" TEXT NOT NULL DEFAULT '',
    "popularity" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Puzzle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PuzzleAttempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "puzzleId" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "ratingBefore" INTEGER NOT NULL,
    "ratingAfter" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PuzzleAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Game" (
    "id" TEXT NOT NULL,
    "whiteId" TEXT NOT NULL,
    "blackId" TEXT NOT NULL,
    "pgn" TEXT NOT NULL DEFAULT '',
    "fen" TEXT NOT NULL DEFAULT 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    "status" TEXT NOT NULL DEFAULT 'in_progress',
    "endReason" TEXT,
    "initialTimeMs" INTEGER NOT NULL DEFAULT 180000,
    "incrementMs" INTEGER NOT NULL DEFAULT 2000,
    "whiteMs" INTEGER NOT NULL DEFAULT 180000,
    "blackMs" INTEGER NOT NULL DEFAULT 180000,
    "vsAi" BOOLEAN NOT NULL DEFAULT false,
    "aiLevel" INTEGER,
    "whiteRatingBefore" INTEGER NOT NULL DEFAULT 1200,
    "blackRatingBefore" INTEGER NOT NULL DEFAULT 1200,
    "whiteRatingAfter" INTEGER,
    "blackRatingAfter" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastMoveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "Puzzle_rating_idx" ON "Puzzle"("rating");

-- CreateIndex
CREATE INDEX "Puzzle_themes_idx" ON "Puzzle"("themes");

-- CreateIndex
CREATE INDEX "PuzzleAttempt_userId_createdAt_idx" ON "PuzzleAttempt"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Game_whiteId_idx" ON "Game"("whiteId");

-- CreateIndex
CREATE INDEX "Game_blackId_idx" ON "Game"("blackId");

-- CreateIndex
CREATE INDEX "Game_createdAt_idx" ON "Game"("createdAt");

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_whiteId_fkey" FOREIGN KEY ("whiteId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_blackId_fkey" FOREIGN KEY ("blackId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
