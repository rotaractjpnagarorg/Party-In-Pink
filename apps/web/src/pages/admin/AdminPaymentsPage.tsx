import React, { useEffect, useState } from 'react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../../services/firebase.js';
import { Search, CheckCircle, XCircle, AlertTriangle, CreditCard, FileImage } from 'lucide-react';

interface PaymentRow {
  id: string;
  merchantReference: string;
  entityType: 'ORDER' | 'DONATION';
  entityId: string;
  method: string;
  amountPaise: number;
  status: string;
  utr?: string;
  storagePath?: string;
  createdAt: string;
}

const statusColor: Record<string, string> = {
  CREATED: 'bg-slate-500/15 text-slate-300',
  PAYMENT_SUBMITTED: 'bg-amber-500/15 text-amber-300',
  VERIFIED: 'bg-emerald-500/15 text-emerald-300',
  REJECTED: 'bg-red-500/15 text-red-300',
  REVIEW_REQUIRED: 'bg-orange-500/15 text-orange-300',
  EXPIRED: 'bg-slate-500/15 text-slate-500',
};

export const AdminPaymentsPage: React.FC = () => {
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionResult, setActionResult] = useState<{ id: string; msg: string; ok: boolean } | null>(
    null
  );

  const loadPayments = async () => {
    try {
      const q = query(collection(db, 'paymentSessions'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      setPayments(
        snap.docs.map((doc) => {
          const d = doc.data();
          return {
            id: doc.id,
            merchantReference: d.merchantReference || doc.id.slice(0, 10),
            entityType: d.entityType || 'ORDER',
            entityId: d.entityId || '',
            method: d.method || 'UPI',
            amountPaise: d.amountPaise || 0,
            status: d.status || 'CREATED',
            utr: d.evidence?.transactionReference || undefined,
            storagePath: d.evidence?.storagePath || undefined,
            createdAt: d.createdAt || '',
          };
        })
      );
    } catch (err) {
      console.error('[Admin Payments] Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, []);

  const handleApproval = async (
    paymentId: string,
    decision: 'APPROVE' | 'REJECT' | 'REVIEW',
    reason?: string
  ) => {
    setActionLoading(paymentId);
    setActionResult(null);
    try {
      const fn = httpsCallable(functions, 'adminApprovePayment');
      const res = await fn({
        paymentId,
        decision,
        reason: reason || `Admin ${decision.toLowerCase()} from console`,
      });
      const data = res.data as any;
      setActionResult({
        id: paymentId,
        msg: data.message || `Payment ${decision.toLowerCase()}d`,
        ok: true,
      });
      await loadPayments();
    } catch (err: any) {
      setActionResult({ id: paymentId, msg: err?.message || 'Action failed', ok: false });
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = payments.filter((p) => {
    if (filterStatus !== 'ALL' && p.status !== filterStatus) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        p.merchantReference.toLowerCase().includes(term) ||
        p.entityId.toLowerCase().includes(term) ||
        (p.utr || '').toLowerCase().includes(term)
      );
    }
    return true;
  });

  const openReceipt = async (paymentId: string) => {
    const receiptWindow = window.open('', '_blank', 'noopener,noreferrer');
    try {
      const response = await httpsCallable<{ paymentId: string }, { url: string }>(
        functions,
        'adminGetReceiptUrl'
      )({ paymentId });
      if (receiptWindow) receiptWindow.location.href = response.data.url;
      else window.location.href = response.data.url;
    } catch (error) {
      receiptWindow?.close();
      setActionResult({
        id: paymentId,
        msg: error instanceof Error ? error.message : 'Could not open receipt',
        ok: false,
      });
    }
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
        <h1 className="text-2xl font-extrabold text-white tracking-tight">Payments</h1>
        <p className="text-sm text-slate-400 mt-1">Manual payment verification & approval</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
        <div className="relative w-full sm:flex-1 sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by reference, entity ID, UTR…"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50 text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-pip-500 focus:border-transparent outline-none"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="w-full sm:w-auto px-3 py-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50 text-sm text-slate-300 outline-none focus:ring-2 focus:ring-pip-500"
        >
          <option value="ALL">All Statuses</option>
          <option value="PAYMENT_SUBMITTED">Pending</option>
          <option value="VERIFIED">Verified</option>
          <option value="REJECTED">Rejected</option>
          <option value="REVIEW_REQUIRED">Review</option>
        </select>
      </div>

      {/* Action result toast */}
      {actionResult && (
        <div
          className={`mb-4 flex items-center space-x-2 p-3 rounded-xl border text-sm ${
            actionResult.ok
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
              : 'bg-red-500/10 border-red-500/20 text-red-300'
          }`}
        >
          {actionResult.ok ? (
            <CheckCircle className="w-4 h-4" />
          ) : (
            <AlertTriangle className="w-4 h-4" />
          )}
          <span>{actionResult.msg}</span>
        </div>
      )}

      {/* Table */}
      <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700/50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase">
                  Reference
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase">
                  Type
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase">
                  Method
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase">
                  Amount
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase">
                  UTR
                </th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-400 uppercase">
                  Status
                </th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-400 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/30">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-500">
                    No payments match your filters
                  </td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-pip-400 font-medium">
                      {p.merchantReference}
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      <span className="flex items-center space-x-1.5">
                        {p.entityType === 'DONATION' ? (
                          '💝'
                        ) : (
                          <CreditCard className="w-3.5 h-3.5" />
                        )}
                        <span>{p.entityType}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{p.method}</td>
                    <td className="px-4 py-3 text-right font-mono text-slate-300">
                      ₹{(p.amountPaise / 100).toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-400">{p.utr || '—'}</td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-lg text-xs font-semibold ${statusColor[p.status] || 'bg-slate-500/15 text-slate-400'}`}
                      >
                        {p.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {p.status === 'PAYMENT_SUBMITTED' || p.status === 'REVIEW_REQUIRED' ? (
                        <div className="flex items-center justify-center space-x-2">
                          {p.storagePath && (
                            <button
                              onClick={() => void openReceipt(p.id)}
                              className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-all"
                              title="View private receipt"
                            >
                              <FileImage className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleApproval(p.id, 'APPROVE')}
                            disabled={actionLoading === p.id}
                            className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-50 transition-all"
                            title="Approve"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() =>
                              handleApproval(p.id, 'REJECT', 'Rejected from Admin Console')
                            }
                            disabled={actionLoading === p.id}
                            className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 disabled:opacity-50 transition-all"
                            title="Reject"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                          {p.status === 'PAYMENT_SUBMITTED' && (
                            <button
                              onClick={() =>
                                handleApproval(p.id, 'REVIEW', 'Flagged for bank reconciliation')
                              }
                              disabled={actionLoading === p.id}
                              className="p-1.5 rounded-lg bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 disabled:opacity-50 transition-all"
                              title="Flag for review"
                            >
                              <AlertTriangle className="w-4 h-4" />
                            </button>
                          )}
                          {actionLoading === p.id && (
                            <div className="animate-spin w-4 h-4 border-2 border-pip-500 border-t-transparent rounded-full" />
                          )}
                        </div>
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
