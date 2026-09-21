import React from 'react';
import { HelpCircle, ArrowLeft, Home, UserCheck, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEvent } from '../context/EventContext.js';

export const NotFoundPage: React.FC = () => {
  const { event } = useEvent();

  return (
    <div className="py-20 bg-slate-50 min-h-screen flex items-center justify-center">
      <div className="max-w-md w-full mx-auto px-4 text-center">
        <div className="inline-flex p-4 rounded-3xl bg-pip-50 text-pip-600 mb-6 shadow-sm">
          <HelpCircle className="w-12 h-12" />
        </div>

        <h1 className="text-6xl font-black text-slate-900 tracking-tight">404</h1>
        <h2 className="mt-2 text-2xl font-bold text-slate-800">Page Not Found</h2>
        <p className="mt-3 text-slate-600 text-sm leading-relaxed">
          The page you are looking for doesn&apos;t exist or has moved. Let&apos;s get you back on
          track for Party In Pink {event.edition}!
        </p>

        <div className="mt-8 space-y-3">
          <Link
            to="/"
            className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-pip-600 text-white font-bold text-sm shadow hover:bg-pip-700 transition"
          >
            <Home className="w-4 h-4" />
            <span>Return to Home</span>
          </Link>

          <Link
            to="/register"
            className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition"
          >
            <UserCheck className="w-4 h-4 text-pip-600" />
            <span>Register for Event</span>
          </Link>

          <Link
            to="/status"
            className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition"
          >
            <Search className="w-4 h-4 text-slate-400" />
            <span>Check Registration Status</span>
          </Link>
        </div>

        <div className="mt-8">
          <Link
            to="/"
            className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-pip-600 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            <span>Back to previous page</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
