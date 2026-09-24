import React from 'react';
import { Shield, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEvent } from '../context/EventContext.js';

export const TermsPage: React.FC = () => {
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
              <Shield className="w-3.5 h-3.5" />
              <span>Event Governance</span>
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Terms & Conditions of Participation
            </h1>
            <p className="text-sm text-slate-500 mt-2">
              Party In Pink {event.edition} • Last updated September 2026
            </p>
          </div>

          <section className="space-y-4 text-slate-700 text-sm sm:text-base leading-relaxed">
            <h2 className="text-lg font-bold text-slate-900">1. Nature of the Event</h2>
            <p>
              Party In Pink {event.edition} is a high-energy Zumba fundraiser, fitness celebration,
              and charitable initiative organized by the Rotaract Club of Bangalore JP Nagar (RI
              District 3191). Proceeds and contributions support breast cancer care and surgeries
              through Sri Shankara Cancer Foundation.
            </p>

            <h2 className="text-lg font-bold text-slate-900 pt-4">
              2. Physical Fitness & Medical Responsibility
            </h2>
            <p>
              Participation in the high-energy Zumba workout session requires moderate physical
              fitness. By registering, you confirm that you are medically fit to participate and
              assume full responsibility for your health and safety during the event. First-aid
              stations and hydration volunteers will be present at the venue, but the organizers
              accept no liability for personal illness, dehydration, or pre-existing health
              complications.
            </p>

            <h2 className="text-lg font-bold text-slate-900 pt-4">3. Participant Conduct</h2>
            <p>
              All attendees are expected to uphold the ideals of Rotary and maintain respectful,
              courteous behavior toward volunteers, fellow participants, marshals, and the host
              college campus.
            </p>

            <h2 className="text-lg font-bold text-slate-900 pt-4">
              4. Media, Photography & Videography Consent
            </h2>
            <p>
              By participating in Party In Pink {event.edition}, you acknowledge and agree that
              official event photographers and media teams may photograph and film the event. These
              images and videos may be used across Rotaract, Rotary, and institutional social
              channels, post-event reports, and press releases strictly for non-commercial awareness
              promotion.
            </p>

            <h2 className="text-lg font-bold text-slate-900 pt-4">
              5. Force Majeure & Rescheduling
            </h2>
            <p>
              In the rare event of extreme weather, administrative directives, or unforeseen
              circumstances necessitating a change in date or venue, registrations will
              automatically transfer to the rescheduled date. Passes remain valid, and refund
              requests will be reviewed in accordance with our Refund Policy.
            </p>

            <h2 className="text-lg font-bold text-slate-900 pt-4">
              6. Pricing & Payment Processing
            </h2>
            <p>
              Registration prices are displayed transparently in Indian Rupees (INR):
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-600 text-sm">
              <li><strong>Individual Entry Pass:</strong> ₹239 per participant.</li>
              <li><strong>Group / Bulk Pass:</strong> ₹200 per participant (minimum 10 attendees).</li>
            </ul>
            <p>
              All prices include Zumba session entry, refreshments, and participant kit.
              Online transactions are securely authorized and processed through our licensed payment
              gateway partner, <strong>Cashfree Payments India Pvt. Ltd.</strong>, supporting UPI
              (Google Pay, PhonePe, Paytm, BHIM, CRED), Credit/Debit Cards, and Net Banking.
            </p>

            <h2 className="text-lg font-bold text-slate-900 pt-4">
              7. Digital Pass Delivery
            </h2>
            <p>
              Admissions are delivered electronically as digital QR entry passes via email and
              instant portal lookup within minutes of payment verification. For full details,
              refer to our{' '}
              <Link to="/shipping" className="text-pip-600 font-semibold underline hover:text-pip-800">
                Shipping & Digital Delivery Policy
              </Link>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};
