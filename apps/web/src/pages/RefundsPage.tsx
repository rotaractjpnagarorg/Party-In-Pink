import React from 'react';
import { RefreshCcw, ArrowLeft, Mail, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEvent } from '../context/EventContext.js';

export const RefundsPage: React.FC = () => {
  const { event } = useEvent();

  return (
    <div className="py-12 bg-slate-50 min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link
          to="/"
          className="inline-flex items-center text-sm font-semibold text-pip-600 hover:text-pip-800 mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          <span>Back to Home</span>
        </Link>

        <div className="bg-white p-8 sm:p-12 rounded-3xl border border-slate-200 shadow-sm space-y-8">
          <div className="border-b border-slate-100 pb-6">
            <div className="inline-flex items-center space-x-2 text-xs font-bold text-pip-700 bg-pip-50 px-3 py-1 rounded-full mb-3">
              <RefreshCcw className="w-3.5 h-3.5" />
              <span>Financial & Cancellation Terms</span>
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Refund & Cancellation Policy
            </h1>
            <p className="text-sm text-slate-500 mt-2">
              Party In Pink {event.edition} • Rotaract Club of Bangalore JP Nagar
            </p>
          </div>

          <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 sm:p-5 flex items-start space-x-3 text-amber-900 text-sm">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Charitable Cause Notice</p>
              <p className="mt-1 text-amber-800">
                Party In Pink is a breast cancer awareness and fundraising initiative. Event
                proceeds support Sri Shankara Cancer Foundation and the delivery of the event. We
                encourage participants who cannot attend to consider their registration as a direct
                gift to the cause.
              </p>
            </div>
          </div>

          <section className="space-y-4 text-slate-700 text-sm sm:text-base leading-relaxed">
            <h2 className="text-lg font-bold text-slate-900">
              1. Transferability of Registrations
            </h2>
            <p>
              If you are unable to attend the Party In Pink Zumba session, you may transfer your
              registration pass to any friend, family member, or colleague at zero additional fee.
              Simply send an email or WhatsApp to our help desk with your <strong>Order ID</strong>{' '}
              and the replacement participant&apos;s full name, email, and phone number at least 24
              hours prior to the event.
            </p>

            <h2 className="text-lg font-bold text-slate-900 pt-4">
              2. Duplicate Payments & Accidental Overpayments
            </h2>
            <p>
              If you were debited multiple times during UPI transfer or made an inadvertent
              duplicate payment for the same registration:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-slate-600">
              <li>
                <strong>Automated Audit:</strong> Our banking reconciliation system detects
                duplicate UTRs and flags them for manual review by our finance trustees.
              </li>
              <li>
                <strong>Direct Reversal:</strong> Verified excess amounts will be returned to the
                originating UPI VPA or bank account via manual NEFT/IMPS transfer within{' '}
                <strong>3 to 5 business days</strong>.
              </li>
            </ul>

            <h2 className="text-lg font-bold text-slate-900 pt-4">
              3. Standard Registration Cancellations
            </h2>
            <p>
              Cancellation requests submitted up to <strong>72 hours before the event date</strong>{' '}
              are eligible for a 100% refund of the registration fee (minus any payment processing
              charges).
            </p>
            <p>
              Due to advance procurement of water, medical supplies, venue permits, and breakfast
              arrangements, cancellations received within 72 hours of the event start time cannot be
              refunded, though passes remain freely transferable.
            </p>

            <h2 className="text-lg font-bold text-slate-900 pt-4">
              4. Event Postponement or Force Majeure
            </h2>
            <p>
              In the unlikely event of extreme weather conditions, municipal directives, or public
              safety emergencies that necessitate rescheduling the event:
            </p>
            <div className="grid sm:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                <div className="flex items-center space-x-2 font-bold text-slate-900 text-sm mb-1">
                  <CheckCircle2 className="w-4 h-4 text-pip-600" />
                  <span>Automatic Rollover</span>
                </div>
                <p className="text-xs text-slate-600">
                  Your registration and digital pass automatically transfer to the rescheduled date
                  without requiring any action.
                </p>
              </div>
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                <div className="flex items-center space-x-2 font-bold text-slate-900 text-sm mb-1">
                  <Clock className="w-4 h-4 text-pip-600" />
                  <span>Full Refund Window</span>
                </div>
                <p className="text-xs text-slate-600">
                  If the rescheduled date does not suit you, you can request a 100% refund within 7
                  days of the announcement.
                </p>
              </div>
            </div>

            <h2 className="text-lg font-bold text-slate-900 pt-4">
              5. How to Initiate a Refund Request
            </h2>
            <p>
              To request a refund or raise a billing inquiry, write to our volunteer finance desk
              with:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-600">
              <li>
                Your Order ID (e.g. <code>PIP5-xxxxxx</code>)
              </li>
              <li>Bank reference number / 12-digit UPI UTR</li>
              <li>Brief reason for cancellation</li>
            </ul>
            <div className="mt-4 p-4 rounded-2xl bg-pip-50 border border-pip-200 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Mail className="w-5 h-5 text-pip-600" />
                <span className="text-sm font-semibold text-pip-900">
                  rotaractjpnagar@gmail.com
                </span>
              </div>
              <Link
                to="/contact"
                className="px-4 py-2 bg-pip-600 text-white rounded-xl text-xs font-bold hover:bg-pip-700 transition"
              >
                Contact Helpdesk
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
