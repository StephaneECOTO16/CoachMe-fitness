import { NextResponse, after } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { getPublicUrl } from '@/lib/storage';
import { sendMail, getCoachApprovedTemplate, getCoachRejectedTemplate } from '@/lib/mail/index';
import { sendNotification } from '@/lib/notifications';

/**
 * GET /api/admin/coaches/[userId]
 * Get detailed information about a specific coach (admin only).
 */
export async function GET(req: Request, { params }: { params: Promise<{ userId: string }> }) {
    const payload = await requireAuth(req, { allowedRoles: ['ADMIN'] });
    if (!payload) {
        return NextResponse.json({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'Admin access required' }
        }, { status: 401 });
    }

    const { userId } = await params;

    try {
        const coach = await prisma.coachProfile.findUnique({
            where: { userId: userId }, // Query by unique User UUID
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true,
                        avatar: true,
                        createdAt: true,
                    }
                },
                media: true,
                discipline: true,
                chatsAsCoach: {
                    include: {
                        client: {
                            include: {
                                user: { select: { id: true, name: true, email: true } }
                            }
                        }
                    }
                }
            }
        });

        if (!coach) {
            return NextResponse.json({
                success: false,
                error: { code: 'NOT_FOUND' }
            }, { status: 404 });
        }

        const coachWithUrls = {
            ...coach,
            user: {
                ...coach.user,
                avatar: coach.user.avatar ? getPublicUrl(coach.user.avatar) : null,
            },
            media: coach.media.map(m => ({
                ...m,
                url: getPublicUrl(m.url)
            })),
            discipline: coach.discipline.name,
        };

        return NextResponse.json({ success: true, coach: coachWithUrls });
    } catch (err: unknown) {
        console.error('[GET /api/admin/coaches/:userId]', err);
        return NextResponse.json({
            success: false,
            error: { code: 'INTERNAL_ERROR' }
        }, { status: 500 });
    }
}

/**
 * PATCH /api/admin/coaches/[userId]
 * Update coach status (approve/reject) (admin only).
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ userId: string }> }) {
    const payload = await requireAuth(req, { allowedRoles: ['ADMIN'] });
    if (!payload) {
        return NextResponse.json({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'Admin access required' }
        }, { status: 401 });
    }

    const { userId } = await params;

    try {
        const { status, reason } = await req.json();

        if (!status || !['APPROVED', 'REJECTED', 'PENDING'].includes(status)) {
            return NextResponse.json({
                success: false,
                error: { code: 'INVALID_INPUT', message: 'Valid status required (APPROVED, REJECTED, PENDING)' }
            }, { status: 400 });
        }

        const coach = await prisma.coachProfile.update({
            where: { userId: userId }, // Update by unique User UUID
            data: { status, statusReason: status === 'REJECTED' ? reason : null },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    }
                }
            }
        });

        // Audit trail — this endpoint used to skip it entirely, unlike the
        // dedicated /approve and /reject routes.
        await prisma.adminReview.create({
            data: {
                coachId: coach.id,
                adminId: payload.userId,
                action: status,
                comment: status === 'REJECTED' ? reason : undefined,
            },
        });

        // Email + push notification — same side effects the dedicated
        // /approve and /reject routes already perform, now applied here
        // too so the coach detail page's status buttons behave identically.
        if (status === 'APPROVED' || status === 'REJECTED') {
            after(async () => {
                if (coach.user.email) {
                    await sendMail(
                        status === 'APPROVED'
                            ? {
                                to: coach.user.email,
                                subject: 'Your Coach Profile is Approved!',
                                html: getCoachApprovedTemplate(coach.user.name || 'Coach'),
                            }
                            : {
                                to: coach.user.email,
                                subject: 'Update on your Coach Application',
                                html: getCoachRejectedTemplate(coach.user.name || 'Coach'),
                            }
                    ).catch((err) => console.error('[PATCH /api/admin/coaches/:userId] sendMail failed:', err));
                }

                await sendNotification(
                    status === 'APPROVED'
                        ? {
                            userId: coach.user.id,
                            title: 'Profil Coach Validé 🎉',
                            body: 'Félicitations, votre profil a été approuvé par un administrateur.',
                            type: 'ACCOUNT_REVIEW',
                            url: '/coach/dashboard',
                        }
                        : {
                            userId: coach.user.id,
                            title: 'Mise à jour de votre candidature',
                            body: 'Votre profil de coach a été examiné et requiert votre attention.',
                            type: 'ACCOUNT_REVIEW',
                            url: '/coach/dashboard',
                        }
                );
            });
        }

        return NextResponse.json({ success: true, coach });
    } catch (err: unknown) {
        console.error('[PATCH /api/admin/coaches/:userId]', err);
        return NextResponse.json({
            success: false,
            error: { code: 'INTERNAL_ERROR' }
        }, { status: 500 });
    }
}
