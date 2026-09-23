import React, { useEffect, useState } from 'react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../../services/firebase.js';
import { Search, Download, ShoppingCart, Users, User, Mail, Pencil } from 'lucide-react';
import { escapeCsvCell } from '@pip/shared';

interface OrderRow {
  id: string;
  publicReference: string;
  type: 'SINGLE' | 'BULK';
  buyerName: string;
  buyerEmail: string;
  organisationName?: string;
  participantCount: number;
  amountPaise: number;
  paymentStatus: string;
  orderStatus: string;
  createdAt: string;
}

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    CREATED: 'bg-slate-500/15 text-slate-300',
    PAYMENT_SUBMITTED: 'bg-amber-500/15 text-amber-300',
    VERIFIED: 'bg-emerald-500/15 text-emerald-300',
    CONFIRMED: 'bg-green-500/15 text-green-300',
    REJECTED: 'bg-red-500/15 text-red-300',
    REVIEW_REQUIRED: 'bg-orange-500/15 text-orange-300',
  };
  return map[status] || 'bg-slate-500/15 text-slate-400';
};

export const AdminOrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [resending, setResending] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  const updateEmail = async (order: OrderRow) => {
    const email = window.prompt('Recipient email address', order.buyerEmail)?.trim();
    if (!email || email === order.buyerEmail) return;
    setUpdating(order.id);
    try {
      await httpsCallable(
        functions,
        'adminUpdateContact'
      )({ entityType: 'ORDER', entityId: order.id, email });
      setOrders((current) =>
        current.map((item) =>
          item.id === order.id ? { ...item, buyerEmail: email.toLowerCase() } : item
        )
      );
    } catch (error) {
      console.error('[Admin Orders] Contact update failed:', error);
      window.alert(
        'The email address could not be updated. Check the address and your admin role.'
      );
    } finally {
      setUpdating(null);
    }
  };

  const resendConfirmation = async (orderId: string) => {
    setResending(orderId);
    try {
      await httpsCallable(
        functions,
        'adminResendConfirmation'
      )({ entityType: 'ORDER', entityId: orderId });
    } catch (error) {
      console.error('[Admin Orders] Resend failed:', error);
    } finally {
      setResending(null);
    }
  };

  useEffect(() => {
    async function load() {
      try {
        const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
        const snap = await getDocs(q);
        const rows: OrderRow[] = snap.docs.map((doc) => {
          const d = doc.data();
          return {
            id: doc.id,
            publicReference: d.publicReference || doc.id.slice(0, 10),
            type: d.type || 'SINGLE',
            buyerName: d.buyer?.fullName || d.primaryContact?.fullName || '—',
            buyerEmail: d.buyer?.email || d.primaryContact?.email || '—',
            organisationName: d.organisationName || undefined,
            participantCount: d.participantCount || 1,
            amountPaise: d.totalAmountPaise || 0,
            paymentStatus: d.paymentStatus || 'CREATED',
            orderStatus: d.orderStatus || 'CREATED',
            createdAt: d.createdAt || '',
          };
        });
        setOrders(rows);
      } catch (err) {
        console.error('[Admin Orders] Error loading:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = orders.filter((o) => {
    if (filterStatus !== 'ALL' && o.paymentStatus !== filterStatus) return false;
    if (filterType !== 'ALL' && o.type !== filterType) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        o.publicReference.toLowerCase().includes(term) ||
        o.buyerName.toLowerCase().includes(term) ||
        o.buyerEmail.toLowerCase().includes(term) ||
        (o.organisationName || '').toLowerCase().includes(term)
      );
    }
    return true;
  });

  const exportCSV = () => {
    const header =
      'Reference,Type,Buyer,Email,Organisation,Attendees,Amount,Payment Status,Order Status,Created\n';
    const rows = filtered.map((o) =>
      [
        o.publicReference,
        o.type,
        `"${o.buyerName}"`,
        o.buyerEmail,
        `"${o.organisationName || ''}"`,
        o.participantCount,
        (o.amountPaise / 100).toFixed(2),
        o.paymentStatus,
        o.orderStatus,
        o.createdAt,
      ]
        .map(escapeCsvCell)
        .join(',')
    );
    const blob = new Blob([header + rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pip5_orders_${new Date().toISOString().slice(0, 10)}.csv`;
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
          <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">Orders</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">{orders.length} total orders</p>
        </div>
        <button
          onClick={exportCSV}
          className="self-start sm:self-auto flex items-center space-x-2 px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-300 hover:text-white hover:border-slate-600 transition-all"
        >
          <Download className="w-4 h-4" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
        <div className="relative w-full sm:flex-1 sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by reference, name, email, organisation…"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50 text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-pip-500 focus:border-transparent outline-none"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="flex-1 sm:flex-none px-3 py-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50 text-sm text-slate-300 outline-none focus:ring-2 focus:ring-pip-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="CREATED">Created</option>
            <option value="PAYMENT_SUBMITTED">Payment Submitted</option>
            <option value="VERIFIED">Verified</option>
            <option value="REJECTED">Rejected</option>
            <option value="REVIEW_REQUIRED">Review</option>
          </select>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="flex-1 sm:flex-none px-3 py-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50 text-sm text-slate-300 outline-none focus:ring-2 focus:ring-pip-500"
          >
            <option value="ALL">All Types</option>
            <option value="SINGLE">Single</option>
            <option value="BULK">Bulk</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700/50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Reference
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Type
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Buyer
                </th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Attendees
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Amount
                </th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Created
                </th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/30">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-500">
                    No orders match your filters
                  </td>
                </tr>
              ) : (
                filtered.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-pip-400 font-medium">
                      {o.publicReference}
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center space-x-1.5">
                        {o.type === 'BULK' ? (
                          <Users className="w-3.5 h-3.5 text-indigo-400" />
                        ) : (
                          <User className="w-3.5 h-3.5 text-slate-400" />
                        )}
                        <span className="text-slate-300">{o.type}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-white font-medium">{o.buyerName}</p>
                      <p className="text-xs text-slate-500">{o.buyerEmail}</p>
                      {o.organisationName && (
                        <p className="text-xs text-slate-500 flex items-center space-x-1 mt-0.5">
                          <ShoppingCart className="w-3 h-3" />
                          <span>{o.organisationName}</span>
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-slate-300">{o.participantCount}</td>
                    <td className="px-4 py-3 text-right font-mono text-slate-300">
                      ₹{(o.amountPaise / 100).toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-lg text-xs font-semibold ${statusBadge(o.paymentStatus)}`}
                      >
                        {o.paymentStatus.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-slate-500">
                      {o.createdAt
                        ? new Date(o.createdAt).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: '2-digit',
                          })
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => updateEmail(o)}
                          disabled={updating === o.id}
                          className="p-1.5 rounded-lg bg-slate-500/10 text-slate-300 hover:bg-slate-500/20 disabled:opacity-50"
                          title="Correct recipient email"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        {o.orderStatus === 'CONFIRMED' && (
                          <button
                            type="button"
                            onClick={() => resendConfirmation(o.id)}
                            disabled={resending === o.id}
                            className="p-1.5 rounded-lg bg-pip-500/10 text-pip-400 hover:bg-pip-500/20 disabled:opacity-50"
                            title="Resend confirmation"
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
