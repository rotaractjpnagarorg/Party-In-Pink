import React, { useEffect, useState } from 'react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../../services/firebase.js';
import { Mail, RefreshCw, Search } from 'lucide-react';

interface EmailJobRow {
  id: string;
  templateKey: string;
  recipientEmail: string;
  recipientName: string;
  entityType: string;
  status: string;
  attempts: number;
  providerMessageId?: string;
  lastError?: string;
  createdAt: string;
}

export const AdminCommunicationsPage: React.FC = () => {
  const [emails, setEmails] = useState<EmailJobRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [retrying, setRetrying] = useState<string | null>(null);

  const load = async () => {
    try {
      const q = query(collection(db, 'emailJobs'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      setEmails(
        snap.docs.map((doc) => {
          const d = doc.data();
          return {
            id: doc.id,
            templateKey: d.templateKey || '—',
            recipientEmail: d.recipientEmail || '—',
            recipientName: d.recipientName || '—',
            entityType: d.entityType || '—',
            status: d.status || 'QUEUED',
            attempts: d.attempts || 0,
            providerMessageId: d.providerMessageId || undefined,
            lastError: d.lastError || undefined,
            createdAt: d.createdAt || '',
          };
        })
      );
    } catch (err) {
      console.error('[Admin Communications] Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const retryEmail = async (jobId: string) => {
    setRetrying(jobId);
    try {
      await httpsCallable(functions, 'adminRetryEmail')({ jobId });
      await load();
    } catch (error) {
      console.error('[Admin Communications] Retry failed:', error);
    } finally {
      setRetrying(null);
    }
  };

  const filtered = emails.filter((e) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      e.recipientEmail.toLowerCase().includes(term) ||
      e.recipientName.toLowerCase().includes(term) ||
      e.templateKey.toLowerCase().includes(term)
    );
  });

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      QUEUED: 'bg-slate-500/15 text-slate-300',
      SENDING: 'bg-blue-500/15 text-blue-300',
      SENT: 'bg-emerald-500/15 text-emerald-300',
      RETRYING: 'bg-amber-500/15 text-amber-300',
      FAILED: 'bg-red-500/15 text-red-300',
    };
    return map[status] || 'bg-slate-500/15 text-slate-400';
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
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-white tracking-tight">Communications</h1>
        <p className="text-sm text-slate-400 mt-1">Email job history & delivery status</p>
      </div>

      <div className="relative max-w-md mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by recipient, template…"
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50 text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-pip-500 focus:border-transparent outline-none"
        />
      </div>

      <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700/50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase">
                  Template
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase">
                  Recipient
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase">
                  Type
                </th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-400 uppercase">
                  Status
                </th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-400 uppercase">
                  Attempts
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase">
                  Error
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
                  <td colSpan={8} className="text-center py-12 text-slate-500">
                    No email jobs found
                  </td>
                </tr>
              ) : (
                filtered.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3">
                      <span className="flex items-center space-x-1.5">
                        <Mail className="w-3.5 h-3.5 text-pip-400" />
                        <span className="text-white font-medium text-xs">
                          {e.templateKey.replace(/_/g, ' ')}
                        </span>
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-white text-xs">{e.recipientName}</p>
                      <p className="text-[11px] text-slate-500">{e.recipientEmail}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">{e.entityType}</td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-lg text-xs font-semibold ${statusBadge(e.status)}`}
                      >
                        {e.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-slate-400 text-xs">{e.attempts}</td>
                    <td className="px-4 py-3 text-xs text-slate-500 max-w-[150px] truncate">
                      {e.lastError || '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-slate-500">
                      {e.createdAt
                        ? new Date(e.createdAt).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {e.status === 'FAILED' ? (
                        <button
                          type="button"
                          onClick={() => retryEmail(e.id)}
                          disabled={retrying === e.id}
                          className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 disabled:opacity-50"
                          title="Retry email"
                        >
                          <RefreshCw
                            className={`w-4 h-4 ${retrying === e.id ? 'animate-spin' : ''}`}
                          />
                        </button>
                      ) : (
                        '—'
                      )}
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
