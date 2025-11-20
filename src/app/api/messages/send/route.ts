import { NextResponse } from 'next/server';
import { wapisimoClient } from '@/lib/wapisimo-client';
import { conversationDb, messageDb } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const to = formData.get('to') as string;
    const body = formData.get('body') as string;
    const file = formData.get('file') as File | null;

    if (!to) {
      return NextResponse.json(
        { error: 'Missing required field: to' },
        { status: 400 }
      );
    }

    let result;
    const timestamp = Math.floor(Date.now() / 1000);
    const messageId = `msg_${timestamp}_${Math.random().toString(36).substr(2, 9)}`;

    // Clean phone number
    const cleanPhone = to.replace(/[^\d+]/g, '');
    
    // Get or create conversation
    const conversation = conversationDb.getOrCreate(cleanPhone);

    // Send media message
    if (file) {
      // Upload file to get public URL
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);
      
      const uploadResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:4000'}/api/media/upload`, {
        method: 'POST',
        body: uploadFormData,
      });

      if (!uploadResponse.ok) {
        const error = await uploadResponse.json();
        return NextResponse.json(
          { error: 'Failed to upload media file', details: error.error },
          { status: 500 }
        );
      }

      const uploadResult = await uploadResponse.json();
      console.log('Upload result from R2:', uploadResult);
      
      const { url: mediaUrl, mediaType } = uploadResult;
      
      console.log('Extracted values:', { mediaUrl, mediaType, caption: body });

      // Send media message via Wapisimo
      result = await wapisimoClient.sendMediaMessage(
        cleanPhone,
        mediaUrl,
        mediaType,
        body || undefined // Optional caption
      );
    } else if (body) {
      // Send text message - the webhook will handle database storage
      result = await wapisimoClient.sendMessage(cleanPhone, body);
    } else {
      return NextResponse.json(
        { error: 'Either body or file is required' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ...result,
      messageId,
      conversationId: conversation.id
    });
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json(
      { error: 'Failed to send message', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
