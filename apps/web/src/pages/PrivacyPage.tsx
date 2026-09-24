import React from 'react';
import { Lock, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export const PrivacyPage: React.FC = () => {
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
              <Lock className="w-3.5 h-3.5" />
              <span>Data Protection</span>
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Privacy Policy
            </h1>
            <p className="text-sm text-slate-500 mt-2">
              Rotaract Club of Bangalore JP Nagar • Effective September 2026
            </p>
          </div>

          <section className="space-y-4 text-slate-700 text-sm sm:text-base leading-relaxed">
            <h2 className="text-lg font-bold text-slate-900">1. Principle of Data Minimization</h2>
            <p>
              We firmly respect your privacy. In strict accordance with our engineering and privacy
              charter, we only collect the minimum personal data required to issue your event
              ticket, deliver lifecycle notifications, and maintain verifiable accounting for breast
              cancer screening drives:
            </p>
            <ul className="list-disc pl-6 space-y-1.5 text-slate-600">
              <li>
                <strong>Contact Information:</strong> Full Name, Email Address, Mobile Number, and
                optional WhatsApp Number.
              </li>
              <li>
                <strong>Affiliation:</strong> Optional Club, Corporate, or NGO affiliation to assist
                in group allocation.
              </li>
              <li>
                <strong>Payment Evidence:</strong> Payment transaction reference (UTR) and
                screenshot to confirm your UPI/bank transfer.
              </li>
            </ul>
            <p className="bg-slate-50 p-4 rounded-xl text-xs sm:text-sm text-slate-600 border border-slate-200">
              🔒 <strong>We do NOT collect:</strong> Government ID numbers, date of birth, personal
              health history, postal addresses, or credit/debit card numbers.
            </p>

            <h2 className="text-lg font-bold text-slate-900 pt-4">
              2. Payment Receipt Storage & Security
            </h2>
            <p>
              Uploaded payment screenshots are stored in private, deny-by-default cloud storage
              buckets. Receipts are accessible solely to authorised, allowlisted financial approvers
              for the express purpose of cross-verifying incoming bank credits. Payment receipts are
              automatically scheduled for permanent deletion 90 days after the event concludes.
            </p>

            <h2 className="text-lg font-bold text-slate-900 pt-4">3. Third-Party Integrations</h2>
            <p>We integrate only with trusted, secure infrastructure providers:</p>
            <ul className="list-disc pl-6 space-y-1.5 text-slate-600">
              <li>
                <strong>Google Cloud & Firebase:</strong> Provides encrypted database storage and
                serverless logic.
              </li>
              <li>
                <strong>Cashfree Payments India Pvt. Ltd.:</strong> Our authorized payment gateway
                partner. Sensitive payment credentials (card numbers, CVVs, net banking logins, or UPI PINs)
                are encrypted and processed directly on Cashfree's PCI-DSS Level 1 compliant servers and
                are never handled, stored, or accessible on our systems.
              </li>
              <li>
                <strong>KonfHub:</strong> Used strictly for automated ticket generation and barcode
                dispatch.
              </li>
              <li>
                <strong>Brevo:</strong> Used exclusively for sending transactional emails (order
                confirmations, tickets, and reminders).
              </li>

            </ul>
            <p>
              Your contact details are never sold, rented, or shared with commercial advertisers or
              marketing agencies.
            </p>

            <h2 className="text-lg font-bold text-slate-900 pt-4">4. Your Rights</h2>
            <p>
              You have the right to inspect your order details through our secure status lookup tool
              or request correction of any misspelled names or email addresses by contacting our
              support team.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};
