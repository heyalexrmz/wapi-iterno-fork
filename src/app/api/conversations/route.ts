import { NextResponse } from 'next/server';
import { conversationDb } from '@/lib/db';
import { PHONE_ID } from '@/lib/wapisimo-client';

function parseDirection(lastMessage: { direction: string } | undefined): 'inbound' | 'outbound' {
  if (!lastMessage) return 'inbound';
  return lastMessage.direction === 'outbound' ? 'outbound' : 'inbound';
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;
    const parsedLimit = Number.parseInt(searchParams.get('limit') ?? '', 10);
    const limit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, 100) : 50;

    const conversations = await conversationDb.list({ status, limit });

    // Transform conversations to match frontend expectations
    const transformedData = await Promise.all(conversations.map(async (conversation) => {
      const lastMessage = await conversationDb.getLastMessage(conversation.id);
      const messagesCount = await conversationDb.getMessagesCount(conversation.id);

      return {
        id: conversation.id,
        phoneNumber: conversation.phoneNumber,
        status: conversation.status,
        lastActiveAt: conversation.lastActiveAt?.toISOString() || null,
        phoneNumberId: PHONE_ID,
        metadata: conversation.metadata,
        contactName: conversation.contactName,
        messagesCount,
        lastMessage: lastMessage
          ? {
              content: lastMessage.content || '',
              direction: parseDirection(lastMessage),
              type: lastMessage.messageType
            }
          : undefined
      };
    }));

    return NextResponse.json({
      data: transformedData,
      paging: {} // No pagination for local DB for now
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conversations' },
      { status: 500 }
    );
  }
}
