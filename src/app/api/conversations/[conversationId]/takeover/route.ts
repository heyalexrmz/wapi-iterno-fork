import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const { conversationId } = await params;
    const body = await request.json();
    const { humanTakeover } = body;

    if (typeof humanTakeover !== 'boolean') {
      return NextResponse.json(
        { error: 'humanTakeover must be a boolean' },
        { status: 400 }
      );
    }

    const conversation = await prisma.conversation.update({
      where: { id: conversationId },
      data: { humanTakeover },
      select: {
        id: true,
        phoneNumber: true,
        contactName: true,
        humanTakeover: true,
        lastActiveAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: conversation,
    });
  } catch (error) {
    console.error('Error updating conversation takeover status:', error);
    return NextResponse.json(
      { error: 'Failed to update takeover status' },
      { status: 500 }
    );
  }
}
