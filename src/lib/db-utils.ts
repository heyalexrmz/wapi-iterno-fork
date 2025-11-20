import { prisma } from './prisma';

/**
 * Clean up invalid conversations (those with 'me' or empty phone numbers)
 */
export async function cleanupInvalidConversations() {
  try {
    // Delete conversations where phone_number is 'me' or empty
    const result = await prisma.conversation.deleteMany({
      where: {
        OR: [
          { phoneNumber: 'me' },
          { phoneNumber: '' },
        ],
      },
    });
    
    console.log(`Cleaned up ${result.count} invalid conversation(s)`);
    return result.count;
  } catch (error) {
    console.error('Error cleaning up conversations:', error);
    return 0;
  }
}

/**
 * Get statistics about the database
 */
export async function getDatabaseStats() {
  const conversationCount = await prisma.conversation.count();
  const messageCount = await prisma.message.count();
  
  return {
    conversations: conversationCount,
    messages: messageCount,
  };
}
