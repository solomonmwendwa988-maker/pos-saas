import { storage, wait, makeId } from './storage';
import { ROLES } from '@/config/permissions';

const MEMBERS_KEY = 'teamMembers';
const INVITES_KEY = 'teamInvites';

function generateInviteCode() {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
}

class TeamService {
  // ---------- Members ----------

  listMembers() {
    return storage.read(MEMBERS_KEY, []);
  }

  async addMember({ fullName, email, phone, role, invitedBy }) {
    await wait(200);
    const members = this.listMembers();
    if (members.some(m => m.email.toLowerCase() === email.toLowerCase())) {
      throw new Error('A team member with that email already exists.');
    }

    const member = {
      id: makeId('tm'),
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      phone: (phone || '').trim(),
      role: role || ROLES.CASHIER,
      status: 'invited', // 'invited' | 'active' | 'disabled'
      invitedBy: invitedBy || null,
      invitedAt: Date.now(),
      joinedAt: null,
      lastActiveAt: null,
      lastActiveDevice: null,
    };
    members.unshift(member);
    storage.write(MEMBERS_KEY, members);
    return member;
  }

  async updateMember(id, patch) {
    await wait(150);
    const members = this.listMembers();
    const next = members.map(m => (m.id === id ? { ...m, ...patch } : m));
    storage.write(MEMBERS_KEY, next);
    return next.find(m => m.id === id);
  }

  async removeMember(id) {
    await wait(150);
    const members = this.listMembers().filter(m => m.id !== id);
    storage.write(MEMBERS_KEY, members);
    return { id };
  }

  async markActive(id, device) {
    await wait(80);
    return this.updateMember(id, {
      status: 'active',
      lastActiveAt: Date.now(),
      lastActiveDevice: device || 'Unknown device',
    });
  }

  // ---------- Invites ----------

  listInvites() {
    return storage.read(INVITES_KEY, []);
  }

  async createInvite({ email, role, invitedBy }) {
    await wait(180);
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      throw new Error('Enter a valid email address.');
    }
    const invites = this.listInvites();
    if (invites.some(i => i.email.toLowerCase() === email.toLowerCase())) {
      throw new Error('An invite is already pending for that email.');
    }

    const invite = {
      id: makeId('invt'),
      code: generateInviteCode(),
      email: email.toLowerCase(),
      role: role || ROLES.CASHIER,
      invitedBy: invitedBy || null,
      createdAt: Date.now(),
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
      acceptedAt: null,
      status: 'pending', // 'pending' | 'accepted' | 'expired' | 'cancelled'
    };
    invites.unshift(invite);
    storage.write(INVITES_KEY, invites);
    return invite;
  }

  async cancelInvite(id) {
    await wait(120);
    const invites = this.listInvites().map(i =>
      i.id === id ? { ...i, status: 'cancelled' } : i
    );
    storage.write(INVITES_KEY, invites);
    return invites.find(i => i.id === id);
  }

  findInviteByCode(code) {
    return (
      this.listInvites().find(
        i => i.code === code && i.status === 'pending' && i.expiresAt > Date.now()
      ) || null
    );
  }

  async acceptInvite(code, { fullName, phone }) {
    await wait(200);
    const invite = this.findInviteByCode(code);
    if (!invite) throw new Error('This invite is invalid or has expired.');

    const member = await this.addMember({
      fullName,
      email: invite.email,
      phone,
      role: invite.role,
      invitedBy: invite.invitedBy,
    });
    await this.updateMember(member.id, {
      status: 'active',
      joinedAt: Date.now(),
    });

    const invites = this.listInvites().map(i =>
      i.id === invite.id ? { ...i, status: 'accepted', acceptedAt: Date.now() } : i
    );
    storage.write(INVITES_KEY, invites);

    return member;
  }

  reset() {
    storage.remove(MEMBERS_KEY);
    storage.remove(INVITES_KEY);
  }
}

export const teamService = new TeamService();