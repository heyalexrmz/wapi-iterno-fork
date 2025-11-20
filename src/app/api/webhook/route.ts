import { NextResponse } from 'next/server';
import { conversationDb, messageDb } from '@/lib/db';

// Wapisimo webhook event types (actual structure based on logs)
type WapisimoWebhookEvent = {
  from?: string;
  message?: {
    key?: {
      remoteJid?: string;
      fromMe?: boolean;
      id?: string;
    };
    messageTimestamp?: number;
    pushName?: string;
    message?: {
      conversation?: string;
      imageMessage?: { url?: string; caption?: string };
      videoMessage?: { url?: string; caption?: string };
      audioMessage?: { url?: string };
      documentMessage?: { url?: string; caption?: string; fileName?: string };
      stickerMessage?: { url?: string };
    };
  };
  timestamp?: number;
  fromMe?: boolean;
  content?: string;
  phone?: string;
  type?: string;
  subType?: string;
  from_jid?: string;
  from_phone?: string;
  from_contact?: {
    jid?: string;
    displayName?: string;
    phoneNumber?: string;
  };
  url?: string;
  phone_id?: string;
};

export async function POST(request: Request) {
  try {
    const event: WapisimoWebhookEvent = await request.json();
    
    console.log('Received webhook event:', event);

    // Skip status updates
    if (event.type === 'message' && event.subType === 'status_update') {
      console.log('Skipping status update event');
      return NextResponse.json({ success: true, skipped: 'status_update' });
    }

    // Handle message events
    if (event.type === 'message' && event.subType && event.subType !== 'status_update') {
      // Extract phone number - for outgoing messages we need remoteJid
      let phoneNumber = event.phone || event.from_phone || '';
      
      // If it's an outgoing message (fromMe or from='me'), get number from remoteJid
      if (event.fromMe || event.from === 'me') {
        phoneNumber = event.message?.key?.remoteJid || phoneNumber;
      }
      
      const timestamp = event.timestamp || Math.floor(Date.now() / 1000);
      const direction = event.fromMe || event.from === 'me' ? 'outbound' : 'inbound';
      const content = event.content || '';
      const contactName = event.from_contact?.displayName;
      
      // Clean phone number (remove @s.whatsapp.net and @lid suffixes)
      const cleanPhone = phoneNumber
        .replace('@s.whatsapp.net', '')
        .replace(/@lid$/, '')
        .replace(/[^\d+]/g, '');
      
      if (!cleanPhone || cleanPhone === 'me') {
        console.log('No valid phone number found in event, skipping');
        return NextResponse.json({ success: true, skipped: 'no_phone' });
      }

      // Get or create conversation
      const conversation = await conversationDb.getOrCreate(cleanPhone, contactName);
      
      // Update conversation last active time
      await conversationDb.update(conversation.id, {
        lastActiveAt: new Date(timestamp * 1000),
        status: 'active'
      });

      // Generate deterministic message ID to prevent duplicates
      // Use WhatsApp's ID if available, otherwise create one based on timestamp + phone
      const messageId = event.message?.key?.id || 
        `msg_${timestamp}_${cleanPhone.replace(/\D/g, '').slice(-10)}`;

      // Determine if message has media
      const hasMedia = ['image', 'video', 'audio', 'document', 'sticker'].includes(event.subType);
      
      // Extract media URL from event or nested message object
      let mediaUrl = event.url;
      if (!mediaUrl && event.message?.message) {
        const msg = event.message.message;
        mediaUrl = msg.imageMessage?.url || 
                   msg.videoMessage?.url || 
                   msg.audioMessage?.url || 
                   msg.documentMessage?.url || 
                   msg.stickerMessage?.url;
      }

      // Extract filename for documents
      const filename = event.message?.message?.documentMessage?.fileName;

      // Handle reactions
      if (event.subType === 'reaction') {
        await messageDb.create({
          id: messageId,
          conversation_id: conversation.id,
          direction,
          content: content,
          phone_number: cleanPhone,
          message_type: 'reaction',
          status: 'delivered',
          has_media: false,
          media_url: undefined,
          media_filename: undefined,
          media_mime_type: undefined,
          media_byte_size: undefined,
          reaction_emoji: content,
          reacted_to_message_id: undefined,
          timestamp,
          metadata: { rawEvent: event }
        });
      } else {
        // Handle regular messages
        await messageDb.create({
          id: messageId,
          conversation_id: conversation.id,
          direction,
          content: content || '',
          phone_number: cleanPhone,
          message_type: event.subType,
          status: event.fromMe ? 'sent' : 'delivered',
          has_media: hasMedia,
          media_url: mediaUrl,
          media_filename: filename,
          media_mime_type: undefined,
          media_byte_size: undefined,
          reaction_emoji: undefined,
          reacted_to_message_id: undefined,
          timestamp,
          metadata: { rawEvent: event }
        });
      }

      console.log(`Message stored: ${messageId} from ${cleanPhone} (${direction})`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Failed to process webhook', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Handle GET requests (for webhook verification if needed)
export async function GET() {
  return NextResponse.json({ status: 'ok' });
}
