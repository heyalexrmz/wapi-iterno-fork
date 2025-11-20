import Database from 'better-sqlite3';
import path from 'path';

// Types
export type Conversation = {
  id: string;
  phone_number: string;
  contact_name: string | null;
  status: string;
  last_active_at: string | null;
  created_at: string;
  updated_at: string;
  metadata: string;
};

export type Message = {
  id: string;
  conversation_id: string;
  direction: string;
  content: string | null;
  phone_number: string;
  message_type: string;
  status: string | null;
  has_media: number;
  media_url: string | null;
  media_filename: string | null;
  media_mime_type: string | null;
  media_byte_size: number | null;
  reaction_emoji: string | null;
  reacted_to_message_id: string | null;
  timestamp: number;
  created_at: string;
  metadata: string;
};

// Initialize SQLite database
const dbPath = path.join(process.cwd(), 'data', 'whatsapp.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    phone_number TEXT NOT NULL,
    contact_name TEXT,
    status TEXT DEFAULT 'active',
    last_active_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    metadata TEXT DEFAULT '{}'
  );

  CREATE INDEX IF NOT EXISTS idx_conversations_phone ON conversations(phone_number);
  CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);
  CREATE INDEX IF NOT EXISTS idx_conversations_last_active ON conversations(last_active_at DESC);

  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    direction TEXT NOT NULL,
    content TEXT,
    phone_number TEXT NOT NULL,
    message_type TEXT NOT NULL,
    status TEXT,
    has_media INTEGER DEFAULT 0,
    media_url TEXT,
    media_filename TEXT,
    media_mime_type TEXT,
    media_byte_size INTEGER,
    reaction_emoji TEXT,
    reacted_to_message_id TEXT,
    timestamp INTEGER NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    metadata TEXT DEFAULT '{}',
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
  CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp DESC);
  CREATE INDEX IF NOT EXISTS idx_messages_direction ON messages(direction);
`);

// Conversation operations
export const conversationDb = {
  getOrCreate(phoneNumber: string, contactName?: string): Conversation {
    const existing = db.prepare('SELECT * FROM conversations WHERE phone_number = ?').get(phoneNumber) as Conversation | undefined;
    
    if (existing) {
      return existing;
    }

    const id = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    db.prepare(`
      INSERT INTO conversations (id, phone_number, contact_name, last_active_at)
      VALUES (?, ?, ?, datetime('now'))
    `).run(id, phoneNumber, contactName || null);
    
    return db.prepare('SELECT * FROM conversations WHERE id = ?').get(id) as Conversation;
  },

  list(filters: { status?: string; limit?: number } = {}): Conversation[] {
    const { status, limit = 50 } = filters;
    let query = 'SELECT * FROM conversations';
    const params: (string | number)[] = [];

    if (status) {
      query += ' WHERE status = ?';
      params.push(status);
    }

    query += ' ORDER BY last_active_at DESC LIMIT ?';
    params.push(limit);

    return db.prepare(query).all(...params) as Conversation[];
  },

  get(id: string): Conversation | undefined {
    return db.prepare('SELECT * FROM conversations WHERE id = ?').get(id) as Conversation | undefined;
  },

  getByPhone(phoneNumber: string): Conversation | undefined {
    return db.prepare('SELECT * FROM conversations WHERE phone_number = ?').get(phoneNumber) as Conversation | undefined;
  },

  update(id: string, data: Partial<{ contact_name: string; status: string; last_active_at: string; metadata: string }>) {
    const fields: string[] = [];
    const values: (string | number)[] = [];

    Object.entries(data).forEach(([key, value]) => {
      fields.push(`${key} = ?`);
      values.push(value);
    });

    if (fields.length === 0) return;

    fields.push('updated_at = datetime(\'now\')');
    values.push(id);

    db.prepare(`UPDATE conversations SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  },

  getLastMessage(conversationId: string): Message | undefined {
    return db.prepare(`
      SELECT * FROM messages 
      WHERE conversation_id = ? 
      ORDER BY timestamp DESC 
      LIMIT 1
    `).get(conversationId) as Message | undefined;
  },

  getMessagesCount(conversationId: string): number {
    const result = db.prepare('SELECT COUNT(*) as count FROM messages WHERE conversation_id = ?').get(conversationId) as { count: number };
    return result.count;
  }
};

// Message operations
export const messageDb = {
  create(data: {
    id: string;
    conversation_id: string;
    direction: string;
    content?: string;
    phone_number: string;
    message_type: string;
    status?: string;
    has_media?: boolean;
    media_url?: string;
    media_filename?: string;
    media_mime_type?: string;
    media_byte_size?: number;
    reaction_emoji?: string;
    reacted_to_message_id?: string;
    timestamp: number;
    metadata?: Record<string, unknown>;
  }): Message | null {
    try {
      db.prepare(`
        INSERT OR IGNORE INTO messages (
          id, conversation_id, direction, content, phone_number, message_type,
          status, has_media, media_url, media_filename, media_mime_type, media_byte_size,
          reaction_emoji, reacted_to_message_id, timestamp, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
      data.id,
      data.conversation_id,
      data.direction,
      data.content || null,
      data.phone_number,
      data.message_type,
      data.status || null,
      data.has_media ? 1 : 0,
      data.media_url || null,
      data.media_filename || null,
      data.media_mime_type || null,
      data.media_byte_size || null,
      data.reaction_emoji || null,
      data.reacted_to_message_id || null,
      data.timestamp,
      JSON.stringify(data.metadata || {})
    );

      const inserted = db.prepare('SELECT * FROM messages WHERE id = ?').get(data.id) as Message | undefined;
      return inserted || null;
    } catch (error) {
      console.error('Error inserting message:', error);
      return null;
    }
  },

  list(conversationId: string, limit = 50): Message[] {
    return db.prepare(`
      SELECT * FROM messages 
      WHERE conversation_id = ? 
      ORDER BY timestamp DESC 
      LIMIT ?
    `).all(conversationId, limit) as Message[];
  },

  get(id: string): Message | undefined {
    return db.prepare('SELECT * FROM messages WHERE id = ?').get(id) as Message | undefined;
  },

  update(id: string, data: Partial<{ status: string; metadata: string }>) {
    const fields: string[] = [];
    const values: (string | number)[] = [];

    Object.entries(data).forEach(([key, value]) => {
      fields.push(`${key} = ?`);
      values.push(value);
    });

    if (fields.length === 0) return;

    values.push(id);
    db.prepare(`UPDATE messages SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  }
};

export default db;
