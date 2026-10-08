import { storage, makeId } from './storage';

const OTP_KEY = 'auth.otp';
const RESET_KEY = 'auth.resetTokens';

const OTP_TTL_MIN = 10;
const RESET_TTL_MIN = 30;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_SEC = 30;

function generateOtp() {
  // Cryptographically random 6-digit code
  const bytes = new Uint32Array(1);
  crypto.getRandomValues(bytes);
  return String(100000 + (bytes[0] % 900000));
}

function generateToken() {
  // 32-char hex token
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

class OtpService {
  // ---------- OTP ----------

  async createOtp({ email, purpose = 'signup' }) {
    const code = generateOtp();
    const now = Date.now();
    const entry = {
      email: email.toLowerCase(),
      purpose,
      code,
      attempts: 0,
      createdAt: now,
      expiresAt: now + OTP_TTL_MIN * 60 * 1000,
      lastSentAt: now,
    };
    storage.write(OTP_KEY, entry);
    return { code, expiresMinutes: OTP_TTL_MIN };
  }

  async verifyOtp({ email, code }) {
    const entry = storage.read(OTP_KEY, null);
    if (!entry) throw new Error('No verification code found. Request a new one.');
    if (entry.email !== email.toLowerCase()) {
      throw new Error('This code was requested for a different email.');
    }
    if (Date.now() > entry.expiresAt) {
      storage.remove(OTP_KEY);
      throw new Error('That code has expired. Request a new one.');
    }
    if (entry.attempts >= MAX_ATTEMPTS) {
      storage.remove(OTP_KEY);
      throw new Error('Too many incorrect attempts. Request a new code.');
    }
    if (entry.code !== String(code).trim()) {
      entry.attempts += 1;
      storage.write(OTP_KEY, entry);
      const left = MAX_ATTEMPTS - entry.attempts;
      throw new Error(
        `Incorrect code. ${left} attempt${left === 1 ? '' : 's'} remaining.`
      );
    }
    storage.remove(OTP_KEY);
    return { ok: true };
  }

  canResend(email) {
    const entry = storage.read(OTP_KEY, null);
    if (!entry) return { ok: true, secondsLeft: 0 };
    if (entry.email !== email.toLowerCase()) return { ok: true, secondsLeft: 0 };
    const elapsed = (Date.now() - entry.lastSentAt) / 1000;
    if (elapsed >= RESEND_COOLDOWN_SEC) return { ok: true, secondsLeft: 0 };
    return {
      ok: false,
      secondsLeft: Math.ceil(RESEND_COOLDOWN_SEC - elapsed),
    };
  }

  clearOtp() {
    storage.remove(OTP_KEY);
  }

  // ---------- Password reset ----------

  async createResetToken({ email }) {
    const token = generateToken();
    const now = Date.now();
    const record = {
      token,
      email: email.toLowerCase(),
      createdAt: now,
      expiresAt: now + RESET_TTL_MIN * 60 * 1000,
      used: false,
    };
    const all = storage.read(RESET_KEY, []);
    // Keep only the last 10 tokens
    const next = [record, ...all].slice(0, 10);
    storage.write(RESET_KEY, next);
    return { token, expiresMinutes: RESET_TTL_MIN };
  }

  peekResetToken(token) {
    const all = storage.read(RESET_KEY, []);
    const record = all.find(r => r.token === token);
    if (!record) return { ok: false, reason: 'not_found' };
    if (record.used) return { ok: false, reason: 'used' };
    if (Date.now() > record.expiresAt) return { ok: false, reason: 'expired' };
    return { ok: true, email: record.email };
  }

  consumeResetToken(token) {
    const all = storage.read(RESET_KEY, []);
    const next = all.map(r =>
      r.token === token ? { ...r, used: true, usedAt: Date.now() } : r
    );
    storage.write(RESET_KEY, next);
  }

  reset() {
    storage.remove(OTP_KEY);
    storage.remove(RESET_KEY);
  }
}

export const otpService = new OtpService();