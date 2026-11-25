/**
 * Standalone Resend API smoke test script.
 * Sends a single test email without touching the database or newsletter endpoints.
 *
 * Usage:
 *   node apps/api/scripts/test-resend.js
 *   node apps/api/scripts/test-resend.js custom@example.com
 */

const path = require('path');
const dotenv = require('dotenv');
const { Resend } = require('resend');

const DEFAULT_TO_EMAIL = 'sudhanshu2246@gmail.com';
const DEFAULT_FROM_EMAIL = 'onboarding@resend.dev';

const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath, override: true });

const apiKey = process.env.RESEND_API_KEY ? process.env.RESEND_API_KEY.trim() : '';
const fromEmail =
  (process.env.RESEND_EMAIL_FROM && process.env.RESEND_EMAIL_FROM.trim()) || DEFAULT_FROM_EMAIL;
const toEmail = (process.argv[2] && process.argv[2].trim()) || DEFAULT_TO_EMAIL;

function maskKey(value) {
  if (!value) return '(missing)';
  if (value.length <= 10) return `*** (len ${value.length})`;
  return `${value.slice(0, 6)}...${value.slice(-4)} (len ${value.length})`;
}

async function main() {
  console.log('Env file :', envPath);
  console.log('API Key  :', maskKey(apiKey));
  console.log('From     :', fromEmail);
  console.log('To       :', toEmail);

  if (!apiKey) {
    console.error('\nERROR: RESEND_API_KEY is missing or empty in apps/api/.env');
    process.exit(1);
  }

  const resend = new Resend(apiKey);
  const { data, error } = await resend.emails.send({
    from: fromEmail,
    to: toEmail,
    subject: 'Gravitas Edge Consulting — Resend API Test',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:24px auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px;">
        <h2 style="margin:0 0 12px;color:#061B36;">Resend API Test Email</h2>
        <p style="margin:0 0 8px;color:#334155;">If you received this email, your Resend API key and sender configuration are working.</p>
        <p style="margin:0;font-size:12px;color:#64748B;">Sent at: ${new Date().toISOString()}</p>
      </div>
    `,
  });

  if (error) {
    console.error('\nResend API returned an error:', JSON.stringify(error, null, 2));
    process.exit(1);
  }

  console.log('\nSUCCESS: Test email accepted by Resend!');
  console.log('Email ID:', data?.id || data);
}

main().catch((err) => {
  console.error('\nUnexpected error while calling Resend:', err);
  process.exit(1);
});
