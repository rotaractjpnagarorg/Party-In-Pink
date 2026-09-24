import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  AlertCircle,
  Clock,
  ArrowRight,
  Loader2,
  ShieldCheck,
  Zap,
  CreditCard,
  Lock,
  CheckCircle,
} from 'lucide-react';
import { useEvent } from '../context/EventContext.js';
import { useCashfree } from '../hooks/useCashfree.js';
import { formatINR } from '@pip/shared';
import { functions } from '../services/firebase.js';
import { httpsCallable } from 'firebase/functions';

interface PaymentSessionData {
  sessionId: string;
  entityType: 'ORDER' | 'DONATION';
  merchantReference: string;
  amountPaise: number;
  currency: string;
  status: string;
  expiresAt: string;
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

  const { startCheckout: startCashfreeCheckout, isLoading: cashfreeLoading } = useCashfree();

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

  // 15-minute session countdown ticker
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

  const handleCashfreePay = async () => {
    if (!session?.sessionId) return;
    setError(null);
    await startCashfreeCheckout(session.sessionId, {
      onSuccess: () => {
        // Once payment succeeds via Cashfree, route to status page where it awaits Slack admin approval
        navigate(`/status/${token}?status=submitted&gateway=cashfree`);
      },
      onFailure: (msg) => {
        setError(msg);
      },
    });
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
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Header Title */}
        <div className="text-center">
          <div className="inline-flex items-center space-x-2 text-xs font-bold text-pip-700 bg-pip-50 px-3.5 py-1.5 rounded-full mb-3 border border-pip-200 shadow-sm">
            <ShieldCheck className="w-4 h-4 text-pip-600" />
            <span>256-Bit SSL Encrypted • Official Payment Gateway</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight sm:text-4xl">
            {isDonation ? 'Complete Your Contribution' : 'Complete Your Payment'}
          </h1>
          <p className="text-sm text-slate-600 mt-2 max-w-md mx-auto">
            Party In Pink {event.edition} secure checkout. Pay seamlessly via Cards, UPI, or NetBanking.
          </p>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start space-x-3 text-rose-800 text-sm shadow-sm">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold">Payment Error</p>
              <p className="mt-0.5 text-xs text-rose-700 leading-relaxed">{error}</p>
            </div>
          </div>
        )}

        {/* 80G Notice for Donations */}
        {isDonation && (
          <div className="p-5 rounded-2xl bg-amber-50 border-2 border-amber-300 flex items-start gap-3 text-amber-950 shadow-sm">
            <AlertCircle className="w-6 h-6 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-extrabold text-sm">Need an 80G certificate? Please note:</p>
              <p className="mt-1 text-xs leading-relaxed text-amber-900">
                Online contributions through this portal support event infrastructure and awareness. If your organization requires an 80G tax exemption certificate, please{' '}
                <Link to="/contact" className="font-bold underline hover:text-amber-800">
                  contact the organizing team directly
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

          {/* 15-minute Session Countdown Timer */}
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

        {/* Expired Session Alert */}
        {timeLeft === 0 && (
          <div className="p-5 rounded-2xl bg-rose-50 border-2 border-rose-300 flex flex-wrap items-center justify-between gap-4 text-rose-950 shadow-sm">
            <div className="flex items-center space-x-3">
              <AlertCircle className="w-6 h-6 text-rose-600 shrink-0" />
              <div>
                <p className="font-extrabold text-sm">Payment Window Expired</p>
                <p className="text-xs text-rose-800 mt-0.5">
                  Your 15-minute session expired. Click below to renew your session.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void initSession()}
              className="px-4 py-2 bg-rose-600 text-white rounded-xl font-bold text-xs hover:bg-rose-700 transition shadow-sm shrink-0 active:scale-95"
            >
              Renew Session
            </button>
          </div>
        )}

        {/* Main Payment Checkout Box */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-md p-6 sm:p-8 space-y-6">
          <div className="flex items-center space-x-3.5 pb-5 border-b border-slate-100">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pip-600 to-pink-600 text-white flex items-center justify-center font-black shadow-md shadow-pip-200 shrink-0">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <span>Instant Online Payment</span>
                <span className="px-2.5 py-0.5 text-[10px] uppercase tracking-wider bg-emerald-100 text-emerald-800 rounded-full font-bold">
                  Fast & Secure
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Powered by Cashfree Payments Gateway
              </p>
            </div>
          </div>

          {/* Supported Methods Badges */}
          <div className="space-y-3">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Supported Payment Methods
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs text-slate-700">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center space-x-2">
                <span className="text-base">📱</span>
                <div>
                  <p className="font-bold text-slate-900">UPI Apps</p>
                  <p className="text-[10px] text-slate-500">GPay, PhonePe, Paytm, BHIM</p>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center space-x-2">
                <span className="text-base">💳</span>
                <div>
                  <p className="font-bold text-slate-900">Cards</p>
                  <p className="text-[10px] text-slate-500">Visa, Mastercard, RuPay</p>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center space-x-2 col-span-2 sm:col-span-1">
                <span className="text-base">🏦</span>
                <div>
                  <p className="font-bold text-slate-900">NetBanking</p>
                  <p className="text-[10px] text-slate-500">All Major Indian Banks</p>
                </div>
              </div>
            </div>
          </div>

          {/* Primary Call to Action Button */}
          <div className="pt-2">
            <button
              type="button"
              disabled={cashfreeLoading || timeLeft === 0}
              onClick={handleCashfreePay}
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-pip-600 via-pink-600 to-rose-500 hover:from-pip-700 hover:to-pink-700 text-white font-extrabold text-base shadow-lg shadow-pip-500/25 transition active:scale-98 flex items-center justify-center space-x-3 disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              {cashfreeLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Connecting to Cashfree Gateway...</span>
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5 text-amber-300 fill-amber-300" />
                  <span>Pay {formatINR(session?.amountPaise || 0)} Now</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition" />
                </>
              )}
            </button>
          </div>

          {/* Trust and Assurance Points */}
          <div className="pt-4 border-t border-slate-100 space-y-2 text-xs text-slate-600">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Payment is routed directly to the organizing committee for instant approval.</span>
            </div>
            <div className="flex items-center space-x-2">
              <Lock className="w-4 h-4 text-pip-600 shrink-0" />
              <span>End-to-end encrypted checkout via Cashfree Payments India.</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Digital pass(es) and tax receipt dispatched directly to your registered email.</span>
            </div>
          </div>
        </div>

        {/* Footer Navigation & Help */}
        <div className="text-center pt-2 pb-6 space-y-2">
          <p className="text-xs text-slate-500">
            Having trouble with checkout?{' '}
            <Link to="/contact" className="text-pip-600 font-bold hover:underline">
              Contact Organizing Desk
            </Link>{' '}
            or{' '}
            <Link to={`/status/${token}`} className="text-slate-600 font-bold hover:underline">
              View Order Status
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
