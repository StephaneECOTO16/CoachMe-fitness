import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from '@/lib/auth';
import { parseRequestBody, RegisterRequestSchema } from '@/lib/schemas';

export async function POST(req: Request) {
    // Validate request body using Zod schema
    const { data, error } = await parseRequestBody(req, RegisterRequestSchema);
    if (error) {
        return NextResponse.json({ success: false, error }, { status: 400 });
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
                        heightCm: data.heightCm ? parseInt(data.heightCm as string) : null,
                        weightKg: data.weightKg ? parseFloat(data.weightKg as string) : null,
                        goals: data.goals || null,
                    }
                });

                return newUser;
            });

            return NextResponse.json({ success: true, userId: user.id }, { status: 201 });

        } else if (accountType === 'COACH') {
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
                        discipline: data.discipline!,
                        bio: data.bio || null,
                        portfolio: data.portfolio || null,
                        status: 'PENDING', // Coaches start with PENDING status
                    }
                });

                return newUser;
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
