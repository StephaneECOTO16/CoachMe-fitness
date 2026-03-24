/**
 * src/lib/storage/index.ts
 *
 * Cloudflare R2 (S3-compatible) storage utilities.
 *
 * Key security design:
 *  - Presigned URLs are generated server-side with a server-generated key.
 *    The client receives the key alongside the URL, then POSTs the key back
 *    to register the upload. The server validates the key prefix on
 *    registration so a client cannot claim another user's files.
 *  - getPublicUrl() returns a placeholder on missing config rather than
 *    throwing, so a misconfigured R2_PUBLIC_URL never crashes pages.
 */

import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

// ─── Client singleton ─────────────────────────────────────────────────────────

const s3 = new S3Client({
  region: env.R2_REGION,
  endpoint: env.R2_ENDPOINT,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true, // Required for R2
});

const BUCKET = env.R2_BUCKET_NAME;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PresignedResult {
  /** Pre-signed PUT URL — client uploads directly to R2 */
  uploadUrl: string;
  /** R2 object key — returned to client, then POSTed back to register the upload */
  key: string;
  /** Seconds until the presigned URL expires */
  expiresIn: number;
}

// ─── Allowed types ────────────────────────────────────────────────────────────

const MEDIA_ALLOWED_MIME_TYPES: Record<string, string> = {
  "application/pdf": "CERTIFICATE",
  "image/jpeg": "IMAGE",
  "image/png": "IMAGE",
  "image/webp": "IMAGE",
  "video/mp4": "VIDEO",
  "video/quicktime": "VIDEO",
  "video/webm": "VIDEO",
};

const AVATAR_ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const MAX_MEDIA_BYTES = 50 * 1024 * 1024;  // 50 MB
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;  // 5 MB

// ─── Key generators ───────────────────────────────────────────────────────────

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

/** Server-generated R2 key for coach media. Client never specifies this. */
export function coachMediaKey(coachProfileId: number, filename: string): string {
  return `coaches/${coachProfileId}/${Date.now()}-${sanitizeFilename(filename)}`;
}

/** Server-generated R2 key for user avatars. */
export function avatarKey(userId: string, filename: string): string {
  return `users/${userId}/avatar/${Date.now()}-${sanitizeFilename(filename)}`;
}

/** Server-generated R2 key for discipline cover images. */
export function disciplineImageKey(filename: string): string {
  return `disciplines/${Date.now()}-${sanitizeFilename(filename)}`;
}

// ─── Presigned URL generators ─────────────────────────────────────────────────

/**
 * Generates a pre-signed PUT URL for coach media (certs, images, videos).
 * Key is generated server-side — client cannot influence the path.
 */
export async function generateCoachMediaPresignedUrl(
  coachProfileId: number,
  filename: string,
  mimeType: string,
  fileSize: number
): Promise<PresignedResult> {
  if (!MEDIA_ALLOWED_MIME_TYPES[mimeType]) {
    throw new Error(`File type not allowed: ${mimeType}`);
  }
  if (fileSize > MAX_MEDIA_BYTES) {
    throw new Error("File exceeds the 50 MB size limit");
  }

  const key = coachMediaKey(coachProfileId, filename);
  const uploadUrl = await getSignedUrl(
    s3,
    new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: mimeType }),
    { expiresIn: 3600 }
  );

  return { uploadUrl, key, expiresIn: 3600 };
}

/**
 * Generates a pre-signed PUT URL for user avatar uploads.
 */
export async function generateAvatarPresignedUrl(
  userId: string,
  filename: string,
  mimeType: string,
  fileSize: number
): Promise<PresignedResult> {
  if (!AVATAR_ALLOWED_MIME_TYPES.has(mimeType)) {
    throw new Error("Avatar must be JPEG, PNG, or WebP");
  }
  if (fileSize > MAX_AVATAR_BYTES) {
    throw new Error("Avatar exceeds the 5 MB size limit");
  }

  const key = avatarKey(userId, filename);
  const uploadUrl = await getSignedUrl(
    s3,
    new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: mimeType }),
    { expiresIn: 3600 }
  );

  return { uploadUrl, key, expiresIn: 3600 };
}

/**
 * Generates a pre-signed PUT URL for discipline cover images (admin only).
 */
export async function generateDisciplineImagePresignedUrl(
  filename: string,
  mimeType: string,
  fileSize: number
): Promise<PresignedResult> {
  if (!AVATAR_ALLOWED_MIME_TYPES.has(mimeType)) {
    throw new Error("Discipline image must be JPEG, PNG, or WebP");
  }
  if (fileSize > MAX_AVATAR_BYTES) {
    throw new Error("Image exceeds the 5 MB size limit");
  }

  const key = disciplineImageKey(filename);
  const uploadUrl = await getSignedUrl(
    s3,
    new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: mimeType }),
    { expiresIn: 3600 }
  );

  return { uploadUrl, key, expiresIn: 3600 };
}

// ─── Public URL resolver ──────────────────────────────────────────────────────

/**
 * Resolves an R2 object key to its full public URL.
 *
 * Returns a safe placeholder if R2_PUBLIC_URL is not configured instead
 * of throwing — a missing var must never crash a page render.
 * Already-absolute URLs (legacy data) are passed through unchanged.
 */
export function getPublicUrl(key: string): string {
  if (!key) return "/placeholder-image.png";

  // Already a full URL — legacy data or external images
  if (key.startsWith("http://") || key.startsWith("https://")) return key;

  const base = env.R2_PUBLIC_URL?.replace(/\/$/, "");
  if (!base) {
    logger.warn({ key }, "R2_PUBLIC_URL not configured — returning placeholder");
    return "/placeholder-image.png";
  }

  return `${base}/${key.replace(/^\//, "")}`;
}

// ─── Deletion ─────────────────────────────────────────────────────────────────

/**
 * Deletes an object from R2. Logs errors but never throws —
 * a failed storage deletion must not roll back a successful DB operation.
 */
export async function deleteFromStorage(key: string): Promise<void> {
  // Skip full URLs (not an R2 key we own) and empty values
  if (!key || key.startsWith("http://") || key.startsWith("https://")) return;

  try {
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
    logger.info({ key }, "Storage object deleted");
  } catch (err) {
    logger.error(
      { err, key },
      "Failed to delete storage object — manual cleanup may be required"
    );
  }
}

// ─── Key validation ───────────────────────────────────────────────────────────

/**
 * Validates that an R2 key belongs to a specific coach's directory.
 * Used server-side when a client POSTs a key to register an upload,
 * preventing path traversal and cross-user file claims.
 */
export function validateCoachMediaKey(
  key: string,
  coachProfileId: number
): boolean {
  return (
    typeof key === "string" &&
    key.startsWith(`coaches/${coachProfileId}/`) &&
    !key.includes("..") // No path traversal
  );
}
