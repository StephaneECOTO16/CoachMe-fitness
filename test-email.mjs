// Test script for Brevo email configuration
// Run with: node test-email.mjs

import 'dotenv/config';
import nodemailer from 'nodemailer';

async function testEmailConfig() {
  console.log('🔍 Testing Brevo Email Configuration...\n');

  // Display current configuration
  console.log('Configuration:');
  console.log(`- SMTP_HOST: ${process.env.SMTP_HOST}`);
  console.log(`- SMTP_PORT: ${process.env.SMTP_PORT}`);
  console.log(`- SMTP_USER: ${process.env.SMTP_USER}`);
  console.log(`- SMTP_PASS: ${process.env.SMTP_PASS ? '***' + process.env.SMTP_PASS.slice(-8) : 'NOT SET'}`);
  console.log(`- MAIL_FROM_NAME: ${process.env.MAIL_FROM_NAME}`);
  console.log(`- MAIL_FROM_ADDRESS: ${process.env.MAIL_FROM_ADDRESS}`);
  console.log(`- ADMIN_EMAIL: ${process.env.ADMIN_EMAIL}\n`);

  // Create transporter
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587"),
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  try {
    // Verify connection
    console.log('📡 Verifying SMTP connection...');
    await transporter.verify();
    console.log('✅ SMTP connection verified successfully!\n');

    // Send test email
    console.log('📧 Sending test email...');
    const fromName = process.env.MAIL_FROM_NAME || 'CoachMe';
    const fromAddress = process.env.MAIL_FROM_ADDRESS || 'noreply@coachme.cm';

    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromAddress}>`,
      to: process.env.ADMIN_EMAIL,
      subject: 'Brevo Email Test - CoachMe Migration',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 20px auto; padding: 20px; background: #f9f9f9; border-radius: 8px; }
            h2 { color: #00A650; }
            .info { background: white; padding: 15px; border-radius: 5px; margin: 15px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>✅ Brevo Email Configuration Test</h2>
            <p>This is a test email to confirm that your migration from Mailtrap to Brevo is working correctly.</p>
            <div class="info">
              <p><strong>Configuration Details:</strong></p>
              <ul>
                <li>SMTP Host: ${process.env.SMTP_HOST}</li>
                <li>SMTP Port: ${process.env.SMTP_PORT}</li>
                <li>From Name: ${fromName}</li>
                <li>From Address: ${fromAddress}</li>
              </ul>
            </div>
            <p>If you received this email, your Brevo integration is working perfectly! 🎉</p>
            <p style="color: #666; font-size: 12px; margin-top: 30px;">
              Sent at: ${new Date().toISOString()}
            </p>
          </div>
        </body>
        </html>
      `,
    });

    console.log('✅ Test email sent successfully!');
    console.log(`📬 Message ID: ${info.messageId}`);
    console.log(`📨 Sent to: ${process.env.ADMIN_EMAIL}\n`);

    console.log('🎉 SUCCESS! Your Brevo email configuration is working perfectly.\n');
    console.log('Next steps:');
    console.log('1. Check your inbox at', process.env.ADMIN_EMAIL);
    console.log('2. If you don\'t see the email, check your spam folder');
    console.log('3. Update your production environment variables with these same values\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\nPossible issues:');
    console.error('- Check that your Brevo SMTP credentials are correct');
    console.error('- Verify that', process.env.MAIL_FROM_ADDRESS, 'is verified in your Brevo account');
    console.error('- Ensure your Brevo account is active and not suspended');
    console.error('- Check if port 587 is not blocked by your firewall\n');
  }
}

testEmailConfig();
