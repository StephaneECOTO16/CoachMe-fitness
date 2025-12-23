import jwt, { SignOptions } from 'jsonwebtoken';
import { NextRequest } from 'next/server';
import bcrypt from 'bcrypt';
import { cookies } from 'next/headers';

// JWT_SECRET is required in all environments
function getJwtSecret(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT_SECRET environment variable must be set. Please configure it in your .env file.');
    }
    return secret;
}

export function signJwt(payload: object, expiresIn: string | number = '7d'): string {
    return jwt.sign(payload, getJwtSecret(), { expiresIn: expiresIn as any });
}

export function verifyJwt(token?: string) {
    if (!token) return null;
    try {
        return jwt.verify(token, getJwtSecret()) as any;
    } catch (e) {
        return null;
    }
}

/**
 * Safely extract the token from an incoming request.
 * Checks both Authorization header (Bearer token) and HTTP-only cookie.
 * Works for both `Request` and `NextRequest` server handlers.
 */
export async function getTokenFromHeader(req: Request | NextRequest) {
    // Try to get token from Authorization header first (for backwards compatibility)
    const auth = req.headers.get('authorization') || '';
    if (auth) {
        const parts = auth.split(' ');
        if (parts.length === 2 && parts[0] === 'Bearer') {
            return parts[1];
        }
    }

    // Try to get token from HTTP-only cookie
    try {
        const cookieStore = await cookies();
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
 * or `null` if unauthenticated. Optionally check for allowed roles and coach approval status.
 */
export async function requireAuth(
    req: Request | NextRequest,
    allowedRoles?: string[],
    options: { checkCoachStatus?: boolean } = { checkCoachStatus: true }
) {
    const token = await getTokenFromHeader(req);
    const payload = verifyJwt(token || undefined);

    if (!payload) return null;

    // Check role restrictions
    if (allowedRoles && !allowedRoles.includes(payload.role)) return null;

    // Check Coach status if applicable
    if (payload.role === 'COACH' && options.checkCoachStatus) {
        const { prisma } = await import('./prisma');
        const coach = await prisma.coachProfile.findUnique({
            where: { userId: payload.userId },
            select: { status: true }
        });

        if (!coach || coach.status !== 'APPROVED') {
            return null; // Reject if not approved
        }
    }

    return payload;
}
