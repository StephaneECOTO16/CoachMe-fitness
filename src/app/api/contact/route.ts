import { NextResponse } from 'next/server';

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

        // TODO: Integrate SendGrid or other email provider here
        // Example:
        // await sendgrid.send({
        //   to: 'hello@coachme.cm',
        //   from: 'noreply@coachme.cm',
        //   subject: `New Contact Form Submission: ${subject}`,
        //   html: `
        //     <h1>New Message from ${name}</h1>
        //     <p><strong>Email:</strong> ${email}</p>
        //     <p><strong>Subject:</strong> ${subject}</p>
        //     <p><strong>Message:</strong></p>
        //     <p>${message}</p>
        //   `
        // });

        // Simulate delay for development feel
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // For now, just log and return success
        console.log('Contact Form Submission:', { name, email, subject, message });

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
