import React, { useEffect, useState, useMemo } from 'react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../../services/firebase.js';
import {
  Search,
  Download,
  Mail,
  Pencil,
  PlusCircle,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Heart,
  Banknote,
  Building2,
  Ticket,
  RefreshCw,
  Check,
} from 'lucide-react';
import { escapeCsvCell, getDonationComplimentaryPasses } from '@pip/shared';

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
  paymentMethod?: string;
  complimentaryPassesCount?: number;
  donorOrderId?: string;
  createdAt: string;
}

export const AdminDonationsPage: React.FC = () => {
  const [donations, setDonations] = useState<DonationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewFilter, setViewFilter] = useState<'CONFIRMED' | 'ALL'>('CONFIRMED');

  // Resend / Action states
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Edit Donor Modal state
  const [editingDonation, setEditingDonation] = useState<DonationRow | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editMobile, setEditMobile] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Offline / Direct donation modal states
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [newDonorName, setNewDonorName] = useState('');
  const [newDonorEmail, setNewDonorEmail] = useState('');
  const [newDonorMobile, setNewDonorMobile] = useState('');
  const [newAmountRupees, setNewAmountRupees] = useState('');
  const [newPaymentMethod, setNewPaymentMethod] = useState<'DIRECT_UPI' | 'CASH' | 'BANK_TRANSFER'>('DIRECT_UPI');
  const [newReferenceOrNotes, setNewReferenceOrNotes] = useState('');
  const [newPan, setNewPan] = useState('');
  const [newOrganisationName, setNewOrganisationName] = useState('');
  const [newSendThankYouEmail, setNewSendThankYouEmail] = useState(true);
  const [newAllocatePasses, setNewAllocatePasses] = useState(true);

  const [submittingRecord, setSubmittingRecord] = useState(false);
  const [recordError, setRecordError] = useState<string | null>(null);
  const [recordSuccess, setRecordSuccess] = useState<string | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((curr) => (curr?.message === message ? null : curr));
    }, 4500);
  };

  const loadDonations = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'donations'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      const rows: DonationRow[] = snap.docs.map((doc) => {
        const d = doc.data();
        const amountPaise = d.amountPaise || 0;
        const defaultPasses = getDonationComplimentaryPasses(amountPaise);
        return {
          id: doc.id,
          publicReference: d.publicReference || doc.id.slice(0, 10),
          donorName: d.donor?.fullName || '—',
          donorEmail: d.donor?.email || '—',
          donorMobile: d.donor?.mobileNumber || '—',
          amountPaise,
          pan: d.pan || undefined,
          anonymousPublicly: d.isAnonymousPublicly || false,
          paymentStatus: d.paymentStatus || 'CREATED',
          paymentMethod: d.paymentMethod || undefined,
          complimentaryPassesCount: d.complimentaryPassesCount !== undefined ? d.complimentaryPassesCount : defaultPasses,
          donorOrderId: d.donorOrderId || (d.complimentaryOrderRef ? d.complimentaryOrderRef : undefined),
          createdAt: d.createdAt || '',
        };
      });
      setDonations(rows);
    } catch (err) {
      console.error('[Admin Donations] Error loading:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDonations();
  }, []);

  // Resend Thank You / Confirmation Email
  const handleResend = async (donation: DonationRow) => {
    setResendingId(donation.id);
    try {
      const fn = httpsCallable(functions, 'adminResendConfirmation');
      await fn({
        entityType: 'DONATION',
        entityId: donation.id,
      });
      showToast(`Thank-you email & passes resent to ${donation.donorEmail}!`);
    } catch (error: any) {
      console.error('[Admin Donations] Resend failed:', error);
      showToast(error?.message || 'Failed to resend confirmation email.', 'error');
    } finally {
      setResendingId(null);
    }
  };

  // Open Edit Details Modal
  const openEditModal = (donation: DonationRow) => {
    setEditingDonation(donation);
    setEditName(donation.donorName === '—' ? '' : donation.donorName);
    setEditEmail(donation.donorEmail === '—' ? '' : donation.donorEmail);
    setEditMobile(donation.donorMobile === '—' ? '' : donation.donorMobile);
    setEditError(null);
  };

  // Save Edit Details
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDonation) return;
    setEditError(null);

    const trimmedName = editName.trim();
    const trimmedEmail = editEmail.trim().toLowerCase();
    const trimmedMobile = editMobile.trim();

    if (!trimmedName || trimmedName.length < 2) {
      setEditError('Please enter a valid donor name (min 2 characters).');
      return;
    }
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setEditError('Please enter a valid donor email address.');
      return;
    }
    if (trimmedMobile && !/^[6-9]\d{9}$/.test(trimmedMobile)) {
      setEditError('Mobile number must be a valid 10-digit Indian number.');
      return;
    }

    setSavingEdit(true);
    try {
      const updateFn = httpsCallable(functions, 'adminUpdateContact');
      await updateFn({
        entityType: 'DONATION',
        entityId: editingDonation.id,
        fullName: trimmedName,
        email: trimmedEmail,
        mobileNumber: trimmedMobile || undefined,
      });

      setDonations((curr) =>
        curr.map((d) =>
          d.id === editingDonation.id
            ? {
                ...d,
                donorName: trimmedName,
                donorEmail: trimmedEmail,
                donorMobile: trimmedMobile || '—',
              }
            : d
        )
      );

      showToast(`Updated contact details for ${trimmedName} successfully!`);
      setEditingDonation(null);
    } catch (err: any) {
      console.error('[Admin Donations] Save edit error:', err);
      setEditError(err?.message || 'Failed to update donor details.');
    } finally {
      setSavingEdit(false);
    }
  };

  // Offline Donation Submission
  const handleRecordDonation = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecordError(null);
    setRecordSuccess(null);

    const trimmedName = newDonorName.trim();
    const trimmedEmail = newDonorEmail.trim().toLowerCase();
    const amountVal = parseFloat(newAmountRupees);

    if (!trimmedName || trimmedName.length < 2) {
      setRecordError('Please provide a valid donor name (min 2 characters).');
      return;
    }
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setRecordError('Please enter a valid donor email address.');
      return;
    }
    if (isNaN(amountVal) || amountVal <= 0) {
      setRecordError('Please enter a valid donation amount in Rupees (minimum ₹1).');
      return;
    }
    if (newDonorMobile.trim() && !/^[6-9]\d{9}$/.test(newDonorMobile.trim())) {
      setRecordError('Mobile number must be a valid 10-digit Indian number.');
      return;
    }
    if (newPan.trim() && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(newPan.trim().toUpperCase())) {
      setRecordError('PAN must be in standard format (e.g., ABCDE1234F).');
      return;
    }

    setSubmittingRecord(true);
    try {
      const recordFn = httpsCallable(functions, 'adminRecordDonation');
      const response = await recordFn({
        fullName: trimmedName,
        email: trimmedEmail,
        mobileNumber: newDonorMobile.trim() || undefined,
        amountRupees: amountVal,
        paymentMethod: newPaymentMethod,
        referenceOrNotes: newReferenceOrNotes.trim() || undefined,
        pan: newPan.trim().toUpperCase() || undefined,
        organisationName: newOrganisationName.trim() || undefined,
        sendThankYouEmail: newSendThankYouEmail,
        allocatePasses: newAllocatePasses,
      });

      const data = response.data as any;
      setRecordSuccess(
        `Recorded successfully! Ref: ${data.publicReference}. ${
          data.emailSent ? 'Thank-you email has been delivered to ' + trimmedEmail + '.' : ''
        }`
      );
      await loadDonations();
      setTimeout(() => {
        setIsRecordModalOpen(false);
        setNewDonorName('');
        setNewDonorEmail('');
        setNewDonorMobile('');
        setNewAmountRupees('');
        setNewReferenceOrNotes('');
        setNewPan('');
        setNewOrganisationName('');
        setRecordSuccess(null);
      }, 2000);
    } catch (err: any) {
      console.error('[Admin Record Donation] Error:', err);
      setRecordError(err?.message || 'Failed to record donation.');
    } finally {
      setSubmittingRecord(false);
    }
  };

  // Filtered list: ONLY confirmed donations by default
  const filteredDonations = useMemo(() => {
    return donations.filter((d) => {
      // Primary constraint: Confirmed donations only
      if (viewFilter === 'CONFIRMED' && d.paymentStatus !== 'VERIFIED') return false;

      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        d.donorName.toLowerCase().includes(term) ||
        d.donorEmail.toLowerCase().includes(term) ||
        d.donorMobile.toLowerCase().includes(term) ||
        d.publicReference.toLowerCase().includes(term) ||
        (d.pan && d.pan.toLowerCase().includes(term))
      );
    });
  }, [donations, viewFilter, searchTerm]);

  // Aggregate Metrics for Confirmed Donations
  const metrics = useMemo(() => {
    const verified = donations.filter((d) => d.paymentStatus === 'VERIFIED');
    const totalAmount = verified.reduce((sum, d) => sum + d.amountPaise, 0);
    const totalPasses = verified.reduce((sum, d) => sum + (d.complimentaryPassesCount || 0), 0);
    const avgAmount = verified.length > 0 ? Math.round(totalAmount / verified.length) : 0;
    return {
      totalAmount,
      donorCount: verified.length,
      totalPasses,
      avgAmount,
      totalDrafts: donations.length - verified.length,
    };
  }, [donations]);

  // CSV Export
  const handleExportCsv = () => {
    const headers = [
      'Public Reference',
      'Donor Name',
      'Email',
      'Mobile',
      'Amount (INR)',
      'Complimentary Passes',
      'PAN',
      'Payment Method',
      'Payment Status',
      'Created Date',
    ];

    const rows = filteredDonations.map((d) => [
      escapeCsvCell(d.publicReference),
      escapeCsvCell(d.donorName),
      escapeCsvCell(d.donorEmail),
      escapeCsvCell(d.donorMobile),
      escapeCsvCell((d.amountPaise / 100).toString()),
      escapeCsvCell((d.complimentaryPassesCount || 0).toString()),
      escapeCsvCell(d.pan || ''),
      escapeCsvCell(d.paymentMethod || 'UPI'),
      escapeCsvCell(d.paymentStatus),
      escapeCsvCell(d.createdAt),
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `PiP5_Confirmed_Donations_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const parsedAmountNum = parseFloat(newAmountRupees) || 0;
  const computedPasses = getDonationComplimentaryPasses(Math.round(parsedAmountNum * 100));

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
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
              <Heart className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Confirmed Donations</h1>
              <p className="text-sm text-slate-400">
                Verified donor contributions supporting Sri Shankara Cancer Foundation.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={loadDonations}
            disabled={loading}
            className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition border border-slate-700 disabled:opacity-50"
            title="Refresh donations"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => setIsRecordModalOpen(true)}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm shadow-md transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Record Offline</span>
          </button>

          <button
            onClick={handleExportCsv}
            disabled={loading || filteredDonations.length === 0}
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
            <span className="text-xs font-semibold uppercase tracking-wider">Total Verified Funds</span>
            <Banknote className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            ₹{(metrics.totalAmount / 100).toLocaleString('en-IN')}
          </p>
          <p className="text-xs text-emerald-400/80 mt-1">Confirmed & Realized</p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Confirmed Donors</span>
            <Heart className="w-4 h-4 text-rose-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {metrics.donorCount}
          </p>
          <p className="text-xs text-slate-500 mt-1">Individual & Rotary sponsors</p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Complimentary Passes</span>
            <Ticket className="w-4 h-4 text-pink-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {metrics.totalPasses}
          </p>
          <p className="text-xs text-pink-400/80 mt-1">Issued to donors</p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Average Contribution</span>
            <Building2 className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            ₹{(metrics.avgAmount / 100).toLocaleString('en-IN')}
          </p>
          <p className="text-xs text-slate-500 mt-1">Per confirmed supporter</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search by donor name, email, mobile, ref, PAN..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-pip-500"
          />
        </div>

        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => setViewFilter('CONFIRMED')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              viewFilter === 'CONFIRMED'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Confirmed Donations ({metrics.donorCount})
          </button>
          <button
            onClick={() => setViewFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              viewFilter === 'ALL'
                ? 'bg-slate-700 text-white shadow-sm'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            All / Drafts ({donations.length})
          </button>
        </div>
      </div>

      {/* Table of Confirmed Donations */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-3">
          <Loader2 className="w-8 h-8 text-rose-500 animate-spin" />
          <p className="text-sm text-slate-400">Loading verified donations roster…</p>
        </div>
      ) : filteredDonations.length === 0 ? (
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-12 text-center">
          <Heart className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-white">No confirmed donations found</h3>
          <p className="text-xs text-slate-400 mt-1">
            {searchTerm ? 'Try adjusting your search criteria.' : 'Verified donations will appear here.'}
          </p>
        </div>
      ) : (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-800/80 border-b border-slate-700/80 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3.5">Donor / Supporter</th>
                  <th className="px-4 py-3.5">Amount & Passes</th>
                  <th className="px-4 py-3.5">Reference & Method</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredDonations.map((donation) => (
                  <tr key={donation.id} className="hover:bg-slate-800/40 transition">
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-white text-sm flex items-center space-x-2">
                        <span>{donation.donorName}</span>
                        {donation.pan && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                            PAN: {donation.pan}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 flex flex-wrap gap-x-2 mt-0.5">
                        <span>{donation.donorEmail}</span>
                        {donation.donorMobile !== '—' && (
                          <>
                            <span className="text-slate-600">•</span>
                            <span>{donation.donorMobile}</span>
                          </>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="font-bold text-white text-base">
                        ₹{(donation.amountPaise / 100).toLocaleString('en-IN')}
                      </div>
                      {(donation.complimentaryPassesCount || 0) > 0 ? (
                        <div className="inline-flex items-center space-x-1 text-[11px] font-semibold text-pink-400 bg-pink-500/10 px-2 py-0.5 rounded-md border border-pink-500/20 mt-1">
                          <Ticket className="w-3 h-3" />
                          <span>{donation.complimentaryPassesCount} Passes Issued</span>
                        </div>
                      ) : (
                        <div className="text-[11px] text-slate-500 mt-0.5">Direct Donation</div>
                      )}
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="font-mono text-xs font-semibold text-slate-300">
                        {donation.publicReference}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {donation.paymentMethod?.replace(/_/g, ' ') || 'UPI Online'}
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      {donation.paymentStatus === 'VERIFIED' ? (
                        <div className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Verified</span>
                        </div>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-700 text-slate-300">
                          {donation.paymentStatus}
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        {/* Edit Donor Details */}
                        <button
                          onClick={() => openEditModal(donation)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                          title="Edit Donor Details"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>

                        {/* Trigger / Resend Thank You Email */}
                        <button
                          onClick={() => handleResend(donation)}
                          disabled={resendingId === donation.id}
                          className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition border border-slate-700 disabled:opacity-50"
                          title="Resend Thank You & Passes Email"
                        >
                          {resendingId === donation.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-400" />
                          ) : (
                            <Mail className="w-3.5 h-3.5 text-slate-400" />
                          )}
                          <span className="hidden sm:inline">Resend Email</span>
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

      {/* Edit Donor Modal */}
      {editingDonation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <button
              onClick={() => setEditingDonation(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 mb-5">
              <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
                <Pencil className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Edit Donor Details</h3>
                <p className="text-xs text-slate-400 font-mono">
                  Ref: {editingDonation.publicReference}
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
                  Donor Full Name *
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                  placeholder="e.g. Rtn. Ramesh Kumar"
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
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                  placeholder="donor@example.com"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Updates donor record and thank-you recipient.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Mobile Number (Optional)
                </label>
                <input
                  type="tel"
                  value={editMobile}
                  onChange={(e) => setEditMobile(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                  placeholder="10-digit Indian mobile number"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setEditingDonation(null)}
                  disabled={savingEdit}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-rose-600 to-pink-500 hover:from-rose-700 hover:to-pink-600 shadow-md transition disabled:opacity-50 flex items-center space-x-2"
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

      {/* Record Offline Donation Modal */}
      {isRecordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsRecordModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 mb-5">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <PlusCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Record Offline / Direct Donation</h3>
                <p className="text-xs text-slate-400">
                  Add verified direct UPI, Cheque, or Bank Transfer donations.
                </p>
              </div>
            </div>

            {recordError && (
              <div className="p-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{recordError}</span>
              </div>
            )}

            {recordSuccess && (
              <div className="p-3 mb-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{recordSuccess}</span>
              </div>
            )}

            <form onSubmit={handleRecordDonation} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Donor Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newDonorName}
                    onChange={(e) => setNewDonorName(e.target.value)}
                    placeholder="e.g. Suresh Prakash"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={newDonorEmail}
                    onChange={(e) => setNewDonorEmail(e.target.value)}
                    placeholder="donor@example.com"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Donation Amount (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={newAmountRupees}
                    onChange={(e) => setNewAmountRupees(e.target.value)}
                    placeholder="e.g. 5000"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Payment Method
                  </label>
                  <select
                    value={newPaymentMethod}
                    onChange={(e) => setNewPaymentMethod(e.target.value as any)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="DIRECT_UPI">Direct UPI Transfer</option>
                    <option value="BANK_TRANSFER">NEFT / RTGS / IMPS</option>
                    <option value="CASH">Cash / Cheque</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Mobile Number (Optional)
                  </label>
                  <input
                    type="tel"
                    value={newDonorMobile}
                    onChange={(e) => setNewDonorMobile(e.target.value)}
                    placeholder="10-digit number"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    PAN (Optional)
                  </label>
                  <input
                    type="text"
                    value={newPan}
                    onChange={(e) => setNewPan(e.target.value.toUpperCase())}
                    placeholder="e.g. ABCDE1234F"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Organisation / Rotary Club (Optional)
                </label>
                <input
                  type="text"
                  value={newOrganisationName}
                  onChange={(e) => setNewOrganisationName(e.target.value)}
                  placeholder="e.g. Rotary Bengaluru Bannerghatta"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  UTR Reference or Notes
                </label>
                <input
                  type="text"
                  value={newReferenceOrNotes}
                  onChange={(e) => setNewReferenceOrNotes(e.target.value)}
                  placeholder="e.g. UTR 42894829482 / Cheque #123456"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {computedPasses > 0 && (
                <div className="p-3 rounded-xl bg-pink-500/10 border border-pink-500/20 text-pink-300 text-xs flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Ticket className="w-4 h-4 text-pink-400" />
                    <span>Eligible for {computedPasses} complimentary pass(es)</span>
                  </div>
                  <label className="flex items-center space-x-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newAllocatePasses}
                      onChange={(e) => setNewAllocatePasses(e.target.checked)}
                      className="rounded border-slate-700 text-pink-500 focus:ring-pink-500"
                    />
                    <span className="text-[11px] text-white">Allocate passes</span>
                  </label>
                </div>
              )}

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="sendThankYou"
                  checked={newSendThankYouEmail}
                  onChange={(e) => setNewSendThankYouEmail(e.target.checked)}
                  className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500"
                />
                <label htmlFor="sendThankYou" className="text-xs text-slate-300 cursor-pointer">
                  Send Thank-You email and passes to donor automatically
                </label>
              </div>

              <div className="pt-3 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsRecordModalOpen(false)}
                  disabled={submittingRecord}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingRecord}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 shadow-md transition disabled:opacity-50 flex items-center space-x-2"
                >
                  {submittingRecord ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Recording…</span>
                    </>
                  ) : (
                    <span>Confirm & Record</span>
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

export default AdminDonationsPage;
