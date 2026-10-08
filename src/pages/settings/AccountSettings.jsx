import { useState } from 'react';
import {
  AtSign, Bell, BellOff, Camera, CheckCircle2, Phone, Trash2, User,
} from 'lucide-react';
import Input from '@/components/common/Input';
import Button from '@/components/common/Button';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { fileToAvatar, getInitials } from '@/utils/image';
import './Settings.css';

const KENYAN_PHONE = /^(?:\+254|0)(7\d{8}|1\d{8})$/;

export default function AccountSettings() {
  const { user, updateUser } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({
    fullName: user?.fullName || '',
    email: user?.email || '',
    phone: user?.phone || '',
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const push = usePushNotifications();

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const onAvatar = async e => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const dataUrl = await fileToAvatar(file);
      await updateUser({ avatarDataUrl: dataUrl });
      toast.success('Profile picture updated.');
    } catch (err) {
      toast.error(err.message || 'Could not upload image.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const removeAvatar = async () => {
    await updateUser({ avatarDataUrl: null });
    toast.success('Profile picture removed.');
  };

  const save = async e => {
    e.preventDefault();
    setError('');
    if (!form.fullName.trim()) {
      setError('Full name is required.');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(form.email)) {
      setError('Enter a valid email address.');
      return;
    }
    if (form.phone && !KENYAN_PHONE.test(form.phone.replace(/\s/g, ''))) {
      setError('Enter a valid Kenyan phone number.');
      return;
    }
    setSaving(true);
    await updateUser({
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
    });
    setSaving(false);
    toast.success('Account updated.');
  };

  const onEnableNotifications = async () => {
    try {
      const result = await push.request();
      if (result === 'granted') {
        toast.success('Notifications enabled.');
      } else {
        toast.error('Notification permission was not granted.');
      }
    } catch (err) {
      toast.error(err.message || 'Could not enable notifications.');
    }
  };

  const onDisableNotifications = () => {
    push.disable();
    toast.success('Notifications disabled.');
  };

  const onTestNotification = async () => {
    const ok = await push.test();
    if (ok) toast.success('Test notification sent.');
    else toast.error('Could not send a test notification.');
  };

  return (
    <div className="stack gap-24">
      {/* ---------- Profile picture ---------- */}
      <section className="settings-card">
        <div className="settings-card-head">
          <div>
            <div className="settings-card-title">Profile picture</div>
            <div className="settings-card-sub">
              Shown on your profile, the topbar and next to every action you take
              in Sokoni.
            </div>
          </div>
        </div>

        <div className="avatar-upload">
          <div className="avatar-preview">
            {user?.avatarDataUrl ? (
              <img src={user.avatarDataUrl} alt="Profile" />
            ) : (
              <span>{getInitials(user?.fullName)}</span>
            )}
          </div>

          <div className="avatar-actions">
            <label htmlFor="avatar-file">
              <span
                className="btn btn-outline btn-md"
                style={{ display: 'inline-flex', cursor: 'pointer' }}
              >
                <Camera size={14} />
                <span>Upload new photo</span>
              </span>
            </label>
            <input
              id="avatar-file"
              type="file"
              accept="image/*"
              className="file-input"
              onChange={onAvatar}
            />
            {user?.avatarDataUrl && (
              <Button
                type="button"
                variant="ghost"
                leftIcon={<Trash2 size={14} />}
                onClick={removeAvatar}
              >
                Remove
              </Button>
            )}
            <span className="avatar-hint">
              Square image, at least 256×256px. JPG or PNG.
            </span>
          </div>
        </div>
      </section>

      {/* ---------- Personal info ---------- */}
      <form onSubmit={save} className="settings-card">
        <div className="settings-card-head">
          <div>
            <div className="settings-card-title">Personal information</div>
            <div className="settings-card-sub">
              This is how you appear on receipts and audit logs across your
              workspace.
            </div>
          </div>
        </div>

        <div className="stack gap-16">
          <Input
            label="Full name"
            value={form.fullName}
            onChange={e => set('fullName', e.target.value)}
            leftIcon={<User size={15} />}
            placeholder="e.g. Wanjiku Kamau"
          />
          <div className="grid-2">
            <Input
              label="Email address"
              type="email"
              value={form.email}
              onChange={e => set('email', e.target.value)}
              leftIcon={<AtSign size={15} />}
            />
            <Input
              label="Phone number"
              value={form.phone}
              onChange={e => set('phone', e.target.value)}
              leftIcon={<Phone size={15} />}
              placeholder="0712 345 678"
            />
          </div>
        </div>

        {error && (
          <div style={{
            background: 'var(--danger-bg)',
            color: '#b91c1c',
            border: '1px solid #fecaca',
            borderRadius: 10,
            padding: '10px 14px',
            fontSize: 13,
          }}>{error}</div>
        )}

        <div className="settings-actions">
          <Button type="submit" loading={saving}>Save changes</Button>
        </div>
      </form>

      {/* ---------- Notifications ---------- */}
      <section className="settings-card">
        <div className="settings-card-head">
          <div>
            <div className="settings-card-title">Notifications</div>
            <div className="settings-card-sub">
              Get alerts about sales, low stock, shifts and payments — even when
              Sokoni is closed.
            </div>
          </div>
          {push.enabled && (
            <span className="notif-status notif-status-on">
              <CheckCircle2 size={13} /> Enabled
            </span>
          )}
        </div>

        {!push.supported && (
          <div className="notif-warn">
            Notifications are not available on this device. On iPhone, add
            Sokoni to your Home Screen first, then reopen it.
          </div>
        )}

        {push.supported && push.permission === 'denied' && (
          <div className="notif-warn">
            Notifications are blocked for this site. To enable them, open your
            browser settings and allow notifications for this site, then return
            here.
          </div>
        )}

        {push.supported && push.permission !== 'denied' && (
          <>
            <div className="notif-row">
              <span className="notif-row-icon">
                {push.enabled ? <Bell size={18} /> : <BellOff size={18} />}
              </span>
              <div className="notif-row-body">
                <div className="notif-row-title">
                  {push.enabled ? 'Notifications are on' : 'Notifications are off'}
                </div>
                <div className="notif-row-text">
                  {push.enabled
                    ? 'You will receive system notifications for key events.'
                    : 'Turn on to get alerts on your phone and computer.'}
                </div>
              </div>

              {push.enabled ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onDisableNotifications}
                >
                  Turn off
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={onEnableNotifications}
                  loading={push.busy}
                >
                  Turn on
                </Button>
              )}
            </div>

            {push.enabled && (
              <div className="notif-row">
                <span className="notif-row-icon notif-row-icon-soft">
                  <Bell size={16} />
                </span>
                <div className="notif-row-body">
                  <div className="notif-row-title">Send a test</div>
                  <div className="notif-row-text">
                    We'll send a test notification so you can confirm it works.
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={onTestNotification}>
                  Send test
                </Button>
              </div>
            )}
          </>
        )}
      </section>

      <style>{`
        .avatar-upload {
          display: flex; gap: 24px; align-items: center; flex-wrap: wrap;
        }
        .avatar-preview {
          width: 96px; height: 96px; border-radius: 24px;
          background: linear-gradient(135deg, #7c6cff, #22d3ee);
          color: #fff; font-family: var(--font-display); font-weight: 800;
          font-size: 32px;
          display: flex; align-items: center; justify-content: center;
          overflow: hidden; flex-shrink: 0;
          box-shadow: var(--shadow-primary);
        }
        .avatar-preview img { width: 100%; height: 100%; object-fit: cover; }
        .avatar-actions {
          display: flex; flex-direction: column; gap: 8px; align-items: flex-start;
        }
        .avatar-hint { font-size: 11.5px; color: var(--text-faint); }
        .file-input { display: none; }

        .notif-status {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 12px; font-weight: 700;
          padding: 4px 10px; border-radius: 999px;
        }
        .notif-status-on {
          background: var(--success-bg); color: #15803d;
        }

        .notif-warn {
          padding: 12px 14px;
          background: #fffbeb;
          border: 1px solid #fde68a;
          border-radius: 10px;
          font-size: 12.5px;
          color: #92400e;
          line-height: 1.55;
        }

        .notif-row {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px;
          background: var(--bg-soft);
          border-radius: 12px;
        }
        .notif-row-icon {
          width: 40px; height: 40px; border-radius: 12px;
          background: var(--primary-50); color: var(--primary);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .notif-row-icon-soft {
          background: #fff; color: var(--text-muted);
        }
        .notif-row-body { flex: 1; min-width: 0; }
        .notif-row-title { font-size: 13.5px; font-weight: 700; }
        .notif-row-text {
          font-size: 12.5px; color: var(--text-muted); margin-top: 3px;
          line-height: 1.5;
        }
      `}</style>
    </div>
  );
}