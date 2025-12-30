/**
 * src/lib/validation.ts
 * Input validation utilities for API endpoints.
 * Provides safe parsing and validation for common data types.
 */

export interface ValidationResult<T> {
    success: boolean;
    data?: T;
    errors?: Record<string, string>;
}

/**
 * Validate email format.
 */
export function validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 254;
}

/**
 * Validate password strength.
 * Minimum 8 characters, at least one uppercase, one lowercase, one digit.
 */
export function validatePassword(password: string): boolean {
    if (password.length < 8) return false;
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasDigit = /\d/.test(password);
    return hasUpper && hasLower && hasDigit;
}

/**
 * Validate file MIME type for media uploads.
 */
export function isValidMediaMimeType(mimeType: string): boolean {
    const allowed = [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/webp',
        'video/mp4',
        'video/quicktime',
    ];
    return allowed.includes(mimeType);
}

/**
 * Validate file size (in bytes).
 * Default max: 10MB (10,485,760 bytes)
 */
export function isValidFileSize(fileSizeBytes: number, maxSizeBytes = 10485760): boolean {
    return fileSizeBytes > 0 && fileSizeBytes <= maxSizeBytes;
}

/**
 * Sanitize filename for S3 storage.
 * Removes special characters and limits length to prevent issues.
 */
export function sanitizeFileName(fileName: string): string {
    // Remove extension temporarily
    const lastDot = fileName.lastIndexOf('.');
    const name = lastDot > 0 ? fileName.substring(0, lastDot) : fileName;
    const ext = lastDot > 0 ? fileName.substring(lastDot) : '';

    // Sanitize name: lowercase, replace special chars with underscores
    const sanitized = name
        .toLowerCase()
        .replace(/[^a-z0-9._-]/g, '_')
        .replace(/_+/g, '_')
        .substring(0, 255);

    return sanitized + ext;
}

/**
 * Validate and sanitize file upload.
 * Returns object with validation result and sanitized filename.
 */
export function validateFileUpload(
    fileName: string,
    mimeType: string,
    fileSizeBytes: number,
    maxSizeBytes = 10485760,
): { valid: boolean; sanitizedFileName?: string; error?: string } {
    if (!fileName || fileName.trim().length === 0) {
        return { valid: false, error: 'File name is required' };
    }

    if (!mimeType || mimeType.trim().length === 0) {
        return { valid: false, error: 'MIME type is required' };
    }

    if (!isValidMediaMimeType(mimeType)) {
        return {
            valid: false,
            error: `Invalid file type. Allowed types: ${['PDF', 'JPEG', 'PNG', 'WebP', 'MP4', 'QuickTime'].join(', ')}`,
        };
    }

    if (!isValidFileSize(fileSizeBytes, maxSizeBytes)) {
        const maxMB = Math.round(maxSizeBytes / 1024 / 1024);
        return {
            valid: false,
            error: `File size cannot exceed ${maxMB}MB`,
        };
    }

    const sanitizedFileName = sanitizeFileName(fileName);
    return { valid: true, sanitizedFileName };
}

/**
 * Validate age range string (e.g., "25-34").
 */
export function validateAgeRange(ageRange: string): boolean {
    const ageRegex = /^\d{1,2}-\d{1,2}$/;
    if (!ageRegex.test(ageRange)) return false;
    const [min, max] = ageRange.split('-').map(Number);
    return min >= 13 && max <= 120 && min <= max;
}

/**
 * Validate height in centimeters.
 */
export function validateHeight(heightCm: number): boolean {
    return heightCm >= 50 && heightCm <= 300;
}

/**
 * Validate weight in kilograms.
 */
export function validateWeight(weightKg: number): boolean {
    return weightKg >= 20 && weightKg <= 500;
}
