import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { signJwt, comparePassword } from '@/lib/auth';
import { parseRequestBody, LoginRequestSchema } from '@/lib/schemas';
import { checkRateLimit } from '@/lib/rate-limit';
import { getPublicUrl } from '@/lib/aws-s3';

export async function POST(req: Request) {
    // Rate limiting: 5 login attempts per minute per IP
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0] || req.headers.get('x-real-ip') || 'unknown';
    const rateLimitKey = `login:${clientIp}`;

    if (!await checkRateLimit(rateLimitKey, 5, 60000)) {
        return NextResponse.json({
            success: false,
            error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many login attempts. Please try again later.' }
        }, { status: 429 });
    }

    // Validate request body using Zod schema
    const { data, error } = await parseRequestBody(req, LoginRequestSchema);
    if (error) {
        return NextResponse.json({ success: false, error }, { status: 400 });
    }

    if (!data) {
        return NextResponse.json({ success: false, error: { code: "INVALID_REQUEST" } }, { status: 400 });
    }

    const { email, password } = data;

    // Find user by email
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
        return NextResponse.json({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'Invalid credentials' }
        }, { status: 401 });
    }

    // Verify password
    const isValidPassword = await comparePassword(password, user.password);
    if (!isValidPassword) {
        return NextResponse.json({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'Invalid credentials' }
        }, { status: 401 });
    }

    // Generate JWT token with user info
    const avatar = user.avatar ? getPublicUrl(user.avatar) : null;
    const token = signJwt({
        userId: user.id,
        role: user.role,
        email: user.email,
        name: user.name,
        avatar,
    });

    // Set HTTP-only cookie
    const response = NextResponse.json({
        success: true,
        token,
        user: { id: user.id, email: user.email, name: user.name, role: user.role, avatar }
    });

    response.cookies.set('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/',
    });

    return response;
}
