import React from 'react';
import { Link } from 'react-router-dom';
import { Check, User, Users, ArrowRight, Sparkles } from 'lucide-react';
import { useEvent } from '../../context/EventContext.js';
import { formatINR } from '@pip/shared';

export const RegistrationOptionsSection: React.FC = () => {
  const { event, isRegistrationOpen } = useEvent();

  const individualPerks = [
    'Official Party In Pink 5.0 Entry Pass',
    'High-Energy Zumba Masterclass with Certified Trainers',
    'Inspiring Survivor Stories & Community Dialogue',
    'Wholesome Morning Breakfast & Hydration',
    'Digital Participation Certificate',
    'Proceeds support Sri Shankara Cancer Foundation',
  ];

  const bulkPerks = [
    'Discounted group rates starting at ₹219 per attendee',
    'Convenient offline XLSX spreadsheet upload',
    'Club / Corporate banner recognition on social media',
    'Reserved group assembly desk on event morning',
    'All individual benefits (Zumba, Breakfast, Certificate)',
    'Single consolidated group payment via UPI/Bank',
  ];

  return (
    <section className="py-16 bg-white" id="pricing">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-xs font-bold uppercase tracking-widest text-pip-600 mb-2">
            Registration Options
          </h2>
          <p className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Choose Your Registration Type
          </p>
          <p className="mt-3 text-base text-slate-600">
            Open to everyone! Join as an individual or bring your club, college, or company team.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Individual Card */}
          <div className="rounded-3xl border-2 border-slate-200 p-8 flex flex-col justify-between hover:border-pip-300 hover:shadow-xl transition-all bg-white relative">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-pip-100 text-pip-600 flex items-center justify-center">
                  <User className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-700 px-3 py-1 rounded-full">
                  Individual Pass
                </span>
              </div>
              <h3 className="text-2xl font-extrabold text-slate-900">Individual Participant</h3>
              <p className="text-sm text-slate-500 mt-1">
                For single attendees, Rotaractors, or members of the public.
              </p>

              <div className="my-6">
                <span className="text-4xl font-extrabold text-slate-900 font-mono">
                  {formatINR(event.pricesPaise.singlePass)}
                </span>
                <span className="text-slate-500 text-sm ml-2 font-medium">/ person</span>
              </div>

              <ul className="space-y-3 mb-8">
                {individualPerks.map((perk, idx) => (
                  <li key={idx} className="flex items-start space-x-2.5 text-sm text-slate-600">
                    <Check className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                    <span>{perk}</span>
                  </li>
                ))}
              </ul>
            </div>

            <Link
              to="/register"
              className={`w-full text-center py-3.5 rounded-xl font-bold transition-all text-sm flex items-center justify-center space-x-2 ${
                isRegistrationOpen
                  ? 'bg-pip-600 hover:bg-pip-700 text-white shadow-md shadow-pip-600/20'
                  : 'bg-slate-200 text-slate-500 cursor-not-allowed pointer-events-none'
              }`}
            >
              <span>{isRegistrationOpen ? 'Register Yourself' : 'Registrations Closed'}</span>
              {isRegistrationOpen && <ArrowRight className="w-4 h-4" />}
            </Link>
          </div>

          {/* Group / Bulk Card */}
          <div className="rounded-3xl border-2 border-pip-400 p-8 flex flex-col justify-between shadow-lg shadow-pip-500/10 hover:shadow-2xl transition-all bg-gradient-to-b from-white to-pink-50/40 relative">
            <div className="absolute -top-3.5 right-8 px-3.5 py-0.5 rounded-full bg-pip-600 text-white text-xs font-bold uppercase tracking-wide flex items-center space-x-1 shadow-sm">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Most Popular for Clubs</span>
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-pip-600 text-white flex items-center justify-center shadow-md shadow-pip-600/20">
                  <Users className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider bg-pip-100 text-pip-800 px-3 py-1 rounded-full border border-pip-200">
                  Bulk Savings (Min 10 passes)
                </span>
              </div>
              <h3 className="text-2xl font-extrabold text-slate-900">Group / Club / Corporate</h3>
              <p className="text-sm text-slate-500 mt-1">
                For Rotaract/Rotary clubs, colleges, NGOs, and corporate teams.
              </p>

              <div className="my-6">
                <span className="text-4xl font-extrabold text-pip-600 font-mono">
                  {formatINR(event.pricesPaise.bulkPass)}
                </span>
                <span className="text-slate-500 text-sm ml-2 font-medium">
                  / attendee onwards
                </span>
              </div>

              <ul className="space-y-3 mb-8">
                {bulkPerks.map((perk, idx) => (
                  <li
                    key={idx}
                    className="flex items-start space-x-2.5 text-sm text-slate-700 font-medium"
                  >
                    <Check className="w-4 h-4 text-pip-600 mt-0.5 shrink-0" />
                    <span>{perk}</span>
                  </li>
                ))}
              </ul>
            </div>

            <Link
              to="/bulk"
              className={`w-full text-center py-3.5 rounded-xl font-bold transition-all text-sm flex items-center justify-center space-x-2 ${
                isRegistrationOpen
                  ? 'bg-slate-900 hover:bg-black text-white shadow-md'
                  : 'bg-slate-200 text-slate-500 cursor-not-allowed pointer-events-none'
              }`}
            >
              <span>{isRegistrationOpen ? 'Register Your Group' : 'Registrations Closed'}</span>
              {isRegistrationOpen && <ArrowRight className="w-4 h-4" />}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};
