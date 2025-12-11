import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

/**
 * GET /api/profile
 * Fetch the authenticated user's profile.
 * Returns prospect or coach profile based on user role.
 */
export async function GET(req: Request) {
    const payload = requireAuth(req);
    if (!payload) return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED' } }, { status: 401 });

    try {
        const user = await prisma.user.findUnique({
            where: { id: payload.userId },
        });

        if (!user) return NextResponse.json({ success: false, error: { code: 'NOT_FOUND' } }, { status: 404 });

        interface ProfileResponse {
            user: { id: number; email: string; name: string | null; role: string };
            coach?: Record<string, unknown>;
            prospect?: Record<string, unknown>;
        }

        const response: any = {
            user: { id: user.id, email: user.email, name: user.name, role: user.role, createdAt: user.createdAt }
        };

        if (user.role === 'COACH') {
            const coachProfile = await prisma.coachProfile.findUnique({
                where: { userId: user.id },
                include: { media: true },
            });
            response.profile = coachProfile || undefined;
        } else if (user.role === 'PROSPECT') {
            const clientProfile = await prisma.clientProfile.findUnique({
                where: { userId: user.id },
            });
            response.profile = clientProfile || undefined;
        }

        return NextResponse.json({ success: true, ...response });
    } catch (err: unknown) {
        console.error('[GET /api/profile]', err);
        return NextResponse.json({ success: false, error: { code: 'INTERNAL_ERROR' } }, { status: 500 });
    }
}

/**
 * PUT /api/profile
 * Update the authenticated user's profile.
 * Updates user name and role-specific profile fields.
 */
async function updateProfile(req: Request) {
    const payload = requireAuth(req);
    if (!payload) {
        return NextResponse.json({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
        }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { name, ageRange, heightCm, weightKg, bio, discipline, portfolio } = body;

        // Validate numeric fields if provided
        if (heightCm !== undefined && (typeof heightCm !== 'number' || heightCm <= 0)) {
            return NextResponse.json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'heightCm must be a positive number' }
            }, { status: 400 });
        }
        if (weightKg !== undefined && (typeof weightKg !== 'number' || weightKg <= 0)) {
            return NextResponse.json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'weightKg must be a positive number' }
            }, { status: 400 });
        }

        // Update user base fields
        const user = await prisma.user.update({
            where: { id: payload.userId },
            data: { name: name || undefined },
        });

        interface UpdatedProfileResponse {
            user: Record<string, unknown>;
            coach?: Record<string, unknown>;
            prospect?: Record<string, unknown>;
        }

        const response: any = { user };

        // Update role-specific profile
        if (user.role === 'COACH') {
            const coachProfile = await prisma.coachProfile.update({
                where: { userId: user.id },
                data: {
                    bio: bio !== undefined ? bio : undefined,
                    discipline: discipline !== undefined ? discipline : undefined,
                    portfolio: portfolio !== undefined ? portfolio : undefined,
                },
                include: { media: true },
            });
            response.profile = coachProfile;
        } else if (user.role === 'PROSPECT') {
            const clientProfile = await prisma.clientProfile.update({
                where: { userId: user.id },
                data: {
                    ageRange: ageRange !== undefined ? ageRange : undefined,
                    heightCm: heightCm !== undefined ? heightCm : undefined,
                    weightKg: weightKg !== undefined ? weightKg : undefined,
                    goals: body.goals !== undefined ? body.goals : undefined,
                },
            });
            response.profile = clientProfile;
        }

        return NextResponse.json({ success: true, ...response });
    } catch (err: unknown) {
        console.error('[PUT /api/profile]', err);
        return NextResponse.json({ success: false, error: { code: 'INTERNAL_ERROR' } }, { status: 500 });
    }
}

export const PUT = updateProfile;
export const PATCH = updateProfile;
