import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import {
  Copy,
  Check,
  Upload,
  AlertCircle,
  AlertTriangle,
  Clock,
  ArrowRight,
  Loader2,
  ShieldCheck,
  CheckCircle2,
  Download,
  X,
  Building,
  Sparkles,
  Camera,
  Image as ImageIcon,
  FolderOpen,
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
  const [uploadedStoragePath, setUploadedStoragePath] = useState<string | null>(null);
  const [scanStatus, setScanStatus] = useState<
    'IDLE' | 'SCANNING' | 'DETECTED' | 'NOT_FOUND' | 'DUPLICATE' | 'AMOUNT_MISMATCH'
  >('IDLE');
  const [detectedUtr, setDetectedUtr] = useState<string | null>(null);
  const [detectedAmountPaise, setDetectedAmountPaise] = useState<number | null>(null);
  const [scanWarnings, setScanWarnings] = useState<string[]>([]);
  const [utr, setUtr] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showBankDetails, setShowBankDetails] = useState(false);
  const [showMediaPickerModal, setShowMediaPickerModal] = useState(false);

  // Dedicated media picker refs
  const galleryInputRef = React.useRef<HTMLInputElement>(null);
  const cameraInputRef = React.useRef<HTMLInputElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

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

  const handleFileChange = async (file: File | null) => {
    if (receiptPreviewUrl) {
      URL.revokeObjectURL(receiptPreviewUrl);
      setReceiptPreviewUrl(null);
    }
    setDetectedUtr(null);
    setScanStatus('IDLE');
    setScanWarnings([]);
    setUploadedStoragePath(null);

    if (!file) {
      setReceiptFile(null);
      return;
    }
    const hasImageExtension = /\.(jpe?g|png|webp|heic|heif)$/i.test(file.name);
    const isValidImageType =
      (file.type && (file.type.startsWith('image/') || ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'].includes(file.type))) ||
      hasImageExtension;
    if (!isValidImageType || file.size > 8 * 1024 * 1024) {
      setError('Please upload a valid PNG, JPG, or WEBP screenshot smaller than 8 MB.');
      setReceiptFile(null);
      return;
    }
    setError(null);
    setReceiptFile(file);
    setReceiptPreviewUrl(URL.createObjectURL(file));

    // Instantly upload and trigger AI OCR scan so UTR auto-populates in real time
    if (!session || !token) return;
    setScanStatus('SCANNING');
    try {
      const path = `receipts/${session.sessionId}/receipt`;
      const storageRef = ref(storage, path);
      const contentType = file.type?.startsWith('image/') ? file.type : 'image/jpeg';
      await uploadBytes(storageRef, file, { contentType });
      setUploadedStoragePath(path);

      const analyzeCallable = httpsCallable<
        { statusToken: string; sessionId: string; storagePath: string },
        {
          transactionReference?: string | null;
          extractedAmountPaise?: number | null;
          paymentStatusText?: string | null;
          confidence?: number | null;
          validation?: {
            isValid: boolean;
            isDuplicateUtr: boolean;
            isAmountMismatch: boolean;
            isPaymentStatusMissing: boolean;
            expectedAmountPaise: number;
            warnings: string[];
          };
        }
      >(functions, 'analyzePaymentReceipt');

      const response = await analyzeCallable({
        statusToken: token,
        sessionId: session.sessionId,
        storagePath: path,
      });

      const { transactionReference, extractedAmountPaise, validation } = response.data;
      const warnings = validation?.warnings || [];
      setScanWarnings(warnings);
      setDetectedAmountPaise(extractedAmountPaise ?? null);

      // Pre-fill UTR in the input box immediately if found
      if (transactionReference) {
        setUtr(transactionReference);
        setDetectedUtr(transactionReference);
      }

      // Enforce strict blocking validations
      if (validation?.isAmountMismatch) {
        setScanStatus('AMOUNT_MISMATCH');
      } else if (validation?.isDuplicateUtr) {
        setScanStatus('DUPLICATE');
      } else if (transactionReference) {
        setScanStatus('DETECTED');
      } else {
        setScanStatus('NOT_FOUND');
      }
    } catch (err: any) {
      console.warn('Real-time receipt OCR warning (non-blocking):', err);
      setScanWarnings([]);
      setScanStatus('NOT_FOUND');
    }
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
      let storagePath: string | undefined = uploadedStoragePath || undefined;

      // Upload screenshot to Firebase Storage if not already uploaded during real-time scan
      if (receiptFile && !storagePath) {
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
    <div className="py-6 sm:py-12 bg-slate-50 min-h-screen w-full max-w-full overflow-x-hidden">
      <div className="max-w-4xl mx-auto w-full px-3 sm:px-6 lg:px-8 space-y-5 sm:space-y-8 overflow-hidden box-border">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center space-x-2 text-[11px] sm:text-xs font-bold text-pip-700 bg-pip-50 px-3 py-1.5 rounded-full mb-3 border border-pip-200 shadow-sm max-w-full">
            <ShieldCheck className="w-4 h-4 text-pip-600 shrink-0" />
            <span className="truncate">0% Platform Fees • 100% Goes Directly to Cause</span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight">
            {isDonation ? 'Complete Your Donation' : 'Complete Your Payment'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1.5 sm:mt-2 max-w-lg mx-auto">
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
        <div className="bg-white p-4 sm:p-6 lg:p-7 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row flex-wrap items-start sm:items-center justify-between gap-3 sm:gap-4 overflow-hidden min-w-0">
          <div className="flex items-center justify-between w-full sm:w-auto gap-3">
            <div>
              <span className="text-[10px] sm:text-[11px] text-slate-400 uppercase tracking-wider font-bold block">
                Reference Code
              </span>
              <span className="font-mono text-sm sm:text-lg font-extrabold text-slate-900 break-all">
                {session?.merchantReference}
              </span>
            </div>

            {/* 15-Minute Countdown Window */}
            {timeLeft !== null && (
              <div
                className={`flex items-center space-x-1.5 sm:space-x-2 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-xl sm:rounded-2xl border font-mono text-xs sm:text-sm font-black transition ${
                  timeLeft <= 180
                    ? 'bg-rose-50 border-rose-300 text-rose-700 animate-pulse'
                    : 'bg-amber-50 border-amber-200 text-amber-900'
                }`}
              >
                <Clock
                  className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${
                    timeLeft <= 180 ? 'text-rose-600' : 'text-amber-600'
                  }`}
                />
                <div className="text-left">
                  <span className="text-[8px] sm:text-[9px] uppercase tracking-wider block font-sans font-bold text-slate-500">
                    Window
                  </span>
                  <span>{timeLeft > 0 ? formatTimer(timeLeft) : 'EXPIRED'}</span>
                </div>
              </div>
            )}
          </div>

          <div className="text-left sm:text-right">
            <span className="text-[10px] sm:text-[11px] text-slate-400 uppercase tracking-wider font-bold block">
              Payable Amount
            </span>
            <span className="font-mono text-xl sm:text-2xl lg:text-3xl font-extrabold text-pip-600">
              {formatINR(session?.amountPaise || 0)}
            </span>
          </div>
        </div>

        {/* Two-Column Grid: Step 1 (QR Code) & Step 2 (Upload Proof) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-8 items-start">
          {/* Step 1: Scan & Pay */}
          <div className="lg:col-span-6 bg-white p-4 sm:p-6 lg:p-7 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm space-y-4 sm:space-y-6 overflow-hidden min-w-0">
            <div className="flex items-center space-x-2.5">
              <span className="w-7 h-7 rounded-full bg-pip-600 text-white font-black text-sm flex items-center justify-center">
                1
              </span>
              <h2 className="text-lg font-extrabold text-slate-900">Scan & Pay via UPI</h2>
            </div>

            {/* QR Code Container */}
            <div className="p-3 sm:p-5 rounded-2xl bg-gradient-to-b from-slate-50 to-pink-50/40 border border-slate-200 flex flex-col items-center justify-center space-y-3">
              <div className="p-2 sm:p-3 bg-white rounded-xl sm:rounded-2xl shadow-md border border-slate-200/80">
                <QRCodeSVG
                  id="pip-qr-svg"
                  value={qrUpiUri}
                  size={typeof window !== 'undefined' && window.innerWidth < 640 ? 160 : 200}
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

              <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-1 w-full">
                <button
                  type="button"
                  onClick={handleDownloadQR}
                  className="w-full sm:w-auto inline-flex items-center justify-center space-x-1.5 px-4 py-2 bg-white text-slate-800 hover:text-pip-600 text-xs font-bold rounded-xl border border-slate-200 shadow-sm transition active:scale-95"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download / Save QR</span>
                </button>
              </div>
              <p className="text-[10px] text-slate-500 text-center">
                💡 On mobile? Save QR to Photos and scan it from your UPI app's gallery scanner.
              </p>
            </div>

            {/* UPI ID & Amount 1-Tap Copy */}
            <div className="space-y-2.5">
              {/* Official UPI ID with 1-Tap Copy */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-left overflow-hidden min-w-0 gap-2">
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold block">
                    Official UPI ID (GPay • PhonePe • Paytm • CRED)
                  </span>
                  <span className="font-mono text-xs sm:text-sm font-extrabold text-slate-900 break-all">
                    {vpa}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(vpa, 'vpa')}
                  className={`px-3 py-2 rounded-xl border font-bold text-xs flex items-center space-x-1.5 transition active:scale-95 shrink-0 ${
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
                      <span>Copy UPI ID</span>
                    </>
                  )}
                </button>
              </div>

              {/* Exact Amount Card with 1-Tap Copy */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-left overflow-hidden min-w-0 gap-2">
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold block">
                    Exact Amount to Transfer
                  </span>
                  <span className="font-mono text-sm sm:text-base font-extrabold text-slate-900">
                    ₹{amountFormatted}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(amountFormatted, 'amount')}
                  className={`px-3 py-2 rounded-xl border font-bold text-xs flex items-center space-x-1.5 transition active:scale-95 shrink-0 ${
                    copiedField === 'amount'
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                  title="Copy Amount"
                >
                  {copiedField === 'amount' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                      <span>Copy Amount</span>
                    </>
                  )}
                </button>
              </div>

              {/* Step-by-Step Instructions Banner */}
              <div className="p-3 sm:p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 text-xs text-amber-950 space-y-1.5 overflow-hidden">
                <p className="font-extrabold flex items-center gap-1.5 text-amber-900 text-[11px] sm:text-xs">
                  <span>📱 Easy 3-Step Payment:</span>
                </p>
                <ul className="space-y-1 text-[10px] sm:text-[11px] text-amber-900 font-medium leading-relaxed">
                  <li>• <strong>1. Scan QR code</strong> with any UPI app, or copy the UPI ID above.</li>
                  <li>• <strong>2. Transfer exact amount:</strong> ₹{amountFormatted}</li>
                  <li>• <strong>3. Upload screenshot:</strong> Take a screenshot of the receipt and upload in <strong>Step 2</strong> below.</li>
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
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Account Number</span>
                      <span className="font-mono font-bold text-slate-900 break-all">{paymentConfig?.accountNumber}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(paymentConfig?.accountNumber || '', 'acc')}
                      className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 shrink-0"
                    >
                      {copiedField === 'acc' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">IFSC Code</span>
                      <span className="font-mono font-bold text-slate-900 break-all">{paymentConfig?.ifscCode}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(paymentConfig?.ifscCode || '', 'ifsc')}
                      className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 shrink-0"
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
          <div className="lg:col-span-6 bg-white p-4 sm:p-6 lg:p-7 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm space-y-4 sm:space-y-6 overflow-hidden min-w-0">
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
                  <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50 flex items-center gap-3 overflow-hidden min-w-0">
                    <img
                      src={receiptPreviewUrl}
                      alt="Payment Preview"
                      className="w-14 h-14 sm:w-16 sm:h-16 object-cover rounded-xl border border-slate-200 shadow-sm shrink-0"
                    />
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <p className="text-xs font-bold text-slate-900 truncate max-w-full">
                        {receiptFile?.name || 'Screenshot'}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {receiptFile ? `${(receiptFile.size / 1024).toFixed(0)} KB` : ''}
                      </p>
                      {scanStatus === 'SCANNING' ? (
                        <span className="inline-flex items-center space-x-1 mt-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 animate-pulse">
                          <Loader2 className="w-3 h-3 animate-spin text-amber-600" />
                          <span>AI reading screenshot...</span>
                        </span>
                      ) : scanStatus === 'AMOUNT_MISMATCH' ? (
                        <span className="inline-flex items-center space-x-1 mt-1 text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                          <AlertCircle className="w-3 h-3 text-rose-600" />
                          <span>Amount mismatch</span>
                        </span>
                      ) : scanStatus === 'DUPLICATE' ? (
                        <span className="inline-flex items-center space-x-1 mt-1 text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                          <AlertCircle className="w-3 h-3 text-rose-600" />
                          <span>Duplicate UTR</span>
                        </span>
                      ) : scanStatus === 'DETECTED' ? (
                        <span className="inline-flex items-center space-x-1 mt-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>UTR Auto-Filled</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 mt-1 text-[10px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                          <CheckCircle2 className="w-3 h-3 text-slate-500" />
                          <span>Ready to submit</span>
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setReceiptFile(null);
                        setReceiptPreviewUrl(null);
                        setScanStatus('IDLE');
                        setDetectedUtr(null);
                        setDetectedAmountPaise(null);
                        setScanWarnings([]);
                        setUploadedStoragePath(null);
                        setUtr('');
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-white transition"
                      title="Remove"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const dropped = e.dataTransfer.files?.[0];
                      if (dropped) void handleFileChange(dropped);
                    }}
                    className="border-2 border-dashed border-slate-200 hover:border-pip-400 rounded-2xl p-4 sm:p-5 flex flex-col items-center justify-center transition text-center bg-slate-50/60"
                  >
                    {/* Main Dropzone Area - Tapping opens Media Picker */}
                    <div
                      onClick={() => setShowMediaPickerModal(true)}
                      className="cursor-pointer flex flex-col items-center justify-center w-full group py-1"
                    >
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-pip-500 to-rose-600 text-white flex items-center justify-center mb-2 shadow-md shadow-pip-500/20 group-hover:scale-105 transition">
                        <Upload className="w-5 h-5" />
                      </div>
                      <span className="text-xs sm:text-sm font-extrabold text-slate-800 group-hover:text-pip-600 transition">
                        Tap or drag payment screenshot
                      </span>
                      <span className="text-[11px] text-slate-500 mt-0.5">
                        Choose via Media Picker: Gallery, Camera, or File Manager (PNG, JPG, WEBP)
                      </span>
                    </div>

                    {/* Dedicated 3-Option Media Picker Bar */}
                    <div className="mt-3.5 pt-3 border-t border-slate-200/80 w-full grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          galleryInputRef.current?.click();
                        }}
                        className="flex flex-col items-center justify-center p-2 sm:p-2.5 bg-white text-slate-700 hover:text-pink-600 hover:border-pink-300 border border-slate-200 rounded-xl shadow-xs transition hover:shadow-sm active:scale-95 text-center group"
                        title="Open Photo Gallery"
                      >
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-pink-50 text-pink-600 flex items-center justify-center mb-1 group-hover:bg-pink-100 transition">
                          <ImageIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </div>
                        <span className="text-[11px] sm:text-xs font-bold block leading-tight">Gallery</span>
                        <span className="text-[9px] sm:text-[10px] text-slate-400 mt-0.5">Photos</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          cameraInputRef.current?.click();
                        }}
                        className="flex flex-col items-center justify-center p-2 sm:p-2.5 bg-white text-slate-700 hover:text-amber-600 hover:border-amber-300 border border-slate-200 rounded-xl shadow-xs transition hover:shadow-sm active:scale-95 text-center group"
                        title="Open Camera"
                      >
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center mb-1 group-hover:bg-amber-100 transition">
                          <Camera className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </div>
                        <span className="text-[11px] sm:text-xs font-bold block leading-tight">Camera</span>
                        <span className="text-[9px] sm:text-[10px] text-slate-400 mt-0.5">Take Photo</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          fileInputRef.current?.click();
                        }}
                        className="flex flex-col items-center justify-center p-2 sm:p-2.5 bg-white text-slate-700 hover:text-blue-600 hover:border-blue-300 border border-slate-200 rounded-xl shadow-xs transition hover:shadow-sm active:scale-95 text-center group"
                        title="Open File Manager"
                      >
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-1 group-hover:bg-blue-100 transition">
                          <FolderOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </div>
                        <span className="text-[11px] sm:text-xs font-bold block leading-tight">Files</span>
                        <span className="text-[9px] sm:text-[10px] text-slate-400 mt-0.5">File Manager</span>
                      </button>
                    </div>

                    {/* Hidden inputs targeting specific native device pickers */}
                    <input
                      ref={galleryInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        e.target.value = '';
                        setShowMediaPickerModal(false);
                        void handleFileChange(file);
                      }}
                    />
                    <input
                      ref={cameraInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        e.target.value = '';
                        setShowMediaPickerModal(false);
                        void handleFileChange(file);
                      }}
                    />
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="*/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        e.target.value = '';
                        setShowMediaPickerModal(false);
                        void handleFileChange(file);
                      }}
                    />
                  </div>
                )}

                {/* Real-time AI OCR scanning feedback */}
                {scanStatus === 'SCANNING' && (
                  <div className="mt-2.5 p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center space-x-2 animate-pulse">
                    <Loader2 className="w-4 h-4 animate-spin text-amber-600 shrink-0" />
                    <span className="font-semibold">
                      AI is scanning screenshot to auto-detect 12-digit UTR...
                    </span>
                  </div>
                )}

                {scanStatus === 'DETECTED' && detectedUtr && (
                  <div className="mt-2.5 p-3.5 rounded-2xl bg-emerald-50 border-2 border-emerald-300 text-emerald-950 text-xs space-y-2">
                    <div className="flex items-center gap-1.5 font-black text-emerald-900 flex-wrap">
                      <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>AI Auto-Detected UTR:</span>
                    </div>
                    <div className="font-mono text-base sm:text-lg font-black bg-white px-3 py-2 rounded-xl border-2 border-emerald-300 tracking-[0.15em] text-emerald-900 text-center break-all">
                      {detectedUtr}
                    </div>
                    <p className="text-[11px] text-emerald-700 text-center">
                      ✅ Auto-populated into the reference field below. Review and submit.
                    </p>
                  </div>
                )}

                {scanStatus === 'NOT_FOUND' && receiptFile && (
                  <div className="mt-2.5 p-3 rounded-2xl bg-slate-100 border border-slate-200 text-slate-700 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <span className="font-bold block text-slate-800">Screenshot Attached</span>
                      <span className="text-[11px] text-slate-600 block mt-0.5">
                        Could not auto-detect the 12-digit UTR from the image. You can enter the 12-digit UTR below if visible, or leave it blank — our desk will verify it manually.
                      </span>
                    </div>
                  </div>
                )}

                {/* Amount Mismatch — hard block */}
                {scanStatus === 'AMOUNT_MISMATCH' && (
                  <div className="mt-2.5 p-3.5 rounded-2xl bg-rose-50 border-2 border-rose-300 text-rose-950 text-xs space-y-1.5">
                    <div className="flex items-center space-x-1.5 font-black text-rose-800">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>Payment Amount Mismatch — Submission Blocked</span>
                    </div>
                    <p className="text-[11px] text-rose-700 leading-relaxed">
                      Your screenshot shows an amount of{' '}
                      <strong className="font-bold text-rose-900 bg-white px-1.5 py-0.5 rounded border border-rose-200">
                        ₹{detectedAmountPaise ? (detectedAmountPaise / 100).toFixed(2) : 'incorrect'}
                      </strong>
                      , but this transaction requires exactly{' '}
                      <strong className="font-bold text-rose-900 bg-white px-1.5 py-0.5 rounded border border-rose-200">
                        ₹{session?.amountPaise ? (session.amountPaise / 100).toFixed(2) : amountFormatted}
                      </strong>
                      . Please pay the exact amount and upload the corresponding receipt.
                    </p>
                  </div>
                )}

                {/* Duplicate UTR — hard block */}
                {scanStatus === 'DUPLICATE' && detectedUtr && (
                  <div className="mt-2.5 p-3.5 rounded-2xl bg-rose-50 border-2 border-rose-300 text-rose-950 text-xs space-y-1.5">
                    <div className="flex items-center space-x-1.5 font-black text-rose-800">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>Duplicate UTR Detected — Submission Blocked</span>
                    </div>
                    <p className="text-[11px] text-rose-700 leading-relaxed">
                      The UTR <span className="font-mono font-bold bg-white px-1.5 py-0.5 rounded border border-rose-200">{detectedUtr}</span> has already been used for another payment. Please upload the correct screenshot from your new transaction.
                    </p>
                  </div>
                )}

                {/* Validation warnings (missing success status, etc.) */}
                {scanWarnings.length > 0 && scanStatus !== 'DUPLICATE' && scanStatus !== 'AMOUNT_MISMATCH' && (
                  <div className="mt-2.5 space-y-2">
                    {scanWarnings.map((warning, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-start space-x-2"
                      >
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <span className="font-semibold leading-relaxed">{warning}</span>
                      </div>
                    ))}
                  </div>
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
                disabled={
                  isSubmitting ||
                  (!receiptFile && !utr.trim()) ||
                  timeLeft === 0 ||
                  scanStatus === 'DUPLICATE' ||
                  scanStatus === 'AMOUNT_MISMATCH' ||
                  scanStatus === 'SCANNING'
                }
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

      {/* Native-Style Media Picker Bottom Sheet / Modal */}
      {showMediaPickerModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-150">
          <div
            className="fixed inset-0"
            onClick={() => setShowMediaPickerModal(false)}
          />
          <div className="relative w-full max-w-sm sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 p-5 sm:p-6 space-y-4 z-10 animate-in slide-in-from-bottom-5 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Choose Media Source</h3>
                <p className="text-xs text-slate-500">Select where to pick your payment receipt from</p>
              </div>
              <button
                type="button"
                onClick={() => setShowMediaPickerModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Options List */}
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => {
                  setShowMediaPickerModal(false);
                  galleryInputRef.current?.click();
                }}
                className="w-full flex items-center p-3.5 rounded-2xl border border-slate-200 hover:border-pink-300 hover:bg-pink-50/50 transition active:scale-98 text-left group"
              >
                <div className="w-11 h-11 rounded-xl bg-pink-100 text-pink-600 flex items-center justify-center shrink-0 mr-3.5 group-hover:scale-105 transition">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-slate-900 group-hover:text-pink-600 transition">
                    Photo Gallery
                  </h4>
                  <p className="text-xs text-slate-500 truncate">
                    Pick screenshot from Photos, Albums, or Gallery
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowMediaPickerModal(false);
                  cameraInputRef.current?.click();
                }}
                className="w-full flex items-center p-3.5 rounded-2xl border border-slate-200 hover:border-amber-300 hover:bg-amber-50/50 transition active:scale-98 text-left group"
              >
                <div className="w-11 h-11 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0 mr-3.5 group-hover:scale-105 transition">
                  <Camera className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-slate-900 group-hover:text-amber-600 transition">
                    Take Photo (Camera)
                  </h4>
                  <p className="text-xs text-slate-500 truncate">
                    Capture payment receipt live with your camera
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowMediaPickerModal(false);
                  fileInputRef.current?.click();
                }}
                className="w-full flex items-center p-3.5 rounded-2xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 transition active:scale-98 text-left group"
              >
                <div className="w-11 h-11 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 mr-3.5 group-hover:scale-105 transition">
                  <FolderOpen className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition">
                    File Manager / Documents
                  </h4>
                  <p className="text-xs text-slate-500 truncate">
                    Browse Downloads, Google Drive, or device files
                  </p>
                </div>
              </button>
            </div>

            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowMediaPickerModal(false)}
                className="w-full py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
