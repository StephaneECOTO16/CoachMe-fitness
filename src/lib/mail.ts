import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "2525"),
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

interface SendMailParams {
  to: string;
  subject: string;
  html: string;
}

export async function sendMail({ to, subject, html }: SendMailParams) {
  try {
    const info = await transporter.sendMail({
      from: '"CoachMe" <noreply@coachme.cm>',
      to,
      subject,
      html,
    });

    console.log("Message sent: %s", info.messageId);
    return info;
  } catch (error) {
    console.error("Error sending email:", error);
    return null;
  }
}

/**
 * Standard Email Layout Wrapper
 */
const getStandardLayout = (title: string, content: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: #333333;
      margin: 0;
      padding: 0;
      background-color: #f4f7f6;
    }
    .wrapper {
      width: 100%;
      max-width: 600px;
      margin: 20px auto;
      background: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 4px 10px rgba(0,0,0,0.05);
    }
    .header {
      background-color: #00A650; /* CoachMe Primary */
      padding: 30px 20px;
      text-align: center;
      color: #ffffff;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      letter-spacing: 1px;
      text-transform: uppercase;
    }
    .content {
      padding: 40px 30px;
      background-color: #ffffff;
    }
    .content h2 {
      color: #00A650;
      margin-top: 0;
      font-size: 22px;
    }
    .footer {
      background-color: #1a1a1a;
      color: #999999;
      padding: 20px;
      text-align: center;
      font-size: 12px;
    }
    .button {
      display: inline-block;
      padding: 12px 25px;
      background-color: #00A650;
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 5px;
      font-weight: bold;
      margin: 20px 0;
    }
    .footer a {
      color: #00A650;
      text-decoration: none;
    }
    hr {
      border: 0;
      border-top: 1px solid #eeeeee;
      margin: 25px 0;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>CoachMe</h1>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} CoachMe by Ecotosport. All rights reserved.</p>
      <p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/">Home</a> | 
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/contact">Support</a>
      </p>
    </div>
  </div>
</body>
</html>
`;

// Templates

export const getProspectWelcomeTemplate = (name: string) => getStandardLayout(
  "Welcome to CoachMe",
  `
    <h2>Welcome to CoachMe!</h2>
    <p>Hi <strong>${name}</strong>,</p>
    <p>Thank you for joining CoachMe. We are excited to have you on board as part of our sport community!</p>
    <p>Whether you're looking for the perfect coach or ready to start your journey, we're here to help you every step of the way.</p>
    <p>Get started by exploring our featured coaches and finding the perfect match for your goals.</p>
    <a href="${process.env.NEXT_PUBLIC_APP_URL}/coaches" class="button">Explore Coaches</a>
    <p>Stay healthy,<br>The CoachMe Team</p>
  `
);

export const getCoachWelcomeTemplate = (name: string) => getStandardLayout(
  "Welcome to the CoachMe Team",
  `
    <h2>Welcome to CoachMe, Coach!</h2>
    <p>Hi <strong>${name}</strong>,</p>
    <p>We're thrilled to have you apply to join our community of professional coaches.</p>
    <p><strong>Your account is currently under review.</strong> Our administrators will verify your credentials and bio shortly. You'll receive another email as soon as your profile is approved and live on the platform.</p>
    <p>In the meantime, you can log in to your dashboard to complete your account setup, update your profile picture, and refine your bio.</p>
    <a href="${process.env.NEXT_PUBLIC_APP_URL}/profile" class="button">Complete Your Setup</a>
    <p>Best regards,<br>The CoachMe Team</p>
  `
);

export const getAdminNewCoachAlertTemplate = (coachName: string, email: string) => getStandardLayout(
  "New Coach Application",
  `
    <h2>New Coach Application</h2>
    <p>A new coach has registered and is awaiting approval.</p>
    <hr>
    <p><strong>Name:</strong> ${coachName}</p>
    <p><strong>Email:</strong> ${email}</p>
    <hr>
    <p>Please log in to the Admin Dashboard to review the profile and credentials.</p>
    <a href="${process.env.NEXT_PUBLIC_APP_URL}/admin/users" class="button">Go to Dashboard</a>
  `
);

export const getCoachApprovedTemplate = (name: string) => getStandardLayout(
  "Profile Approved",
  `
    <h2>Congratulations! Your profile is live.</h2>
    <p>Hi ${name},</p>
    <p>Great news! Your coach profile has been approved by our administrators.</p>
    <p>You are now visible to clients on the platform. We recommend keeping your availability and sessions up to date to attract more clients.</p>
    <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" class="button">Access Your Dashboard</a>
    <p>Wishing you great success,<br>The CoachMe Team</p>
  `
);

export const getCoachRejectedTemplate = (name: string) => getStandardLayout(
  "Profile Update Required",
  `
    <h2 style="color: #c0392b;">Action Required: Profile Update</h2>
    <p>Hi ${name},</p>
    <p>Thank you for your interest in joining CoachMe. We have reviewed your profile application.</p>
    <p>Unfortunately, we couldn't approve your profile in its current state. This is usually due to missing information or unclear certifications.</p>
    <p>Please log in to review your profile and provide any additional details required.</p>
    <a href="${process.env.NEXT_PUBLIC_APP_URL}/profile" class="button">Update Profile</a>
    <p>Best regards,<br>The CoachMe Team</p>
  `
);

export const getNewMessageTemplate = (senderName: string, content: string) => getStandardLayout(
  "New Message Received",
  `
    <h2>You have a new message</h2>
    <p><strong>${senderName}</strong> sent you a message:</p>
    <div style="background: #f9f9f9; padding: 15px; border-left: 4px solid #00A650; font-style: italic; margin: 20px 0;">
      "${content}"
    </div>
    <a href="${process.env.NEXT_PUBLIC_APP_URL}/messages" class="button">Reply to Message</a>
    <p>You can also view this in your dashboard.</p>
  `
);

export const getContactInquiryTemplate = (name: string, email: string, subject: string, message: string) => getStandardLayout(
  "New Contact Inquiry",
  `
    <h2>New Contact Inquiry</h2>
    <p>You received a new message from the contact form.</p>
    <hr>
    <p><strong>From:</strong> ${name} (<a href="mailto:${email}">${email}</a>)</p>
    <p><strong>Subject:</strong> ${subject}</p>
    <p><strong>Message:</strong></p>
    <div style="background: #f9f9f9; padding: 15px; border-radius: 4px;">
      ${message}
    </div>
  `
);

export const getForgotPasswordTemplate = (resetUrl: string) => getStandardLayout(
  "Reset Your Password",
  `
    <h2>Reset Your Password</h2>
    <p>We received a request to reset the password for your CoachMe account.</p>
    <p>Click the button below to set a new password. This link will expire in 1 hour.</p>
    <center>
      <a href="${resetUrl}" class="button">Reset Password</a>
    </center>
    <hr>
    <p>If you didn't request this, you can safely ignore this email. Your password will remain unchanged.</p>
  `
);

export const getAdminNewChatAlertTemplate = (clientName: string, coachName: string) => getStandardLayout(
  "New Chat Started",
  `
    <h2>Real-time Chat Alert</h2>
    <p>A new conversation has been initiated between a client and a coach.</p>
    <hr>
    <p><strong>Client:</strong> ${clientName}</p>
    <p><strong>Coach:</strong> ${coachName}</p>
    <hr>
    <p>Monitor active conversations in the Admin console if needed.</p>
    <a href="${process.env.NEXT_PUBLIC_APP_URL}/admin/messages" class="button">View Conversations</a>
  `
);
