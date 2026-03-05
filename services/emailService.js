// services/emailService.js
const nodemailer = require("nodemailer");

// Create a reusable email transporter using environment variables.
// This keeps credentials out of the codebase.
function createTransporter() {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_APP_PASSWORD;

  // Fail fast with a clear message if email settings are missing.
  if (!user || !pass) {
    throw new Error("EMAIL_USER / EMAIL_APP_PASSWORD missing in .env");
  }

  // Gmail SMTP settings for sending system emails (like password reset codes).
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587, 
    secure: false,
    auth: { user, pass },

    // Timeouts help avoid the app hanging too long if the SMTP server is slow/unreachable.
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
  });
}

// Send the 6-digit reset code to the user by email.
// The code itself is short and time-limited, so the user can quickly reset their password.
async function sendPasswordResetCodeEmail(toEmail, code) {
  const transporter = createTransporter();

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: toEmail,
    subject: "Your password reset code",
    text:
      `Your password reset code is: ${code}\n\n` +
      `This code expires in 15 minutes.\n\n` +
      `If you didn't request this, ignore this email.`,
  });
}

module.exports = { sendPasswordResetCodeEmail };