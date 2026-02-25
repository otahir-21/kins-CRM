/**
 * Auth service: Twilio Verify OTP + JWT. Replaces Firebase Phone Authentication.
 * Phone number is the unique user identifier.
 */
require('dotenv').config();
const twilio = require('twilio');
const jwt = require('jsonwebtoken');
const { getUserByPhone, createUserByPhone, normalizePhoneToE164 } = require('./data-helpers');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;
const jwtSecret = process.env.JWT_SECRET;
const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '7d';

function getTwilioClient() {
  if (!accountSid || !authToken) {
    throw new Error('Twilio credentials missing. Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.');
  }
  return twilio(accountSid, authToken);
}

function getVerifyServiceSid() {
  if (!verifyServiceSid) {
    throw new Error('Twilio Verify service missing. Set TWILIO_VERIFY_SERVICE_SID.');
  }
  return verifyServiceSid;
}

/**
 * Send OTP to phone via Twilio Verify.
 * @param {string} phone - E.164 or normalizable phone number
 * @returns {Promise<{ success: boolean, message: string }>}
 */
async function sendOtp(phone) {
  const e164 = normalizePhoneToE164(phone);
  const client = getTwilioClient();
  const sid = getVerifyServiceSid();

  await client.verify.v2
    .services(sid)
    .verifications.create({
      to: e164,
      channel: 'sms',
    });

  return {
    success: true,
    message: 'OTP sent successfully.',
  };
}

/**
 * Verify OTP and return user + JWT (create user if new).
 * @param {string} phone - Same phone used in send-otp (E.164 or normalizable)
 * @param {string} code - OTP code from user
 * @returns {Promise<{ user: Object, accessToken: string, expiresIn: string }>}
 */
async function verifyOtpAndGetOrCreateUser(phone, code) {
  const e164 = normalizePhoneToE164(phone);
  const client = getTwilioClient();
  const sid = getVerifyServiceSid();

  const check = await client.verify.v2
    .services(sid)
    .verificationChecks.create({
      to: e164,
      code: String(code).trim(),
    });

  if (check.status !== 'approved') {
    throw new Error('Invalid or expired code.');
  }

  let user = await getUserByPhone(e164);
  if (!user) {
    user = await createUserByPhone(e164);
  }

  if (!jwtSecret) {
    throw new Error('JWT_SECRET is not configured.');
  }

  console.time('jwt.sign');
  const accessToken = jwt.sign(
    {
      sub: user.id,
      phone: user.phoneNumber || user.id,
    },
    jwtSecret,
    { expiresIn: jwtExpiresIn }
  );
  console.timeEnd('jwt.sign');

  const decoded = jwt.verify(accessToken, jwtSecret);
  const expiresIn = jwtExpiresIn;

  return {
    user: {
      id: user.id,
      phoneNumber: user.phoneNumber || user.id,
      name: user.name ?? null,
      gender: user.gender ?? null,
      documentUrl: user.documentUrl ?? null,
      interests: user.interests ?? [],
    },
    accessToken,
    expiresIn,
  };
}

/**
 * Verify JWT and return payload (for protected routes).
 * @param {string} token - Bearer token or raw JWT
 * @returns {Object} Decoded payload { sub, phone }
 */
function verifyToken(token) {
  if (!jwtSecret) throw new Error('JWT_SECRET is not configured.');
  const raw = typeof token === 'string' && token.toLowerCase().startsWith('bearer ')
    ? token.slice(7)
    : token;
  return jwt.verify(raw, jwtSecret);
}

module.exports = {
  sendOtp,
  verifyOtpAndGetOrCreateUser,
  verifyToken,
  normalizePhoneToE164,
};
