import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { env } from '../config/env.js';

export const useS3 = Boolean(env.S3_BUCKET_NAME);

let s3Client: S3Client | undefined;

if (useS3) {
  s3Client = new S3Client({
    region: env.AWS_REGION || 'ap-south-1',
    credentials: (env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY) ? {
      accessKeyId: env.AWS_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    } : undefined,
  });
}

function getLocalStorageRoot() {
  return path.join(process.cwd(), 'storage');
}

export const StorageService = {
  async saveFile(key: string, content: Buffer, mimeType?: string): Promise<void> {
    if (useS3 && s3Client) {
      await s3Client.send(new PutObjectCommand({
        Bucket: env.S3_BUCKET_NAME,
        Key: key,
        Body: content,
        ContentType: mimeType,
      }));
      return;
    }

    const filePath = path.join(getLocalStorageRoot(), key);
    const directory = path.dirname(filePath);

    if (!filePath.startsWith(getLocalStorageRoot())) {
      throw new Error('Invalid file path');
    }

    await mkdir(directory, { recursive: true });
    await writeFile(filePath, content);
  },

  async getFileBuffer(key: string): Promise<Buffer> {
    if (useS3 && s3Client) {
      const response = await s3Client.send(new GetObjectCommand({
        Bucket: env.S3_BUCKET_NAME,
        Key: key,
      }));
      
      if (!response.Body) {
         throw new Error('File not found in S3');
      }
      
      const byteArray = await response.Body.transformToByteArray();
      return Buffer.from(byteArray);
    }

    const filePath = path.join(getLocalStorageRoot(), key);
    
    if (!filePath.startsWith(getLocalStorageRoot())) {
      throw new Error('Invalid file path');
    }
    
    await access(filePath);
    return readFile(filePath);
  },

  async getDownloadUrl(key: string, apiFallbackPath: string, expiresInSeconds: number = 900): Promise<string> {
    if (useS3 && s3Client) {
      const command = new GetObjectCommand({
        Bucket: env.S3_BUCKET_NAME,
        Key: key,
      });
      return getSignedUrl(s3Client, command, { expiresIn: expiresInSeconds });
    }
    
    return env.STORAGE_PUBLIC_BASE_URL ? `${env.STORAGE_PUBLIC_BASE_URL.replace(/\/+$/, '')}${apiFallbackPath}` : apiFallbackPath;
  },
  
  async getLocalFilePath(key: string): Promise<string> {
    if (useS3) {
      throw new Error('Local file path is not available when S3 is enabled');
    }
    
    const filePath = path.join(getLocalStorageRoot(), key);
    
    if (!filePath.startsWith(getLocalStorageRoot())) {
      throw new Error('Invalid file path');
    }
    
    return filePath;
  }
};
