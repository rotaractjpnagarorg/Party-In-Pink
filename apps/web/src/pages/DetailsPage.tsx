import React from 'react';
import { CheckCircle2, Award, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export const DetailsPage: React.FC = () => {
  return (
    <div className="py-12 sm:py-16 bg-slate-50 min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-pip-100 text-pip-800 text-xs font-bold mb-3">
            <Award className="w-3.5 h-3.5 text-pip-600" />
            <span>Event Inclusions & Services</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
            Other Details
          </h1>
          <p className="mt-3 text-base sm:text-lg text-slate-600">
            Everything you need to know about passes, inclusions, and our charitable commitments.
          </p>
        </div>

        {/* Section 1: Registration Types */}
        <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200/80 shadow-sm mb-10 space-y-6">
          <h2 className="text-2xl font-bold text-slate-900">Registration Types</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <h3 className="font-bold text-slate-900 text-base text-pip-600">
                Single Registration
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Individual entry to the Party In Pink Zumba event. Includes certified instruction,
                refreshments, and digital certificate.
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <h3 className="font-bold text-slate-900 text-base text-pip-600">
                Group / Bulk Registration
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Special discounted registration for corporate teams, college contingents,
                Rotaract/Rotary clubs, and NGO groups (min 10 passes).
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <h3 className="font-bold text-slate-900 text-base text-pip-600">
                Donation Participation
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Direct financial contributions supporting breast cancer care and surgeries through
                Sri Shankara Cancer Foundation.
              </p>
            </div>
          </div>
        </div>

        {/* Section 2: What's Included */}
        <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200/80 shadow-sm mb-10 space-y-6">
          <h2 className="text-2xl font-bold text-slate-900">What's Included in Your Pass</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              'Entry pass to the high-energy Party In Pink Zumba session',
              'Routines led by professional certified Zumba instructors',
              'Event memorabilia and digital participant certificate',
              'Hygienic light morning refreshments and hydration',
              'Interaction with cancer survivors, fighters, and health experts',
              'Networking opportunities with fellow changemakers and youth leaders',
            ].map((item, idx) => (
              <div
                key={idx}
                className="flex items-start space-x-3 p-3.5 rounded-xl bg-pink-50/40 border border-pink-100"
              >
                <CheckCircle2 className="w-5 h-5 text-pip-600 shrink-0 mt-0.5" />
                <span className="text-sm font-medium text-slate-700">{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Section 3: Important Principles */}
        <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200/80 shadow-sm mb-12 space-y-6">
          <h2 className="text-2xl font-bold text-slate-900">Important Information</h2>

          <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
            <div>
              <h3 className="font-bold text-slate-900 text-base mb-1">Who We Are</h3>
              <p>
                Rotaract Club of Bangalore JP Nagar is a service-oriented organization dedicated to
                community development, social responsibility, and humanitarian causes. Party In Pink
                is our flagship initiative for breast cancer awareness and fundraising.
              </p>
            </div>

            <div>
              <h3 className="font-bold text-slate-900 text-base mb-1">Fund Utilization</h3>
              <p>
                Funds raised through Party In Pink support breast cancer care and surgeries through
                Sri Shankara Cancer Foundation.
              </p>
            </div>

            <div>
              <h3 className="font-bold text-slate-900 text-base mb-1">Event Safety Protocols</h3>
              <p>
                Party In Pink is conducted in strict adherence to all local health, hygiene, and
                crowd safety guidelines. First-aid facilities and volunteers are on standby
                throughout the event.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Actions */}
        <div className="text-center pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to="/register"
            className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 rounded-xl font-bold text-white bg-pip-600 hover:bg-pip-700 shadow-md shadow-pip-600/20 transition-all text-sm"
          >
            <span>Register Now</span>
            <ArrowRight className="w-4 h-4 ml-1.5" />
          </Link>
          <Link
            to="/gallery"
            className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 rounded-xl font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-all text-sm"
          >
            View Event Photos
          </Link>
        </div>
      </div>
    </div>
  );
};
