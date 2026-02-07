/**
 * Auth routes: POST /auth/send-otp, POST /auth/verify-otp
 * Rate limiting + OTP resend cooldown. No Firebase Phone Auth.
 */
const express = require('express');
const rateLimit = require('express-rate-limit');
const { sendOtp, verifyOtpAndGetOrCreateUser } = require('./auth-service');
const { normalizePhoneToE164 } = require('./data-helpers');

const router = express.Router();

// --- Rate limiting: 10 requests per 15 min per IP for auth ---
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, error: 'Too many auth attempts. Try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
router.use(authLimiter);

// --- OTP resend cooldown: 60 seconds per phone ---
const OTP_COOLDOWN_MS = 60 * 1000;
const lastOtpSent = new Map();

function getCooldownRemaining(phone) {
  try {
    const e164 = normalizePhoneToE164(phone);
    const last = lastOtpSent.get(e164);
    if (!last) return 0;
    const elapsed = Date.now() - last;
    return Math.max(0, Math.ceil((OTP_COOLDOWN_MS - elapsed) / 1000));
  } catch {
    return 0;
  }
}

function setCooldown(phone) {
  try {
    const e164 = normalizePhoneToE164(phone);
    lastOtpSent.set(e164, Date.now());
  } catch {
    // ignore
  }
}

/**
 * POST /auth/send-otp
 * Body: { "phone": "+1234567890" } (E.164 or normalizable)
 */
router.post('/send-otp', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({
        success: false,
        error: 'Phone number is required.',
      });
    }

    const remaining = getCooldownRemaining(phone);
    if (remaining > 0) {
      return res.status(429).json({
        success: false,
        error: `Please wait ${remaining} seconds before requesting a new code.`,
        retryAfterSeconds: remaining,
      });
    }

    await sendOtp(phone);
    setCooldown(phone);

    res.status(200).json({
      success: true,
      message: 'OTP sent successfully.',
    });
  } catch (err) {
    const message = err.message || 'Failed to send OTP.';
    const status = message.includes('Invalid') ? 400 : 500;
    res.status(status).json({
      success: false,
      error: message,
    });
  }
});

/**
 * POST /auth/verify-otp
 * Body: { "phone": "+1234567890", "code": "123456" }
 * Returns: user + accessToken + expiresIn (JWT for auth)
 */
router.post('/verify-otp', async (req, res) => {
  try {
    const { phone, code } = req.body;
    if (!phone) {
      return res.status(400).json({
        success: false,
        error: 'Phone number is required.',
      });
    }
    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'Verification code is required.',
      });
    }

    const result = await verifyOtpAndGetOrCreateUser(phone, code);

    res.status(200).json({
      success: true,
      user: result.user,
      accessToken: result.accessToken,
      expiresIn: result.expiresIn,
    });
  } catch (err) {
    const message = err.message || 'Verification failed.';
    const status = message.includes('Invalid') || message.includes('expired') ? 400 : 500;
    res.status(status).json({
      success: false,
      error: message,
    });
  }
});

module.exports = router;
