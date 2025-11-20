# Migration from Kapso to Wapisimo - Complete Guide

## Overview

This document details the complete migration from Kapso WhatsApp Cloud API to Wapisimo API.

## What Changed

### 1. **API Provider**
- **Before**: Kapso WhatsApp Cloud API
- **After**: Wapisimo API

### 2. **Message Storage**
- **Before**: Messages stored in Kapso's cloud
- **After**: Messages stored locally in SQLite database

### 3. **Message Receiving**
- **Before**: Polling Kapso's API
- **After**: Webhook-based real-time message receiving

### 4. **Authentication**
- **Before**: `KAPSO_API_KEY` + `PHONE_NUMBER_ID` + `WABA_ID`
- **After**: `WAPISIMO_API_KEY` + `WAPISIMO_PHONE_ID`

## Files Created

### New Files
1. **`src/lib/wapisimo-client.ts`** - Wapisimo API client wrapper
2. **`src/lib/db.ts`** - SQLite database operations
3. **`src/app/api/webhook/route.ts`** - Webhook endpoint for receiving messages
4. **`data/.gitignore`** - Git ignore for database files
5. **`MIGRATION_GUIDE.md`** - This file

### Modified Files
1. **`src/app/api/conversations/route.ts`** - Updated to use local database
2. **`src/app/api/messages/[conversationId]/route.ts`** - Updated to use local database
3. **`src/app/api/messages/send/route.ts`** - Updated to use Wapisimo API
4. **`.env`** - Updated environment variables
5. **`package.json`** - Removed Kapso, added better-sqlite3
6. **`README.md`** - Complete rewrite with Wapisimo instructions

### Removed Files
1. **`src/lib/whatsapp-client.ts`** - Old Kapso client (replaced)
2. **`src/app/api/templates/`** - Template routes (Wapisimo doesn't support templates)
3. **`src/app/api/messages/interactive/`** - Interactive messages (removed)
4. **`src/app/api/media/`** - Media endpoints (handled differently now)

## Database Schema

### Conversations Table
```sql
CREATE TABLE conversations (
  id TEXT PRIMARY KEY,
  phone_number TEXT NOT NULL,
  contact_name TEXT,
  status TEXT DEFAULT 'active',
  last_active_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  metadata TEXT DEFAULT '{}'
);
```

### Messages Table
```sql
CREATE TABLE messages (
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
```

## Setup Steps

### 1. Install Dependencies
```bash
npm install
```

This will install:
- `better-sqlite3` - SQLite database
- `@types/better-sqlite3` - TypeScript definitions

### 2. Update Environment Variables

Update `.env` with your Wapisimo credentials:

```env
WAPISIMO_API_KEY=your_api_key_here
WAPISIMO_PHONE_ID=your_phone_id_here
```

**Getting Credentials:**
1. Login to [Wapisimo Dashboard](https://app.wapisimo.dev)
2. Create or select a phone number
3. Copy the Phone ID and API Key

### 3. Configure Webhook

#### Option A: Using cURL
```bash
curl -X POST https://api.wapisimo.dev/v1/{your_phone_id}/webhook \
  -H "Authorization: Bearer {your_api_key}" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-domain.com/api/webhook",
    "type": "new_messages"
  }'
```

#### Option B: Using Wapisimo Dashboard
1. Go to phone settings
2. Add webhook: `https://your-domain.com/api/webhook`
3. Select type: `new_messages`

### 4. Deploy with Public URL

For webhook to work, you need a publicly accessible URL:

#### Local Development with ngrok:
```bash
# Terminal 1: Start app
npm run dev

# Terminal 2: Start ngrok
ngrok http 4000
```

Use the ngrok URL for your webhook configuration.

#### Production Deployment:
Deploy to Vercel, Railway, or any hosting service with HTTPS.

### 5. Connect Phone

Get QR code:
```bash
curl https://api.wapisimo.dev/v1/{your_phone_id}/qr \
  -H "Authorization: Bearer {your_api_key}"
```

Scan with WhatsApp on your phone.

## API Differences

### Sending Messages

#### Kapso (Old)
```typescript
await whatsappClient.messages.sendText({
  phoneNumberId: PHONE_NUMBER_ID,
  to: phoneNumber,
  body: message
});
```

#### Wapisimo (New)
```typescript
await wapisimoClient.sendMessage(phoneNumber, message);
```

### Media Messages

#### Kapso (Old)
```typescript
// Upload file
const upload = await whatsappClient.media.upload({
  phoneNumberId: PHONE_NUMBER_ID,
  type: 'image',
  file: fileBuffer
});

// Send with media ID
await whatsappClient.messages.sendImage({
  phoneNumberId: PHONE_NUMBER_ID,
  to: phoneNumber,
  image: { id: upload.id }
});
```

#### Wapisimo (New)
```typescript
// File must be hosted at a public URL
await wapisimoClient.sendMediaMessage(
  phoneNumber,
  'https://example.com/image.jpg',
  'image',
  'Optional caption'
);
```

## Feature Comparison

| Feature | Kapso | Wapisimo | Status |
|---------|-------|----------|--------|
| Text Messages | ✅ | ✅ | ✅ Working |
| Media Messages | ✅ Direct Upload | ✅ URL Required | ⚠️ Needs hosting |
| Message Templates | ✅ | ❌ | ❌ Not Available |
| Conversations API | ✅ | ❌ (Local DB) | ✅ Working |
| Message History | ✅ | ❌ (Local DB) | ✅ Working |
| Webhooks | ❌ | ✅ | ✅ Working |
| Interactive Messages | ✅ | ❌ | ❌ Removed |
| Rate Limiting | Built-in | 1 msg/sec (queued) | ✅ Automatic |

## Known Limitations

### 1. Media Upload
Wapisimo requires media files to be hosted at publicly accessible URLs. 

**Solution Options:**
- Use AWS S3, Cloudinary, or similar
- Implement your own file hosting
- Use temporary public URLs

### 2. Templates Not Supported
WhatsApp message templates are not available in Wapisimo.

**Solution:**
- Use regular text messages
- Create your own message formatting

### 3. No Message History API
Unlike Kapso, Wapisimo doesn't store messages.

**Solution:**
- Local SQLite database (implemented)
- All messages stored locally
- Database auto-created on first run

## Webhook Events

Wapisimo sends these event types:

### Text Message
```json
{
  "type": "message",
  "subType": "text",
  "from": "1234567890@s.whatsapp.net",
  "message": "Hello!",
  "timestamp": 1742968374,
  "fromMe": false
}
```

### Media Message
```json
{
  "type": "message",
  "subType": "image",
  "from": "1234567890@s.whatsapp.net",
  "message": "Check this out!",
  "url": "https://files.wapisimo.dev/...",
  "timestamp": 1742968374,
  "fromMe": false
}
```

### Reaction
```json
{
  "type": "message",
  "subType": "reaction",
  "conversation": "1234567890@s.whatsapp.net",
  "reaction": "👍",
  "fromMe": false
}
```

## Testing

### 1. Check Database
```bash
sqlite3 data/whatsapp.db "SELECT * FROM conversations;"
sqlite3 data/whatsapp.db "SELECT * FROM messages ORDER BY timestamp DESC LIMIT 10;"
```

### 2. Test Webhook
```bash
# Check if webhook is registered
curl https://api.wapisimo.dev/v1/{phone_id}/webhook \
  -H "Authorization: Bearer {api_key}"
```

### 3. Send Test Message
```bash
curl -X POST http://localhost:4000/api/messages/send \
  -F "to=+1234567890" \
  -F "body=Test message"
```

## Troubleshooting

### Database Locked
```bash
# Stop the app and remove database
rm data/whatsapp.db
# Restart - database will be recreated
npm run dev
```

### Webhook Not Working
1. Verify webhook URL is publicly accessible
2. Check webhook status in Wapisimo dashboard
3. Test webhook manually:
```bash
curl -X POST http://localhost:4000/api/webhook \
  -H "Content-Type: application/json" \
  -d '{"type":"message","subType":"text","from":"test@s.whatsapp.net","message":"Test"}'
```

### Messages Not Appearing
1. Check webhook is configured correctly
2. Verify database is being created
3. Check server logs for errors

### Phone Disconnected
1. Get new QR code from API
2. Scan with WhatsApp
3. Check phone status in dashboard

## Rollback Plan

If you need to rollback to Kapso:

1. Restore original files from git:
```bash
git checkout HEAD~1 src/lib/whatsapp-client.ts
git checkout HEAD~1 src/app/api/conversations/route.ts
git checkout HEAD~1 src/app/api/messages/
git checkout HEAD~1 package.json
git checkout HEAD~1 .env
```

2. Reinstall Kapso:
```bash
npm install @kapso/whatsapp-cloud-api
```

3. Update environment variables back to Kapso

## Performance Considerations

### Database Performance
- SQLite is fast for local storage
- Indexes created for common queries
- Consider PostgreSQL for high traffic

### Webhook Reliability
- Wapisimo automatically retries failed webhooks
- Add error handling in webhook endpoint
- Consider implementing a message queue

## Security Recommendations

1. **Environment Variables**: Never commit `.env`
2. **Database**: Backup regularly
3. **Webhook**: Add signature verification
4. **API Keys**: Rotate periodically
5. **HTTPS**: Always use HTTPS in production

## Next Steps

### Recommended Enhancements

1. **Media Hosting**: Implement S3 or Cloudinary integration
2. **Contact Sync**: Add contact name extraction from WhatsApp
3. **Search**: Add full-text search for messages
4. **Export**: Add conversation export feature
5. **Analytics**: Add message statistics and analytics
6. **Backup**: Implement automatic database backups

## Support

- **Wapisimo API**: https://app.wapisimo.dev/docs
- **Issues**: Create issue in repository
- **Database**: SQLite documentation

## Changelog

### v2.0.0 - Wapisimo Migration
- ✅ Migrated from Kapso to Wapisimo
- ✅ Added SQLite database for message storage
- ✅ Implemented webhook-based message receiving
- ✅ Updated all API endpoints
- ✅ Removed template functionality
- ✅ Removed interactive messages
- ✅ Added comprehensive error handling
- ✅ Updated documentation

---

**Migration completed successfully! 🎉**

The app is now running on Wapisimo with local message storage via SQLite.
