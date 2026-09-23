import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import {
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  Calendar,
  MapPin,
  Loader2,
  ArrowRight,
  ShieldCheck,
  CreditCard,
} from 'lucide-react';
import { useEvent } from '../context/EventContext.js';
import { formatINR, PaymentStatuses, OrderStatuses, type PublicOrderStatus } from '@pip/shared';
import { functions } from '../services/firebase.js';
import { httpsCallable } from 'firebase/functions';

export const StatusPage: React.FC = () => {
  const { token: routeToken } = useParams<{ token?: string }>();
  const [searchParams] = useSearchParams();
  const queryToken = searchParams.get('token');
  const token = routeToken || queryToken || '';

  const { event } = useEvent();

  // Search form state
  const [searchReference, setSearchReference] = useState('');
  const [searchEmail, setSearchEmail] = useState('');

  // Status state
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<PublicOrderStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isDonation = order?.type === 'DONATION';

  const fetchStatusByToken = async (statusToken: string) => {
    setLoading(true);
    setError(null);
    try {
      const getStatusCallable = httpsCallable<any, PublicOrderStatus>(functions, 'getPublicStatus');
      const response = await getStatusCallable({ token: statusToken });
      setOrder(response.data);
    } catch (err: any) {
      console.error('Status fetch error:', err);
      setError(err?.message || 'Unable to locate order with the provided status token.');
    } finally {
      setLoading(false);
    }
  };

  const handleManualSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchReference.trim() || !searchEmail.trim()) {
      setError('Please provide both Order Reference and your registered Email.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const getStatusCallable = httpsCallable<any, PublicOrderStatus>(functions, 'getPublicStatus');
      const response = await getStatusCallable({
        reference: searchReference.trim(),
        email: searchEmail.trim(),
      });
      setOrder(response.data);
    } catch (err: any) {
      console.error('Manual search error:', err);
      setError(err?.message || 'No registration found matching the reference and email address.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchStatusByToken(token);
    }
  }, [token]);

  // Timeline step calculation
  const getStepStatus = (stepIndex: number) => {
    if (!order) return 'upcoming';

    // Steps:
    // 0: Created (AWAITING_PAYMENT)
    // 1: Payment Submitted (PAYMENT_SUBMITTED)
    // 2: Verified (PAYMENT_VERIFIED)
    // 3: Ticket Issued (CONFIRMED)

    const isSubmitted =
      order.paymentStatus === PaymentStatuses.PAYMENT_SUBMITTED ||
      order.paymentStatus === PaymentStatuses.VERIFYING ||
      order.paymentStatus === PaymentStatuses.VERIFIED;

    const isVerified = order.paymentStatus === PaymentStatuses.VERIFIED;
    const isConfirmed = order.orderStatus === OrderStatuses.CONFIRMED;

    if (stepIndex === 0) return 'completed';
    if (stepIndex === 1) {
      if (isVerified) return 'completed';
      if (isSubmitted) return 'current';
      return 'upcoming';
    }
    if (stepIndex === 2) {
      if (isConfirmed) return 'completed';
      if (isVerified) return 'current';
      return 'upcoming';
    }
    if (stepIndex === 3) {
      if (isConfirmed) return 'completed';
      return 'upcoming';
    }
    return 'upcoming';
  };

  const eventDateFormatted = new Date(event.eventDate).toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="py-12 bg-slate-50 min-h-screen">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center space-x-2 text-xs font-bold text-pip-700 bg-pip-50 px-3 py-1 rounded-full mb-2">
            <Search className="w-3.5 h-3.5" />
            <span>Registration Lookup & Status</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Order Status Tracker
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Track your Party In Pink {event.edition} pass, payment verification, and entry
            confirmation.
          </p>
        </div>

        {/* Manual Search Card when no order is displayed */}
        {!order && (
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm mb-8">
            <h2 className="text-lg font-bold text-slate-900 mb-2">Find Your Registration</h2>
            <p className="text-xs text-slate-500 mb-6">
              Enter your Order Reference (received on registration, e.g. <code>PIP5-S-XXXX</code>)
              and your registered Email address.
            </p>

            <form onSubmit={handleManualSearch} className="space-y-4">
              <div>
                <label
                  htmlFor="searchReference"
                  className="block text-xs font-bold text-slate-700 mb-1"
                >
                  Order Reference *
                </label>
                <input
                  id="searchReference"
                  type="text"
                  required
                  placeholder="e.g. PIP5-S-7K9M2P"
                  value={searchReference}
                  onChange={(e) => setSearchReference(e.target.value.toUpperCase())}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm uppercase font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-pip-500"
                />
              </div>

              <div>
                <label
                  htmlFor="searchEmail"
                  className="block text-xs font-bold text-slate-700 mb-1"
                >
                  Registered Email Address *
                </label>
                <input
                  id="searchEmail"
                  type="email"
                  required
                  placeholder="e.g. aditi@example.com"
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-pip-500"
                />
              </div>

              {error && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center space-x-2 py-3 px-6 rounded-xl bg-pip-600 text-white font-bold text-sm shadow hover:bg-pip-700 transition disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Searching Order...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    <span>Check Order Status</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Loading Indicator */}
        {loading && order && (
          <div className="py-12 text-center text-slate-500 flex items-center justify-center space-x-2">
            <Loader2 className="w-5 h-5 animate-spin text-pip-600" />
            <span className="text-sm">Refreshing status...</span>
          </div>
        )}

        {/* Order Details View */}
        {order && (
          <div className="space-y-6">
            {/* Top Overview Banner */}
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-100">
                <div>
                  <span className="text-xs font-mono font-bold text-pip-700 bg-pip-50 px-3 py-1 rounded-full border border-pip-200">
                    {order.publicReference}
                  </span>
                  <h2 className="text-2xl font-extrabold text-slate-900 mt-2">{order.buyerName}</h2>
                  {order.organisationName && (
                    <p className="text-xs text-slate-500 mt-0.5">{order.organisationName}</p>
                  )}
                </div>

                <div className="text-right">
                  <span className="text-xs text-slate-400 uppercase tracking-wider block">
                    Total Amount
                  </span>
                  <span className="text-2xl font-extrabold text-slate-900 font-mono">
                    {formatINR(order.totalAmountPaise)}
                  </span>
                  <span className="block text-xs text-slate-500">
                    {isDonation
                      ? '(donation)'
                      : `(${order.participantCount} pass${order.participantCount === 1 ? '' : 'es'})`}
                  </span>
                </div>
              </div>

              {/* Status Alert Banner */}
              {order.paymentStatus === PaymentStatuses.AWAITING_PAYMENT && (
                <div className="p-4 sm:p-5 rounded-2xl bg-amber-50 border border-amber-200 flex items-start space-x-3 text-amber-900 text-sm">
                  <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-2 flex-grow">
                    <p className="font-bold">Awaiting Payment</p>
                    <p className="text-xs sm:text-sm text-amber-800">
                      {isDonation
                        ? 'Please complete the direct UPI or bank transfer to submit your contribution.'
                        : 'Your registration is reserved. Please complete the direct UPI or bank transfer payment to confirm your entry pass.'}
                    </p>
                    <div className="pt-1">
                      <Link
                        to={`/pay?token=${encodeURIComponent(order.statusToken)}`}
                        className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-amber-600 text-white font-bold text-xs shadow hover:bg-amber-700 transition"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>Pay via PiP Pay</span>
                        <ArrowRight className="w-3.5 h-3.5 ml-1" />
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              {(order.paymentStatus === PaymentStatuses.PAYMENT_SUBMITTED ||
                order.paymentStatus === PaymentStatuses.VERIFYING ||
                order.paymentStatus === PaymentStatuses.REVIEW_REQUIRED) && (
                <div className="p-4 sm:p-5 rounded-2xl bg-blue-50 border border-blue-200 flex items-start space-x-3 text-blue-900 text-sm">
                  <Clock className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Payment is being verified</p>
                    <p className="text-xs sm:text-sm text-blue-800 mt-1">
                      {isDonation
                        ? 'We have received your payment reference and are verifying it.'
                        : 'We have received your payment reference and are verifying it. Your ticket pass will be confirmed shortly.'}
                    </p>
                  </div>
                </div>
              )}

              {order.paymentStatus === PaymentStatuses.REJECTED && (
                <div className="p-4 sm:p-5 rounded-2xl bg-rose-50 border border-rose-200 flex items-start space-x-3 text-rose-900 text-sm">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div className="space-y-2 flex-grow">
                    <p className="font-bold">Payment Verification Rejected</p>
                    <p className="text-xs sm:text-sm text-rose-800">
                      The payment reference submitted could not be reconciled. Please resubmit your payment proof or contact our organizing team for assistance.
                    </p>
                    <div className="pt-1">
                      <Link
                        to={`/pay?token=${encodeURIComponent(order.statusToken)}`}
                        className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-rose-600 text-white font-bold text-xs shadow hover:bg-rose-700 transition"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>Resubmit Payment Proof</span>
                        <ArrowRight className="w-3.5 h-3.5 ml-1" />
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              {order.paymentStatus === PaymentStatuses.VERIFIED && (
                <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start space-x-3 text-emerald-900 text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">
                      {isDonation
                        ? 'Donation Payment Verified — Thank You!'
                        : 'Payment Verified & Pass Confirmed! 🎉'}
                    </p>
                    <p className="text-xs sm:text-sm text-emerald-800 mt-1">
                      {isDonation
                        ? 'Your contribution has been reconciled successfully. A confirmation has been sent to your registered email.'
                        : `Your payment has been reconciled successfully. We look forward to dancing and celebrating with you on ${eventDateFormatted}!`}
                    </p>
                  </div>
                </div>
              )}

              {/* Progress Stepper */}
              {!isDonation && (
                <div className="pt-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
                    Lifecycle Progress
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center text-xs">
                    <div className="space-y-2">
                      <div className="w-8 h-8 mx-auto rounded-full bg-pip-600 text-white flex items-center justify-center font-bold">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <p className="font-semibold text-slate-900">Registered</p>
                    </div>

                    <div className="space-y-2">
                      <div
                        className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center font-bold ${
                          getStepStatus(1) === 'completed'
                            ? 'bg-pip-600 text-white'
                            : getStepStatus(1) === 'current'
                              ? 'bg-blue-600 text-white animate-pulse'
                              : 'bg-slate-100 text-slate-400 border border-slate-300'
                        }`}
                      >
                        {getStepStatus(1) === 'completed' ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : (
                          <span>2</span>
                        )}
                      </div>
                      <p className="font-semibold text-slate-700">Payment</p>
                    </div>

                    <div className="space-y-2">
                      <div
                        className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center font-bold ${
                          getStepStatus(2) === 'completed'
                            ? 'bg-pip-600 text-white'
                            : getStepStatus(2) === 'current'
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-100 text-slate-400 border border-slate-300'
                        }`}
                      >
                        {getStepStatus(2) === 'completed' ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : (
                          <span>3</span>
                        )}
                      </div>
                      <p className="font-semibold text-slate-700">Verified</p>
                    </div>

                    <div className="space-y-2">
                      <div
                        className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center font-bold ${
                          getStepStatus(3) === 'completed'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-100 text-slate-400 border border-slate-300'
                        }`}
                      >
                        {getStepStatus(3) === 'completed' ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : (
                          <span>4</span>
                        )}
                      </div>
                      <p className="font-semibold text-slate-700">Ticket Ready</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Event Details Card */}
            {!isDonation && (
              <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="font-bold text-base text-slate-900 flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-pip-600" />
                  <span>Event Day Schedule & Venue</span>
                </h3>

                <div className="grid sm:grid-cols-2 gap-4 text-xs sm:text-sm text-slate-600">
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                    <div className="font-bold text-slate-900">Date & Reporting</div>
                    <div>{eventDateFormatted}</div>
                    <div className="text-pip-600 font-semibold">Assembly: 6:00 AM IST</div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                    <div className="font-bold text-slate-900">Venue Location</div>
                    <div>{event.venue}</div>
                    <a
                      href={event.venueMapUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-pip-600 hover:underline flex items-center space-x-1"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      <span>View on Google Maps</span>
                    </a>
                  </div>
                </div>

                <div className="pt-2 text-xs text-slate-500 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  <span className="flex items-center space-x-1">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Rotaract JP Nagar Official Event Pass</span>
                  </span>
                  <Link to="/contact" className="text-pip-600 font-semibold hover:underline">
                    Need Help with this Order?
                  </Link>
                </div>
              </div>
            )}

            {/* Check Another Button */}
            <div className="text-center pt-4">
              <button
                onClick={() => {
                  setOrder(null);
                  setError(null);
                }}
                className="text-xs font-semibold text-slate-500 hover:text-pip-600 transition"
              >
                ← Look up another registration
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
