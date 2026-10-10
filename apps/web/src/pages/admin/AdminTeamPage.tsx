import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  Key,
  X,
  Search,
  RefreshCw,
  AlertTriangle,
  Mail,
  User,
  Trash2,
  CheckCircle2,
} from 'lucide-react';
import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../services/firebase.js';
import { useAdminAuth } from '../../context/AdminAuthContext.js';

export interface AdminRecord {
  id: string;
  uid: string;
  email: string;
  displayName: string;
  role: 'SUPER_ADMIN' | 'TICKET_ADMIN' | 'REGISTRATION_ADMIN' | 'PAYMENT_APPROVER' | 'FINANCE_VIEW' | 'VIEW_ONLY';
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
  addedBy?: string;
}

const ROLES_INFO: Record<
  AdminRecord['role'],
  { label: string; description: string; color: string; badgeBg: string; borderColor: string }
> = {
  SUPER_ADMIN: {
    label: 'Super Admin',
    description: 'Full root access to all event systems, payments, ticketing, audit logs, and team management.',
    color: 'text-purple-400',
    badgeBg: 'bg-purple-950/60 text-purple-300',
    borderColor: 'border-purple-500/40',
  },
  TICKET_ADMIN: {
    label: 'Gate / Ticket Admin',
    description: 'Access to Gate Pass Scanner, attendee ticket resolution, and gate check-ins tomorrow.',
    color: 'text-pip-400',
    badgeBg: 'bg-pip-950/60 text-pip-300',
    borderColor: 'border-pip-500/40',
  },
  REGISTRATION_ADMIN: {
    label: 'Registration Admin',
    description: 'Manage registration orders, attendee contact updates, and bulk registrations.',
    color: 'text-blue-400',
    badgeBg: 'bg-blue-950/60 text-blue-300',
    borderColor: 'border-blue-500/40',
  },
  PAYMENT_APPROVER: {
    label: 'Payment Approver',
    description: 'Review UPI receipts, verify bank UTRs, approve pending orders and donations.',
    color: 'text-emerald-400',
    badgeBg: 'bg-emerald-950/60 text-emerald-300',
    borderColor: 'border-emerald-500/40',
  },
  FINANCE_VIEW: {
    label: 'Finance View',
    description: 'View donation tallies, reconciliation summaries, bank inflows, and financial exports.',
    color: 'text-amber-400',
    badgeBg: 'bg-amber-950/60 text-amber-300',
    borderColor: 'border-amber-500/40',
  },
  VIEW_ONLY: {
    label: 'Audit View Only',
    description: 'Read-only access to overview dashboard and confirmed attendee lists.',
    color: 'text-slate-400',
    badgeBg: 'bg-slate-800 text-slate-300',
    borderColor: 'border-slate-700',
  },
};

export const AdminTeamPage: React.FC = () => {
  const { profile } = useAdminAuth();
  const [admins, setAdmins] = useState<AdminRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form State
  const [formEmail, setFormEmail] = useState('');
  const [formName, setFormName] = useState('');
  const [formRole, setFormRole] = useState<AdminRecord['role']>('TICKET_ADMIN');

  // Load admins from Firestore
  const loadAdmins = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const snap = await getDocs(collection(db, 'admins'));
      const list: AdminRecord[] = [];
      snap.docs.forEach((d) => {
        const data = d.data();
        list.push({
          id: d.id,
          uid: data.uid || d.id,
          email: data.email || '',
          displayName: data.displayName || data.email?.split('@')[0] || 'Administrator',
          role: (data.role as AdminRecord['role']) || 'VIEW_ONLY',
          active: data.active !== false,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          addedBy: data.addedBy,
        });
      });
      // Sort: Super Admins first, then alphabetically
      list.sort((a, b) => {
        if (a.role === 'SUPER_ADMIN' && b.role !== 'SUPER_ADMIN') return -1;
        if (a.role !== 'SUPER_ADMIN' && b.role === 'SUPER_ADMIN') return 1;
        return a.displayName.localeCompare(b.displayName);
      });
      setAdmins(list);
    } catch (err: any) {
      console.error('Failed to load admins:', err);
      setErrorMsg(err?.message || 'Could not load admin team list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdmins();
  }, []);

  // Filtered List
  const filteredAdmins = useMemo(() => {
    return admins.filter((a) => {
      const matchesSearch =
        !searchQuery.trim() ||
        a.displayName.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
        a.email.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
        a.role.toLowerCase().includes(searchQuery.toLowerCase().trim());
      const matchesRole = roleFilter === 'ALL' || a.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [admins, searchQuery, roleFilter]);

  // Create / Add Admin
  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formEmail.trim() || !formName.trim()) {
      setErrorMsg('Please enter both Email and Display Name.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    try {
      const cleanEmail = formEmail.toLowerCase().trim();
      const cleanName = formName.trim();
      const nowIso = new Date().toISOString();

      // Check if already in list
      const existing = admins.find((a) => a.email.toLowerCase() === cleanEmail);
      const targetDocId = existing ? existing.id : cleanEmail.replace(/[^a-z0-9]/g, '_');

      const adminPayload = {
        uid: existing ? existing.uid : targetDocId,
        email: cleanEmail,
        displayName: cleanName,
        role: formRole,
        active: true,
        createdAt: existing?.createdAt || nowIso,
        updatedAt: nowIso,
        addedBy: profile?.email || 'Super Admin',
      };

      await setDoc(doc(db, 'admins', targetDocId), adminPayload, { merge: true });

      setSuccessMsg(`✓ Administrator ${cleanName} (${cleanEmail}) successfully provisioned as ${ROLES_INFO[formRole].label}!`);
      setModalOpen(false);
      setFormEmail('');
      setFormName('');
      setFormRole('TICKET_ADMIN');
      await loadAdmins();

      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      console.error('Failed to provision admin:', err);
      setErrorMsg(err?.message || 'Failed to save admin.');
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle Active Status
  const handleToggleActive = async (admin: AdminRecord) => {
    try {
      const newActive = !admin.active;
      await updateDoc(doc(db, 'admins', admin.id), {
        active: newActive,
        updatedAt: new Date().toISOString(),
      });
      setAdmins((prev) =>
        prev.map((a) => (a.id === admin.id ? { ...a, active: newActive } : a))
      );
    } catch (err: any) {
      alert(`Could not update status: ${err?.message || 'Error'}`);
    }
  };

  // Update Role directly
  const handleRoleChange = async (admin: AdminRecord, newRole: AdminRecord['role']) => {
    try {
      await updateDoc(doc(db, 'admins', admin.id), {
        role: newRole,
        updatedAt: new Date().toISOString(),
      });
      setAdmins((prev) =>
        prev.map((a) => (a.id === admin.id ? { ...a, role: newRole } : a))
      );
    } catch (err: any) {
      alert(`Could not change role: ${err?.message || 'Error'}`);
    }
  };

  // Remove Admin Record
  const handleDeleteAdmin = async (admin: AdminRecord) => {
    if (admin.email.toLowerCase() === profile?.email?.toLowerCase()) {
      alert('You cannot delete your own administrative account.');
      return;
    }
    if (!confirm(`Are you sure you want to remove ${admin.displayName} (${admin.email}) from administrators?`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'admins', admin.id));
      setAdmins((prev) => prev.filter((a) => a.id !== admin.id));
    } catch (err: any) {
      alert(`Could not delete admin: ${err?.message || 'Error'}`);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 text-slate-100">
      {/* Header & Action Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2.5 rounded-2xl bg-purple-500/20 text-purple-300 border border-purple-500/30">
              <Key className="w-6 h-6" />
            </span>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">Admin Access & Role Control</h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Manage Event Organizing Committee, Gate Coordinators, and Finance Permissions
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadAdmins()}
            disabled={loading}
            className="p-3 rounded-2xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 transition"
            title="Refresh List"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-purple-400' : ''}`} />
          </button>
          <button
            onClick={() => setModalOpen(true)}
            className="py-3 px-5 rounded-2xl bg-gradient-to-r from-purple-600 to-pip-600 hover:from-purple-500 hover:to-pip-500 text-white font-bold text-sm flex items-center gap-2 shadow-lg shadow-purple-600/25 transition active:scale-[0.98]"
          >
            <UserPlus className="w-4 h-4" />
            Add New Admin
          </button>
        </div>
      </div>

      {/* Success Alert */}
      {successMsg && (
        <div className="mb-6 p-4 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-sm flex items-center gap-3 shadow-lg">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <div className="font-semibold">{successMsg}</div>
        </div>
      )}

      {/* Error Alert */}
      {errorMsg && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-sm flex items-center gap-3 shadow-lg">
          <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0" />
          <div>{errorMsg}</div>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 mb-6 bg-slate-900 p-3 rounded-2xl border border-slate-800">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, or role..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
          />
        </div>

        {/* Role Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          <button
            onClick={() => setRoleFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              roleFilter === 'ALL'
                ? 'bg-purple-600 text-white'
                : 'text-slate-400 hover:text-white bg-slate-950 border border-slate-800'
            }`}
          >
            All ({admins.length})
          </button>
          {Object.entries(ROLES_INFO).map(([key, info]) => {
            const count = admins.filter((a) => a.role === key).length;
            if (count === 0 && roleFilter !== key) return null;
            return (
              <button
                key={key}
                onClick={() => setRoleFilter(key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  roleFilter === key
                    ? 'bg-purple-600 text-white'
                    : 'text-slate-400 hover:text-white bg-slate-950 border border-slate-800'
                }`}
              >
                {info.label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Admins Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAdmins.map((admin) => {
          const roleData = ROLES_INFO[admin.role] || ROLES_INFO.VIEW_ONLY;
          const isSelf = admin.email.toLowerCase() === profile?.email?.toLowerCase();

          return (
            <div
              key={admin.id}
              className={`p-5 rounded-3xl bg-slate-900 border transition relative overflow-hidden flex flex-col justify-between ${
                admin.active ? 'border-slate-800 hover:border-slate-700' : 'border-slate-850 opacity-60'
              }`}
            >
              <div>
                {/* Top Row: Role Badge & Active Toggle */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span
                    className={`text-[11px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border ${roleData.badgeBg} ${roleData.borderColor} flex items-center gap-1.5`}
                  >
                    <Shield className="w-3 h-3" />
                    {roleData.label}
                  </span>

                  <div className="flex items-center gap-2">
                    {isSelf && (
                      <span className="text-[10px] font-bold text-purple-400 bg-purple-950/60 border border-purple-500/30 px-2 py-0.5 rounded-md">
                        You
                      </span>
                    )}
                    <button
                      onClick={() => handleToggleActive(admin)}
                      disabled={isSelf}
                      className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border transition ${
                        admin.active
                          ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/40 hover:bg-emerald-900/60'
                          : 'bg-rose-950/60 text-rose-400 border-rose-500/40 hover:bg-rose-900/60'
                      }`}
                      title={isSelf ? 'Cannot toggle self' : 'Toggle active/inactive access'}
                    >
                      {admin.active ? 'Active' : 'Disabled'}
                    </button>
                  </div>
                </div>

                {/* Name & Email */}
                <div className="flex items-center gap-3 mt-2">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pip-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300 font-black text-sm flex-shrink-0">
                    {admin.displayName.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-white text-base leading-snug truncate">
                      {admin.displayName}
                    </h3>
                    <p className="text-xs text-slate-400 truncate flex items-center gap-1 mt-0.5">
                      <Mail className="w-3 h-3 text-slate-500" />
                      {admin.email}
                    </p>
                  </div>
                </div>

                {/* Role Description */}
                <p className="text-[11px] text-slate-400 mt-3 line-clamp-2 bg-slate-950/60 p-2.5 rounded-xl border border-slate-850">
                  {roleData.description}
                </p>
              </div>

              {/* Bottom Row: Role Changer Dropdown & Delete */}
              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  <span className="text-[10px] uppercase font-bold text-slate-500 flex-shrink-0">Role:</span>
                  <select
                    value={admin.role}
                    onChange={(e) => handleRoleChange(admin, e.target.value as AdminRecord['role'])}
                    disabled={isSelf}
                    className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-purple-500 truncate w-full"
                  >
                    {Object.entries(ROLES_INFO).map(([k, inf]) => (
                      <option key={k} value={k}>
                        {inf.label}
                      </option>
                    ))}
                  </select>
                </div>

                {!isSelf && (
                  <button
                    onClick={() => handleDeleteAdmin(admin)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition flex-shrink-0"
                    title="Remove Admin"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filteredAdmins.length === 0 && !loading && (
        <div className="p-12 text-center bg-slate-900/40 rounded-3xl border border-slate-800 text-slate-400">
          <Users className="w-8 h-8 text-slate-500 mx-auto mb-2" />
          No administrators found matching your filter.
        </div>
      )}

      {/* ADD NEW ADMIN MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl relative text-slate-100">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <span className="p-3 rounded-2xl bg-purple-500/20 text-purple-300 border border-purple-500/30">
                <UserPlus className="w-6 h-6" />
              </span>
              <div>
                <h2 className="text-xl font-black text-white">Add New Administrator</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Grant organizing committee access or gate scanner authorization
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateAdmin} className="space-y-4">
              {/* Email Address */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Google / Firebase Email Address *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="e.g. volunteer@gmail.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  They will sign in with this email via Google or Password at /admin/login.
                </p>
              </div>

              {/* Display Name */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Full Name / Display Name *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Rtr. Kavya Sharma"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              {/* Role Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Assigned Administrative Role *
                </label>
                <select
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value as AdminRecord['role'])}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500"
                >
                  {Object.entries(ROLES_INFO).map(([k, inf]) => (
                    <option key={k} value={k}>
                      {inf.label} — {k}
                    </option>
                  ))}
                </select>
                <div className="mt-2 p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-purple-300">
                  <span className="font-bold block text-white mb-0.5">Permissions:</span>
                  {ROLES_INFO[formRole].description}
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pip-600 hover:from-purple-500 hover:to-pip-500 text-white text-sm font-bold shadow-lg shadow-purple-600/30 transition disabled:opacity-50"
                >
                  {submitting ? 'Granting Access...' : 'Grant Admin Access'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
