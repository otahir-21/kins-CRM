#!/usr/bin/env node
/**
 * Quick test for Auth API (send-otp + verify-otp).
 *
 * Prerequisites:
 *   1. Server running: npm run dev
 *   2. .env has TWILIO_* and JWT_SECRET set
 *
 * Usage:
 *   node test-auth-api.js +14155551234              # Send OTP only
 *   node test-auth-api.js +14155551234 123456       # Send OTP then verify with code
 *   BASE_URL=http://localhost:3000 node test-auth-api.js +14155551234 123456
 */
const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

async function request(method, path, body = null) {
  const url = `${baseUrl}${path}`;
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }
  return { status: res.status, data };
}

async function main() {
  const phone = process.argv[2];
  const code = process.argv[3];

  if (!phone) {
    console.log('Usage: node test-auth-api.js <phone> [code]');
    console.log('Example: node test-auth-api.js +14155551234');
    console.log('         node test-auth-api.js +14155551234 123456');
    process.exit(1);
  }

  console.log('Base URL:', baseUrl);
  console.log('Phone:', phone);
  console.log('');

  // 1. Send OTP
  console.log('1. POST /auth/send-otp');
  const sendRes = await request('POST', '/auth/send-otp', { phone });
  console.log('   Status:', sendRes.status);
  console.log('   Body:', JSON.stringify(sendRes.data, null, 2));
  if (sendRes.status !== 200) {
    console.log('\nSend OTP failed. Check server and .env (Twilio credentials).');
    process.exit(1);
  }
  console.log('');

  if (!code) {
    console.log('OTP sent. Check your phone, then run:');
    console.log(`  node test-auth-api.js ${phone} <CODE>`);
    process.exit(0);
  }

  // 2. Verify OTP
  console.log('2. POST /auth/verify-otp');
  const verifyRes = await request('POST', '/auth/verify-otp', { phone, code });
  console.log('   Status:', verifyRes.status);
  console.log('   Body:', JSON.stringify(verifyRes.data, null, 2));
  if (verifyRes.status === 200 && verifyRes.data.accessToken) {
    console.log('\nSuccess. accessToken (first 50 chars):', verifyRes.data.accessToken.slice(0, 50) + '...');
  } else {
    console.log('\nVerify failed. Wrong or expired code?');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
