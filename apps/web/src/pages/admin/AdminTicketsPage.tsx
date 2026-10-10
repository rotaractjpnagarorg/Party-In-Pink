import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../../services/firebase.js';
import {
  Ticket,
  CheckCircle,
  Download,
  Search,
  Mail,
  Pencil,
  ExternalLink,
  Users,
  Heart,
  RefreshCw,
  X,
  AlertCircle,
  Loader2,
  Check,
  Scan,
} from 'lucide-react';
import { escapeCsvCell } from '@pip/shared';

export interface ConfirmedTicketRow {
  id: string; // attendee doc ID
  orderId: string;
  orderRef: string;
  fullName: string;
  email: string;
  phone: string;
  registrationId: string;
  bookingId?: string;
  ticketStatus: string;
  ticketPdfUrl?: string;
  qrCodePayload?: string;
  type: 'SINGLE' | 'BULK' | 'DONOR_PASS';
  createdAt: string;
}

export const AdminTicketsPage: React.FC = () => {
  const [tickets, setTickets] = useState<ConfirmedTicketRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'SINGLE' | 'BULK' | 'DONOR_PASS'>('ALL');

  // Resend state
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Edit Attendee Modal state
  const [editingTicket, setEditingTicket] = useState<ConfirmedTicketRow | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const loadConfirmedTickets = async () => {
    setLoading(true);
    try {
      // Query ONLY confirmed orders
      const ordersQuery = query(collection(db, 'orders'), where('orderStatus', '==', 'CONFIRMED'));
      const ordersSnap = await getDocs(ordersQuery);

      const items: ConfirmedTicketRow[] = [];

      await Promise.all(
        ordersSnap.docs.map(async (orderDoc) => {
          const order = orderDoc.data();
          const isDonor = orderDoc.id.startsWith('DONOR_') || order.type === 'DONOR';
          const isBulk = order.type === 'BULK';
          const passType: 'SINGLE' | 'BULK' | 'DONOR_PASS' = isDonor
            ? 'DONOR_PASS'
            : isBulk
            ? 'BULK'
            : 'SINGLE';

          try {
            const attendeesSnap = await getDocs(
              collection(db, 'orders', orderDoc.id, 'attendees')
            );
            attendeesSnap.docs.forEach((attDoc) => {
              const d = attDoc.data();
              items.push({
                id: attDoc.id,
                orderId: orderDoc.id,
                orderRef: order.publicReference || orderDoc.id.slice(0, 10),
                fullName: d.fullName || d.name || order.buyer?.fullName || '—',
                email: d.email || order.buyer?.email || '—',
                phone: d.phone || d.mobileNumber || order.buyer?.mobileNumber || '—',
                registrationId: d.registrationId || d.passId || '—',
                bookingId: d.bookingId || order.bookingId || undefined,
                ticketStatus: d.ticketStatus || 'ISSUED',
                ticketPdfUrl: d.ticketPdfUrl || undefined,
                qrCodePayload: d.qrCodePayload || undefined,
                type: passType,
                createdAt: d.createdAt || order.createdAt || '',
              });
            });
          } catch (err) {
            console.error(`[Admin Tickets] Failed to read attendees for ${orderDoc.id}:`, err);
          }
        })
      );

      // Sort by createdAt desc
      items.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      setTickets(items);
    } catch (err) {
      console.error('[Admin Tickets] Error loading confirmed tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfirmedTickets();
  }, []);

  // Show transient banner notification
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification((curr) => (curr?.message === message ? null : curr));
    }, 4000);
  };

  // Trigger Confirmation Email Resend
  const handleResend = async (ticket: ConfirmedTicketRow) => {
    setResendingId(ticket.id);
    try {
      const resendFn = httpsCallable(functions, 'adminResendConfirmation');
      await resendFn({
        entityType: 'ORDER',
        entityId: ticket.orderId,
      });
      showToast(`Confirmation pass email successfully re-sent to ${ticket.email}!`);
    } catch (err: any) {
      console.error('[Admin Tickets] Resend error:', err);
      showToast(err?.message || 'Failed to trigger confirmation email. Check permissions.', 'error');
    } finally {
      setResendingId(null);
    }
  };

  // Open Edit Details Modal
  const openEditModal = (ticket: ConfirmedTicketRow) => {
    setEditingTicket(ticket);
    setEditName(ticket.fullName === '—' ? '' : ticket.fullName);
    setEditEmail(ticket.email === '—' ? '' : ticket.email);
    setEditPhone(ticket.phone === '—' ? '' : ticket.phone);
    setEditError(null);
  };

  // Save Edit Details
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTicket) return;
    setEditError(null);

    const trimmedName = editName.trim();
    const trimmedEmail = editEmail.trim().toLowerCase();
    const trimmedPhone = editPhone.trim();

    if (!trimmedName || trimmedName.length < 2) {
      setEditError('Please enter a valid attendee name (min 2 characters).');
      return;
    }
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setEditError('Please enter a valid email address.');
      return;
    }
    if (trimmedPhone && !/^[6-9]\d{9}$/.test(trimmedPhone)) {
      setEditError('Mobile number must be a valid 10-digit Indian mobile number.');
      return;
    }

    setSavingEdit(true);
    try {
      const updateFn = httpsCallable(functions, 'adminUpdateContact');
      await updateFn({
        entityType: 'ORDER',
        entityId: editingTicket.orderId,
        attendeeId: editingTicket.id,
        fullName: trimmedName,
        email: trimmedEmail,
        mobileNumber: trimmedPhone || undefined,
      });

      // Update local state
      setTickets((curr) =>
        curr.map((t) =>
          t.id === editingTicket.id
            ? {
                ...t,
                fullName: trimmedName,
                email: trimmedEmail,
                phone: trimmedPhone || '—',
              }
            : t
        )
      );

      showToast(`Updated details for ${trimmedName} successfully!`);
      setEditingTicket(null);
    } catch (err: any) {
      console.error('[Admin Tickets] Save edit error:', err);
      setEditError(err?.message || 'Failed to update attendee details.');
    } finally {
      setSavingEdit(false);
    }
  };

  // Filtered tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      if (filterType !== 'ALL' && t.type !== filterType) return false;
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        t.fullName.toLowerCase().includes(term) ||
        t.email.toLowerCase().includes(term) ||
        t.phone.toLowerCase().includes(term) ||
        t.registrationId.toLowerCase().includes(term) ||
        (t.bookingId && t.bookingId.toLowerCase().includes(term)) ||
        t.orderRef.toLowerCase().includes(term)
      );
    });
  }, [tickets, filterType, searchTerm]);

  // Aggregate Metrics
  const stats = useMemo(() => {
    const single = tickets.filter((t) => t.type === 'SINGLE').length;
    const bulk = tickets.filter((t) => t.type === 'BULK').length;
    const donor = tickets.filter((t) => t.type === 'DONOR_PASS').length;
    return { total: tickets.length, single, bulk, donor };
  }, [tickets]);

  // Export gate check-in CSV
  const handleExportCsv = () => {
    const headers = [
      'Pass ID',
      'Attendee Name',
      'Email',
      'Phone',
      'KonfHub Booking ID',
      'Pass Type',
      'Order Ref',
      'Ticket Status',
      'PDF Ticket URL',
      'Issued Date',
    ];

    const rows = filteredTickets.map((t) => [
      escapeCsvCell(t.registrationId),
      escapeCsvCell(t.fullName),
      escapeCsvCell(t.email),
      escapeCsvCell(t.phone),
      escapeCsvCell(t.bookingId || ''),
      escapeCsvCell(t.type),
      escapeCsvCell(t.orderRef),
      escapeCsvCell(t.ticketStatus),
      escapeCsvCell(t.ticketPdfUrl || ''),
      escapeCsvCell(t.createdAt),
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `PiP5_Confirmed_Tickets_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center space-x-3 px-4 py-3 rounded-xl shadow-xl border animate-in fade-in slide-in-from-top-2 duration-200 ${
            notification.type === 'success'
              ? 'bg-emerald-950/90 text-emerald-200 border-emerald-800'
              : 'bg-red-950/90 text-red-200 border-red-800'
          }`}
        >
          {notification.type === 'success' ? (
            <Check className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          )}
          <span className="text-sm font-medium">{notification.message}</span>
          <button
            onClick={() => setNotification(null)}
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
            <div className="p-2.5 rounded-xl bg-pink-500/10 border border-pink-500/20 text-pink-400">
              <Ticket className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Confirmed Tickets</h1>
              <p className="text-sm text-slate-400">
                Official attendee roster with KonfHub issued passes, booking IDs, and entry status.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Link
            to="/admin/scan"
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold shadow-md shadow-emerald-600/20 transition"
            title="Open Gate Scanner Camera"
          >
            <Scan className="w-4 h-4" />
            <span>Gate Scanner</span>
          </Link>
          <button
            onClick={loadConfirmedTickets}
            disabled={loading}
            className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition border border-slate-700 disabled:opacity-50"
            title="Refresh ticket data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={handleExportCsv}
            disabled={loading || filteredTickets.length === 0}
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-pip-600 to-pink-500 hover:from-pip-700 hover:to-pink-600 text-white font-semibold text-sm shadow-md transition disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>Export Roster CSV</span>
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Confirmed Passes</span>
            <Ticket className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">{stats.total}</p>
          <p className="text-xs text-emerald-400/80 mt-1">100% Issued & Active</p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Individual Passes</span>
            <Ticket className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">{stats.single}</p>
          <p className="text-xs text-slate-500 mt-1">Single registrations</p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Group Passes</span>
            <Users className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">{stats.bulk}</p>
          <p className="text-xs text-slate-500 mt-1">Bulk booking attendees</p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Donor Passes</span>
            <Heart className="w-4 h-4 text-pink-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">{stats.donor}</p>
          <p className="text-xs text-pink-400/80 mt-1">Complimentary sponsor tickets</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search by name, email, phone, pass ID, booking ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-pip-500"
          />
        </div>

        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0">
          {(
            [
              { id: 'ALL', label: 'All Passes' },
              { id: 'SINGLE', label: 'Individual' },
              { id: 'BULK', label: 'Group' },
              { id: 'DONOR_PASS', label: 'Donor Passes' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition whitespace-nowrap ${
                filterType === tab.id
                  ? 'bg-pip-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700/80'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table of Confirmed Tickets */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-3">
          <Loader2 className="w-8 h-8 text-pip-500 animate-spin" />
          <p className="text-sm text-slate-400">Loading confirmed tickets roster…</p>
        </div>
      ) : filteredTickets.length === 0 ? (
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-12 text-center">
          <Ticket className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-white">No confirmed tickets match your filter</h3>
          <p className="text-xs text-slate-400 mt-1">
            Try adjusting your search terms or filter selection.
          </p>
        </div>
      ) : (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-800/80 border-b border-slate-700/80 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3.5">Attendee / Contact</th>
                  <th className="px-4 py-3.5">Pass ID & Booking ID</th>
                  <th className="px-4 py-3.5">Type & Order Ref</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredTickets.map((ticket) => (
                  <tr key={`${ticket.orderId}-${ticket.id}`} className="hover:bg-slate-800/40 transition">
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-white text-sm">{ticket.fullName}</div>
                      <div className="text-xs text-slate-400 flex flex-wrap gap-x-2 mt-0.5">
                        <span>{ticket.email}</span>
                        {ticket.phone !== '—' && (
                          <>
                            <span className="text-slate-600">•</span>
                            <span>{ticket.phone}</span>
                          </>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="font-mono text-xs font-bold text-pink-400 bg-pink-500/10 px-2 py-0.5 rounded-md inline-block border border-pink-500/20">
                        {ticket.registrationId}
                      </div>
                      {ticket.bookingId && (
                        <div className="text-[11px] text-slate-400 font-mono mt-1 flex items-center space-x-1">
                          <span className="text-slate-500">KonfHub:</span>
                          <span className="text-slate-300 font-medium">{ticket.bookingId}</span>
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-3.5">
                      <div>
                        {ticket.type === 'DONOR_PASS' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30">
                            Donor Pass
                          </span>
                        ) : ticket.type === 'BULK' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/30">
                            Group Attendee
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/15 text-blue-300 border border-blue-500/30">
                            Individual
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono mt-1">
                        {ticket.orderRef}
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="flex items-center space-x-1.5 text-xs font-semibold text-emerald-400">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Issued & Valid</span>
                      </div>
                      {ticket.ticketPdfUrl && (
                        <a
                          href={ticket.ticketPdfUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center space-x-1 text-[11px] text-pip-400 hover:text-pip-300 underline mt-1"
                        >
                          <span>PDF Ticket</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        {/* Edit Attendee details button */}
                        <button
                          onClick={() => openEditModal(ticket)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                          title="Edit Attendee Details"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>

                        {/* Trigger Resend Email button */}
                        <button
                          onClick={() => handleResend(ticket)}
                          disabled={resendingId === ticket.id}
                          className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition border border-slate-700 disabled:opacity-50"
                          title="Resend Pass / Confirmation Email"
                        >
                          {resendingId === ticket.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-pip-400" />
                          ) : (
                            <Mail className="w-3.5 h-3.5 text-slate-400" />
                          )}
                          <span className="hidden sm:inline">Resend Pass</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Attendee Modal */}
      {editingTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <button
              onClick={() => setEditingTicket(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 mb-5">
              <div className="p-2 rounded-xl bg-pip-500/10 border border-pip-500/20 text-pip-400">
                <Pencil className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Edit Attendee Details</h3>
                <p className="text-xs text-slate-400 font-mono">
                  Pass: {editingTicket.registrationId}
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
                  Attendee Full Name *
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-pip-500"
                  placeholder="e.g. Rahul Sharma"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  required
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-pip-500"
                  placeholder="name@example.com"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Updates attendee record and triggers pass delivery to this address.
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
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-pip-500"
                  placeholder="10-digit Indian mobile number"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setEditingTicket(null)}
                  disabled={savingEdit}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-pip-600 to-pink-500 hover:from-pip-700 hover:to-pink-600 shadow-md transition disabled:opacity-50 flex items-center space-x-2"
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
export default AdminTicketsPage;
