import { useEffect, useState } from 'react';
import { Lock, LogOut, Shield } from 'lucide-react';
import Input from '@/components/common/Input';
import Button from '@/components/common/Button';
import Badge from '@/components/common/Badge';
import Modal from '@/components/common/Modal';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import PasswordStrength, { passwordScore } from '@/components/forms/PasswordStrength';
import { authService } from '@/services/authService';
import { useToast } from '@/context/ToastContext';
import './Settings.css';

export default function SecuritySettings() {
  const toast = useToast();
  const [twoFA, setTwoFA] = useState(true);
  const [pwdOpen, setPwdOpen] = useState(false);

  const [sessions, setSessions] = useState([]);
  const [confirmRevoke, setConfirmRevoke] = useState(null);
  const [confirmLogoutAll, setConfirmLogoutAll] = useState(false);

  const refreshSessions = () => setSessions(authService.listSessions());

  useEffect(() => {
    refreshSessions();
  }, []);

  const revoke = () => {
    if (!confirmRevoke) return;
    authService.revokeSession(confirmRevoke.id);
    refreshSessions();
    toast.success('Session signed out.');
    setConfirmRevoke(null);
  };

  const logoutAll = () => {
    authService.revokeOtherSessions();
    refreshSessions();
    setConfirmLogoutAll(false);
    toast.success('All other sessions signed out.');
  };

  const otherSessions = sessions.filter(s => !s.current);

  return (
    <div className="stack gap-24">
      <section className="settings-card">
        <div className="settings-card-head">
          <div>
            <div className="settings-card-title">Password</div>
            <div className="settings-card-sub">
              Use a strong password with at least 8 characters, one uppercase,
              one lowercase, one number and one special character.
            </div>
          </div>
        </div>
        <div>
          <Button
            variant="outline"
            leftIcon={<Lock size={14} />}
            onClick={() => setPwdOpen(true)}
          >
            Change password
          </Button>
        </div>
      </section>

      <section className="settings-card">
        <div className="settings-card-head">
          <div>
            <div className="settings-card-title">Two-factor authentication</div>
            <div className="settings-card-sub">
              Require a 6-digit OTP sent to your phone each time you sign in from a new device.
            </div>
          </div>
          <Badge tone={twoFA ? 'success' : 'neutral'}>
            {twoFA ? 'Enabled' : 'Disabled'}
          </Badge>
        </div>

        <div className="twofa-row">
          <span className="twofa-icon"><Shield size={18} /></span>
          <div style={{ flex: 1 }}>
            <div className="bold" style={{ fontSize: 13.5 }}>SMS OTP verification</div>
            <div className="muted" style={{ fontSize: 12.5, marginTop: 2 }}>
              Recommended. Protects your account even if your password is compromised.
            </div>
          </div>
          <button
            className={`switch ${twoFA ? 'on' : ''}`}
            onClick={() => {
              setTwoFA(v => !v);
              toast.success(twoFA
                ? 'Two-factor authentication disabled.'
                : 'Two-factor authentication enabled.');
            }}
            aria-pressed={twoFA}
            aria-label="Toggle two-factor authentication"
          >
            <span />
          </button>
        </div>
      </section>

      <section className="settings-card">
        <div className="settings-card-head">
          <div>
            <div className="settings-card-title">Active sessions</div>
            <div className="settings-card-sub">
              {sessions.length === 1
                ? 'You are only signed in on this device.'
                : `${sessions.length} devices are signed in to your Sokoni account.`}
            </div>
          </div>
          {otherSessions.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              leftIcon={<LogOut size={13} />}
              onClick={() => setConfirmLogoutAll(true)}
            >
              Sign out other devices
            </Button>
          )}
        </div>

        <ul className="sessions">
          {sessions.map(s => (
            <li key={s.id} className="session-row">
              <div className="session-main">
                <div className="row gap-8" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
                  <span className="bold" style={{ fontSize: 13.5 }}>{s.device}</span>
                  {s.current && <Badge tone="primary">This device</Badge>}
                </div>
                <div className="muted" style={{ fontSize: 12.5, marginTop: 3 }}>
                  {s.location}
                  {s.startedAt && (
                    <> · Started {new Date(s.startedAt).toLocaleString('en-KE', {
                      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                    })}</>
                  )}
                  {' · '}{s.last}
                </div>
              </div>
              {!s.current && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setConfirmRevoke(s)}
                >
                  Sign out
                </Button>
              )}
            </li>
          ))}
        </ul>
      </section>

      <Modal
        open={pwdOpen}
        onClose={() => setPwdOpen(false)}
        title="Change password"
        size="sm"
      >
        <ChangePasswordForm onClose={() => setPwdOpen(false)} />
      </Modal>

      <ConfirmDialog
        open={!!confirmRevoke}
        onClose={() => setConfirmRevoke(null)}
        onConfirm={revoke}
        title="Sign out this session"
        message={confirmRevoke ? `Sign out ${confirmRevoke.device}?` : ''}
        confirmLabel="Sign out"
      />

      <ConfirmDialog
        open={confirmLogoutAll}
        onClose={() => setConfirmLogoutAll(false)}
        onConfirm={logoutAll}
        title="Sign out other devices"
        message="Sign out of all other sessions? You'll stay signed in on this device."
        confirmLabel="Sign out others"
      />

      <style>{`
        .twofa-row {
          display: flex; gap: 14px; align-items: center;
          padding: 14px; background: var(--bg-soft);
          border-radius: 12px;
        }
        .twofa-icon {
          width: 40px; height: 40px; border-radius: 12px; flex-shrink: 0;
          background: var(--primary-50); color: var(--primary);
          display: flex; align-items: center; justify-content: center;
        }
        .switch {
          width: 42px; height: 24px; border-radius: 999px;
          background: var(--border-strong); border: 0; cursor: pointer;
          position: relative; transition: background var(--dur);
          flex-shrink: 0;
        }
        .switch.on { background: var(--primary); }
        .switch span {
          position: absolute; top: 3px; left: 3px;
          width: 18px; height: 18px; border-radius: 50%; background: #fff;
          transition: transform var(--dur) var(--ease);
        }
        .switch.on span { transform: translateX(18px); }

        .sessions { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; }
        .session-row {
          display: flex; justify-content: space-between; align-items: center;
          padding: 14px 0; border-bottom: 1px solid var(--border);
          gap: 12px;
        }
        .session-row:last-child { border-bottom: 0; }
        .session-main { min-width: 0; }
      `}</style>
    </div>
  );
}

function ChangePasswordForm({ onClose }) {
  const toast = useToast();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const valid = current && passwordScore(next) === 5 && next === confirm;

  const submit = async e => {
    e.preventDefault();
    setError('');
    if (!valid) {
      setError('Please complete all fields correctly.');
      return;
    }
    setSaving(true);
    await new Promise(r => setTimeout(r, 600));
    setSaving(false);
    toast.success('Password changed successfully.');
    onClose();
  };

  return (
    <form onSubmit={submit} className="stack gap-16" noValidate>
      <Input
        label="Current password"
        password
        value={current}
        onChange={e => setCurrent(e.target.value)}
        autoFocus
      />
      <Input
        label="New password"
        password
        value={next}
        onChange={e => setNext(e.target.value)}
      />
      <PasswordStrength value={next} />
      <Input
        label="Confirm new password"
        password
        value={confirm}
        onChange={e => setConfirm(e.target.value)}
        error={confirm && confirm !== next ? 'Passwords do not match.' : undefined}
      />
      {error && (
        <div style={{
          background: 'var(--danger-bg)', color: '#b91c1c',
          border: '1px solid #fecaca', borderRadius: 10,
          padding: '10px 14px', fontSize: 13,
        }}>{error}</div>
      )}
      <div className="row gap-12" style={{ justifyContent: 'flex-end' }}>
        <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
        <Button type="submit" loading={saving} disabled={!valid}>Change password</Button>
      </div>
    </form>
  );
}