import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  CreateBucketCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { S3ClientConfig } from '@aws-sdk/client-s3';
import { Storage } from '@google-cloud/storage';

// Storage interface - unified API for both S3/MinIO (dev) and GCS (prod)
export interface IStorageService {
  uploadTrack(buffer: Buffer, trackId: string): Promise<string>;
  deleteTrack(storageKey: string): Promise<void>;
  getPresignedUrl(storageKey: string, expiresIn?: number): Promise<string>;
  exists(storageKey: string): Promise<boolean>;
  getFileBuffer(storageKey: string): Promise<Buffer>;
  getPublicUrl(storageKey: string): string;
}

// Development storage using MinIO (S3-compatible)
class MinioStorageService implements IStorageService {
  private cachedClient: S3Client | null = null;
  private bucketName: string;
  private publicUrlBase: string;

  constructor() {
    this.bucketName =
      process.env.STORAGE_BUCKET || process.env.MINIO_BUCKET_NAME || 'musicai-tracks';
    this.publicUrlBase =
      process.env.STORAGE_PUBLIC_URL ||
      `http://${process.env.MINIO_ENDPOINT || 'localhost:9000'}/${this.bucketName}`;
  }

  private get s3Client(): S3Client {
    if (!this.cachedClient) {
      const endpoint =
        process.env.STORAGE_ENDPOINT || process.env.MINIO_ENDPOINT || 'localhost:9000';
      const accessKey = process.env.STORAGE_ACCESS_KEY || process.env.MINIO_ROOT_USER || 'admin';
      const secretKey =
        process.env.STORAGE_SECRET_KEY || process.env.MINIO_ROOT_PASSWORD || 'minioadmin';

      const config: S3ClientConfig = {
        endpoint: endpoint.startsWith('http') ? endpoint : `http://${endpoint}`,
        credentials: {
          accessKeyId: accessKey,
          secretAccessKey: secretKey,
        },
        forcePathStyle: true, // Required for MinIO
        region: 'us-east-1',
        tls: false,
      };

      this.cachedClient = new S3Client(config);
    }
    return this.cachedClient;
  }

  async uploadTrack(buffer: Buffer, trackId: string): Promise<string> {
    const storageKey = `tracks/${trackId}.mp3`;
    const body = Buffer.from(buffer);

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: storageKey,
      Body: body,
      ContentType: 'audio/mpeg',
      ContentLength: body.length,
    });

    await this.s3Client.send(command);
    return storageKey;
  }

  async deleteTrack(storageKey: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: storageKey,
    });

    await this.s3Client.send(command);
  }

  async getPresignedUrl(storageKey: string, expiresIn = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: storageKey,
    });

    return getSignedUrl(this.s3Client, command, { expiresIn });
  }

  async exists(storageKey: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: storageKey,
      });

      await this.s3Client.send(command);
      return true;
    } catch {
      return false;
    }
  }

  async getFileBuffer(storageKey: string): Promise<Buffer> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: storageKey,
    });

    const response = await this.s3Client.send(command);
    const stream = response.Body as any;
    const chunks: Buffer[] = [];

    for await (const chunk of stream) {
      chunks.push(chunk);
    }

    return Buffer.concat(chunks);
  }

  getPublicUrl(storageKey: string): string {
    return `${this.publicUrlBase}/${storageKey}`;
  }

  async createBucketIfNotExists(): Promise<void> {
    try {
      await this.s3Client.send(new CreateBucketCommand({ Bucket: this.bucketName }));
    } catch (error: unknown) {
      const err = error as { name?: string };
      if (err.name !== 'BucketAlreadyOwnedByYou' && err.name !== 'BucketAlreadyExists') {
        throw error;
      }
    }
  }
}

// Production storage using Google Cloud Storage
class GcsStorageService implements IStorageService {
  private storage: Storage;
  private bucketName: string;

  constructor() {
    // Uses Application Default Credentials (ADC)
    this.storage = new Storage();
    this.bucketName = process.env.GCS_BUCKET_NAME || process.env.STORAGE_BUCKET || 'musicai-tracks';
  }

  private get bucket() {
    return this.storage.bucket(this.bucketName);
  }

  async uploadTrack(buffer: Buffer, trackId: string): Promise<string> {
    const storageKey = `tracks/${trackId}.mp3`;
    const file = this.bucket.file(storageKey);

    await file.save(buffer, {
      contentType: 'audio/mpeg',
      metadata: {
        trackId,
      },
    });

    return storageKey;
  }

  async deleteTrack(storageKey: string): Promise<void> {
    await this.bucket.file(storageKey).delete();
  }

  async getPresignedUrl(storageKey: string, expiresIn = 3600): Promise<string> {
    const file = this.bucket.file(storageKey);
    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + expiresIn * 1000,
    });
    return url;
  }

  async exists(storageKey: string): Promise<boolean> {
    const [exists] = await this.bucket.file(storageKey).exists();
    return exists;
  }

  async getFileBuffer(storageKey: string): Promise<Buffer> {
    const file = this.bucket.file(storageKey);
    const [buffer] = await file.download();
    return buffer;
  }

  getPublicUrl(storageKey: string): string {
    const publicBase = process.env.GCS_PUBLIC_BASE_URL || process.env.STORAGE_PUBLIC_URL;
    if (publicBase) {
      return `${publicBase}/${storageKey}`;
    }
    return `https://storage.googleapis.com/${this.bucketName}/${storageKey}`;
  }

  async createBucketIfNotExists(): Promise<void> {
    const [exists] = await this.storage.bucket(this.bucketName).exists();
    if (!exists) {
      await this.storage.createBucket(this.bucketName);
    }
  }
}

// Factory function to create appropriate storage service based on NODE_ENV
function createStorageService(): IStorageService {
  const nodeEnv = process.env.NODE_ENV || 'development';

  if (nodeEnv === 'production') {
    return new GcsStorageService();
  }

  // development, staging, or any other non-production environment
  return new MinioStorageService();
}

// Singleton instance
const storageService = createStorageService();

// Export both the service and individual classes for testing
export { MinioStorageService, GcsStorageService, storageService };
export default storageService;
