import React, { useState } from 'react';
import { Mail, Phone, MapPin, MessageSquare, ArrowLeft, Send, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEvent } from '../context/EventContext.js';

export const ContactPage: React.FC = () => {
  const { event } = useEvent();
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    category: 'registration',
    message: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Front-facing feedback: direct to WhatsApp or email
    const mailtoSubject = encodeURIComponent(
      `[PiP ${event.edition} Helpdesk] Query from ${formData.name} (${formData.category})`
    );
    const mailtoBody = encodeURIComponent(
      `Name: ${formData.name}\nEmail: ${formData.email}\nPhone: ${formData.phone}\nCategory: ${formData.category}\n\nMessage:\n${formData.message}`
    );
    window.location.href = `mailto:rotaractjpnagar@gmail.com?subject=${mailtoSubject}&body=${mailtoBody}`;
    setSubmitted(true);
  };

  return (
    <div className="py-12 bg-slate-50 min-h-screen">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link
          to="/"
          className="inline-flex items-center text-sm font-semibold text-pip-600 hover:text-pip-800 mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          <span>Back to Home</span>
        </Link>

        <div className="grid lg:grid-cols-12 gap-8">
          {/* Left Column: Contact Info */}
          <div className="lg:col-span-5 space-y-6">
            <div>
              <div className="inline-flex items-center space-x-2 text-xs font-bold text-pip-700 bg-pip-50 px-3 py-1 rounded-full mb-3">
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Support & Helpdesk</span>
              </div>
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                We&apos;re Here to Help
              </h1>
              <p className="mt-2 text-slate-600 text-sm leading-relaxed">
                Have questions about registration, sponsorship, donations, payment receipts, or
                event participation? Reach out to our volunteer organizing team.
              </p>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-start space-x-4">
                <div className="p-2.5 rounded-xl bg-pip-50 text-pip-600">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Email Us
                  </div>
                  <a
                    href="mailto:rotaractjpnagar@gmail.com"
                    className="text-sm font-semibold text-slate-900 hover:text-pip-600 transition"
                  >
                    rotaractjpnagar@gmail.com
                  </a>
                  <p className="text-xs text-slate-500 mt-0.5">Response within 6-12 hours</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-start space-x-4">
                <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Sponsorship & Event Contact
                  </div>
                  <a
                    href="https://wa.me/918618066508?text=Hi%20Party%20In%20Pink%205.0"
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-semibold text-slate-900 hover:text-emerald-600 transition"
                  >
                    Rtr. Anarghya Suvin · +91 86180 66508
                  </a>
                  <p className="text-xs text-slate-500 mt-0.5">President, 2026–27</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-start space-x-4">
                <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Event Venue
                  </div>
                  <div className="text-sm font-semibold text-slate-900">{event.venue}</div>
                  <p className="text-xs text-slate-500 mt-0.5">Bengaluru, Karnataka</p>
                </div>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-gradient-to-br from-pip-600 to-pink-700 text-white shadow-md">
              <h3 className="font-bold text-base">Organized with ❤️ by</h3>
              <p className="text-sm text-pink-100 mt-1 font-medium">
                Rotaract Club of Bangalore JP Nagar
              </p>
              <p className="text-xs text-pink-200 mt-0.5">Rotary International District 3191</p>
            </div>
          </div>

          {/* Right Column: Message Form */}
          <div className="lg:col-span-7">
            <div className="bg-white p-6 sm:p-10 rounded-3xl border border-slate-200 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900 mb-2">Send us a Message</h2>
              <p className="text-xs text-slate-500 mb-6">
                Fill in the details below and we will open your mail client with a pre-filled ticket
                request.
              </p>

              {submitted ? (
                <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-center space-y-3">
                  <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
                  <h3 className="font-bold text-lg">Thank You!</h3>
                  <p className="text-sm">
                    Your query has been queued for our team. If your mail client didn&apos;t open
                    automatically, write directly to <strong>rotaractjpnagar@gmail.com</strong>.
                  </p>
                  <button
                    onClick={() => setSubmitted(false)}
                    className="mt-2 text-xs font-bold text-emerald-700 underline"
                  >
                    Send another query
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="name" className="block text-xs font-bold text-slate-700 mb-1">
                        Full Name *
                      </label>
                      <input
                        id="name"
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="John Doe"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-pip-500"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="email"
                        className="block text-xs font-bold text-slate-700 mb-1"
                      >
                        Email Address *
                      </label>
                      <input
                        id="email"
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="john@example.com"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-pip-500"
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="phone"
                        className="block text-xs font-bold text-slate-700 mb-1"
                      >
                        WhatsApp / Phone *
                      </label>
                      <input
                        id="phone"
                        type="tel"
                        required
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="9876543210"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-pip-500"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="category"
                        className="block text-xs font-bold text-slate-700 mb-1"
                      >
                        Query Category
                      </label>
                      <select
                        id="category"
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-pip-500 bg-white"
                      >
                        <option value="registration">Individual Registration</option>
                        <option value="bulk">Bulk / Corporate Registration</option>
                        <option value="payment">Payment & UTR Verification</option>
                        <option value="donation">Donations & 80G Receipt</option>
                        <option value="sponsorship">Sponsorships & Stalls</option>
                        <option value="other">Other Inquiry</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="message"
                      className="block text-xs font-bold text-slate-700 mb-1"
                    >
                      Your Message *
                    </label>
                    <textarea
                      id="message"
                      rows={4}
                      required
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      placeholder="How can we assist you today? Mention your Order ID if this is regarding an existing registration."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-pip-500"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full flex items-center justify-center space-x-2 py-3 px-6 rounded-xl bg-pip-600 text-white font-bold text-sm shadow hover:bg-pip-700 transition"
                  >
                    <Send className="w-4 h-4" />
                    <span>Send Message</span>
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
