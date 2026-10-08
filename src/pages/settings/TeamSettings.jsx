import { useEffect, useState } from 'react';
import {
  Clock, Mail, Phone, Plus, ShieldCheck, Trash2, UserCheck, UserX, X,
} from 'lucide-react';
import Card from '@/components/common/Card';
import Badge from '@/components/common/Badge';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import Modal from '@/components/common/Modal';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { teamService } from '@/services/teamService';
import { activityLogService } from '@/services/activityLogService';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { ROLES, ROLE_LABELS, ROLE_DESCRIPTIONS } from '@/config/permissions';
import './Settings.css';

const ROLE_TONE = {
  OWNER: 'primary',
  MANAGER: 'info',
  CASHIER: 'neutral',
};

export default function TeamSettings() {
  const { user, role: currentRole } = useAuth();
  const toast = useToast();

  const [members, setMembers] = useState([]);
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState(ROLES.CASHIER);
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState('');

  const [pendingRemove, setPendingRemove] = useState(null);
  const [pendingRole, setPendingRole] = useState(null);
  const [newRole, setNewRole] = useState('');

  const refresh = () => {
    setMembers(teamService.listMembers());
    setInvites(teamService.listInvites());
    setLoading(false);
  };

  useEffect(() => {
    refresh();
  }, []);

  const log = (action, summary, meta) => {
    activityLogService.log({
      action,
      summary,
      meta,
      user: user || { id: 'unknown', fullName: 'Unknown', role: currentRole },
    });
  };

  const sendInvite = async e => {
    e.preventDefault();
    setInviteError('');
    setInviting(true);
    try {
      const invite = await teamService.createInvite({
        email: inviteEmail,
        role: inviteRole,
        invitedBy: user?.id,
      });
      log(
        'team.invite',
        `Invited ${invite.email} as ${ROLE_LABELS[invite.role]}`,
        { email: invite.email, role: invite.role, code: invite.code }
      );
      toast.success(
        `Invite created. Share the code ${invite.code} with ${invite.email}.`
      );
      setInviteEmail('');
      setInviteRole(ROLES.CASHIER);
      setInviteOpen(false);
      refresh();
    } catch (err) {
      setInviteError(err.message || 'Could not create invite.');
    } finally {
      setInviting(false);
    }
  };

  const cancelInvite = async id => {
    await teamService.cancelInvite(id);
    refresh();
    toast.success('Invite cancelled.');
  };

  const confirmRemove = async () => {
    if (!pendingRemove) return;
    await teamService.removeMember(pendingRemove.id);
    log('team.remove', `Removed ${pendingRemove.fullName}`, {
      memberId: pendingRemove.id,
      email: pendingRemove.email,
      role: pendingRemove.role,
    });
    setPendingRemove(null);
    refresh();
    toast.success('Team member removed.');
  };

  const confirmRoleChange = async () => {
    if (!pendingRole || !newRole) return;
    await teamService.updateMember(pendingRole.id, { role: newRole });
    log(
      'team.role-change',
      `Changed ${pendingRole.fullName} from ${ROLE_LABELS[pendingRole.role]} to ${ROLE_LABELS[newRole]}`,
      { memberId: pendingRole.id, from: pendingRole.role, to: newRole }
    );
    setPendingRole(null);
    setNewRole('');
    refresh();
    toast.success('Role updated.');
  };

  if (loading) {
    return <div className="skeleton" style={{ height: 320 }} />;
  }

  const ownerRow = {
    id: 'owner',
    fullName: user?.fullName || 'Owner',
    email: user?.email || '',
    phone: user?.phone || '',
    role: ROLES.OWNER,
    status: 'active',
    lastActiveAt: Date.now(),
  };

  const allRows = [ownerRow, ...members];

  const pendingInvites = invites.filter(
    i => i.status === 'pending' && i.expiresAt > Date.now()
  );

  return (
    <div className="stack gap-24">
      {/* Team members */}
      <section className="settings-card">
        <div className="settings-card-head">
          <div>
            <div className="settings-card-title">Team members</div>
            <div className="settings-card-sub">
              People with access to this workspace. Cashiers see the POS and
              their own shift. Managers see everything except billing and team
              settings.
            </div>
          </div>
          <Button
            leftIcon={<Plus size={14} />}
            onClick={() => setInviteOpen(true)}
          >
            Invite member
          </Button>
        </div>

        <div className="tm-list">
          {allRows.map(m => {
            const isMe = m.id === ownerRow.id;
            return (
              <div key={m.id} className="tm-row">
                <span className="tm-avatar">{m.fullName?.[0] || 'U'}</span>
                <div className="tm-body">
                  <div className="tm-name">
                    {m.fullName}
                    {isMe && <span className="tm-you">you</span>}
                  </div>
                  <div className="tm-meta">
                    <span><Mail size={12} /> {m.email || '—'}</span>
                    {m.phone && <span><Phone size={12} /> {m.phone}</span>}
                  </div>
                  <div className="tm-last">
                    {m.status === 'active'
                      ? 'Active'
                      : m.status === 'invited'
                      ? 'Invitation pending'
                      : m.status}
                  </div>
                </div>

                <div className="tm-actions">
                  <Badge tone={ROLE_TONE[m.role] || 'neutral'}>
                    {ROLE_LABELS[m.role] || m.role}
                  </Badge>

                  {!isMe && (
                    <>
                      <button
                        className="tm-icon-btn"
                        onClick={() => {
                          setPendingRole(m);
                          setNewRole(m.role);
                        }}
                        aria-label="Change role"
                        title="Change role"
                      >
                        <ShieldCheck size={14} />
                      </button>
                      <button
                        className="tm-icon-btn danger"
                        onClick={() => setPendingRemove(m)}
                        aria-label="Remove"
                        title="Remove"
                      >
                        <Trash2 size={14} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Pending invites */}
      {pendingInvites.length > 0 && (
        <section className="settings-card">
          <div className="settings-card-head">
            <div>
              <div className="settings-card-title">Pending invitations</div>
              <div className="settings-card-sub">
                Share the invite code with the person. They enter it when
                creating their account.
              </div>
            </div>
          </div>

          <div className="tm-list">
            {pendingInvites.map(i => (
              <div key={i.id} className="tm-row">
                <span className="tm-avatar" style={{ background: 'var(--warning)' }}>
                  <Clock size={16} />
                </span>
                <div className="tm-body">
                  <div className="tm-name">{i.email}</div>
                  <div className="tm-meta">
                    <span>
                      Invited as <strong>{ROLE_LABELS[i.role]}</strong>
                    </span>
                  </div>
                  <div className="tm-code">
                    Code: <span className="mono">{i.code}</span>
                  </div>
                </div>
                <div className="tm-actions">
                  <Badge tone="warning">Pending</Badge>
                  <button
                    className="tm-icon-btn danger"
                    onClick={() => cancelInvite(i.id)}
                    aria-label="Cancel invite"
                    title="Cancel invite"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Role reference */}
      <section className="settings-card">
        <div className="settings-card-head">
          <div>
            <div className="settings-card-title">Roles explained</div>
            <div className="settings-card-sub">
              A quick reference of what each role can do.
            </div>
          </div>
        </div>
        <div className="tm-roles">
          {Object.values(ROLES).map(r => (
            <div key={r} className="tm-role-card">
              <div className="tm-role-head">
                <Badge tone={ROLE_TONE[r]}>{ROLE_LABELS[r]}</Badge>
              </div>
              <div className="tm-role-body">{ROLE_DESCRIPTIONS[r]}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Invite modal */}
      <Modal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        title="Invite team member"
        subtitle="They will receive an invite code to join this workspace."
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>
              Cancel
            </Button>
            <Button onClick={sendInvite} loading={inviting} leftIcon={<UserCheck size={14} />}>
              Send invite
            </Button>
          </>
        }
      >
        <form onSubmit={sendInvite} className="stack gap-16">
          <Input
            label="Email address"
            type="email"
            value={inviteEmail}
            onChange={e => setInviteEmail(e.target.value)}
            placeholder="cashier@example.com"
            leftIcon={<Mail size={15} />}
            autoFocus
          />
          <div>
            <label
              className="field-label"
              style={{ marginBottom: 8, display: 'block' }}
            >
              Role
            </label>
            <div className="stack gap-8">
              {[ROLES.MANAGER, ROLES.CASHIER].map(r => (
                <button
                  key={r}
                  type="button"
                  className={`tm-role-pick ${inviteRole === r ? 'on' : ''}`}
                  onClick={() => setInviteRole(r)}
                >
                  <div className="tm-role-pick-head">
                    <Badge tone={ROLE_TONE[r]}>{ROLE_LABELS[r]}</Badge>
                    {inviteRole === r && <UserCheck size={14} />}
                  </div>
                  <div className="tm-role-pick-body">{ROLE_DESCRIPTIONS[r]}</div>
                </button>
              ))}
            </div>
          </div>
          {inviteError && <div className="form-error">{inviteError}</div>}
        </form>
      </Modal>

      {/* Remove confirmation */}
      <ConfirmDialog
        open={!!pendingRemove}
        onClose={() => setPendingRemove(null)}
        onConfirm={confirmRemove}
        title="Remove team member"
        message={
          pendingRemove
            ? `Remove ${pendingRemove.fullName}? They will lose access immediately. Their past actions stay in the activity log.`
            : ''
        }
        confirmLabel="Remove"
      />

      {/* Role change modal */}
      <Modal
        open={!!pendingRole}
        onClose={() => setPendingRole(null)}
        title="Change role"
        subtitle={pendingRole ? `Updating ${pendingRole.fullName}` : ''}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setPendingRole(null)}>
              Cancel
            </Button>
            <Button onClick={confirmRoleChange}>Save change</Button>
          </>
        }
      >
        <div className="stack gap-8">
          {[ROLES.MANAGER, ROLES.CASHIER].map(r => (
            <button
              key={r}
              type="button"
              className={`tm-role-pick ${newRole === r ? 'on' : ''}`}
              onClick={() => setNewRole(r)}
            >
              <div className="tm-role-pick-head">
                <Badge tone={ROLE_TONE[r]}>{ROLE_LABELS[r]}</Badge>
                {newRole === r && <UserCheck size={14} />}
              </div>
              <div className="tm-role-pick-body">{ROLE_DESCRIPTIONS[r]}</div>
            </button>
          ))}
        </div>
      </Modal>

      <style>{`
        .tm-list { display: flex; flex-direction: column; gap: 10px; }
        .tm-row {
          display: flex; align-items: center; gap: 14px;
          padding: 14px 16px;
          background: var(--bg-soft); border-radius: 12px;
        }
        .tm-avatar {
          width: 40px; height: 40px; border-radius: 50%;
          background: linear-gradient(135deg, #7c6cff, #22d3ee);
          color: #fff; font-weight: 700;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; font-family: var(--font-display);
          font-size: 16px;
        }
        .tm-body { flex: 1; min-width: 0; }
        .tm-name {
          font-size: 13.5px; font-weight: 700;
          display: inline-flex; align-items: center; gap: 8px;
        }
        .tm-you {
          font-size: 10px; font-weight: 700;
          padding: 1px 6px; border-radius: 999px;
          background: var(--primary-50); color: var(--primary);
        }
        .tm-meta {
          display: flex; gap: 12px; flex-wrap: wrap;
          font-size: 12px; color: var(--text-muted); margin-top: 3px;
        }
        .tm-meta span { display: inline-flex; align-items: center; gap: 5px; }
        .tm-last {
          font-size: 11.5px; color: var(--text-faint); margin-top: 3px;
        }
        .tm-code {
          font-size: 12px; margin-top: 4px;
          color: var(--warning); font-weight: 600;
        }
        .tm-actions {
          display: flex; gap: 6px; align-items: center; flex-shrink: 0;
        }
        .tm-icon-btn {
          width: 30px; height: 30px; border-radius: 8px;
          background: transparent; border: 1px solid var(--border);
          color: var(--text-muted); display: flex;
          align-items: center; justify-content: center;
          cursor: pointer; transition: all var(--dur);
        }
        .tm-icon-btn:hover {
          background: #fff; color: var(--primary);
          border-color: var(--primary);
        }
        .tm-icon-btn.danger:hover {
          color: var(--danger); border-color: #fecaca;
          background: var(--danger-bg);
        }

        .tm-roles {
          display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;
        }
        @media (max-width: 720px) {
          .tm-roles { grid-template-columns: 1fr; }
        }
        .tm-role-card {
          padding: 14px 16px; background: var(--bg-soft);
          border-radius: 12px;
        }
        .tm-role-head { margin-bottom: 8px; }
        .tm-role-body {
          font-size: 12.5px; color: var(--text-muted);
          line-height: 1.55;
        }

        .tm-role-pick {
          display: block; width: 100%; text-align: left;
          padding: 14px; border-radius: 12px;
          background: #fff; border: 1px solid var(--border-strong);
          cursor: pointer; transition: all var(--dur);
        }
        .tm-role-pick:hover { border-color: var(--primary); }
        .tm-role-pick.on {
          border-color: var(--primary);
          background: var(--primary-50);
          box-shadow: 0 0 0 3px var(--primary-50);
        }
        .tm-role-pick-head {
          display: flex; justify-content: space-between;
          align-items: center; margin-bottom: 6px;
        }
        .tm-role-pick-body {
          font-size: 12.5px; color: var(--text-muted); line-height: 1.55;
        }

        .form-error {
          padding: 10px 14px; border-radius: 10px;
          background: var(--danger-bg); color: #b91c1c;
          border: 1px solid #fecaca;
          font-size: 13px; font-weight: 500;
        }
      `}</style>
    </div>
  );
}