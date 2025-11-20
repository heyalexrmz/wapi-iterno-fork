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
    const conversation = conversationDb.get(conversationId);
    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    const messages = messageDb.list(conversationId, limit);

    // Transform messages to match frontend expectations
    const transformedData = messages.map((msg) => {
      const metadata = JSON.parse(msg.metadata || '{}');
      const hasMedia = Boolean(msg.has_media);
      
      return {
        id: msg.id,
        direction: msg.direction,
        // For media messages, content is caption. For text, it's the message itself
        content: hasMedia ? '' : (msg.content || ''),
        createdAt: new Date(msg.timestamp * 1000).toISOString(),
        status: msg.status,
        phoneNumber: msg.phone_number,
        hasMedia,
        mediaData: msg.media_url
          ? {
              url: msg.media_url,
              filename: msg.media_filename,
              contentType: msg.media_mime_type,
              byteSize: msg.media_byte_size
            }
          : undefined,
        reactionEmoji: msg.reaction_emoji,
        reactedToMessageId: msg.reacted_to_message_id,
        filename: msg.media_filename,
        mimeType: msg.media_mime_type,
        messageType: msg.message_type,
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
