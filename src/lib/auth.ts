import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';
import bcrypt from 'bcrypt';
import { cookies } from 'next/headers';

// JWT_SECRET is required in all environments
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable must be set. Please configure it in your .env.local file.');
}

export function signJwt(payload: object, expiresIn = '7d') {
    return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

export function verifyJwt(token?: string) {
    if (!token) return null;
    try {
        return jwt.verify(token, JWT_SECRET) as any;
    } catch (e) {
        return null;
    }
}

/**
 * Safely extract the token from an incoming request.
 * Checks both Authorization header (Bearer token) and HTTP-only cookie.
 * Works for both `Request` and `NextRequest` server handlers.
 */
export function getTokenFromHeader(req: Request | NextRequest) {
    // Try to get token from Authorization header first (for backwards compatibility)
    // @ts-ignore - both Request and NextRequest expose `.headers.get` in Next.js
    const auth = (req as any).headers?.get?.('authorization') || '';
    if (auth) {
        const parts = auth.split(' ');
        if (parts.length === 2 && parts[0] === 'Bearer') {
            return parts[1];
        }
    }

    // Try to get token from HTTP-only cookie
    try {
        const cookieStore = cookies();
        const tokenCookie = cookieStore.get('token');
        if (tokenCookie) {
            return tokenCookie.value;
        }
    } catch (error) {
        // cookies() can only be called in server components/route handlers
        // If it fails, fall back to reading from request headers
        const cookieHeader = req.headers.get('cookie');
        if (cookieHeader) {
            const match = cookieHeader.match(/token=([^;]+)/);
            if (match) {
                return match[1];
            }
        }
    }

    return null;
}

export async function hashPassword(password: string) {
    return bcrypt.hash(password, 10);
}

export async function comparePassword(plain: string, hashed: string) {
    return bcrypt.compare(plain, hashed);
}

/**
 * Helper to require authentication inside route handlers. Returns the token payload
 * or `null` if unauthenticated. Optionally check for allowed roles.
 */
export function requireAuth(req: Request | NextRequest, allowedRoles?: string[]) {
    const token = getTokenFromHeader(req);
    const payload = verifyJwt(token || undefined);
    if (!payload) return null;
    if (allowedRoles && !allowedRoles.includes(payload.role)) return null;
    return payload;
}
