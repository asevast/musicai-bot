import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { S3ClientConfig } from '@aws-sdk/client-s3';

let cachedClient: S3Client | null = null;
let cachedBucketName: string | null = null;

function getStorageConfig(): S3ClientConfig {
  const endpoint = process.env.MINIO_ENDPOINT || 'localhost:9000';
  const rootUser = process.env.MINIO_ROOT_USER || 'admin';
  const rootPassword = process.env.MINIO_ROOT_PASSWORD || 'minioadmin';
  const bucketName = process.env.MINIO_BUCKET_NAME || 'musicai-tracks';

  return {
    endpoint: `http://${endpoint}`,
    credentials: {
      accessKeyId: rootUser,
      secretAccessKey: rootPassword,
    },
    forcePathStyle: true,
    region: 'us-east-1',
    // Disable HTTP chunked encoding - send content-length
    tls: false,
  };
}

function getStorageService(): S3Client {
  if (!cachedClient) {
    const config = getStorageConfig();
    cachedClient = new S3Client(config);
    cachedBucketName = process.env.MINIO_BUCKET_NAME || 'musicai-tracks';
  }
  return cachedClient;
}

export class StorageService {
  private get s3Client(): S3Client {
    return getStorageService();
  }

  private get bucketName(): string {
    return cachedBucketName ?? (process.env.MINIO_BUCKET_NAME || 'musicai-tracks');
  }

  async uploadTrack(buffer: Buffer, trackId: string): Promise<string> {
    const storageKey = `tracks/${trackId}.mp3`;

    // Ensure buffer has explicit length
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

  async createBucketIfNotExists(): Promise<void> {
    try {
      const { S3Client, CreateBucketCommand } = await import('@aws-sdk/client-s3');
      const config = getStorageConfig();
      const client = new S3Client(config);

      await client.send(new CreateBucketCommand({ Bucket: this.bucketName }));
    } catch (error: unknown) {
      const err = error as { name?: string };
      if (err.name !== 'BucketAlreadyOwnedByYou') {
        throw error;
      }
    }
  }
}

export const storageService = new StorageService();
