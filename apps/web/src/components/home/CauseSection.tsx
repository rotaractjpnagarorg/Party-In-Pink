import React from 'react';
import { Activity, HeartHandshake, ShieldCheck } from 'lucide-react';

export const CauseSection: React.FC = () => {
  const stats = [
    { value: '250+', label: 'People attended Party In Pink 4.0' },
    { value: '₹2L', label: 'Donated through Party In Pink 4.0' },
    { value: '250+', label: 'Volunteer hours contributed' },
    { value: '15+', label: 'Sponsors and collaborators' },
  ];

  return (
    <section className="py-16 bg-slate-50 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-xs font-bold uppercase tracking-widest text-pip-600 mb-2">
            Why It Matters 💖
          </h2>
          <p className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Dance for a Cause. Make an Impact.
          </p>
          <p className="mt-3 text-base sm:text-lg text-slate-600">
            Party In Pink promotes early detection and prevention while raising funds to support
            breast cancer surgeries through Sri Shankara Cancer Foundation.
          </p>
        </div>

        {/* 4 Stat Highlights */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 mb-12">
          {stats.map((item, idx) => (
            <div
              key={idx}
              className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-center"
            >
              <div className="text-3xl sm:text-4xl font-extrabold text-pip-600 mb-1 font-mono">
                {item.value}
              </div>
              <div className="text-xs sm:text-sm font-medium text-slate-600">{item.label}</div>
            </div>
          ))}
        </div>

        <figure className="mb-12 overflow-hidden rounded-3xl bg-slate-950 shadow-xl lg:grid lg:grid-cols-[1.45fr_0.55fr]">
          <img
            src="/assets/images/pip4/contribution-team.jpg"
            alt="Party In Pink 4.0 volunteers and supporters gathered with the contribution cheque for Sri Shankara Cancer Foundation"
            className="h-72 w-full object-cover object-center sm:h-96 lg:h-full"
            loading="lazy"
          />
          <figcaption className="flex flex-col justify-center p-7 text-white sm:p-10">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-pink-300">
              Impact in action
            </span>
            <h3 className="mt-3 text-2xl font-extrabold sm:text-3xl">
              A community that follows through
            </h3>
            <p className="mt-4 text-sm leading-relaxed text-slate-300 sm:text-base">
              Party In Pink 4.0 brought volunteers, dancers, partners, and supporters together for
              breast cancer awareness and meaningful support for Sri Shankara Cancer Foundation.
            </p>
          </figcaption>
        </figure>

        {/* 3 Authentic Mission Pillars from pip.rotaractjpnagar.org */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-pink-100 text-pip-700 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Early Detection Saves Lives</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Awareness of early detection and prevention helps people act sooner, seek appropriate
              care, and support others through their breast cancer journey.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-pink-100 text-pip-700 flex items-center justify-center font-bold">
              <HeartHandshake className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Support Through Treatment</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Sri Shankara Cancer Foundation provides diagnostics, oncology treatment,
              post-treatment care, outreach, and screening. Contributions help support its work.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-pink-100 text-pip-700 flex items-center justify-center font-bold">
              <Activity className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Community Moves Together</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Party In Pink is more than an event—it's a movement. We dance, celebrate, and fund.
              Together, we're making breast cancer care accessible to everyone.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
