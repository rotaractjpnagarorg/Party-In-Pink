import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, Gift, ArrowRight, Shield } from 'lucide-react';
import { useEvent } from '../../context/EventContext.js';
import { formatINR } from '@pip/shared';

export const DonationBanner: React.FC = () => {
  const { event } = useEvent();

  return (
    <section className="py-14 bg-gradient-to-r from-pip-900 via-rose-900 to-pink-950 text-white relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-pip-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-4">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-pip-800/80 text-pip-200 text-xs font-semibold border border-pip-700">
              <Gift className="w-3.5 h-3.5" />
              <span>Can't make it in person? Support virtually!</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Support Breast Cancer Patients Today
            </h2>
            <p className="text-slate-300 text-base leading-relaxed">
              Contributions support breast cancer care and surgeries through Sri Shankara Cancer
              Foundation, the beneficiary organization for Party In Pink 5.0.
            </p>
            <div className="flex items-center space-x-2 text-xs text-pip-200 font-medium">
              <Shield className="w-4 h-4 text-pip-300" />
              <span>
                Contributions are reconciled by the organizing team and directed to the event's
                beneficiary cause.
              </span>
            </div>
          </div>

          <div className="lg:col-span-5 bg-white/10 backdrop-blur-md p-6 sm:p-7 rounded-3xl border border-white/20 space-y-5">
            <p className="text-sm font-bold text-white uppercase tracking-wider">
              Quick Contribution
            </p>
            <div className="grid grid-cols-3 gap-2.5">
              {event.donationConfig.presetsPaise.slice(0, 3).map((amt, idx) => (
                <Link
                  key={idx}
                  to={`/donate?preset=${amt}`}
                  className="py-2.5 px-2 text-center rounded-xl bg-white/15 hover:bg-white/25 border border-white/20 text-white font-mono font-bold text-sm transition-colors"
                >
                  {formatINR(amt)}
                </Link>
              ))}
            </div>

            <Link
              to="/donate"
              className="w-full inline-flex items-center justify-center py-3.5 px-6 rounded-xl font-bold bg-white text-pip-900 hover:bg-pip-50 shadow-lg transition-all text-sm group"
            >
              <Heart className="w-4 h-4 mr-2 text-pip-600 fill-pip-600 group-hover:scale-110 transition-transform" />
              <span>Donate Any Amount</span>
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
            <Link
              to="/sponsor"
              className="w-full inline-flex items-center justify-center py-3 px-6 rounded-xl font-bold bg-transparent text-white hover:bg-white/10 border border-white/30 transition-all text-sm"
            >
              View Sponsorship Opportunities
            </Link>
            <p className="text-[11px] text-center text-slate-300">
              *Donations are charitable contributions and do not issue event entry passes.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
