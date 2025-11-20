import { NextResponse } from 'next/server';
import { cleanupMessageDisplay } from '@/lib/cleanup-messages';

/**
 * API route to fix duplicate message display in existing messages
 * GET /api/cleanup-messages
 */
export async function GET() {
  try {
    const fixedCount = cleanupMessageDisplay();
    
    return NextResponse.json({
      success: true,
      message: `Fixed ${fixedCount} message(s) with duplicate text`,
      note: 'New messages will not have this issue. This was a one-time cleanup.'
    });
  } catch (error) {
    console.error('Error in cleanup route:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to clean up messages',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
