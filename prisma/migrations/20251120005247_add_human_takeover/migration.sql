-- AlterTable
ALTER TABLE "conversations" ADD COLUMN     "human_takeover" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "conversations_human_takeover_idx" ON "conversations"("human_takeover");
