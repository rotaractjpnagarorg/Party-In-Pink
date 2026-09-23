import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import {
  QrCode,
  Building,
  Copy,
  Check,
  Upload,
  AlertCircle,
  Clock,
  ArrowRight,
  Loader2,
  ShieldCheck,
  Info,
} from 'lucide-react';
import { useEvent } from '../context/EventContext.js';
import { formatINR } from '@pip/shared';
import { functions, storage } from '../services/firebase.js';
import { httpsCallable } from 'firebase/functions';
import { ref, uploadBytes } from 'firebase/storage';

interface PaymentSessionData {
  sessionId: string;
  entityType: 'ORDER' | 'DONATION';
  merchantReference: string;
  amountPaise: number;
  currency: string;
  status: string;
  expiresAt: string;
  upiUri: string;
  paymentDisplayConfig: {
    upiVpa: string;
    payeeName: string;
    bankName: string;
    accountNumber: string;
    ifscCode: string;
    branch: string;
  };
}

export const PaymentPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();
  const { event } = useEvent();

  const [activeTab, setActiveTab] = useState<'upi' | 'bank'>('upi');
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<PaymentSessionData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Evidence state
  const [utr, setUtr] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptStoragePath, setReceiptStoragePath] = useState<string | null>(null);
  const [isAnalyzingReceipt, setIsAnalyzingReceipt] = useState(false);
  const [ocrMessage, setOcrMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Initialize or fetch payment session
  useEffect(() => {
    if (!token) {
      setError('Missing order status token. Please return to the status page or register first.');
      setLoading(false);
      return;
    }

    const initSession = async () => {
      setLoading(true);
      setError(null);
      try {
        const createSessionCallable = httpsCallable<any, PaymentSessionData>(
          functions,
          'createPaymentSession'
        );
        const response = await createSessionCallable({ statusToken: token });
        setSession(response.data);
      } catch (err: any) {
        console.error('Payment session error:', err);
        setError(err?.message || 'Failed to initialize payment session. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    initSession();
  }, [token]);

  // Copy to clipboard helper
  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2500);
  };

  const handleReceiptFile = async (file: File | null) => {
    setReceiptFile(file);
    setReceiptStoragePath(null);
    setOcrMessage(null);
    if (!file || !session || !token) return;
    if (!['image/png', 'image/jpeg'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setError('Receipt must be a PNG or JPG image smaller than 5 MB.');
      setReceiptFile(null);
      return;
    }

    setIsAnalyzingReceipt(true);
    setError(null);
    let uploaded = false;
    try {
      const path = `receipts/${session.sessionId}/receipt`;
      await uploadBytes(ref(storage, path), file);
      uploaded = true;
      setReceiptStoragePath(path);
      const analyze = httpsCallable<
        { statusToken: string; sessionId: string; storagePath: string },
        { transactionReference?: string | null; confidence?: number | null }
      >(functions, 'analyzePaymentReceipt');
      const response = await analyze({
        statusToken: token,
        sessionId: session.sessionId,
        storagePath: path,
      });
      if (response.data.transactionReference) {
        setUtr(response.data.transactionReference);
        setOcrMessage('Transaction reference detected. Please verify it before submitting.');
      } else {
        setOcrMessage('Receipt uploaded. Enter the UTR manually if it was not detected.');
      }
    } catch (receiptError) {
      console.error('Receipt analysis error:', receiptError);
      if (uploaded) {
        setOcrMessage(
          'Receipt uploaded, but automatic detection was unavailable. Enter the UTR manually.'
        );
      } else {
        setReceiptFile(null);
        setError('Receipt upload failed. Please try again.');
      }
    } finally {
      setIsAnalyzingReceipt(false);
    }
  };

  // Submit Evidence
  const handleSubmitEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || !token) return;

    if (!utr.trim() && !receiptFile) {
      setError(
        'Please provide either your 12-digit UTR reference or upload a payment receipt screenshot.'
      );
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      let storagePath: string | undefined = receiptStoragePath || undefined;

      // 1. Upload receipt to Firebase Storage if selected
      if (receiptFile && !storagePath) {
        const path = `receipts/${session.sessionId}/receipt`;
        const storageRef = ref(storage, path);
        await uploadBytes(storageRef, receiptFile);
        storagePath = path;
      }

      // 2. Call submitPaymentEvidence Cloud Function
      interface SubmitEvidenceResponse {
        success: boolean;
        message: string;
      }
      const submitCallable = httpsCallable<Record<string, unknown>, SubmitEvidenceResponse>(
        functions,
        'submitPaymentEvidence'
      );
      await submitCallable({
        statusToken: token,
        sessionId: session.sessionId,
        transactionReference: utr.trim() || undefined,
        storagePath,
        source: receiptFile ? 'RECEIPT_UPLOAD' : 'MANUAL_ENTRY',
      });

      // Redirect to status page
      navigate(`/status/${token}`);
    } catch (err: unknown) {
      console.error('Evidence submission error:', err);
      const msg =
        err instanceof Error
          ? err.message
          : 'Failed to submit payment evidence. Please check your reference and try again.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 bg-slate-50 min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-pip-600 mx-auto" />
          <p className="text-sm font-semibold text-slate-700">Connecting to PiP Pay...</p>
        </div>
      </div>
    );
  }

  if (error && !session) {
    return (
      <div className="py-20 bg-slate-50 min-h-screen">
        <div className="max-w-md mx-auto px-4 text-center space-y-4">
          <div className="p-4 bg-rose-50 rounded-2xl border border-rose-200 text-rose-800 space-y-2">
            <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
            <h2 className="text-lg font-bold">Unable to Load Payment</h2>
            <p className="text-xs text-rose-700">{error}</p>
          </div>
          <Link
            to="/status"
            className="inline-flex items-center space-x-1.5 px-4 py-2 bg-pip-600 text-white rounded-xl text-xs font-bold"
          >
            <span>Return to Status Page</span>
          </Link>
        </div>
      </div>
    );
  }

  const paymentConfig = session?.paymentDisplayConfig || event.paymentDisplayConfig;

  return (
    <div className="py-10 bg-slate-50 min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Header Title */}
        <div className="text-center">
          <div className="inline-flex items-center space-x-2 text-xs font-bold text-pip-700 bg-pip-50 px-3 py-1 rounded-full mb-2 border border-pip-200">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>PiP Pay Direct Gateway • 100% Fee-Free for Charity</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Complete Your Payment
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Party In Pink {event.edition} accepts direct UPI and SBI Bank Transfers with zero
            transaction markups.
          </p>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start space-x-3 text-rose-800 text-sm">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Payment Error</p>
              <p className="mt-0.5 text-rose-700">{error}</p>
            </div>
          </div>
        )}

        {session?.entityType === 'DONATION' && (
          <div className="p-5 rounded-2xl bg-amber-50 border-2 border-amber-300 flex items-start gap-3 text-amber-950">
            <AlertCircle className="w-6 h-6 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-extrabold">Need an 80G certificate? Do not pay these accounts.</p>
              <p className="mt-1 text-sm leading-relaxed">
                Donations sent to the UPI IDs or bank account displayed on this page are not
                eligible for an 80G certificate. Please{' '}
                <Link to="/contact" className="font-bold underline hover:text-amber-800">
                  contact the organizing team before donating
                </Link>{' '}
                so they can guide you through the appropriate eligible receipt process.
              </p>
            </div>
          </div>
        )}

        {/* Amount & Reference Bar */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold block">
              Merchant Reference
            </span>
            <span className="font-mono text-lg font-extrabold text-slate-900">
              {session?.merchantReference}
            </span>
          </div>

          <div className="text-right">
            <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold block">
              Payable Amount
            </span>
            <span className="font-mono text-3xl font-extrabold text-pip-600">
              {formatINR(session?.amountPaise || 0)}
            </span>
          </div>
        </div>

        <div className="grid lg:grid-cols-12 gap-8">
          {/* Left Column: Payment Methods */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
              {/* Method Switcher Tabs */}
              <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setActiveTab('upi')}
                  className={`flex-1 py-2.5 rounded-lg flex items-center justify-center space-x-2 transition ${
                    activeTab === 'upi'
                      ? 'bg-white text-pip-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <QrCode className="w-4 h-4" />
                  <span>Direct UPI & QR Code</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('bank')}
                  className={`flex-1 py-2.5 rounded-lg flex items-center justify-center space-x-2 transition ${
                    activeTab === 'bank'
                      ? 'bg-white text-pip-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Building className="w-4 h-4" />
                  <span>SBI Bank Transfer</span>
                </button>
              </div>

              {/* Tab 1: UPI & QR View */}
              {activeTab === 'upi' && (
                <div className="space-y-6 text-center">
                  <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 inline-block mx-auto shadow-inner">
                    {session?.upiUri ? (
                      <QRCodeSVG
                        value={session.upiUri}
                        size={220}
                        level="H"
                        includeMargin={true}
                        className="rounded-xl mx-auto"
                      />
                    ) : (
                      <div className="w-[220px] h-[220px] flex items-center justify-center text-slate-400">
                        Generating QR...
                      </div>
                    )}
                    <p className="text-xs text-slate-500 font-mono mt-3">
                      Scan with GPay / PhonePe / Paytm / BHIM
                    </p>
                  </div>

                  {/* Mobile UPI Intent Button */}
                  <div>
                    <a
                      href={session?.upiUri}
                      className="w-full flex items-center justify-center space-x-2 py-3.5 px-6 rounded-xl bg-gradient-to-r from-pip-600 to-pink-500 text-white font-bold text-sm shadow hover:from-pip-700 hover:to-pink-600 transition"
                    >
                      <span>Pay via Any UPI App</span>
                      <ArrowRight className="w-4 h-4" />
                    </a>
                  </div>

                  {/* UPI VPA Copy Bar */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-left">
                    <div>
                      <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                        Official UPI ID
                      </div>
                      <div className="font-mono text-sm font-bold text-slate-900">
                        {paymentConfig.upiVpa}
                      </div>
                    </div>
                    <button
                      onClick={() => copyToClipboard(paymentConfig.upiVpa, 'vpa')}
                      className="p-2 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition"
                    >
                      {copiedField === 'vpa' ? (
                        <Check className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Tab 2: Bank Transfer Details */}
              {activeTab === 'bank' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                      <div>
                        <div className="text-xs text-slate-400 uppercase font-semibold">
                          Account Name
                        </div>
                        <div className="text-sm font-bold text-slate-900">
                          {paymentConfig.payeeName}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                      <div>
                        <div className="text-xs text-slate-400 uppercase font-semibold">
                          Account Number
                        </div>
                        <div className="text-sm font-mono font-bold text-slate-900">
                          {paymentConfig.accountNumber}
                        </div>
                      </div>
                      <button
                        onClick={() => copyToClipboard(paymentConfig.accountNumber, 'acc')}
                        className="p-2 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition"
                      >
                        {copiedField === 'acc' ? (
                          <Check className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                    <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                      <div>
                        <div className="text-xs text-slate-400 uppercase font-semibold">
                          IFSC Code
                        </div>
                        <div className="text-sm font-mono font-bold text-slate-900">
                          {paymentConfig.ifscCode}
                        </div>
                      </div>
                      <button
                        onClick={() => copyToClipboard(paymentConfig.ifscCode, 'ifsc')}
                        className="p-2 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition"
                      >
                        {copiedField === 'ifsc' ? (
                          <Check className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                    <div>
                      <div className="text-xs text-slate-400 uppercase font-semibold">
                        Bank & Branch
                      </div>
                      <div className="text-xs text-slate-700 mt-0.5">
                        {paymentConfig.bankName} • {paymentConfig.branch}
                      </div>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 text-xs text-blue-900 flex items-start space-x-2">
                    <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <span>
                      Please mention your reference <strong>{session?.merchantReference}</strong> in
                      the transfer remarks/notes.
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Evidence & UTR Submission */}
          <div className="lg:col-span-5">
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-pip-600 bg-pip-50 px-2.5 py-1 rounded-full">
                  Step 2: Submit Proof
                </span>
                <h3 className="text-xl font-extrabold text-slate-900 mt-2">Confirm Payment</h3>
                <p className="text-xs text-slate-500 mt-1">
                  After completing your transfer, enter the 12-digit UTR reference or upload a
                  screenshot.
                </p>
              </div>

              <form onSubmit={handleSubmitEvidence} className="space-y-4">
                <div>
                  <label htmlFor="utrInput" className="block text-xs font-bold text-slate-700 mb-1">
                    12-Digit Bank Reference / UPI UTR
                  </label>
                  <input
                    id="utrInput"
                    type="text"
                    maxLength={20}
                    placeholder="e.g. 429218273849"
                    value={utr}
                    onChange={(e) => setUtr(e.target.value.toUpperCase())}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-pip-500 uppercase"
                  />
                  <p className="text-xs text-slate-400 mt-1">
                    Found in your payment app under Transaction details.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Upload Screenshot (Optional but speeds up verification)
                  </label>
                  <label className="border-2 border-dashed border-slate-200 hover:border-pip-300 rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer transition text-center bg-slate-50">
                    <Upload className="w-5 h-5 text-slate-400 mb-1" />
                    <span className="text-xs font-semibold text-slate-700">
                      {isAnalyzingReceipt
                        ? 'Uploading and reading receipt…'
                        : receiptFile
                          ? receiptFile.name
                          : 'Choose screenshot / receipt image'}
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5">PNG or JPG up to 5MB</span>
                    <input
                      type="file"
                      accept="image/png, image/jpeg"
                      className="hidden"
                      disabled={isAnalyzingReceipt}
                      onChange={(e) => void handleReceiptFile(e.target.files?.[0] || null)}
                    />
                  </label>
                  {ocrMessage && <p className="text-xs text-blue-700 mt-2">{ocrMessage}</p>}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || isAnalyzingReceipt}
                  className="w-full flex items-center justify-center space-x-2 py-4 px-6 rounded-2xl bg-pip-600 hover:bg-pip-700 text-white font-bold text-base shadow-lg shadow-pip-600/30 transition disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Submitting Evidence...</span>
                    </>
                  ) : (
                    <>
                      <span>I Have Paid — Verify</span>
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </form>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-500 flex items-center space-x-2">
                <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                <span>Verification usually takes 2–6 hours via our volunteer finance desk.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
