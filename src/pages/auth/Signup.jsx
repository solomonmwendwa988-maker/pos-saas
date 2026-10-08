import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AtSign, Building2, Lock, Mail, MapPin, Phone, User as UserIcon,
} from 'lucide-react';
import AuthLayout from '@/components/layout/AuthLayout';
import Input from '@/components/common/Input';
import Button from '@/components/common/Button';
import OTPInput from '@/components/forms/OTPInput';
import PasswordStrength, { passwordScore } from '@/components/forms/PasswordStrength';
import { authService } from '@/services/authService';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import './Signup.css';

const STEPS = ['Personal', 'Business', 'Security', 'Verify'];
const KENYAN_PHONE = /^(?:\+254|0)(7\d{8}|1\d{8})$/;

export default function Signup() {
  const nav = useNavigate();
  const toast = useToast();
  const { setSession } = useAuth();

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendIn, setResendIn] = useState(0);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('Mini-market');
  const [businessLocation, setBusinessLocation] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [otp, setOtp] = useState('');

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setInterval(() => setResendIn(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [resendIn]);

  const strength = passwordScore(password);
  const passwordsMatch = confirm.length > 0 && confirm === password;

  const stepValid = useMemo(() => {
    if (step === 0) {
      return (
        fullName.trim().length > 2 &&
        /\S+@\S+\.\S+/.test(email) &&
        KENYAN_PHONE.test(phone.replace(/\s/g, ''))
      );
    }
    if (step === 1) {
      return (
        businessName.trim().length > 1 &&
        businessType &&
        businessLocation.trim().length > 1
      );
    }
    if (step === 2) return strength === 5 && passwordsMatch;
    return otp.length === 6;
  }, [
    step,
    fullName,
    email,
    phone,
    businessName,
    businessType,
    businessLocation,
    strength,
    passwordsMatch,
    otp,
  ]);

  const next = () => {
    setError('');
    setStep(s => Math.min(3, s + 1));
  };
  const back = () => {
    setError('');
    setStep(s => Math.max(0, s - 1));
  };

  const submitSignup = async () => {
    setLoading(true);
    setError('');
    try {
      await authService.signup({
        fullName,
        email,
        phone,
        businessName,
        businessType,
        businessLocation,
        password,
      });
      next();
      setResendIn(30);
      toast.success('Check your email for the 6-digit verification code.');
    } catch (e) {
      setError(e.message || 'Signup failed.');
    } finally {
      setLoading(false);
    }
  };

  const submitOtp = async () => {
    setLoading(true);
    setError('');
    try {
      const session = await authService.verifyOtp(otp);
      setSession(session);
      nav('/loading', { replace: true, state: { next: '/onboarding' } });
    } catch (e) {
      setError(e.message || 'Verification failed.');
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    setError('');
    try {
      await authService.resendSignupOtp();
      setResendIn(30);
      toast.success('New code sent.');
    } catch (e) {
      setError(e.message || 'Could not resend the code.');
    }
  };

  return (
    <AuthLayout
      title="Create your Sokoni account"
      subtitle="Start your 3-day free trial. No card required."
      footer={<>Already have an account? <Link to="/login">Sign in</Link></>}
    >
      <ol className="signup-steps">
        {STEPS.map((label, i) => (
          <li
            key={label}
            className={i < step ? 'done' : i === step ? 'active' : ''}
          >
            <span className="signup-step-dot">{i + 1}</span>
            <span className="signup-step-label">{label}</span>
          </li>
        ))}
      </ol>

      {step === 0 && (
        <div className="stack gap-16 fade-up">
          <Input
            label="Full name"
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            placeholder="e.g. Wanjiku Kamau"
            leftIcon={<UserIcon size={16} />}
          />
          <Input
            label="Email address"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="owner@duka.co.ke"
            leftIcon={<AtSign size={16} />}
          />
          <Input
            label="Phone number"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="0712 345 678"
            leftIcon={<Phone size={16} />}
            hint="Kenyan mobile: 07XX XXX XXX or +254 7XX XXX XXX"
          />
        </div>
      )}

      {step === 1 && (
        <div className="stack gap-16 fade-up">
          <Input
            label="Business name"
            value={businessName}
            onChange={e => setBusinessName(e.target.value)}
            placeholder="e.g. Kamau Mini Market"
            leftIcon={<Building2 size={16} />}
          />
          <div className="field">
            <label className="field-label" htmlFor="business-type">
              Business type
            </label>
            <div className="field-control">
              <select
                id="business-type"
                className="field-input"
                value={businessType}
                onChange={e => setBusinessType(e.target.value)}
              >
                <option>Mini-market</option>
                <option>Supermarket</option>
                <option>Boutique</option>
                <option>Electronics</option>
                <option>Pharmacy</option>
                <option>Hardware</option>
                <option>Other</option>
              </select>
            </div>
          </div>
          <Input
            label="Business location"
            value={businessLocation}
            onChange={e => setBusinessLocation(e.target.value)}
            placeholder="e.g. Nakuru Town"
            leftIcon={<MapPin size={16} />}
          />
        </div>
      )}

      {step === 2 && (
        <div className="stack gap-16 fade-up">
          <Input
            label="Password"
            password
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Create a strong password"
            leftIcon={<Lock size={16} />}
          />
          <PasswordStrength value={password} />
          <Input
            label="Confirm password"
            password
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            placeholder="Re-enter your password"
            leftIcon={<Lock size={16} />}
            error={confirm && !passwordsMatch ? 'Passwords do not match.' : undefined}
          />
        </div>
      )}

      {step === 3 && (
        <div className="stack gap-16 fade-up">
          <div className="otp-hint">
            <Mail size={14} />
            <span>
              Code sent to <strong>{email}</strong>. Check your inbox and spam
              folder.
            </span>
          </div>
          <OTPInput value={otp} onChange={setOtp} />
          <div className="row gap-8" style={{ justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="signup-resend"
              onClick={resend}
              disabled={resendIn > 0}
            >
              {resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend code'}
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="form-error" style={{ marginTop: 14 }}>
          {error}
        </div>
      )}

      <div className="row gap-12" style={{ marginTop: 22 }}>
        {step > 0 && step < 3 && (
          <Button variant="outline" onClick={back}>
            Back
          </Button>
        )}
        {step < 2 && (
          <Button full onClick={next} disabled={!stepValid}>
            Continue
          </Button>
        )}
        {step === 2 && (
          <Button
            full
            onClick={submitSignup}
            loading={loading}
            disabled={!stepValid}
          >
            Create account
          </Button>
        )}
        {step === 3 && (
          <Button
            full
            onClick={submitOtp}
            loading={loading}
            disabled={!stepValid}
          >
            Verify and start trial
          </Button>
        )}
      </div>

      <style>{`
        .form-error {
          background: var(--danger-bg); color: #b91c1c;
          border: 1px solid #fecaca; border-radius: 10px;
          padding: 10px 14px; font-size: 13px; font-weight: 500;
        }
        .otp-hint {
          display: flex; gap: 8px; align-items: center;
          padding: 10px 14px; border-radius: 10px;
          background: var(--primary-50); color: var(--primary-700);
          font-size: 12.5px;
        }
        .signup-resend {
          background: transparent; border: 0;
          color: var(--primary); font-weight: 600; cursor: pointer;
          font-size: 13px; padding: 4px 6px;
        }
        .signup-resend:disabled { color: var(--text-faint); cursor: default; }
      `}</style>
    </AuthLayout>
  );
}