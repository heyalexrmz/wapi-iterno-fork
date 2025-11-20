import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/conversations/status?phone=5219841588331@s.whatsapp.net
 * Check human takeover status for a phone number
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const rawPhone = searchParams.get('phone');

    if (!rawPhone) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      );
    }

    // Clean up phone number - remove @s.whatsapp.net suffix
    const cleanPhone = rawPhone.replace(/@s\.whatsapp\.net$/, '');

    // Find the conversation by phone number
    const conversation = await prisma.conversation.findFirst({
      where: {
        phoneNumber: cleanPhone,
      },
      select: {
        id: true,
        phoneNumber: true,
        contactName: true,
        humanTakeover: true,
        status: true,
        lastActiveAt: true,
      },
    });

    if (!conversation) {
      return NextResponse.json(
        { 
          error: 'Conversation not found',
          humanTakeover: false,
          exists: false
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      exists: true,
      conversationId: conversation.id,
      phoneNumber: conversation.phoneNumber,
      contactName: conversation.contactName,
      humanTakeover: conversation.humanTakeover,
      status: conversation.status,
      lastActiveAt: conversation.lastActiveAt,
    });
  } catch (error) {
    console.error('Error checking conversation status:', error);
    return NextResponse.json(
      { error: 'Failed to check conversation status' },
      { status: 500 }
    );
  }
}
