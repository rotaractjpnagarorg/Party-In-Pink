import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Menu,
  X,
  Users,
  UserPlus,
  Search,
  Calendar,
  Camera,
  Info,
  Heart,
  Home,
  Shield,
} from 'lucide-react';
import { useEvent } from '../../context/EventContext.js';
import { useAdminAuth } from '../../context/AdminAuthContext.js';
import { BrandLogo } from '../common/BrandLogo.js';

export const Header: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { event, isRegistrationOpen } = useEvent();
  const { isAuthenticated, profile } = useAdminAuth();

  const mobileNavLinks = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'About Us', path: '/about', icon: Info },
    { name: 'Event Photos', path: '/gallery', icon: Camera },
    { name: 'Register', path: '/register', icon: UserPlus, highlight: isRegistrationOpen },
    { name: 'Group Passes', path: '/bulk', icon: Users },
    { name: 'Donate & Sponsor', path: '/donate', icon: Heart },
    { name: 'Check Status', path: '/status', icon: Search },
  ];

  const desktopNavLinks = [
    { name: 'About', path: '/about' },
    { name: 'Photos', path: '/gallery' },
    { name: 'Group Passes', path: '/bulk' },
    { name: 'Donate & Sponsor', path: '/donate' },
    { name: 'Check Status', path: '/status' },
  ];

  const closeMobile = () => setMobileMenuOpen(false);

  return (
    <header className="relative z-50 border-b border-slate-200/80 bg-white shadow-sm w-full max-w-full overflow-x-hidden transition-[background-color,border-color,box-shadow] duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between sm:h-20">
          {/* Brand Logo & Title */}
          <Link to="/" className="flex items-center space-x-3 group" onClick={closeMobile}>
            <div className="flex flex-col">
              <BrandLogo tone="light-surface" />
              <p className="hidden text-[11px] font-medium tracking-wide text-slate-500 sm:block mt-0.5">
                Rotaract Club of Bangalore JP Nagar
              </p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-1.5">
            {desktopNavLinks.map((link) => {
              const isActive =
                location.pathname === link.path ||
                (link.path === '/donate' && location.pathname === '/sponsor');
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                    isActive
                      ? 'text-pip-600 font-bold bg-pip-50'
                      : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100/70'
                  }`}
                >
                  <span>{link.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* CTA Action & Mobile Toggle */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {isRegistrationOpen ? (
              <Link
                to="/register"
                className="hidden sm:inline-flex items-center justify-center px-4 py-2 text-sm font-semibold rounded-lg text-white bg-gradient-to-r from-pip-600 to-pink-500 hover:from-pip-700 hover:to-pink-600 shadow-sm shadow-pip-600/30 hover:shadow-md transition-all active:scale-[0.98]"
              >
                Register Now
              </Link>
            ) : (
              <span className="hidden sm:inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                <Calendar className="w-3.5 h-3.5 text-amber-600" />
                <span>Registrations Soon</span>
              </span>
            )}

            <Link
              to="/admin"
              className={`hidden sm:inline-flex items-center justify-center p-2 rounded-xl transition-all ${
                isAuthenticated
                  ? 'text-pip-600 bg-pip-50 hover:bg-pip-100 ring-1 ring-pip-200'
                  : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
              }`}
              title={
                isAuthenticated
                  ? `Admin Console (${profile?.displayName || 'Active'})`
                  : 'Admin Portal'
              }
              aria-label="Admin Portal"
            >
              <Shield className="w-4 h-4" />
            </Link>

            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg md:hidden text-slate-700 hover:text-slate-900 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-pip-500 transition-colors"
              aria-expanded={mobileMenuOpen}
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-200 bg-white/95 backdrop-blur-md px-4 pt-2 pb-6 space-y-2 animate-in fade-in slide-in-from-top-3 duration-150">
          {mobileNavLinks.map((link) => {
            const isActive =
              location.pathname === link.path ||
              (link.path === '/donate' && location.pathname === '/sponsor');
            return (
              <Link
                key={link.path}
                to={link.path}
                onClick={closeMobile}
                className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-base font-medium transition-colors ${
                  isActive
                    ? 'bg-pip-50 text-pip-700 font-bold border border-pip-200/60'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                {link.icon && (
                  <link.icon
                    className={`w-5 h-5 ${isActive ? 'text-pip-600' : 'text-slate-400'}`}
                  />
                )}
                <span>{link.name}</span>
              </Link>
            );
          })}
          <div className="pt-4 border-t border-slate-100 space-y-2">
            <Link
              to="/register"
              onClick={closeMobile}
              className="w-full flex items-center justify-center space-x-2 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-pip-600 to-pink-500 hover:from-pip-700 hover:to-pink-600 shadow-sm text-sm"
            >
              <span>Register Individual — {event.pricesPaise?.singlePass ? `₹${event.pricesPaise.singlePass / 100}` : '₹239'}</span>
            </Link>
            <div className="grid grid-cols-2 gap-2">
              <Link
                to="/bulk"
                onClick={closeMobile}
                className="flex items-center justify-center space-x-1.5 py-2.5 rounded-xl font-semibold text-pip-700 bg-pip-50 hover:bg-pip-100 border border-pip-200 text-xs text-center"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Group Passes</span>
              </Link>
              <Link
                to="/donate"
                onClick={closeMobile}
                className="flex items-center justify-center space-x-1.5 py-2.5 rounded-xl font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-xs text-center"
              >
                <Heart className="w-3.5 h-3.5" />
                <span>Donate</span>
              </Link>
            </div>

            {/* Mobile Admin Entry Point for PWA & Handhelds */}
            <div className="pt-2">
              <Link
                to="/admin"
                onClick={closeMobile}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition-all shadow-sm active:scale-[0.99] border border-slate-800"
              >
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-lg bg-pip-500/20 border border-pip-400/30 flex items-center justify-center shrink-0">
                    <Shield className="w-4 h-4 text-pip-400" />
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-bold text-white tracking-wide">
                      {isAuthenticated ? 'Admin Console' : 'Admin Login / Portal'}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {isAuthenticated
                        ? (profile?.displayName || 'Active Committee')
                        : 'Rotaract Operations & Scanning'}
                    </span>
                  </div>
                </div>
                <span className="text-[11px] font-semibold px-2.5 py-1 rounded-md bg-slate-800 text-pip-300 border border-slate-700">
                  {isAuthenticated ? 'Open →' : 'Sign In'}
                </span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
