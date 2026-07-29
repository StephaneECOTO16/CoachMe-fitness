import { NextResponse, after } from 'next/server';
import { sendMail, getContactInquiryTemplate } from "@/lib/mail";
import { prisma } from '@/lib/db';
import { sendNotification } from '@/lib/notifications';

const MESSAGE_PREVIEW_LENGTH = 140;

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, email, subject, message } = body;

        // Validation
        if (!name || !email || !subject || !message) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Send email to the support inbox
        // Note: In a production serverless environment, you might want to await this
        // or offload it to a background queue to ensure it completes.
        await sendMail({
            to: process.env.ADMIN_EMAIL || "infos@ecotofitness.com",
            subject: `New Contact Inquiry: ${subject}`,
            html: getContactInquiryTemplate(name, email, subject, message),
        });

        // Also notify every admin in-app/push — the email above only
        // reaches a single fixed inbox, not the admin notification system
        // any admin account actually sees. Runs via after() so it isn't
        // dropped if Vercel freezes the function right after the response.
        after(async () => {
            const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } });
            const preview = message.length > MESSAGE_PREVIEW_LENGTH
                ? `${message.slice(0, MESSAGE_PREVIEW_LENGTH)}…`
                : message;
            await Promise.allSettled(admins.map((admin) => sendNotification({
                userId: admin.id,
                title: `Nouveau message de contact — ${subject}`,
                body: `${name} (${email}) : ${preview}`,
                type: 'SYSTEM',
            })));
        });

        return NextResponse.json(
            { message: 'Message sent successfully' },
            { status: 200 }
        );
    } catch (error) {
        console.error('Contact API Error:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
