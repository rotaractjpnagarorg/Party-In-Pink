import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, MessageCircle, MapPin, ShieldCheck } from 'lucide-react';
import { BrandLogo } from '../common/BrandLogo.js';

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-slate-900 text-slate-300 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Brand & Purpose */}
          <div className="space-y-4 md:col-span-1">
            <BrandLogo tone="dark-surface" />
            <p className="text-sm text-slate-400 leading-relaxed">
              A high-energy Zumba fundraiser supporting breast cancer awareness and treatment.
              Organized by the Rotaract Club of Bangalore JP Nagar (RI District 3191).
            </p>
            <div className="flex items-center space-x-2 text-xs text-pip-300 bg-pip-950/70 p-3 rounded-lg border border-pip-800/80">
              <ShieldCheck className="w-4 h-4 text-pip-400 shrink-0" />
              <span>Event proceeds support Sri Shankara Cancer Foundation and cancer care.</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Quick Links
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link to="/about" className="hover:text-pip-400 transition">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/gallery" className="hover:text-pip-400 transition">
                  📸 Event Photos & Moments
                </Link>
              </li>
              <li>
                <Link to="/register" className="hover:text-pip-400 transition">
                  Single Registration
                </Link>
              </li>
              <li>
                <Link to="/bulk" className="hover:text-pip-400 transition">
                  Group / Bulk Registration
                </Link>
              </li>
              <li>
                <Link to="/donate" className="hover:text-pip-400 transition">
                  Support the Cause / Donate
                </Link>
              </li>
              <li>
                <Link to="/sponsor" className="hover:text-pip-400 transition">
                  Sponsorship Opportunities
                </Link>
              </li>
              <li>
                <Link to="/status" className="hover:text-pip-400 transition">
                  Check Registration Status
                </Link>
              </li>
              <li>
                <Link
                  to="/admin"
                  className="text-slate-500 hover:text-slate-400 transition text-xs"
                >
                  Admin Portal
                </Link>
              </li>
            </ul>
          </div>

          {/* Policies & Compliance */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Legal & Information
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link to="/details" className="hover:text-pip-400 transition">
                  Other Details & Inclusions
                </Link>
              </li>
              <li>
                <Link to="/terms" className="hover:text-pip-400 transition">
                  Terms & Conditions
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="hover:text-pip-400 transition">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/refunds" className="hover:text-pip-400 transition">
                  Refunds & Cancellations
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-pip-400 transition">
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact & Venue */}
          <div className="space-y-3 text-sm">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Get In Touch
            </h3>
            <div className="flex items-start space-x-2.5 text-slate-400">
              <MapPin className="w-4 h-4 text-pip-400 mt-1 shrink-0" />
              <span>SSMRV College, Jayanagar 4th T Block, Bengaluru</span>
            </div>
            <div className="flex items-center space-x-2.5 text-slate-400">
              <Mail className="w-4 h-4 text-pip-400 shrink-0" />
              <a href="mailto:rotaractjpnagar@gmail.com" className="hover:text-white transition">
                rotaractjpnagar@gmail.com
              </a>
            </div>
            <div className="flex items-center space-x-2.5 text-slate-400">
              <MessageCircle className="w-4 h-4 text-pip-400 shrink-0" />
              <a
                href="https://wa.me/918618066508?text=Hi%20I%20want%20to%20participate%20in%20Party%20In%20Pink%202026"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition"
              >
                Rtr. Anarghya Suvin (+91 86180 66508)
              </a>
            </div>
            <div className="pt-2">
              <a
                href="https://kwikpic-in.app.link/e/h5bGNMAx5Yb?uCode=VDACQM"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 text-xs text-slate-300 hover:bg-slate-700 hover:text-white transition border border-slate-700"
              >
                <span>📷 Browse Kwikpic Album</span>
              </a>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>
            © {currentYear} Rotaract Club of Bangalore JP Nagar (RI District 3191). All rights
            reserved.
          </p>
          <p className="flex items-center space-x-1">
            <span>Beneficiary:</span>
            <span className="font-semibold text-slate-400">Sri Shankara Cancer Foundation</span>
          </p>
        </div>
      </div>
    </footer>
  );
};
