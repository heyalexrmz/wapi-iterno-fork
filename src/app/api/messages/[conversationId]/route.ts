import { NextResponse } from 'next/server';
import { messageDb, conversationDb } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const { conversationId } = await params;
  try {
    const { searchParams } = new URL(request.url);
    const parsedLimit = Number.parseInt(searchParams.get('limit') ?? '', 10);
    const limit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, 100) : 50;

    // Verify conversation exists
    const conversation = await conversationDb.get(conversationId);
    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    const messages = await messageDb.list(conversationId, limit);

    // Transform messages to match frontend expectations
    const transformedData = messages.map((msg) => {
      const metadata = msg.metadata as Record<string, unknown>;
      const hasMedia = Boolean(msg.hasMedia);
      
      return {
        id: msg.id,
        direction: msg.direction,
        // For media messages, content is caption. For text, it's the message itself
        content: hasMedia ? '' : (msg.content || ''),
        createdAt: new Date(Number(msg.timestamp) * 1000).toISOString(),
        status: msg.status,
        phoneNumber: msg.phoneNumber,
        hasMedia,
        mediaData: msg.mediaUrl
          ? {
              url: msg.mediaUrl,
              filename: msg.mediaFilename,
              contentType: msg.mediaMimeType,
              byteSize: msg.mediaByteSize
            }
          : undefined,
        reactionEmoji: msg.reactionEmoji,
        reactedToMessageId: msg.reactedToMessageId,
        filename: msg.mediaFilename,
        mimeType: msg.mediaMimeType,
        messageType: msg.messageType,
        // Caption is only for media messages
        caption: hasMedia ? msg.content : undefined,
        metadata
      };
    });

    return NextResponse.json({
      data: transformedData,
      paging: {} // No pagination for local DB for now
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages', conversationId },
      { status: 500 }
    );
  }
}
