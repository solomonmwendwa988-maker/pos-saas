import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Lock, ShieldAlert } from 'lucide-react';
import AuthLayout from '@/components/layout/AuthLayout';
import Input from '@/components/common/Input';
import Button from '@/components/common/Button';
import PasswordStrength, { passwordScore } from '@/components/forms/PasswordStrength';
import { authService } from '@/services/authService';
import { useToast } from '@/context/ToastContext';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const toast = useToast();

  const token = params.get('token');

  const [tokenState, setTokenState] = useState('checking'); // checking | ok | invalid
  const [resetEmail, setResetEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) {
      setTokenState('invalid');
      return;
    }
    const peek = authService.peekResetToken(token);
    if (!peek.ok) {
      setTokenState('invalid');
      return;
    }
    setResetEmail(peek.email);
    setTokenState('ok');
  }, [token]);

  const valid =
    passwordScore(password) === 5 &&
    password === confirm &&
    tokenState === 'ok';

  const submit = async e => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authService.resetPassword(token, password);
      setDone(true);
      toast.success('Password changed. Sign in with your new password.');
      setTimeout(() => nav('/login', { replace: true }), 2200);
    } catch (err) {
      setError(err.message || 'Could not reset password.');
    } finally {
      setLoading(false);
    }
  };

  if (tokenState === 'checking') {
    return (
      <AuthLayout title="Checking reset link">
        <div className="stack gap-12">
          <div className="skeleton" style={{ height: 42 }} />
          <div className="skeleton" style={{ height: 42 }} />
          <div className="skeleton" style={{ height: 48 }} />
        </div>
      </AuthLayout>
    );
  }

  if (tokenState === 'invalid') {
    return (
      <AuthLayout
        title="Reset link is invalid"
        subtitle="This link is missing, expired or has already been used."
        footer={<Link to="/login">Back to sign in</Link>}
      >
        <div className="rp-invalid">
          <span className="rp-invalid-icon"><ShieldAlert size={22} /></span>
          <h3 className="rp-invalid-title">We couldn't verify this link</h3>
          <p className="rp-invalid-text">
            Reset links expire after 30 minutes and can only be used once.
            Request a new one to continue.
          </p>
          <Link to="/forgot-password">
            <Button full size="lg">Request a new link</Button>
          </Link>
        </div>
        <style>{`
          .rp-invalid { text-align: center; padding: 8px 0; }
          .rp-invalid-icon {
            width: 60px; height: 60px; border-radius: 18px;
            background: var(--danger-bg); color: var(--danger);
            display: inline-flex; align-items: center; justify-content: center;
            margin-bottom: 12px;
          }
          .rp-invalid-title { font-size: 18px; font-weight: 800; margin: 0; }
          .rp-invalid-text {
            font-size: 13.5px; color: var(--text-muted);
            margin: 8px 0 20px; line-height: 1.6;
          }
        `}</style>
      </AuthLayout>
    );
  }

  if (done) {
    return (
      <AuthLayout title="Password updated" subtitle="You can now sign in.">
        <div className="rp-done">
          <span className="rp-done-icon"><CheckCircle2 size={28} /></span>
          <h3 className="rp-done-title">All set</h3>
          <p className="rp-done-text">
            Your password has been changed. Redirecting you to sign in…
          </p>
          <Link to="/login">
            <Button full size="lg">Sign in now</Button>
          </Link>
        </div>
        <style>{`
          .rp-done { text-align: center; padding: 8px 0; }
          .rp-done-icon {
            width: 64px; height: 64px; border-radius: 20px;
            background: var(--success-bg); color: var(--success);
            display: inline-flex; align-items: center; justify-content: center;
            margin-bottom: 12px;
          }
          .rp-done-title { font-size: 18px; font-weight: 800; margin: 0; }
          .rp-done-text {
            font-size: 13.5px; color: var(--text-muted);
            margin: 8px 0 20px; line-height: 1.6;
          }
        `}</style>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Set a new password"
      subtitle={`Reset for ${resetEmail}`}
      footer={<Link to="/login">Back to sign in</Link>}
    >
      <form onSubmit={submit} className="stack gap-16" noValidate>
        <Input
          label="New password"
          password
          value={password}
          onChange={e => setPassword(e.target.value)}
          leftIcon={<Lock size={15} />}
          autoFocus
        />
        <PasswordStrength value={password} />
        <Input
          label="Confirm password"
          password
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          leftIcon={<Lock size={15} />}
          error={confirm && confirm !== password ? 'Passwords do not match.' : undefined}
        />
        {error && <div className="form-error">{error}</div>}
        <Button
          full
          size="lg"
          loading={loading}
          disabled={!valid}
          type="submit"
        >
          Reset password
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