import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

class R2Storage {
  private client: S3Client | null = null;
  private bucketName: string;
  private publicUrl: string;

  constructor() {
    this.bucketName = process.env.R2_BUCKET_NAME || '';
    this.publicUrl = process.env.R2_PUBLIC_URL || '';

    // Only initialize if all credentials are present
    if (
      process.env.R2_ACCOUNT_ID &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      this.bucketName
    ) {
      this.client = new S3Client({
        region: 'auto',
        endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: process.env.R2_ACCESS_KEY_ID,
          secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
        },
      });
    }
  }

  isConfigured(): boolean {
    return this.client !== null && this.bucketName !== '' && this.publicUrl !== '';
  }

  async uploadFile(
    file: Buffer,
    filename: string,
    contentType: string
  ): Promise<string> {
    if (!this.client) {
      throw new Error('R2 storage is not configured');
    }

    const key = `uploads/${filename}`;

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: file,
      ContentType: contentType,
    });

    await this.client.send(command);

    // Return public URL
    return `${this.publicUrl}/${key}`;
  }

  getConfigurationInstructions(): string {
    return `
R2 Storage is not configured. Please add the following environment variables:

1. R2_ACCOUNT_ID - Your Cloudflare account ID
2. R2_ACCESS_KEY_ID - Your R2 access key ID
3. R2_SECRET_ACCESS_KEY - Your R2 secret access key
4. R2_BUCKET_NAME - Your R2 bucket name
5. R2_PUBLIC_URL - Your R2 bucket public URL (e.g., https://pub-xxxxx.r2.dev)

To set up R2:
1. Go to Cloudflare Dashboard > R2
2. Create a new bucket
3. Create API tokens with "Object Read & Write" permissions
4. Enable public access to your bucket or set up a custom domain
5. Add the credentials to your .env file
    `.trim();
  }
}

export const r2Storage = new R2Storage();
