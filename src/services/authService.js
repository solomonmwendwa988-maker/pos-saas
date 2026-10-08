/**
 * Auth service.
 *
 * SECURITY NOTES:
 *  - Email delivery uses EmailJS. The public key is safe to expose;
 *    restrict allowed origins in your EmailJS dashboard.
 *  - Password reset tokens live in localStorage for the demo. Move to a
 *    backend for real security (tokens should be server-side, single-use,
 *    and hashed).
 *  - Never store raw passwords in localStorage under any circumstances.
 */
import { storage, wait, makeId } from './storage';
import { otpService } from './otpService';
import { emailService } from './emailService';

const SESSION_KEY = 'auth.session';
const PENDING_KEY = 'auth.pending';
const SESSIONS_KEY = 'auth.sessions';
const USERS_KEY = 'auth.users';
const RESET_CONTEXT_KEY = 'auth.resetContext';

function detectDevice() {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  let browser = 'Browser';
  if (ua.includes('Edg')) browser = 'Edge';
  else if (ua.includes('Chrome')) browser = 'Chrome';
  else if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Safari')) browser = 'Safari';

  let os = 'Unknown OS';
  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
  else if (ua.includes('Mac')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';

  return `${browser} · ${os}`;
}

class AuthService {
  // ---------- Users (simple local registry) ----------
  _users() {
    return storage.read(USERS_KEY, {});
  }
  _saveUsers(users) {
    storage.write(USERS_KEY, users);
  }
  _upsertUser(email, patch) {
    const users = this._users();
    const key = email.toLowerCase();
    users[key] = { ...(users[key] || {}), email: key, ...patch };
    this._saveUsers(users);
  }
  _findUser(email) {
    return this._users()[email.toLowerCase()] || null;
  }

  // ---------- Signup ----------
  async signup(payload) {
    await wait(300);

    const existing = this._findUser(payload.email);
    if (existing?.verified) {
      throw new Error('An account with that email already exists.');
    }

    storage.write(PENDING_KEY, {
      fullName: payload.fullName,
      email: payload.email.toLowerCase(),
      phone: payload.phone,
      businessName: payload.businessName,
      businessType: payload.businessType,
      businessLocation: payload.businessLocation,
    });

    // Send OTP by email
    const { code, expiresMinutes } = await otpService.createOtp({
      email: payload.email,
      purpose: 'signup',
    });

    await emailService.sendOtp({
      to: payload.email,
      name: payload.fullName,
      code,
      expiresMinutes,
    });

    return { email: payload.email, phone: payload.phone };
  }

  async resendSignupOtp() {
    const pending = storage.read(PENDING_KEY, null);
    if (!pending?.email) throw new Error('No pending signup to resend to.');

    const gate = otpService.canResend(pending.email);
    if (!gate.ok) {
      throw new Error(`Please wait ${gate.secondsLeft}s before resending.`);
    }

    const { code, expiresMinutes } = await otpService.createOtp({
      email: pending.email,
      purpose: 'signup',
    });
    await emailService.sendOtp({
      to: pending.email,
      name: pending.fullName,
      code,
      expiresMinutes,
    });
    return { ok: true };
  }

  async verifyOtp(code) {
    const pending = storage.read(PENDING_KEY, null);
    if (!pending?.email) throw new Error('No pending signup found.');

    await otpService.verifyOtp({ email: pending.email, code });

    this._upsertUser(pending.email, {
      fullName: pending.fullName,
      phone: pending.phone,
      role: 'OWNER',
      verified: true,
      verifiedAt: Date.now(),
    });

    const session = {
      user: {
        id: makeId('u'),
        fullName: pending.fullName || '',
        email: pending.email,
        phone: pending.phone || '',
        role: 'OWNER',
        avatarDataUrl: null,
      },
      business: {
        name: pending.businessName || '',
        type: pending.businessType || 'Mini-market',
        location: pending.businessLocation || '',
      },
      token: 'session.' + makeId('t'),
      createdAt: Date.now(),
    };
    storage.write(SESSION_KEY, session);
    storage.remove(PENDING_KEY);
    this._registerSession();
    return session;
  }

  // ---------- Login ----------
  async login({ email, password }) {
    await wait(400);
    if (!email || !password) throw new Error('Enter your email and password.');
    if (password.length < 6) throw new Error('Incorrect email or password.');

    const user = this._findUser(email);
    if (!user) {
      // Do not leak whether the email exists — proceed to OTP anyway
      // so the flow is identical. Backend will do real credential checks.
    }

    const { code, expiresMinutes } = await otpService.createOtp({
      email: email.toLowerCase(),
      purpose: 'login',
    });
    await emailService.sendOtp({
      to: email,
      name: user?.fullName || 'there',
      code,
      expiresMinutes,
    });

    return { email: email.toLowerCase() };
  }

  async resendLoginOtp(email) {
    const gate = otpService.canResend(email);
    if (!gate.ok) {
      throw new Error(`Please wait ${gate.secondsLeft}s before resending.`);
    }
    const { code, expiresMinutes } = await otpService.createOtp({
      email,
      purpose: 'login',
    });
    const user = this._findUser(email);
    await emailService.sendOtp({
      to: email,
      name: user?.fullName || 'there',
      code,
      expiresMinutes,
    });
    return { ok: true };
  }

  async completeLoginWithOtp(code, email) {
    await otpService.verifyOtp({ email, code });

    const user = this._findUser(email);
    const session = {
      user: {
        id: user?.id || makeId('u'),
        fullName: user?.fullName || '',
        email: email.toLowerCase(),
        phone: user?.phone || '',
        role: user?.role || 'OWNER',
        avatarDataUrl: user?.avatarDataUrl || null,
      },
      business: {
        name: user?.businessName || '',
        type: user?.businessType || 'Mini-market',
        location: user?.businessLocation || '',
      },
      token: 'session.' + makeId('t'),
      createdAt: Date.now(),
    };
    storage.write(SESSION_KEY, session);
    this._registerSession();
    return session;
  }

  // ---------- Password reset ----------
  async requestPasswordReset(emailOrPhone) {
    await wait(400);
    if (!emailOrPhone) throw new Error('Enter your email address.');

    const identifier = emailOrPhone.trim().toLowerCase();
    // If it looks like a phone number, we can't email it — treat as email only.
    if (!/\S+@\S+\.\S+/.test(identifier)) {
      throw new Error('Enter the email address on your account.');
    }

    const user = this._findUser(identifier);
    const { token, expiresMinutes } = await otpService.createResetToken({
      email: identifier,
    });

    const appUrl =
      import.meta.env.VITE_APP_URL || window.location.origin;
    const resetLink = `${appUrl}/reset-password?token=${token}`;

    await emailService.sendPasswordReset({
      to: identifier,
      name: user?.fullName || 'there',
      link: resetLink,
      expiresMinutes,
    });

    // Store the email for display on the next page. Never store the token
    // in sessionStorage — it's already in the emailed link.
    storage.write(RESET_CONTEXT_KEY, { email: identifier, requestedAt: Date.now() });

    return { email: identifier };
  }

  peekResetToken(token) {
    return otpService.peekResetToken(token);
  }

  async resetPassword(token, newPassword) {
    await wait(400);
    if (!token) throw new Error('Missing reset token.');
    if (newPassword.length < 8) {
      throw new Error('Password does not meet requirements.');
    }
    const peek = otpService.peekResetToken(token);
    if (!peek.ok) {
      if (peek.reason === 'expired') throw new Error('This reset link has expired.');
      if (peek.reason === 'used') throw new Error('This reset link has already been used.');
      throw new Error('This reset link is not valid.');
    }
    // Backend would actually update the password hash here.
    this._upsertUser(peek.email, { passwordUpdatedAt: Date.now() });
    otpService.consumeResetToken(token);
    storage.remove(RESET_CONTEXT_KEY);
    return { ok: true };
  }

  // ---------- Session ----------
  async logout() {
    const sessions = storage.read(SESSIONS_KEY, []);
    storage.write(SESSIONS_KEY, sessions.filter(s => !s.current));
    storage.remove(SESSION_KEY);
  }

  getSession() {
    return storage.read(SESSION_KEY, null);
  }

  updateUser(patch) {
    const session = storage.read(SESSION_KEY);
    if (!session) return null;
    const updated = { ...session, user: { ...session.user, ...patch } };
    storage.write(SESSION_KEY, updated);
    return updated;
  }

  _registerSession() {
    const sessions = storage.read(SESSIONS_KEY, []);
    const entry = {
      id: makeId('s'),
      device: detectDevice(),
      location: 'This device',
      last: 'Active now',
      current: true,
      startedAt: new Date().toISOString(),
    };
    const next = [entry, ...sessions.map(s => ({ ...s, current: false }))];
    storage.write(SESSIONS_KEY, next);
    return entry;
  }

  listSessions() {
    let list = storage.read(SESSIONS_KEY, []);
    if (list.length === 0) return [this._registerSession()];
    const hasCurrent = list.some(s => s.current);
    if (!hasCurrent) {
      list = [{ ...list[0], current: true }, ...list.slice(1).map(s => ({ ...s, current: false }))];
      storage.write(SESSIONS_KEY, list);
    }
    return list;
  }

  revokeSession(id) {
    const sessions = storage.read(SESSIONS_KEY, []);
    const next = sessions.filter(s => s.id !== id);
    storage.write(SESSIONS_KEY, next);
    return next;
  }

  revokeOtherSessions() {
    const sessions = storage.read(SESSIONS_KEY, []);
    const current = sessions.find(s => s.current);
    const next = current ? [current] : [];
    storage.write(SESSIONS_KEY, next);
    return next;
  }
}

export const authService = new AuthService();