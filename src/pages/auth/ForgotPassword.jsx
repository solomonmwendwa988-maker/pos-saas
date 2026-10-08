import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Send } from 'lucide-react';
import AuthLayout from '@/components/layout/AuthLayout';
import Input from '@/components/common/Input';
import Button from '@/components/common/Button';
import { authService } from '@/services/authService';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const submit = async e => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Enter the email address on your account.');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email.trim())) {
      setError('Enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      await authService.requestPasswordReset(email.trim());
      setSent(true);
    } catch (err) {
      setError(err.message || 'Could not send the reset link.');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <AuthLayout
        title="Check your inbox"
        subtitle={`If an account exists for ${email}, we sent a password reset link.`}
        footer={<Link to="/login">Back to sign in</Link>}
      >
        <div className="fp-sent">
          <span className="fp-sent-icon"><Send size={22} /></span>
          <h3 className="fp-sent-title">Reset link sent</h3>
          <p className="fp-sent-text">
            Open the email and click the button to choose a new password.
            The link expires in 30 minutes.
          </p>
          <p className="fp-sent-hint">
            Didn't receive it? Check your spam folder, or{' '}
            <button
              type="button"
              className="fp-inline-link"
              onClick={() => setSent(false)}
            >
              try a different email
            </button>
            .
          </p>
        </div>
        <style>{`
          .fp-sent { text-align: center; padding: 12px 0; }
          .fp-sent-icon {
            width: 60px; height: 60px; border-radius: 18px;
            background: var(--success-bg); color: var(--success);
            display: inline-flex; align-items: center; justify-content: center;
            margin-bottom: 12px;
          }
          .fp-sent-title { font-size: 18px; font-weight: 800; margin: 0; }
          .fp-sent-text {
            font-size: 13.5px; color: var(--text-muted);
            margin: 8px 0 0; line-height: 1.6;
          }
          .fp-sent-hint {
            font-size: 12.5px; color: var(--text-faint);
            margin-top: 16px;
          }
          .fp-inline-link {
            background: transparent; border: 0;
            color: var(--primary); font-weight: 600; cursor: pointer;
            text-decoration: underline; padding: 0;
          }
        `}</style>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="Enter the email address on your Sokoni account and we'll send a reset link."
      footer={<>Remembered it? <Link to="/login">Back to sign in</Link></>}
    >
      <form onSubmit={submit} className="stack gap-16" noValidate>
        <Input
          label="Email address"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="owner@duka.co.ke"
          leftIcon={<Mail size={15} />}
          autoFocus
        />
        {error && <div className="form-error">{error}</div>}
        <Button
          full
          size="lg"
          loading={loading}
          type="submit"
          leftIcon={<Send size={14} />}
        >
          Send reset link
        </Button>
      </form>
      <style>{`
        .form-error {
          background: var(--danger-bg); color: #b91c1c;
          border: 1px solid #fecaca; border-radius: 10px;
          padding: 10px 14px; font-size: 13px; font-weight: 500;
        }
      `}</style>
    </AuthLayout>
  );
}