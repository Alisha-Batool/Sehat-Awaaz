require("dotenv").config();
const nodemailer = require("nodemailer");

async function testSMTP() {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  try {
    await transporter.verify();
    console.log("SUCCESS: Gmail SMTP connection and authentication verified.");
  } catch (error) {
    console.error("SMTP verification failed:", error.message);
  }
}

testSMTP();
