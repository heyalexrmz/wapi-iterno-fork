import prisma from './prisma';

/**
 * Clean up messages to fix duplicate content display
 * For text messages, clear the content field (it will be shown as caption)
 * For media messages, clear the caption field (it will be shown as content)
 */
export async function cleanupMessageDisplay() {
  try {
    // For messages without media, set content to empty if it's the same as caption
    const textResult = await prisma.message.updateMany({
      where: {
        hasMedia: false,
        content: {
          not: null,
        },
      },
      data: {
        content: '',
      },
    });
    
    // For messages with media, caption should stay, content should be empty
    const mediaResult = await prisma.message.updateMany({
      where: {
        hasMedia: true,
        content: {
          not: null,
        },
      },
      data: {
        content: '',
      },
    });
    
    const totalFixed = textResult.count + mediaResult.count;
    console.log(`Fixed ${totalFixed} message(s)`);
    return totalFixed;
  } catch (error) {
    console.error('Error cleaning up messages:', error);
    return 0;
  }
}

/**
 * Remove all messages from database (nuclear option)
 */
export async function clearAllMessages() {
  try {
    const result = await prisma.message.deleteMany({});
    console.log(`Deleted ${result.count} message(s)`);
    return result.count;
  } catch (error) {
    console.error('Error clearing messages:', error);
    return 0;
  }
}
