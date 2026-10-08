import { useState } from 'react';
import { AtSign, Camera, Phone, Trash2, User } from 'lucide-react';
import Input from '@/components/common/Input';
import Button from '@/components/common/Button';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
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

  return (
    <div className="stack gap-24">
      <section className="settings-card">
        <div className="settings-card-head">
          <div>
            <div className="settings-card-title">Profile picture</div>
            <div className="settings-card-sub">
              Shown on your profile, the topbar and next to every action you take in Sokoni.
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
              <Button
                type="button"
                variant="outline"
                leftIcon={<Camera size={14} />}
                loading={uploading}
                onClick={() => document.getElementById('avatar-file')?.click()}
              >
                Upload new photo
              </Button>
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

      <form onSubmit={save} className="settings-card">
        <div className="settings-card-head">
          <div>
            <div className="settings-card-title">Personal information</div>
            <div className="settings-card-sub">
              This is how you appear on receipts and audit logs across your workspace.
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
            background: 'var(--danger-bg)', color: '#b91c1c',
            border: '1px solid #fecaca', borderRadius: 10,
            padding: '10px 14px', fontSize: 13,
          }}>{error}</div>
        )}

        <div className="settings-actions">
          <Button type="submit" loading={saving}>Save changes</Button>
        </div>
      </form>

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
      `}</style>
    </div>
  );
}