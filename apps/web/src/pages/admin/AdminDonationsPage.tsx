import React, { useEffect, useState } from 'react';
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
  QrCode,
  Building2,
  Ticket,
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
  createdAt: string;
}

export const AdminDonationsPage: React.FC = () => {
  const [donations, setDonations] = useState<DonationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [resending, setResending] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  // Offline / Direct donation modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [donorName, setDonorName] = useState('');
  const [donorEmail, setDonorEmail] = useState('');
  const [donorMobile, setDonorMobile] = useState('');
  const [amountRupees, setAmountRupees] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'DIRECT_UPI' | 'CASH' | 'BANK_TRANSFER'>('DIRECT_UPI');
  const [referenceOrNotes, setReferenceOrNotes] = useState('');
  const [pan, setPan] = useState('');
  const [organisationName, setOrganisationName] = useState('');
  const [sendThankYouEmail, setSendThankYouEmail] = useState(true);
  const [allocatePasses, setAllocatePasses] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const loadDonations = async () => {
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
            paymentMethod: d.paymentMethod || undefined,
            createdAt: d.createdAt || '',
          };
        })
      );
    } catch (err) {
      console.error('[Admin Donations] Error loading:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDonations();
  }, []);

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
      window.alert('The email address could not be updated. Check the address and your admin role.');
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
      window.alert('Thank-you email has been queued and sent to the donor.');
    } catch (error) {
      console.error('[Admin Donations] Resend failed:', error);
      window.alert('Failed to send thank-you email. Please check your admin privileges.');
    } finally {
      setResending(null);
    }
  };

  const parsedAmountNum = parseFloat(amountRupees) || 0;
  const computedPasses = getDonationComplimentaryPasses(Math.round(parsedAmountNum * 100));

  const resetForm = () => {
    setDonorName('');
    setDonorEmail('');
    setDonorMobile('');
    setAmountRupees('');
    setPaymentMethod('DIRECT_UPI');
    setReferenceOrNotes('');
    setPan('');
    setOrganisationName('');
    setSendThankYouEmail(true);
    setAllocatePasses(true);
    setFormError(null);
    setFormSuccess(null);
  };

  const handleRecordDonation = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    const trimmedName = donorName.trim();
    const trimmedEmail = donorEmail.trim().toLowerCase();
    const amountVal = parseFloat(amountRupees);

    if (!trimmedName || trimmedName.length < 2) {
      setFormError('Please provide a valid donor name (min 2 characters).');
      return;
    }
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setFormError('Please enter a valid donor email address to send acknowledgement.');
      return;
    }
    if (isNaN(amountVal) || amountVal <= 0) {
      setFormError('Please enter a valid donation amount in Rupees (minimum ₹1).');
      return;
    }
    if (donorMobile.trim() && !/^[6-9]\d{9}$/.test(donorMobile.trim())) {
      setFormError('Mobile number must be a valid 10-digit Indian number starting with 6-9.');
      return;
    }
    if (pan.trim() && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan.trim().toUpperCase())) {
      setFormError('PAN must be in standard format (e.g., ABCDE1234F).');
      return;
    }

    setSubmitting(true);
    try {
      const recordFn = httpsCallable(functions, 'adminRecordDonation');
      const response = await recordFn({
        fullName: trimmedName,
        email: trimmedEmail,
        mobileNumber: donorMobile.trim() || undefined,
        amountRupees: amountVal,
        paymentMethod,
        referenceOrNotes: referenceOrNotes.trim() || undefined,
        pan: pan.trim().toUpperCase() || undefined,
        organisationName: organisationName.trim() || undefined,
        sendThankYouEmail,
        allocatePasses,
      });

      const data = response.data as any;
      setFormSuccess(
        `Recorded successfully! Ref: ${data.publicReference}. ${
          data.emailSent ? 'Thank-you email has been delivered to ' + trimmedEmail + '.' : ''
        }`
      );
      await loadDonations();
      setTimeout(() => {
        resetForm();
        setIsModalOpen(false);
      }, 2500);
    } catch (err: any) {
      console.error('[Admin Record Donation] Error:', err);
      setFormError(err?.message || 'Failed to record donation. Please verify your admin role.');
    } finally {
      setSubmitting(false);
    }
  };

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
    const header = 'Reference,Donor,Email,Mobile,Amount,PAN,Anonymous,Payment Method,Payment Status,Created\n';
    const rows = filtered.map((d) =>
      [
        d.publicReference,
        `"${d.donorName}"`,
        d.donorEmail,
        d.donorMobile,
        (d.amountPaise / 100).toFixed(2),
        d.pan || '',
        d.anonymousPublicly,
        d.paymentMethod || 'ONLINE',
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
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              resetForm();
              setIsModalOpen(true);
            }}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-pip-600 to-pink-500 hover:from-pip-500 hover:to-pink-400 text-sm font-semibold text-white shadow-lg shadow-pip-500/20 transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Record Cash / Direct UPI</span>
          </button>
          <button
            onClick={exportCSV}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-sm text-slate-300 hover:text-white hover:border-slate-600 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
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
                  Mode
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
                  <td colSpan={8} className="text-center py-12 text-slate-500">
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
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center text-xs font-medium text-slate-400 bg-slate-800/60 px-2 py-0.5 rounded-md border border-slate-700/50">
                        {d.paymentMethod ? d.paymentMethod.replace(/_/g, ' ') : 'ONLINE'}
                      </span>
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
                            year: '2-digit',
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
                            title="Resend donation thank-you email"
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

      {/* Record Direct / Offline Donation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-xl my-8 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-7 text-white">
            <button
              type="button"
              onClick={() => {
                if (!submitting) {
                  setIsModalOpen(false);
                  resetForm();
                }
              }}
              className="absolute top-5 right-5 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-pip-500/20 border border-pip-500/30 flex items-center justify-center text-pip-400">
                <Heart className="w-5 h-5 fill-pip-400/20" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                  Record Direct / Offline Donation
                </h2>
                <p className="text-xs text-slate-400">
                  Log direct UPI, Cash, or Bank transfers and send thank-you emails automatically
                </p>
              </div>
            </div>

            {formError && (
              <div className="mb-5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start space-x-2.5 text-xs sm:text-sm text-red-300">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            {formSuccess && (
              <div className="mb-5 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-start space-x-2.5 text-xs sm:text-sm text-emerald-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>{formSuccess}</span>
              </div>
            )}

            <form onSubmit={handleRecordDonation} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Donor Full Name <span className="text-pip-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={donorName}
                    onChange={(e) => setDonorName(e.target.value)}
                    placeholder="e.g. Ramesh Kumar"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-pip-500 focus:border-transparent outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Donor Email Address <span className="text-pip-400">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={donorEmail}
                    onChange={(e) => setDonorEmail(e.target.value)}
                    placeholder="donor@example.com"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-pip-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Donation Amount (₹) <span className="text-pip-400">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="1"
                    value={amountRupees}
                    onChange={(e) => setAmountRupees(e.target.value)}
                    placeholder="e.g. 5000"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-pip-500 focus:border-transparent outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Mobile Number (Optional)
                  </label>
                  <input
                    type="tel"
                    maxLength={10}
                    value={donorMobile}
                    onChange={(e) => setDonorMobile(e.target.value)}
                    placeholder="10-digit number"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-pip-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Payment Method <span className="text-pip-400">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('DIRECT_UPI')}
                    className={`flex items-center justify-center space-x-2 py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
                      paymentMethod === 'DIRECT_UPI'
                        ? 'bg-pip-500/20 border-pip-500 text-pip-300'
                        : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>Direct UPI</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('CASH')}
                    className={`flex items-center justify-center space-x-2 py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
                      paymentMethod === 'CASH'
                        ? 'bg-pip-500/20 border-pip-500 text-pip-300'
                        : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Banknote className="w-3.5 h-3.5" />
                    <span>Cash</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('BANK_TRANSFER')}
                    className={`flex items-center justify-center space-x-2 py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
                      paymentMethod === 'BANK_TRANSFER'
                        ? 'bg-pip-500/20 border-pip-500 text-pip-300'
                        : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Bank/IMPS</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    UTR / Reference / Notes
                  </label>
                  <input
                    type="text"
                    value={referenceOrNotes}
                    onChange={(e) => setReferenceOrNotes(e.target.value)}
                    placeholder="e.g. 12-digit UTR or 'Handed in cash'"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-pip-500 focus:border-transparent outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    PAN Number (Optional)
                  </label>
                  <input
                    type="text"
                    maxLength={10}
                    value={pan}
                    onChange={(e) => setPan(e.target.value.toUpperCase())}
                    placeholder="e.g. ABCDE1234F"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-pip-500 focus:border-transparent outline-none font-mono uppercase"
                  />
                </div>
              </div>

              {/* Complimentary Passes live badge */}
              <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/40 flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2 text-slate-300">
                  <Ticket className="w-4 h-4 text-pip-400" />
                  <span>
                    {computedPasses > 0 ? (
                      <>
                        Qualifies for{' '}
                        <strong className="text-pip-300 font-bold">
                          {computedPasses} complimentary event pass{computedPasses > 1 ? 'es' : ''}
                        </strong>
                      </>
                    ) : (
                      'No passes included (contributions under ₹1,000)'
                    )}
                  </span>
                </div>
                {computedPasses > 0 && (
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allocatePasses}
                      onChange={(e) => setAllocatePasses(e.target.checked)}
                      className="rounded border-slate-700 text-pip-500 focus:ring-pip-500"
                    />
                    <span className="text-xs text-slate-400">Issue passes</span>
                  </label>
                )}
              </div>

              {/* Email Acknowledgement Toggle */}
              <div className="p-3 rounded-xl bg-pip-950/30 border border-pip-800/30 flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2 text-slate-300">
                  <Mail className="w-4 h-4 text-pip-400" />
                  <span>Trigger official Thank-You email to donor upon saving</span>
                </div>
                <input
                  type="checkbox"
                  checked={sendThankYouEmail}
                  onChange={(e) => setSendThankYouEmail(e.target.checked)}
                  className="rounded border-slate-700 text-pip-500 focus:ring-pip-500 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => {
                    setIsModalOpen(false);
                    resetForm();
                  }}
                  className="px-4 py-2.5 rounded-xl border border-slate-700 text-sm text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-pip-600 to-pink-500 hover:from-pip-500 hover:to-pink-400 text-sm font-semibold text-white shadow-lg shadow-pip-500/20 disabled:opacity-50 transition-all cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving & Sending…</span>
                    </>
                  ) : (
                    <>
                      <Heart className="w-4 h-4 fill-white/20" />
                      <span>Record & Send Acknowledgement</span>
                    </>
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
