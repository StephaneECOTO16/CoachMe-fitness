/**
 * src/lib/aws-s3.ts
 * Cloudflare R2 / S3-compatible storage utilities for presigned URLs and object storage.
 * Handles secure file uploads for media (certificates, images, videos).
 * Supports Cloudflare R2, AWS S3, and other S3-compatible services (MinIO, Spaces, etc).
 */

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Cloudflare R2 configuration
const s3Client = new S3Client({
    region: process.env.R2_REGION || 'auto', // R2 uses 'auto' region
    endpoint: process.env.R2_ENDPOINT, // e.g., https://<account_id>.r2.cloudflarestorage.com
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
    },
    // R2 requires path-style addressing for API operations
    forcePathStyle: true,
});

const BUCKET_NAME = process.env.R2_BUCKET_NAME || '';
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

// Allowed MIME types and their corresponding MediaType enum values
const ALLOWED_TYPES: Record<string, string> = {
    'application/pdf': 'CERTIFICATE',
    'image/jpeg': 'IMAGE',
    'image/png': 'IMAGE',
    'image/webp': 'IMAGE',
    'video/mp4': 'VIDEO',
    'video/quicktime': 'VIDEO',
};

export interface PresignedUrlResponse {
    url: string;
    key: string;
    expiresIn: number;
}

/**
 * Generate a presigned URL for S3 upload.
 * Validates file type and provides a time-limited URL for secure client uploads.
 * @param fileName - Original file name
 * @param mimeType - MIME type of the file
 * @param coachId - Coach ID (for organizing uploads)
 * @returns Object containing presigned URL, key, and expiration
 */
export async function generatePresignedUrl(
    fileName: string,
    mimeType: string,
    coachId: number,
    fileSize: number
): Promise<PresignedUrlResponse> {
    // Validate file type
    if (!ALLOWED_TYPES[mimeType]) {
        throw new Error(`MIME type ${mimeType} not allowed`);
    }

    // Validate file size
    if (fileSize > MAX_FILE_SIZE) {
        throw new Error(`File size exceeds limit of ${MAX_FILE_SIZE / 1024 / 1024}MB`);
    }

    // Validate bucket is configured
    if (!BUCKET_NAME) {
        throw new Error('R2_BUCKET_NAME not configured');
    }

    // Generate a unique key: /coaches/{coachId}/{timestamp}-{fileName}
    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const key = `coaches/${coachId}/${timestamp}-${sanitizedFileName}`;

    // Create presigned URL command
    const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        ContentType: mimeType,
    });

    // Generate URL valid for 1 hour (3600 seconds)
    const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

    return { url, key, expiresIn: 3600 };
}

/**
 * Get the public URL for a media file stored in R2.
 * Uses R2 public bucket domain (e.g., https://<bucket>.r2.dev or custom domain).
 * @param key - R2 object key
 * @returns Full URL to the object
 */
export function getPublicUrl(key: string): string {
    // Cloudflare R2 public bucket URL (must enable public access on bucket)
    // You can use either the default R2.dev domain or a custom domain
    const publicUrl = process.env.R2_PUBLIC_URL; // e.g., https://<bucket>.r2.dev

    if (!publicUrl) {
        throw new Error('R2_PUBLIC_URL not configured. Please set up a public R2 bucket domain.');
    }

    const base = publicUrl.replace(/\/$/, '');
    return `${base}/${key}`;
}
