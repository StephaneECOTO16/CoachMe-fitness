import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, signJwt } from '@/lib/auth';
import { getPublicUrl } from '@/lib/aws-s3';

/**
 * GET /api/profile
 * Fetch the authenticated user's profile.
 * Returns prospect or coach profile based on user role.
 */
export async function GET(req: Request) {
    const payload = await requireAuth(req, undefined, { checkCoachStatus: false });
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
            user: { id: user.id, email: user.email, name: user.name, role: user.role, createdAt: user.createdAt, avatar: user.avatar ? getPublicUrl(user.avatar) : null }
        };

        if (user.role === 'COACH') {
            const coachProfile = await prisma.coachProfile.findUnique({
                where: { userId: user.id },
                include: { media: true, discipline: true, },
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
    const payload = await requireAuth(req, undefined, { checkCoachStatus: false });
    if (!payload) {
        return NextResponse.json({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
        }, { status: 401 });
    }

    try {
        const body = await req.json();
        const {
            name,
            avatar,
            ageRange,
            heightCm,
            weightKg,
            bio,
            discipline,
            portfolio,
            rateAmount,
            rateType,
            hourlyRate,
            address,
            city,
            country,
            experienceYears,
            instagram,
            facebook,
            tiktok,
            twitter,
            youtube
        } = body;

        if (avatar !== undefined && avatar !== null && typeof avatar !== 'string') {
            return NextResponse.json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'avatar must be a string or null' }
            }, { status: 400 });
        }

        // Validate numeric fields if provided
        if (heightCm !== undefined && heightCm !== null && (typeof heightCm !== 'number' || heightCm <= 0)) {
            return NextResponse.json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'heightCm must be a positive number' }
            }, { status: 400 });
        }
        if (weightKg !== undefined && weightKg !== null && (typeof weightKg !== 'number' || weightKg <= 0)) {
            return NextResponse.json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'weightKg must be a positive number' }
            }, { status: 400 });
        }
        if (rateAmount !== undefined && rateAmount !== null && (typeof rateAmount !== 'number' || rateAmount <= 0)) {
            return NextResponse.json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'rateAmount must be a positive number' }
            }, { status: 400 });
        }
        if (hourlyRate !== undefined && hourlyRate !== null && (typeof hourlyRate !== 'number' || hourlyRate <= 0)) {
            return NextResponse.json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'hourlyRate must be a positive number' }
            }, { status: 400 });
        }
        if (
            rateType !== undefined &&
            rateType !== null &&
            (typeof rateType !== 'string' || !['HOUR', 'WEEK', 'MONTH'].includes(rateType.toUpperCase()))
        ) {
            return NextResponse.json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'rateType must be one of HOUR, WEEK, MONTH' }
            }, { status: 400 });
        }
        if (experienceYears !== undefined && experienceYears !== null && (typeof experienceYears !== 'number' || experienceYears < 0)) {
            return NextResponse.json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'experienceYears must be 0 or more' }
            }, { status: 400 });
        }

        // Update user base fields
        const avatarValue =
            avatar === undefined ? undefined :
                avatar === null ? null :
                    avatar.trim().length === 0 ? null :
                        avatar;

        const user = await prisma.user.update({
            where: { id: payload.userId },
            data: { name: name || undefined, avatar: avatarValue },
            select: { id: true, email: true, name: true, role: true, createdAt: true, avatar: true },
        });

        interface UpdatedProfileResponse {
            user: Record<string, unknown>;
            coach?: Record<string, unknown>;
            prospect?: Record<string, unknown>;
        }

        const avatarUrl = user.avatar ? getPublicUrl(user.avatar) : null;
        const response: any = { user: { ...user, avatar: avatarUrl } };

        // Update role-specific profile
        if (user.role === 'COACH') {
            let disciplineId: number | undefined;
            if (discipline !== undefined) {
                if (typeof discipline !== 'string' || discipline.trim().length === 0) {
                    return NextResponse.json({
                        success: false,
                        error: { code: 'VALIDATION_ERROR', message: 'discipline must be a non-empty string' }
                    }, { status: 400 });
                }

                const disciplineRecord = await prisma.discipline.findUnique({
                    where: { name: discipline },
                });
                if (!disciplineRecord) {
                    return NextResponse.json({
                        success: false,
                        error: { code: 'VALIDATION_ERROR', message: 'Invalid discipline' }
                    }, { status: 400 });
                }

                disciplineId = disciplineRecord.id;
            }

            const legacyHourlyRateProvided = hourlyRate !== undefined;
            const effectiveRateAmount = rateAmount !== undefined ? rateAmount : hourlyRate;
            const effectiveRateType =
                rateType !== undefined
                    ? rateType.toUpperCase()
                    : legacyHourlyRateProvided
                        ? 'HOUR'
                        : undefined;

            const coachProfile = await prisma.coachProfile.update({
                where: { userId: user.id },
                data: {
                    bio: bio !== undefined ? bio : undefined,
                    disciplineId: disciplineId !== undefined ? disciplineId : undefined,
                    portfolio: portfolio !== undefined ? portfolio : undefined,
                    rateAmount: effectiveRateAmount !== undefined ? effectiveRateAmount : undefined,
                    rateType: effectiveRateType !== undefined ? effectiveRateType : undefined,
                    address: address !== undefined ? address : undefined,
                    city: city !== undefined ? city : undefined,
                    country: country !== undefined ? country : undefined,
                    experienceYears: experienceYears !== undefined ? experienceYears : undefined,
                    instagram: instagram !== undefined ? instagram : undefined,
                    facebook: facebook !== undefined ? facebook : undefined,
                    tiktok: tiktok !== undefined ? tiktok : undefined,
                    twitter: twitter !== undefined ? twitter : undefined,
                    youtube: youtube !== undefined ? youtube : undefined,
                },
                include: { media: true, discipline: true },
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

        const token = signJwt({
            userId: user.id,
            role: user.role,
            email: user.email,
            name: user.name,
            avatar: avatarUrl,
        });

        const apiResponse = NextResponse.json({ success: true, token, ...response });
        apiResponse.cookies.set('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7,
            path: '/',
        });

        return apiResponse;
    } catch (err: unknown) {
        console.error('[PUT /api/profile]', err);
        return NextResponse.json({ success: false, error: { code: 'INTERNAL_ERROR' } }, { status: 500 });
    }
}

export const PUT = updateProfile;
export const PATCH = updateProfile;
