import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AtSign, Lock, Mail, RefreshCcw } from 'lucide-react';
import AuthLayout from '@/components/layout/AuthLayout';
import Input from '@/components/common/Input';
import Button from '@/components/common/Button';
import OTPInput from '@/components/forms/OTPInput';
import { authService } from '@/services/authService';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';

export default function Login() {
  const nav = useNavigate();
  const toast = useToast();
  const { setSession } = useAuth();

  const [step, setStep] = useState('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setInterval(() => setResendIn(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [resendIn]);

  const submitCredentials = async e => {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('Enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      await authService.login({ email, password });
      setStep('otp');
      setResendIn(30);
      toast.success('Check your email for the 6-digit code.');
    } catch (err) {
      setError(err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  const submitOtp = async e => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const session = await authService.completeLoginWithOtp(otp, email);
      setSession(session);
      nav('/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || 'Verification failed.');
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    setError('');
    try {
      await authService.resendLoginOtp(email);
      setResendIn(30);
      toast.success('New code sent.');
    } catch (err) {
      setError(err.message || 'Could not resend the code.');
    }
  };

  return (
    <AuthLayout
      title={step === 'credentials' ? 'Sign in to Sokoni' : "Verify it's you"}
      subtitle={
        step === 'credentials'
          ? 'Access your dashboard, POS and reports.'
          : `We sent a 6-digit code to ${email}. Check your inbox and spam folder.`
      }
      footer={
        step === 'credentials' ? (
          <>New to Sokoni? <Link to="/signup">Create an account</Link></>
        ) : (
          <>
            Didn't get the code?{' '}
            <button
              className="linklike"
              onClick={resend}
              disabled={resendIn > 0}
              type="button"
            >
              {resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend code'}
            </button>
          </>
        )
      }
    >
      {step === 'credentials' ? (
        <form onSubmit={submitCredentials} className="stack gap-16" noValidate>
          <Input
            label="Email address"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            leftIcon={<AtSign size={16} />}
            placeholder="owner@duka.co.ke"
            autoComplete="email"
            required
          />
          <Input
            label="Password"
            password
            value={password}
            onChange={e => setPassword(e.target.value)}
            leftIcon={<Lock size={16} />}
            autoComplete="current-password"
            required
          />
          <div className="row between" style={{ marginTop: -4 }}>
            <label className="check">
              <input
                type="checkbox"
                checked={remember}
                onChange={e => setRemember(e.target.checked)}
              />
              <span>Remember me</span>
            </label>
            <Link to="/forgot-password" className="linklike">
              Forgot password?
            </Link>
          </div>
          {error && <div className="form-error">{error}</div>}
          <Button type="submit" full size="lg" loading={loading}>
            Continue
          </Button>
        </form>
      ) : (
        <form onSubmit={submitOtp} className="stack gap-16" noValidate>
          <div className="otp-hint">
            <Mail size={14} />
            <span>Sent to <strong>{email}</strong></span>
          </div>
          <OTPInput value={otp} onChange={setOtp} />
          {error && <div className="form-error">{error}</div>}
          <Button
            type="submit"
            full
            size="lg"
            loading={loading}
            disabled={otp.length !== 6}
          >
            Verify and continue
          </Button>
          <button
            type="button"
            className="linklike"
            onClick={() => { setStep('credentials'); setOtp(''); setError(''); }}
          >
            Use a different account
          </button>
        </form>
      )}

      <style>{`
        .linklike {
          background: transparent; border: 0; color: var(--primary);
          font-weight: 600; cursor: pointer; font-size: 13.5px; padding: 0;
        }
        .linklike:disabled { color: var(--text-faint); cursor: default; }
        .linklike:hover:not(:disabled) { text-decoration: underline; }
        .check {
          display: inline-flex; align-items: center; gap: 8px;
          font-size: 13.5px; color: var(--text-muted); cursor: pointer;
        }
        .check input { accent-color: var(--primary); }
        .form-error {
          background: var(--danger-bg); color: #b91c1c;
          border: 1px solid #fecaca; border-radius: 10px;
          padding: 10px 14px; font-size: 13px; font-weight: 500;
        }
        .otp-hint {
          display: flex; gap: 8px; align-items: center;
          padding: 10px 14px; border-radius: 10px;
          background: var(--primary-50); color: var(--primary-700);
          font-size: 12.5px; margin-bottom: 4px;
        }
      `}</style>
    </AuthLayout>
  );
}