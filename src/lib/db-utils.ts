import db, { conversationDb, messageDb } from './db';

/**
 * Clean up invalid conversations (those with 'me' or empty phone numbers)
 */
export function cleanupInvalidConversations() {
  try {
    // Delete conversations where phone_number is 'me' or empty
    const stmt = db.prepare(`
      DELETE FROM conversations 
      WHERE phone_number = 'me' 
         OR phone_number = '' 
         OR phone_number IS NULL
    `);
    
    const result = stmt.run();
    
    // Also delete orphaned messages
    db.prepare(`
      DELETE FROM messages 
      WHERE conversation_id NOT IN (SELECT id FROM conversations)
    `).run();
    
    console.log(`Cleaned up ${result.changes} invalid conversation(s)`);
    return result.changes;
  } catch (error) {
    console.error('Error cleaning up conversations:', error);
    return 0;
  }
}

/**
 * Get statistics about the database
 */
export function getDatabaseStats() {
  const conversationCount = db.prepare('SELECT COUNT(*) as count FROM conversations').get() as { count: number };
  const messageCount = db.prepare('SELECT COUNT(*) as count FROM messages').get() as { count: number };
  
  return {
    conversations: conversationCount.count,
    messages: messageCount.count
  };
}
