const WAPISIMO_API_BASE = 'https://api.wapisimo.dev/v1';

export class WapisimoClient {
  private apiKey: string;
  private phoneId: string;

  constructor(apiKey: string, phoneId: string) {
    this.apiKey = apiKey;
    this.phoneId = phoneId;
  }

  private async fetch(endpoint: string, options: RequestInit = {}) {
    const url = `${WAPISIMO_API_BASE}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = response.statusText;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error || errorJson.message || errorText;
      } catch {
        errorMessage = errorText || response.statusText;
      }
      console.error('Wapisimo API Error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorMessage,
        endpoint,
        body: options.body
      });
      throw new Error(`Wapisimo API error (${response.status}): ${errorMessage}`);
    }

    return response.json();
  }

  // Send text message
  async sendMessage(to: string, message: string) {
    return this.fetch(`/${this.phoneId}/send`, {
      method: 'POST',
      body: JSON.stringify({ to, message }),
    });
  }

  // Send media message
  async sendMediaMessage(to: string, mediaUrl: string, mediaType: 'image' | 'video' | 'audio' | 'document', caption?: string) {
    // Default messages by media type
    const defaultMessages = {
      image: 'Imagen',
      video: 'Video',
      audio: 'Audio',
      document: 'Documento'
    };
    
    const payload = {
      to,
      mediaUrl,
      mediaType,
      message: caption || defaultMessages[mediaType]
    };
    
    console.log('Sending media message:', JSON.stringify(payload, null, 2));
    
    return this.fetch(`/${this.phoneId}/send`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // Verify if number has WhatsApp
  async verifyNumber(phoneNumber: string) {
    const params = new URLSearchParams({ phone: phoneNumber });
    return this.fetch(`/verify?${params}`);
  }

  // Get QR code for phone connection
  async getQRCode() {
    return this.fetch(`/${this.phoneId}/qr`);
  }

  // Webhook management
  async listWebhooks() {
    return this.fetch(`/${this.phoneId}/webhook`);
  }

  async addWebhook(url: string, type: string = 'new_messages') {
    return this.fetch(`/${this.phoneId}/webhook`, {
      method: 'POST',
      body: JSON.stringify({ url, type }),
    });
  }

  async deleteWebhook(webhookId: string) {
    return this.fetch(`/${this.phoneId}/webhook/${webhookId}`, {
      method: 'DELETE',
    });
  }
}

export const wapisimoClient = new WapisimoClient(
  process.env.WAPISIMO_API_KEY || '',
  process.env.WAPISIMO_PHONE_ID || ''
);

export const PHONE_ID = process.env.WAPISIMO_PHONE_ID || '';
