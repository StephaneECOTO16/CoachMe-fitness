import { NextResponse } from 'next/server';
import { sendMail, getContactInquiryTemplate } from "@/lib/mail";

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

        // Send email to admin
        // Note: In a production serverless environment, you might want to await this
        // or offload it to a background queue to ensure it completes.
        await sendMail({
            to: "admin@coachme.cm",
            subject: `New Contact Inquiry: ${subject}`,
            html: getContactInquiryTemplate(name, email, subject, message),
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
