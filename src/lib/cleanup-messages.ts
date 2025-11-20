import db from './db';

/**
 * Clean up messages to fix duplicate content display
 * For text messages, clear the content field (it will be shown as caption)
 * For media messages, clear the caption field (it will be shown as content)
 */
export function cleanupMessageDisplay() {
  try {
    // For messages without media, set content to empty if it's the same as caption
    const updateTextMessages = db.prepare(`
      UPDATE messages 
      SET content = ''
      WHERE has_media = 0 
        AND content IS NOT NULL
        AND content != ''
    `);
    
    const textResult = updateTextMessages.run();
    
    // For messages with media, caption should stay, content should be empty
    const updateMediaMessages = db.prepare(`
      UPDATE messages 
      SET content = ''
      WHERE has_media = 1
        AND content IS NOT NULL
    `);
    
    const mediaResult = updateMediaMessages.run();
    
    console.log(`Fixed ${textResult.changes + mediaResult.changes} message(s)`);
    return textResult.changes + mediaResult.changes;
  } catch (error) {
    console.error('Error cleaning up messages:', error);
    return 0;
  }
}

/**
 * Remove all messages from database (nuclear option)
 */
export function clearAllMessages() {
  try {
    const result = db.prepare('DELETE FROM messages').run();
    console.log(`Deleted ${result.changes} message(s)`);
    return result.changes;
  } catch (error) {
    console.error('Error clearing messages:', error);
    return 0;
  }
}
