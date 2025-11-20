import prisma from './prisma';
import type { Conversation as PrismaConversation, Message as PrismaMessage } from '@prisma/client';

// Get the WhatsApp Number ID from environment
const WHATSAPP_NUMBER_ID = process.env.WAPISIMO_PHONE_ID || '';

// Types (exported for compatibility)
export type Conversation = PrismaConversation & {
  metadata: Record<string, unknown>;
};

export type Message = PrismaMessage & {
  metadata: Record<string, unknown>;
  hasMedia: boolean;
  mediaByteSize: number | null;
  timestamp: bigint;
};

// Conversation operations
export const conversationDb = {
  async getOrCreate(phoneNumber: string, contactName?: string): Promise<Conversation> {
    // Try to find existing conversation
    const existing = await prisma.conversation.findUnique({
      where: {
        whatsappNumberId_phoneNumber: {
          whatsappNumberId: WHATSAPP_NUMBER_ID,
          phoneNumber: phoneNumber,
        },
      },
    });
    
    if (existing) {
      return existing as Conversation;
    }

    // Create new conversation
    const newConversation = await prisma.conversation.create({
      data: {
        whatsappNumberId: WHATSAPP_NUMBER_ID,
        phoneNumber: phoneNumber,
        contactName: contactName || null,
        lastActiveAt: new Date(),
      },
    });
    
    return newConversation as Conversation;
  },

  async list(filters: { status?: string; limit?: number } = {}): Promise<Conversation[]> {
    const { status, limit = 50 } = filters;
    
    const conversations = await prisma.conversation.findMany({
      where: {
        whatsappNumberId: WHATSAPP_NUMBER_ID,
        ...(status && { status }),
      },
      orderBy: {
        lastActiveAt: 'desc',
      },
      take: limit,
    });

    return conversations as Conversation[];
  },

  async get(id: string): Promise<Conversation | null> {
    const conversation = await prisma.conversation.findFirst({
      where: {
        id,
        whatsappNumberId: WHATSAPP_NUMBER_ID,
      },
    });
    
    return conversation as Conversation | null;
  },

  async getByPhone(phoneNumber: string): Promise<Conversation | null> {
    const conversation = await prisma.conversation.findUnique({
      where: {
        whatsappNumberId_phoneNumber: {
          whatsappNumberId: WHATSAPP_NUMBER_ID,
          phoneNumber: phoneNumber,
        },
      },
    });
    
    return conversation as Conversation | null;
  },

  async update(id: string, data: Partial<{ contactName: string; status: string; lastActiveAt: Date; metadata: Record<string, unknown> }>) {
    await prisma.conversation.update({
      where: {
        id,
      },
      data: {
        ...(data.contactName !== undefined && { contactName: data.contactName }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.lastActiveAt !== undefined && { lastActiveAt: data.lastActiveAt }),
        ...(data.metadata !== undefined && { metadata: data.metadata as any }),
      },
    });
  },

  async getLastMessage(conversationId: string): Promise<Message | null> {
    const message = await prisma.message.findFirst({
      where: {
        conversationId,
      },
      orderBy: {
        timestamp: 'desc',
      },
    });
    
    return message as Message | null;
  },

  async getMessagesCount(conversationId: string): Promise<number> {
    return await prisma.message.count({
      where: {
        conversationId,
      },
    });
  }
};

// Message operations
export const messageDb = {
  async create(data: {
    id: string;
    conversation_id: string;
    direction: string;
    content?: string;
    phone_number: string;
    message_type: string;
    status?: string;
    has_media?: boolean;
    media_url?: string;
    media_filename?: string;
    media_mime_type?: string;
    media_byte_size?: number;
    reaction_emoji?: string;
    reacted_to_message_id?: string;
    timestamp: number;
    metadata?: Record<string, unknown>;
  }): Promise<Message | null> {
    try {
      const message = await prisma.message.upsert({
        where: {
          id: data.id,
        },
        update: {},
        create: {
          id: data.id,
          conversationId: data.conversation_id,
          direction: data.direction,
          content: data.content || null,
          phoneNumber: data.phone_number,
          messageType: data.message_type,
          status: data.status || null,
          hasMedia: data.has_media || false,
          mediaUrl: data.media_url || null,
          mediaFilename: data.media_filename || null,
          mediaMimeType: data.media_mime_type || null,
          mediaByteSize: data.media_byte_size || null,
          reactionEmoji: data.reaction_emoji || null,
          reactedToMessageId: data.reacted_to_message_id || null,
          timestamp: BigInt(data.timestamp),
          metadata: (data.metadata || {}) as any,
        },
      });

      return message as Message;
    } catch (error) {
      console.error('Error inserting message:', error);
      return null;
    }
  },

  async list(conversationId: string, limit = 50): Promise<Message[]> {
    const messages = await prisma.message.findMany({
      where: {
        conversationId,
      },
      orderBy: {
        timestamp: 'desc',
      },
      take: limit,
    });

    return messages as Message[];
  },

  async get(id: string): Promise<Message | null> {
    const message = await prisma.message.findUnique({
      where: {
        id,
      },
    });
    
    return message as Message | null;
  },

  async update(id: string, data: Partial<{ status: string; metadata: Record<string, unknown> }>) {
    await prisma.message.update({
      where: {
        id,
      },
      data: {
        ...(data.status !== undefined && { status: data.status }),
        ...(data.metadata !== undefined && { metadata: data.metadata as any }),
      },
    });
  }
};

export default prisma;
