import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import {
  Copy,
  Check,
  Upload,
  AlertCircle,
  Clock,
  ArrowRight,
  Loader2,
  ShieldCheck,
  CheckCircle2,
  Download,
  X,
  Building,
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
  paymentDisplayConfig?: {
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

  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<PaymentSessionData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  // Proof submission state
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreviewUrl, setReceiptPreviewUrl] = useState<string | null>(null);
  const [utr, setUtr] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showBankDetails, setShowBankDetails] = useState(false);

  // Initialize or fetch payment session
  const initSession = async () => {
    if (!token) {
      setError('Missing order status token. Please return to the status page or register first.');
      setLoading(false);
      return;
    }
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

  useEffect(() => {
    initSession();
  }, [token]);

  // 15-minute countdown ticker
  useEffect(() => {
    if (!session?.expiresAt) return;

    const updateTimer = () => {
      const expiryMs = new Date(session.expiresAt).getTime();
      const remaining = Math.max(0, Math.floor((expiryMs - Date.now()) / 1000));
      setTimeLeft(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [session?.expiresAt]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2500);
  };

  const paymentConfig = session?.paymentDisplayConfig || event.paymentDisplayConfig;
  const vpa = paymentConfig?.upiVpa || 'racjpn2425@ybl';
  const payeeName = paymentConfig?.payeeName || event.paymentDisplayConfig.payeeName || 'Party In Pink 5.0';
  const amountFormatted = session ? (session.amountPaise / 100).toFixed(2) : '0.00';

  // Deep-link UPI URIs
  const qrUpiUri = React.useMemo(() => {
    if (!session) return '';
    const ref = encodeURIComponent(session.merchantReference);
    return `upi://pay?pa=${vpa}&pn=${encodeURIComponent(payeeName)}&am=${amountFormatted}&cu=INR&tn=${ref}&tr=${session.merchantReference}`;
  }, [session, vpa, payeeName, amountFormatted]);

  const mobileIntentUri = React.useMemo(() => {
    return `upi://pay?pa=${vpa}&pn=${encodeURIComponent(payeeName)}`;
  }, [vpa, payeeName]);

  const handleDownloadQR = () => {
    const svg = document.getElementById('pip-qr-svg');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = `PiP5-Payment-QR-${session?.merchantReference || 'code'}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  const handleFileChange = (file: File | null) => {
    if (receiptPreviewUrl) {
      URL.revokeObjectURL(receiptPreviewUrl);
      setReceiptPreviewUrl(null);
    }
    if (!file) {
      setReceiptFile(null);
      return;
    }
    if (
      !['image/png', 'image/jpeg', 'image/webp'].includes(file.type) ||
      file.size > 8 * 1024 * 1024
    ) {
      setError('Please upload a valid PNG, JPG, or WEBP screenshot smaller than 8 MB.');
      setReceiptFile(null);
      return;
    }
    setError(null);
    setReceiptFile(file);
    setReceiptPreviewUrl(URL.createObjectURL(file));
  };

  const handleSubmitProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || !token) return;

    if (!receiptFile && !utr.trim()) {
      setError('Please attach your payment screenshot or enter your 12-digit UTR reference.');
      return;
    }

    const cleanedUtr = utr.trim().replace(/\D/g, '');
    if (utr.trim() && cleanedUtr.length !== 12 && !receiptFile) {
      setError('Please enter a valid 12-digit UTR reference (e.g. 429218273849) or attach your screenshot.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      let storagePath: string | undefined = undefined;

      // 1. Upload screenshot to Firebase Storage if selected
      if (receiptFile) {
        const path = `receipts/${session.sessionId}/receipt`;
        const storageRef = ref(storage, path);
        await uploadBytes(storageRef, receiptFile, {
          contentType: receiptFile.type || 'image/jpeg',
        });
        storagePath = path;
      }

      // 2. Submit payment evidence callable
      const submitCallable = httpsCallable<Record<string, unknown>, { success: boolean }>(
        functions,
        'submitPaymentEvidence'
      );

      await submitCallable({
        statusToken: token,
        sessionId: session.sessionId,
        transactionReference: cleanedUtr.length === 12 ? cleanedUtr : undefined,
        storagePath,
        source: receiptFile ? 'RECEIPT_UPLOAD' : 'MANUAL_ENTRY',
      });

      // 3. Redirect to status page
      navigate(`/status/${token}`);
    } catch (err: any) {
      console.error('Evidence submission error:', err);
      setError(err?.message || 'Failed to submit payment proof. Please try again.');
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
          <div className="p-5 bg-rose-50 rounded-2xl border border-rose-200 text-rose-800 space-y-2">
            <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
            <h2 className="text-lg font-bold">Unable to Load Payment</h2>
            <p className="text-xs text-rose-700">{error}</p>
          </div>
          <Link
            to="/status"
            className="inline-flex items-center space-x-1.5 px-5 py-2.5 bg-pip-600 text-white rounded-xl text-xs font-bold hover:bg-pip-700 transition"
          >
            <span>Return to Status Page</span>
          </Link>
        </div>
      </div>
    );
  }

  const isDonation = session?.entityType === 'DONATION';

  return (
    <div className="py-12 bg-slate-50 min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center space-x-2 text-xs font-bold text-pip-700 bg-pip-50 px-3.5 py-1.5 rounded-full mb-3 border border-pip-200 shadow-sm">
            <ShieldCheck className="w-4 h-4 text-pip-600" />
            <span>0% Platform Fees • 100% Goes Directly to Cause</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight sm:text-4xl">
            {isDonation ? 'Complete Your Donation' : 'Complete Your Payment'}
          </h1>
          <p className="text-sm text-slate-600 mt-2 max-w-lg mx-auto">
            Scan the QR code with any UPI app (GPay, PhonePe, Paytm, BHIM) and upload your payment confirmation screenshot below.
          </p>
        </div>

        {/* Global Error Alert */}
        {error && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start space-x-3 text-rose-800 text-sm shadow-sm">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold">Notice</p>
              <p className="mt-0.5 text-xs text-rose-700 leading-relaxed">{error}</p>
            </div>
          </div>
        )}

        {/* 80G Notice if Donation */}
        {isDonation && (
          <div className="p-5 rounded-2xl bg-amber-50 border-2 border-amber-300 flex items-start gap-3 text-amber-950 shadow-sm">
            <AlertCircle className="w-6 h-6 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-extrabold text-sm">Need an 80G certificate? Please note:</p>
              <p className="mt-1 text-xs leading-relaxed text-amber-900">
                Direct transfers through this page support general event awareness. If you require an 80G tax receipt, please{' '}
                <Link to="/contact" className="font-bold underline hover:text-amber-800">
                  contact our team directly
                </Link>{' '}
                prior to making payment.
              </p>
            </div>
          </div>
        )}

        {/* Amount & Reference Bar */}
        <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-[11px] text-slate-400 uppercase tracking-wider font-bold block">
              Reference Code
            </span>
            <span className="font-mono text-lg font-extrabold text-slate-900">
              {session?.merchantReference}
            </span>
          </div>

          {/* 15-Minute Countdown Window */}
          {timeLeft !== null && (
            <div
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-2xl border font-mono text-sm font-black transition ${
                timeLeft <= 180
                  ? 'bg-rose-50 border-rose-300 text-rose-700 animate-pulse'
                  : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}
            >
              <Clock
                className={`w-4 h-4 ${
                  timeLeft <= 180 ? 'text-rose-600' : 'text-amber-600'
                }`}
              />
              <div className="text-left">
                <span className="text-[9px] uppercase tracking-wider block font-sans font-bold text-slate-500">
                  Window
                </span>
                <span>{timeLeft > 0 ? formatTimer(timeLeft) : 'EXPIRED'}</span>
              </div>
            </div>
          )}

          <div className="text-right">
            <span className="text-[11px] text-slate-400 uppercase tracking-wider font-bold block">
              Payable Amount
            </span>
            <span className="font-mono text-2xl sm:text-3xl font-extrabold text-pip-600">
              {formatINR(session?.amountPaise || 0)}
            </span>
          </div>
        </div>

        {/* Two-Column Grid: Step 1 (QR Code) & Step 2 (Upload Proof) */}
        <div className="grid lg:grid-cols-12 gap-8 items-start">
          {/* Step 1: Scan & Pay */}
          <div className="lg:col-span-6 bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center space-x-2.5">
              <span className="w-7 h-7 rounded-full bg-pip-600 text-white font-black text-sm flex items-center justify-center">
                1
              </span>
              <h2 className="text-lg font-extrabold text-slate-900">Scan & Pay via UPI</h2>
            </div>

            {/* QR Code Container */}
            <div className="p-5 rounded-2xl bg-gradient-to-b from-slate-50 to-pink-50/40 border border-slate-200 flex flex-col items-center justify-center space-y-3">
              <div className="p-3 bg-white rounded-2xl shadow-md border border-slate-200/80">
                <QRCodeSVG
                  id="pip-qr-svg"
                  value={qrUpiUri}
                  size={200}
                  level="H"
                  includeMargin={true}
                  className="rounded-lg"
                />
              </div>

              <div className="text-center space-y-1">
                <p className="text-xs font-bold text-slate-800">
                  Scan with GPay, PhonePe, Paytm, or BHIM
                </p>
                <p className="text-[11px] text-slate-500 font-mono">
                  Amount: <strong>₹{amountFormatted}</strong>
                </p>
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <button
                  type="button"
                  onClick={handleDownloadQR}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white text-slate-700 hover:text-pip-600 text-xs font-bold rounded-xl border border-slate-200 shadow-sm transition active:scale-95"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download QR</span>
                </button>
              </div>
            </div>

            {/* Mobile-Friendly Quick Pay Options */}
            <div className="space-y-2.5">
              {/* Direct App Link for CRED, Paytm, BHIM */}
              <a
                href={mobileIntentUri}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-pip-600 via-pink-600 to-rose-500 hover:from-pip-700 hover:to-pink-700 text-white font-extrabold text-sm flex items-center justify-center space-x-2 shadow-md shadow-pip-500/25 active:scale-98 transition text-center"
              >
                <span>⚡ Open UPI App (CRED, Paytm, BHIM)</span>
              </a>

              {/* Official UPI ID with 1-Tap Copy */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-left">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold block">
                    Official UPI ID (GPay / PhonePe / Any UPI)
                  </span>
                  <span className="font-mono text-xs sm:text-sm font-extrabold text-slate-900">
                    {vpa}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(vpa, 'vpa')}
                  className={`px-3 py-2 rounded-xl border font-bold text-xs flex items-center space-x-1.5 transition active:scale-95 ${
                    copiedField === 'vpa'
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                  title="Copy UPI ID"
                >
                  {copiedField === 'vpa' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                      <span>Copy ID</span>
                    </>
                  )}
                </button>
              </div>

              {/* Step-by-Step Instructions Banner */}
              <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 text-xs text-amber-950 space-y-1.5">
                <p className="font-extrabold flex items-center gap-1.5 text-amber-900">
                  <span>📱 Fast Mobile Instructions:</span>
                </p>
                <ul className="space-y-1 text-[11px] text-amber-900 font-medium">
                  <li>• <strong>CRED & Paytm users:</strong> Tap <em>"Open UPI App"</em> above to pay directly.</li>
                  <li>• <strong>GPay & PhonePe users:</strong> Tap <em>"Copy UPI ID"</em>, paste in app, pay <strong>₹{amountFormatted}</strong>.</li>
                  <li>• <strong>Once paid:</strong> Take a screenshot and upload in <strong>Step 2</strong> on the right!</li>
                </ul>
              </div>
            </div>

            {/* Collapsible SBI Bank Details */}
            <div className="pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowBankDetails(!showBankDetails)}
                className="text-xs font-bold text-slate-500 hover:text-pip-600 flex items-center space-x-1.5 transition"
              >
                <Building className="w-3.5 h-3.5" />
                <span>{showBankDetails ? 'Hide' : 'Show'} Direct Bank Transfer (SBI / NEFT) Details</span>
              </button>

              {showBankDetails && (
                <div className="mt-3 p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs text-slate-700">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Account Name</span>
                    <span className="font-bold text-slate-900">{paymentConfig?.payeeName}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Account Number</span>
                      <span className="font-mono font-bold text-slate-900">{paymentConfig?.accountNumber}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(paymentConfig?.accountNumber || '', 'acc')}
                      className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600"
                    >
                      {copiedField === 'acc' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">IFSC Code</span>
                      <span className="font-mono font-bold text-slate-900">{paymentConfig?.ifscCode}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(paymentConfig?.ifscCode || '', 'ifsc')}
                      className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600"
                    >
                      {copiedField === 'ifsc' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Bank & Branch</span>
                    <span>{paymentConfig?.bankName} • {paymentConfig?.branch}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Step 2: Upload Proof & Submit */}
          <div className="lg:col-span-6 bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center space-x-2.5">
              <span className="w-7 h-7 rounded-full bg-pip-600 text-white font-black text-sm flex items-center justify-center">
                2
              </span>
              <div>
                <h2 className="text-lg font-extrabold text-slate-900">Upload Payment Proof</h2>
                <p className="text-xs text-slate-500">Takes 10 seconds to confirm</p>
              </div>
            </div>

            <form onSubmit={handleSubmitProof} className="space-y-5">
              {/* File Upload Dropzone */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Payment App Screenshot *
                </label>

                {receiptPreviewUrl ? (
                  <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50 flex items-center space-x-3.5">
                    <img
                      src={receiptPreviewUrl}
                      alt="Payment Preview"
                      className="w-16 h-16 object-cover rounded-xl border border-slate-200 shadow-sm"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {receiptFile?.name}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {receiptFile ? `${(receiptFile.size / 1024).toFixed(0)} KB` : ''}
                      </p>
                      <span className="inline-flex items-center space-x-1 mt-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Ready to submit</span>
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setReceiptFile(null);
                        setReceiptPreviewUrl(null);
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-white transition"
                      title="Remove"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-slate-200 hover:border-pip-400 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition text-center bg-slate-50/60 hover:bg-pip-50/30">
                    <div className="w-10 h-10 rounded-full bg-pip-100 text-pip-600 flex items-center justify-center mb-2">
                      <Upload className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-slate-800">
                      Tap or drag payment screenshot
                    </span>
                    <span className="text-[11px] text-slate-400 mt-0.5">
                      PNG, JPG, or WEBP up to 8 MB
                    </span>
                    <input
                      type="file"
                      accept="image/png, image/jpeg, image/webp"
                      className="hidden"
                      onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                    />
                  </label>
                )}
              </div>

              {/* Optional UTR Input */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="utrInput" className="block text-xs font-bold text-slate-700">
                    12-Digit UPI UTR / Ref (Optional)
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {utr.replace(/\D/g, '').length}/12
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
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-pip-500"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting || (!receiptFile && !utr.trim()) || timeLeft === 0}
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-pip-600 via-pink-600 to-rose-500 hover:from-pip-700 hover:to-pink-700 text-white font-extrabold text-base shadow-lg shadow-pip-500/25 transition active:scale-98 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Submitting Payment Proof...</span>
                  </>
                ) : (
                  <>
                    <span>Confirm & Submit Proof</span>
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition" />
                  </>
                )}
              </button>

              {/* Reassurance Notes */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-600 space-y-1.5">
                <div className="flex items-center space-x-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Proof goes directly to organizing desk for 1-click verification.</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-pip-600 shrink-0" />
                  <span>Digital tickets issued automatically to your email upon approval.</span>
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* Footer Link */}
        <div className="text-center pt-2 pb-6">
          <p className="text-xs text-slate-500">
            Need help?{' '}
            <Link to="/contact" className="text-pip-600 font-bold hover:underline">
              Contact Organizing Desk
            </Link>{' '}
            or{' '}
            <Link to={`/status/${token}`} className="text-slate-600 font-bold hover:underline">
              Check Status
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
