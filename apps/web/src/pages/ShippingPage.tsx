import React from 'react';
import { Send, ArrowLeft, Clock, CheckCircle2, Ticket } from 'lucide-react';
import { Link } from 'react-router-dom';

import { useEvent } from '../context/EventContext.js';

export const ShippingPage: React.FC = () => {
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
              <Send className="w-3.5 h-3.5" />
              <span>Fulfilment & Delivery Terms</span>
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Shipping & Digital Delivery Policy
            </h1>
            <p className="text-sm text-slate-500 mt-2">
              Party In Pink {event.edition} • Rotaract Club of Bangalore JP Nagar (RI District 3191)
            </p>
          </div>

          <div className="rounded-2xl bg-pip-50/70 border border-pip-200 p-4 sm:p-5 flex items-start space-x-3 text-slate-800 text-sm">
            <Ticket className="w-5 h-5 text-pip-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-slate-900">Digital Goods & Services Notice</p>
              <p className="mt-1 text-slate-600">
                All passes, registrations, and donor entries for Party In Pink are 100% digital
                e-tickets. No physical items will be shipped via courier or post.
              </p>
            </div>
          </div>

          <section className="space-y-6 text-slate-700 text-sm sm:text-base leading-relaxed">
            <div>
              <h2 className="text-lg font-bold text-slate-900">1. Nature of Products & Delivery Method</h2>
              <p className="mt-2 text-slate-600">
                Party In Pink {event.edition} provides admission passes and registration access to our annual
                fitness concert and breast cancer awareness initiative.
              </p>
              <ul className="list-disc pl-5 mt-3 space-y-2 text-slate-600 text-sm">
                <li>
                  <strong>Electronic Delivery:</strong> Upon successful payment completion, your official QR admission pass is delivered immediately to the email address provided during registration.
                </li>
                <li>
                  <strong>Online Viewable Pass:</strong> You can also instantly view and download your verified entry pass directly from our{' '}
                  <Link to="/status" className="font-semibold text-pip-600 underline hover:text-pip-800">
                    Registration Status Page
                  </Link>{' '}
                  using your Merchant Reference or Order ID.
                </li>
                <li>
                  <strong>Physical Inclusions at Venue:</strong> The wristbands, energy kit, and refreshments included with your ticket are handed to you in person at the venue check-in desk upon scanning your digital QR pass.
                </li>
              </ul>
            </div>

            <div>
              <h2 className="text-lg font-bold text-slate-900">2. Delivery Timelines</h2>
              <div className="grid sm:grid-cols-2 gap-4 mt-3">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center space-x-2 text-pip-600 font-bold text-sm mb-1">
                    <Clock className="w-4 h-4" />
                    <span>Online Payments (Cashfree / UPI)</span>
                  </div>
                  <p className="text-xs text-slate-600">
                    <strong>Instant delivery</strong> (typically 1 to 5 minutes) upon successful transaction authorization.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center space-x-2 text-emerald-600 font-bold text-sm mb-1">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Direct Bank / Manual UTR</span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Delivered within <strong>2 to 4 hours</strong> following financial reconciliation and verification by our team.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-bold text-slate-900">3. Shipping & Handling Charges</h2>
              <p className="mt-2 text-slate-600">
                Because all admissions are issued electronically via e-tickets,{' '}
                <strong>shipping and handling charges are ₹0.00 (Free)</strong> for all registrations across all ticket categories.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-bold text-slate-900">4. Non-Delivery or Access Assistance</h2>
              <p className="mt-2 text-slate-600">
                If you have completed your payment but have not received your ticket confirmation email within 15 minutes, please follow these steps:
              </p>
              <ol className="list-decimal pl-5 mt-2 space-y-2 text-slate-600 text-sm">
                <li>Check your Spam, Junk, or Promotions folder for an email from <code>tickets@rotaractjpnagar.org</code>.</li>
                <li>Visit our <Link to="/status" className="font-semibold text-pip-600 underline">Status Lookup</Link> and enter your Order Reference or Email to view your active pass.</li>
                <li>
                  Reach out directly to our dedicated ticketing desk at{' '}
                  <a href="mailto:rotaractjpnagar@gmail.com" className="font-semibold text-pip-600 underline">
                    rotaractjpnagar@gmail.com
                  </a>{' '}
                  or via WhatsApp at{' '}
                  <a href="https://wa.me/918618066508" className="font-semibold text-emerald-600 underline" target="_blank" rel="noreferrer">
                    +91 86180 66508
                  </a>
                  . Our team will verify your transaction reference and reissue your pass immediately.
                </li>
              </ol>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
