/**
 * POST /api/coach/onboarding → "Devenir coach"
 *
 * Converts the authenticated PROSPECT account into a COACH account with a
 * PENDING profile awaiting admin approval. The user keeps the same email,
 * password and history — no second account is needed.
 */

import { NextResponse, after } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import { parseRequestBody, BecomeCoachSchema } from '@/lib/validation/schemas';
import { sendNotification } from '@/lib/notifications';
import { sendMail, getCoachWelcomeTemplate, getAdminNewCoachAlertTemplate } from '@/lib/mail/index';
import { becomeCoach } from '@/services/user.service';

export async function POST(req: Request) {
    const payload = await requireAuth(req, { allowedRoles: ['PROSPECT'] });
    if (!payload) {
        return NextResponse.json({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
        }, { status: 401 });
    }

    const { data, error } = await parseRequestBody(req, BecomeCoachSchema);
    if (error || !data) {
        return NextResponse.json({ success: false, error }, { status: 400 });
    }

    let user;
    try {
        user = await becomeCoach(payload.userId, data);
    } catch (err: unknown) {
        // Concurrent double-submit: the unique userId on CoachProfile wins
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
            return NextResponse.json({
                success: false,
                error: { code: 'ALREADY_EXISTS', message: 'Account is already a coach account' }
            }, { status: 409 });
        }
        const e = err as { code?: string; message?: string; status?: number };
        if (!e.status) logger.error({ err, userId: payload.userId }, 'Become coach failed');
        return NextResponse.json({
            success: false,
            error: { code: e.code ?? 'INTERNAL_ERROR', message: e.message ?? 'Failed to become coach' }
        }, { status: e.status ?? 500 });
    }

    const displayName = user.name ?? user.email;

    // Emails + notifications run via after(): on Vercel the function can be
    // frozen as soon as the response is sent, killing un-awaited promises.
    after(async () => {
        await Promise.allSettled([
            sendMail({
                to: user.email,
                subject: 'Welcome to CoachMe!',
                html: getCoachWelcomeTemplate(user.name ?? 'Coach'),
            }),
            sendMail({
                to: env.ADMIN_EMAIL,
                subject: 'New Coach Application Pending',
                html: getAdminNewCoachAlertTemplate(displayName, user.email),
            }),
            sendNotification({
                userId: user.id,
                title: 'Candidature reçue 🏋️',
                body: "Votre profil coach est en cours d'examen. Vous serez notifié dès qu'il sera approuvé.",
                type: 'SYSTEM',
                url: '/coach/dashboard'
            }),
        ]);

        try {
            const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } });
            await Promise.allSettled(admins.map((admin) => sendNotification({
                userId: admin.id,
                title: 'Nouvelle candidature coach',
                body: `${displayName} (ancien client) souhaite devenir coach et attend votre validation.`,
                type: 'ACCOUNT_REVIEW',
                url: '/admin/coaches'
            })));
        } catch (err) {
            logger.error({ err }, '[POST /api/coach/onboarding] admin notification failed');
        }
    });

    return NextResponse.json({
        success: true,
        user: { id: user.id, email: user.email, name: user.name, role: user.role }
    }, { status: 201 });
}
