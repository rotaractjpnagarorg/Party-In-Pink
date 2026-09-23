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
  CheckCircle2,
  FileText,
  Sparkles,
  HelpCircle,
  X,
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

  // Evidence & Submission Mode State
  const [proofMode, setProofMode] = useState<'SCREENSHOT' | 'UTR'>('SCREENSHOT');
  const [showUtrHelp, setShowUtrHelp] = useState(false);
  const [utr, setUtr] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreviewUrl, setReceiptPreviewUrl] = useState<string | null>(null);
  const [receiptStoragePath, setReceiptStoragePath] = useState<string | null>(null);
  const [isAnalyzingReceipt, setIsAnalyzingReceipt] = useState(false);
  const [ocrSuccess, setOcrSuccess] = useState(false);
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
    if (receiptPreviewUrl) {
      URL.revokeObjectURL(receiptPreviewUrl);
      setReceiptPreviewUrl(null);
    }
    setReceiptFile(file);
    setReceiptStoragePath(null);
    setOcrMessage(null);
    setOcrSuccess(false);

    if (!file || !session || !token) return;
    if (
      !['image/png', 'image/jpeg', 'image/webp'].includes(file.type) ||
      file.size > 5 * 1024 * 1024
    ) {
      setError('Receipt must be a PNG, JPG, or WEBP image smaller than 5 MB.');
      setReceiptFile(null);
      return;
    }

    setReceiptPreviewUrl(URL.createObjectURL(file));
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
        setOcrSuccess(true);
        setOcrMessage(`12-Digit UTR detected: ${response.data.transactionReference}`);
      } else {
        setOcrSuccess(false);
        setOcrMessage('Screenshot uploaded! UTR was not clearly detected; you can optionally verify it below.');
      }
    } catch (receiptError) {
      console.error('Receipt analysis error:', receiptError);
      if (uploaded) {
        setOcrSuccess(false);
        setOcrMessage('Screenshot uploaded. You can optionally enter your 12-digit UTR below.');
      } else {
        setReceiptFile(null);
        setError('Screenshot upload failed. Please try again.');
      }
    } finally {
      setIsAnalyzingReceipt(false);
    }
  };

  // Submit Evidence
  const handleSubmitEvidence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || !token) return;

    const cleanedUtr = utr.trim().replace(/\D/g, '');

    if (proofMode === 'SCREENSHOT') {
      if (!receiptFile) {
        setError('Please select or upload a payment receipt screenshot.');
        return;
      }
    } else {
      if (cleanedUtr.length !== 12) {
        setError('Please enter a valid 12-digit numeric UTR reference (e.g. 429218273849).');
        return;
      }
    }

    setIsSubmitting(true);
    setError(null);

    try {
      let storagePath: string | undefined = receiptStoragePath || undefined;

      // In SCREENSHOT mode, ensure file is uploaded to Firebase Storage
      if (proofMode === 'SCREENSHOT' && receiptFile && !storagePath) {
        const path = `receipts/${session.sessionId}/receipt`;
        const storageRef = ref(storage, path);
        await uploadBytes(storageRef, receiptFile);
        storagePath = path;
      }

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
        transactionReference: cleanedUtr.length === 12 ? cleanedUtr : undefined,
        storagePath: proofMode === 'SCREENSHOT' ? storagePath : undefined,
        source: proofMode === 'SCREENSHOT' ? 'RECEIPT_UPLOAD' : 'MANUAL_ENTRY',
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
                  Choose how you would like to confirm your transfer:
                </p>
              </div>

              {/* Segmented Control / Option A & Option B Switcher */}
              <div className="grid grid-cols-2 p-1.5 bg-slate-100 rounded-2xl gap-1">
                <button
                  type="button"
                  id="tabOptionScreenshot"
                  onClick={() => {
                    setProofMode('SCREENSHOT');
                    setError(null);
                  }}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold transition flex flex-col items-center justify-center space-y-0.5 ${
                    proofMode === 'SCREENSHOT'
                      ? 'bg-white text-pip-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center space-x-1.5">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Screenshot</span>
                  </div>
                  <span className="text-[10px] font-semibold text-emerald-600">⚡ AI Auto-fills UTR</span>
                </button>

                <button
                  type="button"
                  id="tabOptionUtr"
                  onClick={() => {
                    setProofMode('UTR');
                    setError(null);
                  }}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold transition flex flex-col items-center justify-center space-y-0.5 ${
                    proofMode === 'UTR'
                      ? 'bg-white text-pip-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center space-x-1.5">
                    <FileText className="w-3.5 h-3.5" />
                    <span>Enter 12-Digit UTR</span>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-400">Manual Entry</span>
                </button>
              </div>

              <form onSubmit={handleSubmitEvidence} className="space-y-4">
                {/* OPTION A: SCREENSHOT UPLOAD */}
                {proofMode === 'SCREENSHOT' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Payment App Screenshot
                      </label>

                      {receiptPreviewUrl ? (
                        <div className="relative p-3 rounded-2xl border border-slate-200 bg-slate-50 flex items-center space-x-3">
                          <img
                            src={receiptPreviewUrl}
                            alt="Receipt Preview"
                            className="w-16 h-16 object-cover rounded-xl border border-slate-200 shadow-sm shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold text-slate-900 truncate">
                              {receiptFile?.name}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {receiptFile ? `${(receiptFile.size / 1024).toFixed(0)} KB` : ''}
                            </div>
                          </div>
                          <div className="flex items-center space-x-1.5">
                            <label className="text-xs font-bold text-pip-600 hover:text-pip-700 cursor-pointer bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
                              Change
                              <input
                                type="file"
                                accept="image/png, image/jpeg, image/webp"
                                className="hidden"
                                disabled={isAnalyzingReceipt}
                                onChange={(e) => void handleReceiptFile(e.target.files?.[0] || null)}
                              />
                            </label>
                            <button
                              type="button"
                              onClick={() => {
                                setReceiptFile(null);
                                setReceiptPreviewUrl(null);
                                setReceiptStoragePath(null);
                                setOcrSuccess(false);
                                setOcrMessage(null);
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-slate-100 transition"
                              title="Remove screenshot"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <label className="border-2 border-dashed border-slate-200 hover:border-pip-400 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition text-center bg-slate-50/50 hover:bg-pip-50/30">
                          <div className="w-10 h-10 rounded-full bg-pip-100 text-pip-600 flex items-center justify-center mb-2">
                            <Upload className="w-5 h-5" />
                          </div>
                          <span className="text-xs font-bold text-slate-800">
                            Tap to upload screenshot
                          </span>
                          <span className="text-[11px] text-slate-400 mt-0.5">
                            PNG, JPG, or WEBP up to 5MB
                          </span>
                          <span className="text-[10px] font-semibold text-pip-600 mt-2 inline-flex items-center">
                            <Sparkles className="w-3 h-3 mr-1" />
                            Google Cloud Vision will detect your UTR
                          </span>
                          <input
                            type="file"
                            accept="image/png, image/jpeg, image/webp"
                            className="hidden"
                            disabled={isAnalyzingReceipt}
                            onChange={(e) => void handleReceiptFile(e.target.files?.[0] || null)}
                          />
                        </label>
                      )}
                    </div>

                    {/* Scanning Feedback */}
                    {isAnalyzingReceipt && (
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl flex items-center space-x-2.5 text-xs text-blue-900 animate-pulse">
                        <Loader2 className="w-4 h-4 animate-spin text-blue-600 shrink-0" />
                        <span>AI is reading transaction reference with Google Cloud Vision...</span>
                      </div>
                    )}

                    {/* OCR Results Banner */}
                    {!isAnalyzingReceipt && receiptFile && (
                      <>
                        {ocrSuccess && utr ? (
                          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-950 space-y-1">
                            <div className="flex items-center space-x-1.5 font-bold text-emerald-800">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                              <span>
                                UTR Detected: <span className="font-mono text-sm tracking-wider">{utr}</span>
                              </span>
                            </div>
                            <p className="text-[11px] text-emerald-700">
                              Verified from your screenshot. Tap submit below to confirm your passes!
                            </p>
                          </div>
                        ) : (
                          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-slate-600">
                                {ocrMessage || 'Screenshot uploaded. You can optionally verify the UTR below:'}
                              </span>
                            </div>
                            <input
                              type="text"
                              maxLength={12}
                              inputMode="numeric"
                              placeholder="Optional: 12-digit UTR"
                              value={utr}
                              onChange={(e) => setUtr(e.target.value.replace(/\D/g, ''))}
                              className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-pip-500"
                            />
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* OPTION B: MANUAL UTR ENTRY */}
                {proofMode === 'UTR' && (
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label htmlFor="utrInput" className="block text-xs font-bold text-slate-700">
                          12-Digit Bank Reference / UPI UTR
                        </label>
                        <span className="text-[11px] font-mono text-slate-400">
                          {utr.replace(/\D/g, '').length} / 12 digits
                        </span>
                      </div>
                      <input
                        id="utrInput"
                        type="text"
                        maxLength={12}
                        inputMode="numeric"
                        placeholder="e.g. 429218273849"
                        value={utr}
                        onChange={(e) => setUtr(e.target.value.replace(/\D/g, ''))}
                        className="w-full px-4 py-3 rounded-2xl border border-slate-300 text-base font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-pip-500"
                      />
                    </div>

                    {/* UTR Help Tooltip / Accordion */}
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
                      <button
                        type="button"
                        onClick={() => setShowUtrHelp(!showUtrHelp)}
                        className="flex items-center justify-between w-full text-left font-bold text-slate-700 hover:text-pip-600"
                      >
                        <span className="flex items-center space-x-1.5">
                          <HelpCircle className="w-3.5 h-3.5 text-pip-500" />
                          <span>Where do I find my 12-digit UTR?</span>
                        </span>
                        <span className="text-slate-400 text-xs">{showUtrHelp ? 'Hide' : 'Show'}</span>
                      </button>

                      {showUtrHelp && (
                        <div className="mt-2.5 pt-2 border-t border-slate-200 space-y-1 text-[11px] text-slate-600">
                          <div><strong>Google Pay:</strong> Look for <em>UPI transaction ID</em></div>
                          <div><strong>PhonePe:</strong> Look for <em>UTR</em> in Transfer Details</div>
                          <div><strong>Paytm:</strong> Look for <em>UPI Ref No</em></div>
                          <div><strong>Bank SMS:</strong> 12-digit number following <em>Ref No / UTR</em></div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={
                    isSubmitting ||
                    isAnalyzingReceipt ||
                    (proofMode === 'SCREENSHOT' && !receiptFile) ||
                    (proofMode === 'UTR' && utr.replace(/\D/g, '').length !== 12)
                  }
                  className="w-full flex items-center justify-center space-x-2 py-4 px-6 rounded-2xl bg-pip-600 hover:bg-pip-700 text-white font-bold text-base shadow-lg shadow-pip-600/30 transition disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Submitting Proof...</span>
                    </>
                  ) : (
                    <>
                      <span>
                        {proofMode === 'SCREENSHOT' ? 'Confirm & Submit Screenshot' : 'Confirm & Submit UTR'}
                      </span>
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
