import React, { useEffect, useState } from 'react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../../services/firebase.js';
import { Search, Download, Mail, Pencil } from 'lucide-react';
import { escapeCsvCell } from '@pip/shared';

interface DonationRow {
  id: string;
  publicReference: string;
  donorName: string;
  donorEmail: string;
  donorMobile: string;
  amountPaise: number;
  pan?: string;
  anonymousPublicly: boolean;
  paymentStatus: string;
  createdAt: string;
}

export const AdminDonationsPage: React.FC = () => {
  const [donations, setDonations] = useState<DonationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [resending, setResending] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  const updateEmail = async (donation: DonationRow) => {
    const email = window.prompt('Donor email address', donation.donorEmail)?.trim();
    if (!email || email === donation.donorEmail) return;
    setUpdating(donation.id);
    try {
      await httpsCallable(
        functions,
        'adminUpdateContact'
      )({ entityType: 'DONATION', entityId: donation.id, email });
      setDonations((current) =>
        current.map((item) =>
          item.id === donation.id ? { ...item, donorEmail: email.toLowerCase() } : item
        )
      );
    } catch (error) {
      console.error('[Admin Donations] Contact update failed:', error);
      window.alert(
        'The email address could not be updated. Check the address and your admin role.'
      );
    } finally {
      setUpdating(null);
    }
  };

  const resendThankYou = async (donationId: string) => {
    setResending(donationId);
    try {
      await httpsCallable(
        functions,
        'adminResendConfirmation'
      )({
        entityType: 'DONATION',
        entityId: donationId,
      });
    } catch (error) {
      console.error('[Admin Donations] Resend failed:', error);
    } finally {
      setResending(null);
    }
  };

  useEffect(() => {
    async function load() {
      try {
        const q = query(collection(db, 'donations'), orderBy('createdAt', 'desc'));
        const snap = await getDocs(q);
        setDonations(
          snap.docs.map((doc) => {
            const d = doc.data();
            return {
              id: doc.id,
              publicReference: d.publicReference || doc.id.slice(0, 10),
              donorName: d.donor?.fullName || '—',
              donorEmail: d.donor?.email || '—',
              donorMobile: d.donor?.mobileNumber || '—',
              amountPaise: d.amountPaise || 0,
              pan: d.pan || undefined,
              anonymousPublicly: d.isAnonymousPublicly || false,
              paymentStatus: d.paymentStatus || 'CREATED',
              createdAt: d.createdAt || '',
            };
          })
        );
      } catch (err) {
        console.error('[Admin Donations] Error:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = donations.filter((d) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      d.publicReference.toLowerCase().includes(term) ||
      d.donorName.toLowerCase().includes(term) ||
      d.donorEmail.toLowerCase().includes(term)
    );
  });

  const exportCSV = () => {
    const header = 'Reference,Donor,Email,Mobile,Amount,PAN,Anonymous,Payment Status,Created\n';
    const rows = filtered.map((d) =>
      [
        d.publicReference,
        `"${d.donorName}"`,
        d.donorEmail,
        d.donorMobile,
        (d.amountPaise / 100).toFixed(2),
        d.pan || '',
        d.anonymousPublicly,
        d.paymentStatus,
        d.createdAt,
      ]
        .map(escapeCsvCell)
        .join(',')
    );
    const blob = new Blob([header + rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pip5_donations_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-4 border-pip-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">Donations</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">{donations.length} total contributions</p>
        </div>
        <button
          onClick={exportCSV}
          className="self-start sm:self-auto flex items-center space-x-2 px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-300 hover:text-white hover:border-slate-600 transition-all"
        >
          <Download className="w-4 h-4" />
          <span>Export CSV</span>
        </button>
      </div>

      <div className="relative w-full sm:max-w-md mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by reference, donor name, email…"
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50 text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-pip-500 focus:border-transparent outline-none"
        />
      </div>

      <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700/50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase">
                  Reference
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase">
                  Donor
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase">
                  Amount
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase">
                  PAN
                </th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-400 uppercase">
                  Status
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase">
                  Date
                </th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-400 uppercase">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/30">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-500">
                    No donations found
                  </td>
                </tr>
              ) : (
                filtered.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-pip-400 font-medium">
                      {d.publicReference}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-white font-medium">{d.donorName}</p>
                      <p className="text-xs text-slate-500">{d.donorEmail}</p>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-300">
                      ₹{(d.amountPaise / 100).toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-400">{d.pan || '—'}</td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-lg text-xs font-semibold ${
                          d.paymentStatus === 'VERIFIED'
                            ? 'bg-emerald-500/15 text-emerald-300'
                            : d.paymentStatus === 'PAYMENT_SUBMITTED'
                              ? 'bg-amber-500/15 text-amber-300'
                              : 'bg-slate-500/15 text-slate-400'
                        }`}
                      >
                        {d.paymentStatus.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-slate-500">
                      {d.createdAt
                        ? new Date(d.createdAt).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                          })
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => updateEmail(d)}
                          disabled={updating === d.id}
                          className="p-1.5 rounded-lg bg-slate-500/10 text-slate-300 hover:bg-slate-500/20 disabled:opacity-50"
                          title="Correct donor email"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        {d.paymentStatus === 'VERIFIED' && (
                          <button
                            type="button"
                            onClick={() => resendThankYou(d.id)}
                            disabled={resending === d.id}
                            className="p-1.5 rounded-lg bg-pip-500/10 text-pip-400 hover:bg-pip-500/20 disabled:opacity-50"
                            title="Resend donation acknowledgement"
                          >
                            <Mail className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
