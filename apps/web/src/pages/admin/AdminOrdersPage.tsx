import React, { useEffect, useState, useMemo } from 'react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../../services/firebase.js';
import {
  Search,
  Download,
  ShoppingCart,
  Users,
  Mail,
  Pencil,
  CheckCircle,
  XCircle,
  AlertTriangle,
  AlertCircle,
  Clock,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Loader2,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { escapeCsvCell } from '@pip/shared';

interface OrderRow {
  id: string;
  publicReference: string;
  type: 'SINGLE' | 'BULK' | 'DONOR';
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  organisationName?: string;
  participantCount: number;
  amountPaise: number;
  paymentStatus: string;
  orderStatus: string;
  paymentSessionId?: string;
  utr?: string;
  paymentProofUrl?: string;
  createdAt: string;
}

export const AdminOrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusTab, setStatusTab] = useState<'ALL' | 'ACTION_REQUIRED' | 'CONFIRMED' | 'AWAITING_PAYMENT' | 'FAILED'>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'SINGLE' | 'BULK' | 'DONOR'>('ALL');

  // Expanded row
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  // Actions state
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Edit Buyer modal state
  const [editingOrder, setEditingOrder] = useState<OrderRow | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((curr) => (curr?.message === message ? null : curr));
    }, 4500);
  };

  const loadOrders = async () => {
    setLoading(true);
    try {
      let ordersSnap;
      try {
        ordersSnap = await getDocs(query(collection(db, 'orders'), orderBy('createdAt', 'desc')));
      } catch {
        ordersSnap = await getDocs(collection(db, 'orders'));
      }

      // 2. Fetch Payment Sessions to correlate UTR & payment proofs (optional/resilient)
      let paymentsSnap;
      try {
        paymentsSnap = await getDocs(query(collection(db, 'paymentSessions'), orderBy('createdAt', 'desc')));
      } catch {
        try {
          paymentsSnap = await getDocs(collection(db, 'paymentSessions'));
        } catch {
          paymentsSnap = { docs: [] };
        }
      }
      const paymentMap = new Map<string, any>();
      paymentsSnap.docs.forEach((d) => {
        const data = d.data();
        paymentMap.set(d.id, data);
        if (data.entityId) {
          paymentMap.set(data.entityId, data);
        }
      });

      const rows: OrderRow[] = ordersSnap.docs.map((doc) => {
        const d = doc.data();
        const isDonor = doc.id.startsWith('DONOR_') || d.type === 'DONOR';
        const type: 'SINGLE' | 'BULK' | 'DONOR' = isDonor ? 'DONOR' : d.type === 'BULK' ? 'BULK' : 'SINGLE';

        const payment =
          paymentMap.get(d.paymentSessionId) ||
          paymentMap.get(doc.id) ||
          undefined;

        return {
          id: doc.id,
          publicReference: d.publicReference || doc.id.slice(0, 10),
          type,
          buyerName: d.buyer?.fullName || d.primaryContact?.fullName || '—',
          buyerEmail: d.buyer?.email || d.primaryContact?.email || '—',
          buyerPhone: d.buyer?.mobileNumber || d.buyer?.phone || d.primaryContact?.mobileNumber || '—',
          organisationName: d.organisationName || undefined,
          participantCount: d.participantCount || 1,
          amountPaise: d.totalAmountPaise || 0,
          paymentStatus: d.paymentStatus || (payment ? payment.status : 'CREATED'),
          orderStatus: d.orderStatus || 'CREATED',
          paymentSessionId: d.paymentSessionId || (payment ? payment.id : undefined),
          utr: payment?.evidence?.transactionReference || d.utr || undefined,
          paymentProofUrl: payment?.evidence?.storagePath || payment?.evidence?.fileUrl || undefined,
          createdAt: d.createdAt || '',
        };
      });

      setOrders(rows);
    } catch (err) {
      console.error('[Admin Orders] Error loading orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  // Trigger Confirmation Email Resend
  const handleResend = async (order: OrderRow) => {
    setResendingId(order.id);
    try {
      const fn = httpsCallable(functions, 'adminResendConfirmation');
      await fn({
        entityType: 'ORDER',
        entityId: order.id,
      });
      showToast(`Confirmation & pass email sent to ${order.buyerEmail}!`);
    } catch (err: any) {
      console.error('[Admin Orders] Resend failed:', err);
      showToast(err?.message || 'Failed to trigger confirmation email.', 'error');
    } finally {
      setResendingId(null);
    }
  };

  // Payment Approval / Rejection directly from Orders tab
  const handleApprovePayment = async (order: OrderRow, decision: 'APPROVE' | 'REJECT') => {
    const reason =
      decision === 'REJECT'
        ? window.prompt('Reason for rejecting payment (will be recorded in audit log):')
        : undefined;

    if (decision === 'REJECT' && reason === null) return;

    setApprovingId(order.id);
    try {
      const approveFn = httpsCallable(functions, 'adminApprovePayment');
      const payload: Record<string, any> = {
        decision,
        orderId: order.id,
      };
      if (order.paymentSessionId) {
        payload.paymentId = order.paymentSessionId;
      }
      if (reason && reason.trim()) {
        payload.reason = reason.trim();
      }

      await approveFn(payload);

      showToast(`Payment ${decision === 'APPROVE' ? 'approved & confirmed' : 'rejected'} successfully!`);
      await loadOrders();
    } catch (err: any) {
      console.error('[Admin Orders] Approval error:', err);
      showToast(err?.message || 'Payment approval action failed.', 'error');
    } finally {
      setApprovingId(null);
    }
  };

  // Edit Buyer modal handlers
  const openEditModal = (order: OrderRow) => {
    setEditingOrder(order);
    setEditName(order.buyerName === '—' ? '' : order.buyerName);
    setEditEmail(order.buyerEmail === '—' ? '' : order.buyerEmail);
    setEditPhone(order.buyerPhone === '—' ? '' : order.buyerPhone);
    setEditError(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrder) return;
    setEditError(null);

    const trimmedName = editName.trim();
    const trimmedEmail = editEmail.trim().toLowerCase();
    const trimmedPhone = editPhone.trim();

    if (!trimmedName || trimmedName.length < 2) {
      setEditError('Please enter a valid full name.');
      return;
    }
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setEditError('Please enter a valid email address.');
      return;
    }
    if (trimmedPhone && !/^[6-9]\d{9}$/.test(trimmedPhone)) {
      setEditError('Mobile number must be a valid 10-digit Indian number.');
      return;
    }

    setSavingEdit(true);
    try {
      const updateFn = httpsCallable(functions, 'adminUpdateContact');
      await updateFn({
        entityType: 'ORDER',
        entityId: editingOrder.id,
        fullName: trimmedName,
        email: trimmedEmail,
        mobileNumber: trimmedPhone || undefined,
      });

      setOrders((curr) =>
        curr.map((o) =>
          o.id === editingOrder.id
            ? {
                ...o,
                buyerName: trimmedName,
                buyerEmail: trimmedEmail,
                buyerPhone: trimmedPhone || '—',
              }
            : o
        )
      );

      showToast(`Updated contact details for ${trimmedName} successfully!`);
      setEditingOrder(null);
    } catch (err: any) {
      console.error('[Admin Orders] Save edit error:', err);
      setEditError(err?.message || 'Failed to update order contact.');
    } finally {
      setSavingEdit(false);
    }
  };

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      // Type filter
      if (typeFilter !== 'ALL' && o.type !== typeFilter) return false;

      // Status Tab filter
      if (statusTab === 'ACTION_REQUIRED') {
        const needsAction =
          o.orderStatus === 'PAYMENT_SUBMITTED' ||
          o.orderStatus === 'REVIEW_REQUIRED' ||
          o.paymentStatus === 'PAYMENT_SUBMITTED' ||
          o.paymentStatus === 'REVIEW_REQUIRED';
        if (!needsAction) return false;
      } else if (statusTab === 'CONFIRMED') {
        if (o.orderStatus !== 'CONFIRMED') return false;
      } else if (statusTab === 'AWAITING_PAYMENT') {
        if (
          o.orderStatus !== 'CREATED' &&
          o.orderStatus !== 'AWAITING_PAYMENT' &&
          o.orderStatus !== 'PENDING'
        )
          return false;
      } else if (statusTab === 'FAILED') {
        if (
          o.orderStatus !== 'FAILED' &&
          o.orderStatus !== 'EXPIRED' &&
          o.orderStatus !== 'REJECTED'
        )
          return false;
      }

      // Search term
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        o.buyerName.toLowerCase().includes(term) ||
        o.buyerEmail.toLowerCase().includes(term) ||
        o.buyerPhone.toLowerCase().includes(term) ||
        o.publicReference.toLowerCase().includes(term) ||
        (o.organisationName && o.organisationName.toLowerCase().includes(term)) ||
        (o.utr && o.utr.toLowerCase().includes(term))
      );
    });
  }, [orders, statusTab, typeFilter, searchTerm]);

  // Aggregate stats
  const stats = useMemo(() => {
    const actionRequired = orders.filter(
      (o) =>
        o.orderStatus === 'PAYMENT_SUBMITTED' ||
        o.orderStatus === 'REVIEW_REQUIRED' ||
        o.paymentStatus === 'PAYMENT_SUBMITTED' ||
        o.paymentStatus === 'REVIEW_REQUIRED'
    ).length;
    const confirmed = orders.filter((o) => o.orderStatus === 'CONFIRMED');
    const confirmedAmount = confirmed.reduce((sum, o) => sum + o.amountPaise, 0);
    const confirmedPasses = confirmed.reduce((sum, o) => sum + o.participantCount, 0);

    return {
      total: orders.length,
      actionRequired,
      confirmedCount: confirmed.length,
      confirmedAmount,
      confirmedPasses,
    };
  }, [orders]);

  // Status Badge Helper
  const renderStatusBadge = (order: OrderRow) => {
    if (order.orderStatus === 'CONFIRMED') {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
          <CheckCircle className="w-3.5 h-3.5" />
          <span>Confirmed</span>
        </span>
      );
    }
    if (order.orderStatus === 'PAYMENT_SUBMITTED' || order.paymentStatus === 'PAYMENT_SUBMITTED') {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30 animate-pulse">
          <Clock className="w-3.5 h-3.5" />
          <span>Approval Needed</span>
        </span>
      );
    }
    if (order.orderStatus === 'REVIEW_REQUIRED' || order.paymentStatus === 'REVIEW_REQUIRED') {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-500/15 text-orange-300 border border-orange-500/30">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Review Flagged</span>
        </span>
      );
    }
    if (order.orderStatus === 'REJECTED' || order.orderStatus === 'FAILED') {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-500/15 text-red-300 border border-red-500/30">
          <XCircle className="w-3.5 h-3.5" />
          <span>{order.orderStatus}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
        {order.orderStatus}
      </span>
    );
  };

  // Export CSV
  const handleExportCsv = () => {
    const headers = [
      'Order Ref',
      'Type',
      'Buyer Name',
      'Email',
      'Mobile',
      'Organisation',
      'Passes Count',
      'Amount (INR)',
      'Order Status',
      'Payment Status',
      'UTR',
      'Created Date',
    ];

    const rows = filteredOrders.map((o) => [
      escapeCsvCell(o.publicReference),
      escapeCsvCell(o.type),
      escapeCsvCell(o.buyerName),
      escapeCsvCell(o.buyerEmail),
      escapeCsvCell(o.buyerPhone),
      escapeCsvCell(o.organisationName || ''),
      escapeCsvCell(o.participantCount.toString()),
      escapeCsvCell((o.amountPaise / 100).toString()),
      escapeCsvCell(o.orderStatus),
      escapeCsvCell(o.paymentStatus),
      escapeCsvCell(o.utr || ''),
      escapeCsvCell(o.createdAt),
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `PiP5_Orders_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center space-x-3 px-4 py-3 rounded-xl shadow-xl border animate-in fade-in slide-in-from-top-2 duration-200 ${
            toast.type === 'success'
              ? 'bg-emerald-950/90 text-emerald-200 border-emerald-800'
              : 'bg-red-950/90 text-red-200 border-red-800'
          }`}
        >
          {toast.type === 'success' ? (
            <Check className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          )}
          <span className="text-sm font-medium">{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <ShoppingCart className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Orders & Payment Approvals</h1>
              <p className="text-sm text-slate-400">
                Track all single, group, and donor orders with integrated UTR verification.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={loadOrders}
            disabled={loading}
            className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition border border-slate-700 disabled:opacity-50"
            title="Refresh orders"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleExportCsv}
            disabled={loading || filteredOrders.length === 0}
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-pip-600 to-pink-500 hover:from-pip-700 hover:to-pink-600 text-white font-semibold text-sm shadow-md transition disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Orders</span>
            <ShoppingCart className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">{stats.total}</p>
          <p className="text-xs text-slate-500 mt-1">Single, bulk & donor</p>
        </div>

        <div
          className={`border rounded-2xl p-4 sm:p-5 transition ${
            stats.actionRequired > 0
              ? 'bg-amber-950/20 border-amber-800/80'
              : 'bg-slate-900/80 border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Needs Action / Review</span>
            <AlertTriangle className={`w-4 h-4 ${stats.actionRequired > 0 ? 'text-amber-400' : 'text-slate-400'}`} />
          </div>
          <p
            className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${
              stats.actionRequired > 0 ? 'text-amber-300' : 'text-white'
            }`}
          >
            {stats.actionRequired}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {stats.actionRequired > 0 ? 'Submitted UTRs awaiting review' : 'No pending reviews'}
          </p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Confirmed Revenue</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            ₹{(stats.confirmedAmount / 100).toLocaleString('en-IN')}
          </p>
          <p className="text-xs text-emerald-400/80 mt-1">From confirmed orders</p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Confirmed Attendees</span>
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {stats.confirmedPasses}
          </p>
          <p className="text-xs text-blue-400/80 mt-1">Passes issued</p>
        </div>
      </div>

      {/* Status Tabs Navigation */}
      <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 border-b border-slate-800 text-sm">
        <button
          onClick={() => setStatusTab('ALL')}
          className={`px-4 py-2 font-medium rounded-xl transition whitespace-nowrap ${
            statusTab === 'ALL'
              ? 'bg-slate-800 text-white font-semibold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          All Orders ({stats.total})
        </button>

        <button
          onClick={() => setStatusTab('ACTION_REQUIRED')}
          className={`px-4 py-2 font-medium rounded-xl transition flex items-center space-x-2 whitespace-nowrap ${
            statusTab === 'ACTION_REQUIRED'
              ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <span>Under Review</span>
          {stats.actionRequired > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-slate-950">
              {stats.actionRequired}
            </span>
          )}
        </button>

        <button
          onClick={() => setStatusTab('CONFIRMED')}
          className={`px-4 py-2 font-medium rounded-xl transition whitespace-nowrap ${
            statusTab === 'CONFIRMED'
              ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Confirmed ({stats.confirmedCount})
        </button>

        <button
          onClick={() => setStatusTab('AWAITING_PAYMENT')}
          className={`px-4 py-2 font-medium rounded-xl transition whitespace-nowrap ${
            statusTab === 'AWAITING_PAYMENT'
              ? 'bg-slate-800 text-white font-semibold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Awaiting Payment
        </button>

        <button
          onClick={() => setStatusTab('FAILED')}
          className={`px-4 py-2 font-medium rounded-xl transition whitespace-nowrap ${
            statusTab === 'FAILED'
              ? 'bg-slate-800 text-white font-semibold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Failed / Expired
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search by buyer, email, phone, reference, UTR..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-pip-500"
          />
        </div>

        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0">
          {(
            [
              { id: 'ALL', label: 'All Types' },
              { id: 'SINGLE', label: 'Individual' },
              { id: 'BULK', label: 'Group' },
              { id: 'DONOR', label: 'Donor Orders' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setTypeFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition whitespace-nowrap ${
                typeFilter === tab.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-3">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <p className="text-sm text-slate-400">Loading orders & payment records…</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-12 text-center">
          <ShoppingCart className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-white">No orders match your filter</h3>
          <p className="text-xs text-slate-400 mt-1">
            Try adjusting your search criteria or switching status tabs.
          </p>
        </div>
      ) : (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-800/80 border-b border-slate-700/80 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3.5">Order / Buyer</th>
                  <th className="px-4 py-3.5">Passes & Amount</th>
                  <th className="px-4 py-3.5">Type & Ref</th>
                  <th className="px-4 py-3.5">Status & Verification</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredOrders.map((order) => {
                  const isExpanded = expandedOrderId === order.id;
                  const isPendingAction =
                    order.orderStatus === 'PAYMENT_SUBMITTED' ||
                    order.orderStatus === 'REVIEW_REQUIRED' ||
                    order.paymentStatus === 'PAYMENT_SUBMITTED' ||
                    order.paymentStatus === 'REVIEW_REQUIRED' ||
                    order.orderStatus === 'AWAITING_PAYMENT' ||
                    order.paymentStatus === 'AWAITING_PAYMENT';

                  return (
                    <React.Fragment key={order.id}>
                      <tr className={`hover:bg-slate-800/40 transition ${isPendingAction ? 'bg-amber-950/10' : ''}`}>
                        <td className="px-4 py-3.5">
                          <div className="font-semibold text-white text-sm flex items-center space-x-2">
                            <span>{order.buyerName}</span>
                            {order.organisationName && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20">
                                {order.organisationName}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-400 flex flex-wrap gap-x-2 mt-0.5">
                            <span>{order.buyerEmail}</span>
                            {order.buyerPhone !== '—' && (
                              <>
                                <span className="text-slate-600">•</span>
                                <span>{order.buyerPhone}</span>
                              </>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-3.5">
                          <div className="font-bold text-white text-base">
                            ₹{(order.amountPaise / 100).toLocaleString('en-IN')}
                          </div>
                          <div className="text-xs text-slate-400 flex items-center space-x-1 mt-0.5">
                            <Users className="w-3.5 h-3.5 text-slate-500" />
                            <span>{order.participantCount} pass{order.participantCount > 1 ? 'es' : ''}</span>
                          </div>
                        </td>

                        <td className="px-4 py-3.5">
                          <div>
                            {order.type === 'DONOR' ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30">
                                Donor Passes
                              </span>
                            ) : order.type === 'BULK' ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/30">
                                Group Order
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/15 text-blue-300 border border-blue-500/30">
                                Single Order
                              </span>
                            )}
                          </div>
                          <div className="font-mono text-xs text-slate-400 mt-1">
                            {order.publicReference}
                          </div>
                        </td>

                        <td className="px-4 py-3.5">
                          <div>{renderStatusBadge(order)}</div>
                          {order.utr && (
                            <div className="text-[11px] text-slate-400 font-mono mt-1 flex items-center space-x-1">
                              <span className="text-slate-500">UTR:</span>
                              <span className="text-slate-300">{order.utr}</span>
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-3.5 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            {/* If pending confirmation, show Approve button */}
                            {order.orderStatus !== 'CONFIRMED' && (
                              <div className="flex items-center space-x-1">
                                <button
                                  onClick={() => handleApprovePayment(order, 'APPROVE')}
                                  disabled={approvingId === order.id}
                                  className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition disabled:opacity-50"
                                  title="Approve Payment"
                                >
                                  {approvingId === order.id ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Check className="w-3.5 h-3.5" />
                                  )}
                                  <span>Approve</span>
                                </button>

                                <button
                                  onClick={() => handleApprovePayment(order, 'REJECT')}
                                  disabled={approvingId === order.id}
                                  className="p-1.5 rounded-lg text-red-400 hover:text-white hover:bg-red-500/20 transition disabled:opacity-50"
                                  title="Reject Payment"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            )}

                            {/* Edit Buyer Details */}
                            <button
                              onClick={() => openEditModal(order)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                              title="Edit Buyer Contact"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>

                            {/* Trigger Resend Confirmation */}
                            {order.orderStatus === 'CONFIRMED' && (
                              <button
                                onClick={() => handleResend(order)}
                                disabled={resendingId === order.id}
                                className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition border border-slate-700 disabled:opacity-50"
                                title="Resend Confirmation Email"
                              >
                                {resendingId === order.id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin text-pip-400" />
                                ) : (
                                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                                )}
                                <span className="hidden sm:inline">Resend Email</span>
                              </button>
                            )}

                            {/* Expand Row details */}
                            <button
                              onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                              title={isExpanded ? 'Collapse' : 'Expand Details'}
                            >
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Order Drawer */}
                      {isExpanded && (
                        <tr className="bg-slate-950/60 border-t border-b border-slate-800">
                          <td colSpan={5} className="px-6 py-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                              <div>
                                <span className="font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                                  Order Metadata
                                </span>
                                <div className="space-y-1 text-slate-300 font-mono">
                                  <div>Order ID: {order.id}</div>
                                  <div>Created: {order.createdAt}</div>
                                  <div>Type: {order.type}</div>
                                </div>
                              </div>

                              <div>
                                <span className="font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                                  Payment Information
                                </span>
                                <div className="space-y-1 text-slate-300">
                                  <div>Payment Session: {order.paymentSessionId || 'None'}</div>
                                  <div>Status: {order.paymentStatus}</div>
                                  <div>UTR: {order.utr || 'Not submitted'}</div>
                                </div>
                              </div>

                              <div>
                                <span className="font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                                  Payment Verification Evidence
                                </span>
                                {order.paymentProofUrl ? (
                                  <a
                                    href={order.paymentProofUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center space-x-1.5 text-pip-400 hover:text-pip-300 underline"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                    <span>View Uploaded Proof</span>
                                  </a>
                                ) : (
                                  <span className="text-slate-500">No screenshot uploaded.</span>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Buyer Details Modal */}
      {editingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <button
              onClick={() => setEditingOrder(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 mb-5">
              <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                <Pencil className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Edit Buyer Details</h3>
                <p className="text-xs text-slate-400 font-mono">
                  Order Ref: {editingOrder.publicReference}
                </p>
              </div>
            </div>

            {editError && (
              <div className="p-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Buyer Full Name *
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Priyanshu Roy"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Buyer Email Address *
                </label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  required
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="name@example.com"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Updates order contact and tickets delivery destination.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Mobile Number (Optional)
                </label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="10-digit Indian mobile number"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setEditingOrder(null)}
                  disabled={savingEdit}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md transition disabled:opacity-50 flex items-center space-x-2"
                >
                  {savingEdit ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving…</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOrdersPage;
