import emailjs from '@emailjs/browser';
import { env } from '@/utils/env';

const CONFIG = {
  publicKey: import.meta.env.VITE_EMAILJS_PUBLIC_KEY || '',
  serviceId: import.meta.env.VITE_EMAILJS_SERVICE_ID || '',
  otpTemplateId: import.meta.env.VITE_EMAILJS_OTP_TEMPLATE_ID || '',
  resetTemplateId: import.meta.env.VITE_EMAILJS_RESET_TEMPLATE_ID || '',
};

const configured = () =>
  CONFIG.publicKey && CONFIG.serviceId;

class EmailService {
  async sendOtp({ to, name, code, expiresMinutes = 10 }) {
    if (!configured()) {
      throw new Error(
        'Email is not configured. Add EmailJS keys to your .env file.'
      );
    }
    if (!CONFIG.otpTemplateId) {
      throw new Error('OTP template ID is missing from your .env file.');
    }

    const result = await emailjs.send(
      CONFIG.serviceId,
      CONFIG.otpTemplateId,
      {
        to_email: to,
        to_name: name || 'there',
        otp_code: code,
        expires_minutes: String(expiresMinutes),
        app_name: env.appName,
      },
      { publicKey: CONFIG.publicKey }
    );

    return { id: result.text || 'sent' };
  }

  async sendPasswordReset({ to, name, link, expiresMinutes = 30 }) {
    if (!configured()) {
      throw new Error(
        'Email is not configured. Add EmailJS keys to your .env file.'
      );
    }
    if (!CONFIG.resetTemplateId) {
      throw new Error('Reset template ID is missing from your .env file.');
    }

    const result = await emailjs.send(
      CONFIG.serviceId,
      CONFIG.resetTemplateId,
      {
        to_email: to,
        to_name: name || 'there',
        reset_link: link,
        expires_minutes: String(expiresMinutes),
        app_name: env.appName,
      },
      { publicKey: CONFIG.publicKey }
    );

    return { id: result.text || 'sent' };
  }

  isConfigured() {
    return configured();
  }
}

export const emailService = new EmailService();