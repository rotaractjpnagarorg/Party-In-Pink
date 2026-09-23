import React, { useEffect, useState } from 'react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../../services/firebase.js';
import { Ticket, CheckCircle, XCircle, RefreshCw, AlertTriangle } from 'lucide-react';

interface TicketJobRow {
  id: string;
  orderId: string;
  status: string;
  attempts: number;
  maxAttempts: number;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
}

export const AdminTicketsPage: React.FC = () => {
  const [jobs, setJobs] = useState<TicketJobRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [retryLoading, setRetryLoading] = useState<string | null>(null);
  const [retryResult, setRetryResult] = useState<{ id: string; msg: string; ok: boolean } | null>(
    null
  );

  const loadJobs = async () => {
    try {
      const q = query(collection(db, 'ticketJobs'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      setJobs(
        snap.docs.map((doc) => {
          const d = doc.data();
          return {
            id: doc.id,
            orderId: d.orderId || doc.id,
            status: d.status || 'QUEUED',
            attempts: d.attempts || 0,
            maxAttempts: d.maxAttempts || 5,
            lastError: d.lastError || undefined,
            createdAt: d.createdAt || '',
            updatedAt: d.updatedAt || '',
          };
        })
      );
    } catch (err) {
      console.error('[Admin Tickets] Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
  }, []);

  const handleRetry = async (jobId: string) => {
    setRetryLoading(jobId);
    setRetryResult(null);
    try {
      const fn = httpsCallable(functions, 'adminRetryTicket');
      const res = await fn({ jobId });
      const data = res.data as any;
      setRetryResult({ id: jobId, msg: data.message || 'Retry queued', ok: true });
      await loadJobs();
    } catch (err: any) {
      setRetryResult({ id: jobId, msg: err?.message || 'Retry failed', ok: false });
    } finally {
      setRetryLoading(null);
    }
  };

  const statusIcon = (status: string) => {
    if (status === 'ISSUED') return <CheckCircle className="w-4 h-4 text-emerald-400" />;
    if (status === 'FAILED') return <XCircle className="w-4 h-4 text-red-400" />;
    if (status === 'RETRYING') return <RefreshCw className="w-4 h-4 text-amber-400 animate-spin" />;
    return <Ticket className="w-4 h-4 text-slate-400" />;
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      QUEUED: 'bg-slate-500/15 text-slate-300',
      ISSUED: 'bg-emerald-500/15 text-emerald-300',
      RETRYING: 'bg-amber-500/15 text-amber-300',
      FAILED: 'bg-red-500/15 text-red-300',
      REVIEW_REQUIRED: 'bg-orange-500/15 text-orange-300',
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
        <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">Ticket Jobs</h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">KonfHub fulfilment status & retry controls</p>
      </div>

      {retryResult && (
        <div
          className={`mb-4 flex items-center space-x-2 p-3 rounded-xl border text-sm ${
            retryResult.ok
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
              : 'bg-red-500/10 border-red-500/20 text-red-300'
          }`}
        >
          {retryResult.ok ? (
            <CheckCircle className="w-4 h-4" />
          ) : (
            <AlertTriangle className="w-4 h-4" />
          )}
          <span>{retryResult.msg}</span>
        </div>
      )}

      <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700/50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase">
                  Order ID
                </th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-400 uppercase">
                  Status
                </th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-400 uppercase">
                  Attempts
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase">
                  Last Error
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase">
                  Updated
                </th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-400 uppercase">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/30">
              {jobs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-500">
                    No ticket jobs
                  </td>
                </tr>
              ) : (
                jobs.map((j) => (
                  <tr key={j.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-pip-400">
                      {j.orderId.slice(0, 16)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${statusBadge(j.status)}`}
                      >
                        {statusIcon(j.status)}
                        <span>{j.status}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-slate-400">
                      {j.attempts}/{j.maxAttempts}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 max-w-[200px] truncate">
                      {j.lastError || '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-slate-500">
                      {j.updatedAt
                        ? new Date(j.updatedAt).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {j.status === 'FAILED' ||
                      j.status === 'RETRYING' ||
                      j.status === 'REVIEW_REQUIRED' ? (
                        <button
                          onClick={() => handleRetry(j.id)}
                          disabled={retryLoading === j.id}
                          className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 disabled:opacity-50 transition-all"
                          title={
                            j.status === 'REVIEW_REQUIRED'
                              ? 'Retry after reconciling KonfHub'
                              : 'Retry'
                          }
                        >
                          {retryLoading === j.id ? (
                            <div className="animate-spin w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full" />
                          ) : (
                            <RefreshCw className="w-4 h-4" />
                          )}
                        </button>
                      ) : (
                        <span className="text-xs text-slate-600">—</span>
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
