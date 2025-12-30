import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, comparePassword } from '@/lib/auth';
import { DeleteAccountRequestSchema, parseRequestBody } from '@/lib/schemas';
import { cookies } from 'next/headers';
import { deleteMediaFromS3 } from '@/lib/aws-s3';

export async function POST(req: NextRequest) {
    const authPayload = await requireAuth(req, undefined, { checkCoachStatus: false });
    if (!authPayload) {
        return NextResponse.json({
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'You must be logged in' }
        }, { status: 401 });
    }

    const { data, error } = await parseRequestBody(req, DeleteAccountRequestSchema);
    if (error) {
        return NextResponse.json({ success: false, error }, { status: 400 });
    }

    const { password } = data!;

    try {
        const user = await prisma.user.findUnique({
            where: { id: authPayload.userId },
            include: {
                coachProfile: { include: { media: true } },
                clientProfile: true,
                medias: true,
            }
        });

        if (!user) {
            return NextResponse.json({
                success: false,
                error: { code: 'NOT_FOUND', message: 'User not found' }
            }, { status: 404 });
        }

        // Verify password before deletion
        const isMatch = await comparePassword(password, user.password);
        if (!isMatch) {
            return NextResponse.json({
                success: false,
                error: { code: 'INCORRECT_PASSWORD', message: 'Incorrect password' }
            }, { status: 400 });
        }

        // Perform deletion in a transaction to ensure atomic cleanup
        await prisma.$transaction(async (tx) => {
            // 1. Delete Messages sent by user
            await tx.message.deleteMany({ where: { senderId: user.id } });

            // 2. If user is a coach, delete their sessions/chats/profiles
            if (user.coachProfile) {
                // Delete commission logs
                await tx.commissionLog.deleteMany({ where: { coachId: user.coachProfile.id } });
                // Delete admin reviews
                await tx.adminReview.deleteMany({ where: { coachId: user.coachProfile.id } });
                // Delete chats as coach (and their messages)
                const coachChats = await tx.chat.findMany({ where: { coachId: user.coachProfile.id } });
                for (const chat of coachChats) {
                    await tx.message.deleteMany({ where: { chatId: chat.id } });
                    await tx.chat.delete({ where: { id: chat.id } });
                }
                // Delete coach profile
                await tx.coachProfile.delete({ where: { id: user.coachProfile.id } });
            }

            // 3. If user is a client, delete their profiles/chats
            if (user.clientProfile) {
                // Delete chats as client
                const clientChats = await tx.chat.findMany({ where: { clientId: user.clientProfile.id } });
                for (const chat of clientChats) {
                    await tx.message.deleteMany({ where: { chatId: chat.id } });
                    await tx.chat.delete({ where: { id: chat.id } });
                }
                // Delete client profile
                await tx.clientProfile.delete({ where: { id: user.clientProfile.id } });
            }

            // 4. Collect all file keys for physical deletion
            const filesToDelete: string[] = [];
            if (user.avatar) filesToDelete.push(user.avatar);

            // Add all coach media
            if (user.coachProfile?.media) {
                user.coachProfile.media.forEach(m => {
                    if (m.url) filesToDelete.push(m.url);
                });
            }

            // Add any other media owned by user
            if (user.medias) {
                user.medias.forEach(m => {
                    if (m.url && !filesToDelete.includes(m.url)) {
                        filesToDelete.push(m.url);
                    }
                });
            }

            // Delete Media records from database
            await tx.media.deleteMany({ where: { ownerId: user.id } });
            if (user.coachProfile) {
                await tx.media.deleteMany({ where: { coachId: user.coachProfile.id } });
            }

            // 5. Finally delete the user (PasswordResetTokens should cascade based on schema)
            await tx.user.delete({ where: { id: user.id } });

            // 6. Physically delete files from S3/R2 (after successful DB transaction)
            // Note: We do this after the transaction so we don't delete files if the DB op fails
            for (const key of filesToDelete) {
                await deleteMediaFromS3(key);
            }
        });

        // Clear the auth cookie
        const cookieStore = await cookies();
        cookieStore.delete('token');

        return NextResponse.json({ success: true, message: 'Account deleted successfully' });
    } catch (err) {
        console.error('[API_USER_DELETE_ACCOUNT_POST]', err);
        return NextResponse.json({
            success: false,
            error: { code: 'INTERNAL_ERROR', message: 'Failed to delete account' }
        }, { status: 500 });
    }
}
