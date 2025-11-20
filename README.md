# WhatsApp Cloud Inbox - Wapisimo Edition

A Next.js-based WhatsApp inbox application powered by Wapisimo API, with local SQLite database for storing conversations and messages.

## Features

- 💬 Real-time message receiving via webhooks
- 📱 Conversation management
- 📨 Send text messages
- 🗄️ Local SQLite database for persistent storage
- 🔄 Automatic conversation creation
- 📊 Message history tracking

## Prerequisites

- Node.js 18 or higher
- A Wapisimo account with API access
- A WhatsApp phone number connected to Wapisimo

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and update with your credentials:

```env
# Wapisimo API Configuration
WAPISIMO_API_KEY=your_wapisimo_api_key_here
WAPISIMO_PHONE_ID=your_phone_id_here

# Application URL (required for media uploads)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Cloudflare R2 Storage Configuration (required for sending images/documents)
R2_ACCOUNT_ID=your_cloudflare_account_id
R2_ACCESS_KEY_ID=your_r2_access_key_id
R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
R2_BUCKET_NAME=your_bucket_name
R2_PUBLIC_URL=https://pub-xxxxx.r2.dev
```

**How to get your credentials:**

**Wapisimo:**
1. Go to [Wapisimo Dashboard](https://app.wapisimo.dev)
2. Create or select your phone number
3. Copy the Phone ID and API Key from the phone settings

**Cloudflare R2 (for media uploads):**
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com) > R2
2. Create a new bucket (e.g., "whatsapp-media")
3. Go to R2 > Settings > Create API token
4. Create token with "Object Read & Write" permissions
5. Copy the Account ID, Access Key ID, and Secret Access Key
6. Enable public access to your bucket:
   - Go to your bucket > Settings
   - Connect a custom domain OR use R2.dev subdomain
   - Copy the public URL (e.g., https://pub-xxxxx.r2.dev)
7. Add all credentials to your `.env` file

### 3. Set Up Webhook

Once your app is running on a publicly accessible URL (e.g., using ngrok, Vercel, etc.), you need to configure the webhook in Wapisimo:

**Using the Wapisimo API:**

```bash
curl -X POST https://api.wapisimo.dev/v1/{your_phone_id}/webhook \
  -H "Authorization: Bearer {your_api_key}" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-domain.com/api/webhook",
    "type": "new_messages"
  }'
```

**Or via the Wapisimo Dashboard:**
1. Go to your phone settings
2. Navigate to Webhooks section
3. Add webhook URL: `https://your-domain.com/api/webhook`
4. Select event type: `new_messages`

### 4. Connect Your Phone

If your phone is not yet connected to WhatsApp Web:

1. Visit your app at `http://localhost:4000` (or your deployed URL)
2. The app will show a QR code (feature needs to be implemented in UI)
3. Scan the QR code with WhatsApp on your phone

Alternatively, use the API:

```bash
curl https://api.wapisimo.dev/v1/{your_phone_id}/qr \
  -H "Authorization: Bearer {your_api_key}"
```

### 5. Run the Application

**Development:**
```bash
npm run dev
```

**Production:**
```bash
npm run build
npm start
```

The app will run on `http://localhost:4000`

## Migration from Kapso

This app has been migrated from Kapso to Wapisimo. Key differences:

### Architecture Changes

1. **Local Database**: Wapisimo doesn't store messages, so we use SQLite locally
2. **Webhooks**: Messages are received via webhooks instead of polling
3. **No Templates**: Wapisimo doesn't support WhatsApp templates (removed functionality)
4. **Media Handling**: Wapisimo requires publicly accessible URLs for media

### What's Different

| Feature | Kapso | Wapisimo |
|---------|-------|----------|
| Message Storage | API-managed | Local SQLite DB |
| Message Receiving | API polling | Webhooks |
| Templates | Supported | Not supported |
| Media Upload | Direct upload | Requires public URL |
| Rate Limiting | Built-in | 1 msg/second (queued) |

### Removed Features

- WhatsApp message templates
- Direct media file upload (requires URL hosting now)
- Template parameter management

### New Requirements

- Public webhook endpoint for receiving messages
- SQLite database (auto-created in `data/` folder)
- Media hosting service for sending images/videos/documents

## Database

The app uses SQLite with the following schema:

### Conversations Table
- `id`: Unique conversation identifier
- `phone_number`: WhatsApp phone number
- `contact_name`: Optional contact name
- `status`: Conversation status (active/ended)
- `last_active_at`: Last message timestamp
- `metadata`: JSON metadata

### Messages Table
- `id`: Unique message identifier
- `conversation_id`: Reference to conversation
- `direction`: inbound/outbound
- `content`: Message text content
- `message_type`: text/image/video/audio/document/reaction
- `phone_number`: Sender/recipient phone
- `has_media`: Boolean flag
- `media_url`: URL to media file
- `timestamp`: Unix timestamp
- `metadata`: JSON metadata

Database file location: `data/whatsapp.db`

## API Endpoints

### GET `/api/conversations`
List all conversations with optional status filter

**Query Parameters:**
- `status` (optional): Filter by status (active/ended)
- `limit` (optional): Number of results (default: 50, max: 100)

### GET `/api/messages/{conversationId}`
Get messages for a specific conversation

**Query Parameters:**
- `limit` (optional): Number of results (default: 50, max: 100)

### POST `/api/messages/send`
Send a text message

**Form Data:**
- `to`: Phone number (with country code, e.g., +1234567890)
- `body`: Message text

### POST `/api/webhook`
Webhook endpoint for receiving messages from Wapisimo
- Automatically creates conversations
- Stores all incoming messages
- Handles reactions and different message types

## Webhook Event Types

Wapisimo sends events for:
- Text messages
- Media messages (image, video, audio, document, sticker)
- Reactions
- Chat updates

All events are automatically stored in the local database.

## Media Messages

**Now Supported**: The app now includes Cloudflare R2 integration for media uploads!

### Sending Images and Documents

1. **Configure R2**: Add your Cloudflare R2 credentials to `.env` (see Setup Instructions)
2. **Upload Files**: Click the paperclip icon in the chat interface
3. **Select Media**: Choose images, videos, audio, or documents
4. **Send**: Files are automatically uploaded to R2 and sent via WhatsApp

### Supported Media Types

- **Images**: JPEG, PNG, GIF, WebP
- **Videos**: MP4, AVI, MOV, WebM
- **Audio**: MP3, WAV, OGG, M4A
- **Documents**: PDF, DOC, DOCX, TXT, and more

### How It Works

1. File is uploaded through the UI
2. Backend uploads to Cloudflare R2 bucket
3. Public URL is generated
4. Wapisimo sends media to WhatsApp with the URL
5. Webhook receives confirmation and stores in database

### Why Cloudflare R2?

- **S3-Compatible**: Works with standard AWS SDK
- **Generous Free Tier**: 10GB storage, 1 million Class A operations/month
- **No Egress Fees**: Unlike S3, no bandwidth charges
- **Fast Global CDN**: Built-in content delivery

### Alternative Storage Options

If you prefer other services, you can modify `src/lib/r2-storage.ts` to use:
- AWS S3
- Google Cloud Storage
- Azure Blob Storage
- Vercel Blob
- Any S3-compatible service

## Development

### Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── conversations/     # Conversation endpoints
│   │   ├── messages/          # Message endpoints
│   │   └── webhook/           # Webhook handler
│   └── page.tsx               # Main UI
├── components/                # React components
├── lib/
│   ├── db.ts                  # Database operations
│   ├── wapisimo-client.ts     # Wapisimo API client
│   └── utils.ts               # Utilities
└── types/                     # TypeScript types
```

### Adding Features

1. **Media Upload**: Implement file hosting and update `send/route.ts`
2. **QR Code Display**: Add UI component to show connection QR
3. **Contact Names**: Enhance webhook to extract contact names
4. **Search**: Add search functionality to messages/conversations
5. **Webhooks Management**: Add UI for webhook configuration

## Troubleshooting

### Database Locked Error
If you get "database is locked" errors:
```bash
rm data/whatsapp.db
# App will recreate it automatically
```

### Webhook Not Receiving Messages
1. Ensure your webhook URL is publicly accessible
2. Check webhook status in Wapisimo dashboard
3. Verify the webhook is configured for your phone ID
4. Check server logs for incoming webhook requests

### Phone Disconnected
1. Get a new QR code from Wapisimo API
2. Scan with WhatsApp to reconnect
3. Verify phone status in Wapisimo dashboard

### Rate Limiting
Wapisimo queues messages at 1/second automatically. If you hit rate limits:
- Check the queue position in API responses
- Wait for previous messages to send
- Monitor the `status` field in responses

## Security Considerations

1. **Environment Variables**: Never commit `.env` to version control
2. **Database**: Add authentication if deploying publicly
3. **Webhook**: Consider adding webhook signature verification
4. **API Keys**: Rotate keys periodically
5. **HTTPS**: Always use HTTPS in production for webhook endpoint

## License

MIT License - See LICENSE file

## Support

For Wapisimo API support: [Wapisimo Documentation](https://app.wapisimo.dev/docs)
For app issues: Create an issue in the repository

## Changelog

### v2.0.0 - Wapisimo Migration
- Migrated from Kapso to Wapisimo API
- Added local SQLite database
- Implemented webhook-based message receiving
- Removed template functionality
- Updated message sending to use Wapisimo endpoints
- Added comprehensive error handling
