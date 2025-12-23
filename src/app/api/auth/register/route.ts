import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from '@/lib/auth';
import { parseRequestBody, RegisterRequestSchema } from '@/lib/schemas';
import { checkRateLimit } from '@/lib/rate-limit';
import { sendMail, getProspectWelcomeTemplate, getCoachWelcomeTemplate, getAdminNewCoachAlertTemplate } from "@/lib/mail";

export async function POST(req: Request) {
    // Rate limiting: 3 registration attempts per 5 minutes per IP
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0] || req.headers.get('x-real-ip') || 'unknown';
    const rateLimitKey = `register:${clientIp}`;

    if (!checkRateLimit(rateLimitKey, 3, 300000)) {
        return NextResponse.json({
            success: false,
            error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many registration attempts. Please try again later.' }
        }, { status: 429 });
    }

    // Validate request body using Zod schema
    const { data, error } = await parseRequestBody(req, RegisterRequestSchema);
    if (error) {
        return NextResponse.json({ success: false, error }, { status: 400 });
    }

    if (!data) {
        return NextResponse.json({ success: false, error: { code: "INVALID_REQUEST" } }, { status: 400 });
    }

    const { email, password, name, accountType } = data;

    // Check if user already exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
        return NextResponse.json({
            success: false,
            error: { code: 'ALREADY_EXISTS', message: 'Email already registered' }
        }, { status: 409 });
    }

    // Hash password
    const hashed = await hashPassword(password);

    try {
        if (accountType === 'PROSPECT') {
            // Create PROSPECT user with ClientProfile in a transaction
            const user = await prisma.$transaction(async (tx) => {
                const newUser = await tx.user.create({
                    data: {
                        email,
                        password: hashed,
                        role: 'PROSPECT',
                        name,
                    }
                });

                // Create ClientProfile with optional fields
                await tx.clientProfile.create({
                    data: {
                        userId: newUser.id,
                        ageRange: data.ageRange || null,
                        heightCm: data.heightCm || null,
                        weightKg: data.weightKg || null,
                        goals: data.goals || null,
                    }
                });

                return newUser;
            });

            // Send Welcome Email (Non-blocking)
            sendMail({
                to: email,
                subject: "Welcome to CoachMe!",
                html: getProspectWelcomeTemplate(name),
            });

            return NextResponse.json({ success: true, userId: user.id }, { status: 201 });

        } else if (accountType === 'COACH') {
            const disciplineRecord = await prisma.discipline.findUnique({
                where: { name: data.discipline! },
            });
            if (!disciplineRecord) {
                return NextResponse.json({
                    success: false,
                    error: { code: 'VALIDATION_ERROR', message: 'Invalid discipline' }
                }, { status: 400 });
            }

            // Create COACH user with CoachProfile in a transaction
            const user = await prisma.$transaction(async (tx) => {
                const newUser = await tx.user.create({
                    data: {
                        email,
                        password: hashed,
                        role: 'COACH',
                        name,
                    }
                });

                // Create CoachProfile with PENDING status
                await tx.coachProfile.create({
                    data: {
                        userId: newUser.id,
                        disciplineId: disciplineRecord.id,
                        bio: data.bio || null,
                        portfolio: data.portfolio || null,
                        status: 'PENDING', // Coaches start with PENDING status
                    }
                });

                return newUser;
            });

            // Send Welcome Email (Non-blocking)
            sendMail({
                to: email,
                subject: "Welcome to CoachMe!",
                html: getCoachWelcomeTemplate(name),
            });

            // Send Admin Alert (Non-blocking)
            sendMail({
                to: "admin@coachme.cm",
                subject: "New Coach Application Pending",
                html: getAdminNewCoachAlertTemplate(name, email),
            });

            return NextResponse.json({
                success: true,
                userId: user.id,
                message: 'Coach account created. Pending admin approval.'
            }, { status: 201 });
        }

        // Should never reach here due to Zod validation
        return NextResponse.json({
            success: false,
            error: { code: 'INVALID_ACCOUNT_TYPE', message: 'Invalid account type' }
        }, { status: 400 });

    } catch (err: unknown) {
        console.error('[POST /api/auth/register]', err);
        return NextResponse.json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: 'Failed to create account' }
        }, { status: 500 });
    }
}
