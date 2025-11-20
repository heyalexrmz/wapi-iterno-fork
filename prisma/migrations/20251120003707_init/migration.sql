-- CreateTable
CREATE TABLE "conversations" (
    "id" TEXT NOT NULL,
    "whatsapp_number_id" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "contact_name" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "last_active_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "content" TEXT,
    "phone_number" TEXT NOT NULL,
    "message_type" TEXT NOT NULL,
    "status" TEXT,
    "has_media" BOOLEAN NOT NULL DEFAULT false,
    "media_url" TEXT,
    "media_filename" TEXT,
    "media_mime_type" TEXT,
    "media_byte_size" INTEGER,
    "reaction_emoji" TEXT,
    "reacted_to_message_id" TEXT,
    "timestamp" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "conversations_whatsapp_number_id_idx" ON "conversations"("whatsapp_number_id");

-- CreateIndex
CREATE INDEX "conversations_phone_number_idx" ON "conversations"("phone_number");

-- CreateIndex
CREATE INDEX "conversations_status_idx" ON "conversations"("status");

-- CreateIndex
CREATE INDEX "conversations_last_active_at_idx" ON "conversations"("last_active_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "conversations_whatsapp_number_id_phone_number_key" ON "conversations"("whatsapp_number_id", "phone_number");

-- CreateIndex
CREATE INDEX "messages_conversation_id_idx" ON "messages"("conversation_id");

-- CreateIndex
CREATE INDEX "messages_timestamp_idx" ON "messages"("timestamp" DESC);

-- CreateIndex
CREATE INDEX "messages_direction_idx" ON "messages"("direction");

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
