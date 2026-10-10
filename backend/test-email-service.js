require('dotenv').config();

const { sendEmail } = require('./src/services/email.service');

async function main() {
  try {
    const result = await sendEmail({
      to: process.env.SMTP_USER,
      subject: 'Sehat Awaaz — Email Service Test',
      text: 'Your Sehat Awaaz email service is working.',
      html: '<p>Your Sehat Awaaz email service is working.</p>',
    });

    console.log('Email accepted by SMTP server.');
    console.log('Message ID:', result.messageId);
  } catch (error) {
    console.error('Email test failed:', error.message);
    process.exitCode = 1;
  }
}

main();
