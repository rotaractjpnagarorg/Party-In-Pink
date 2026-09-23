import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  ShieldCheck,
  Building,
  AlertCircle,
  ArrowRight,
  Loader2,
  Gift,
  Sparkles,
  Check,
  BadgeIndianRupee,
  Handshake,
  Phone,
  Mail,
  Users,
} from 'lucide-react';
import { useEvent } from '../context/EventContext.js';
import { formatINR, getDonationComplimentaryPasses } from '@pip/shared';
import { functions } from '../services/firebase.js';
import { httpsCallable } from 'firebase/functions';

const SPONSORSHIP_PACKAGES = [
  {
    name: 'Platinum',
    amount: '₹20,000',
    amountNum: 20000,
    passes: 7,
    accent: 'border-pip-500 bg-pip-50/70',
    badgeClass: 'bg-pip-600 text-white',
    benefits: [
      'Major Donor recognition & official certificate',
      '7 Complimentary Event Passes (with QR check-in)',
      '5 minutes of stage time',
      'Logo on event backdrop, social media, and certificates',
      'Placement of standees and banners at venue',
      'Recognition and MC shout-out during the event',
      'Distribution of sponsor deliverables or pamphlets',
    ],
  },
  {
    name: 'Gold',
    amount: '₹15,000',
    amountNum: 15000,
    passes: 5,
    accent: 'border-amber-300 bg-amber-50/70',
    badgeClass: 'bg-amber-600 text-white',
    benefits: [
      'Major Donor recognition & official certificate',
      '5 Complimentary Event Passes (with QR check-in)',
      '3 minutes of stage time',
      'Logo on event backdrop, social media, and certificates',
      'Placement of standees and banners at venue',
      'Recognition and MC shout-out during the event',
      'Distribution of sponsor deliverables or pamphlets',
    ],
  },
  {
    name: 'Silver',
    amount: '₹10,000',
    amountNum: 10000,
    passes: 2,
    accent: 'border-slate-300 bg-slate-50/90',
    badgeClass: 'bg-slate-700 text-white',
    benefits: [
      'Major Donor recognition & official certificate',
      '2 Complimentary Event Passes (with QR check-in)',
      'Logo on event backdrop, social media, and certificates',
      'Placement of standees and banners at venue',
      'Recognition and MC shout-out during the event',
      'Distribution of sponsor deliverables or pamphlets',
    ],
  },
];

const PRESET_AMOUNTS = [
  {
    amount: 20000,
    tier: 'Platinum',
    label: '7 Complimentary Passes • 5 Min Stage Time • MC Shoutout',
    passes: 7,
  },
  {
    amount: 15000,
    tier: 'Gold',
    label: '5 Complimentary Passes • 3 Min Stage Time • MC Shoutout',
    passes: 5,
  },
  {
    amount: 10000,
    tier: 'Silver',
    label: '2 Complimentary Passes • Banner & Logo • MC Shoutout',
    passes: 2,
  },
  {
    amount: 5000,
    tier: 'Wellwisher',
    label: '1 Complimentary Pass • Wellwisher Certificate & Recognition',
    passes: 1,
  },
  {
    amount: 2500,
    tier: 'Aid Partner',
    label: 'Patient Treatment & Hospital Aid',
    passes: 0,
  },
  {
    amount: 1000,
    tier: 'Care Donor',
    label: 'Cancer Screening & Mammogram Support',
    passes: 0,
  },
];

const ORGANIZERS = [
  { name: 'Rtr. Manish S Chikmath', role: 'Project Chair', tag: 'Project Leadership' },
  { name: 'Rtr. Karthik M S', role: 'Project Co-Chair', tag: 'Project Leadership' },
  { name: 'Rtr. Drishti Mishra', role: 'Project Co-Chair', tag: 'Project Leadership' },
  { name: 'Rtr. Anarghya Suvin', role: 'President 2026–27', tag: 'Club Leadership' },
  { name: 'Rtr. Adithya N', role: 'Secretary 2026–27', tag: 'Club Leadership' },
  { name: 'Rtr. Vignesh V', role: 'Director, Community Service 2026–27', tag: 'Club Leadership' },
  { name: 'Rtr. Sumukha', role: 'Director, Community Service 2026–27', tag: 'Club Leadership' },
];

export const DonatePage: React.FC = () => {
  const { event } = useEvent();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [selectedAmount, setSelectedAmount] = useState<number>(10000);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [isCustom, setIsCustom] = useState<boolean>(false);

  // Form state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [whatsappSame, setWhatsappSame] = useState(true);
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [pan, setPan] = useState('');
  const [organisationName, setOrganisationName] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);

  // Submission state
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Handle URL query parameters (e.g. ?preset=2000000 or ?amount=20000)
  useEffect(() => {
    const presetParam = searchParams.get('preset');
    const amountParam = searchParams.get('amount');
    const target = presetParam || amountParam;
    if (target) {
      const val = parseInt(target, 10);
      if (!isNaN(val) && val > 0) {
        const amt = val >= 100000 ? Math.round(val / 100) : val;
        setSelectedAmount(amt);
        setIsCustom(false);
        setCustomAmount('');
      }
    }
  }, [searchParams]);

  const effectiveAmountPaise = isCustom
    ? Math.round(parseFloat(customAmount || '0') * 100)
    : selectedAmount * 100;

  const complimentaryPasses = getDonationComplimentaryPasses(effectiveAmountPaise);

  const handleSelectPreset = (amt: number) => {
    setSelectedAmount(amt);
    setIsCustom(false);
    setCustomAmount('');
  };

  const handleSelectPackageAndScroll = (amt: number) => {
    setSelectedAmount(amt);
    setIsCustom(false);
    setCustomAmount('');
    const formElement = document.getElementById('contribution-form');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleCustomChange = (val: string) => {
    setCustomAmount(val);
    setIsCustom(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (effectiveAmountPaise < 10000) {
      setErrorMessage('Minimum contribution amount is ₹100.');
      return;
    }

    if (!fullName.trim() || !email.trim() || !mobileNumber.trim()) {
      setErrorMessage('Please provide your full name, email, and mobile number.');
      return;
    }

    setLoading(true);

    try {
      interface CreateDonationResponse {
        success: boolean;
        donationId: string;
        publicReference: string;
        statusToken: string;
        amountPaise: number;
      }
      const createDonationCallable = httpsCallable<Record<string, unknown>, CreateDonationResponse>(
        functions,
        'createDonation'
      );

      const payload: Record<string, unknown> = {
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        mobileNumber: mobileNumber.trim(),
        whatsappSameAsMobile: whatsappSame,
        amountPaise: effectiveAmountPaise,
        isAnonymousPublicly: isAnonymous,
      };

      if (!whatsappSame && whatsappNumber.trim()) {
        payload.whatsappNumber = whatsappNumber.trim();
      }
      if (pan.trim()) {
        payload.pan = pan.trim().toUpperCase();
      }
      if (organisationName.trim()) {
        payload.organisationName = organisationName.trim();
      }

      const response = await createDonationCallable(payload);

      const data = response.data;
      if (data?.statusToken) {
        navigate(`/pay?token=${data.statusToken}`);
      } else {
        throw new Error('Invalid response from donation service');
      }
    } catch (err: unknown) {
      console.error('Donation error:', err);
      const msg =
        err instanceof Error ? err.message : 'Failed to initialize donation. Please try again.';
      setErrorMessage(msg);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="py-12 bg-slate-50 min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center space-x-2 text-xs font-bold text-pip-700 bg-pip-50 px-3.5 py-1.5 rounded-full mb-3 border border-pip-200 shadow-xs">
            <Handshake className="w-3.5 h-3.5 text-pip-600" />
            <span>Sponsorship & Donations • Party In Pink {event.edition}</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
            Sponsorship & Donations
          </h1>
          <p className="text-base text-slate-600 mt-3 leading-relaxed">
            Partner with us to champion breast cancer awareness, early screening, and life-saving surgeries
            at <strong>Sri Shankara Cancer Foundation</strong>, the beneficiary organization for Party In Pink 5.0.
          </p>

          {/* Quick jump pills */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 mt-6 text-xs font-bold">
            <a
              href="#packages"
              className="px-3.5 py-1.5 rounded-full bg-white border border-slate-200 text-slate-700 hover:border-pip-300 hover:text-pip-700 transition shadow-xs"
            >
              👑 Sponsorship Packages
            </a>
            <a
              href="#contribution-form"
              className="px-3.5 py-1.5 rounded-full bg-pip-600 text-white hover:bg-pip-700 transition shadow-xs"
            >
              💳 Donate Online via PiP Pay
            </a>
            <a
              href="#inkind"
              className="px-3.5 py-1.5 rounded-full bg-white border border-slate-200 text-slate-700 hover:border-pip-300 hover:text-pip-700 transition shadow-xs"
            >
              🎁 In-Kind Support
            </a>
            <a
              href="#contact"
              className="px-3.5 py-1.5 rounded-full bg-white border border-slate-200 text-slate-700 hover:border-pip-300 hover:text-pip-700 transition shadow-xs"
            >
              📞 Partnership Contact
            </a>
          </div>
        </div>

        {/* Global Error Banner */}
        {errorMessage && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start space-x-3 text-rose-800 text-sm">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Notice</p>
              <p className="mt-0.5 text-rose-700">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* 80G Statutory Notice */}
        <div className="p-5 rounded-2xl bg-amber-50 border-2 border-amber-300 flex items-start gap-3 text-amber-950">
          <AlertCircle className="w-6 h-6 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <p className="font-extrabold">Need an 80G certificate? Do not pay these accounts.</p>
            <p className="mt-1 text-sm leading-relaxed">
              Donations sent to the UPI IDs or bank account shown in this flow are not eligible for
              an 80G certificate. Please{' '}
              <Link to="/contact" className="font-bold underline hover:text-amber-800">
                contact the organizing team before donating
              </Link>{' '}
              so they can guide you through the appropriate eligible receipt process.
            </p>
          </div>
        </div>

        {/* SECTION 1: SPONSORSHIP PACKAGES (Deck Tiers) */}
        <section id="packages" className="space-y-6 pt-2">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Official Sponsorship Packages
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Select a package to view deliverables. Every sponsorship includes complimentary event passes
              and promotional visibility.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {SPONSORSHIP_PACKAGES.map((pkg) => (
              <article
                key={pkg.name}
                className={`rounded-3xl border-2 p-6 sm:p-7 shadow-sm flex flex-col justify-between transition-all hover:shadow-md ${pkg.accent}`}
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        {pkg.name}
                      </p>
                      <p className="text-3xl font-extrabold text-slate-900 mt-0.5">{pkg.amount}</p>
                    </div>
                    <BadgeIndianRupee className="h-7 w-7 text-pip-600 shrink-0" />
                  </div>

                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-pink-100 text-pink-800 border border-pink-200">
                    <Gift className="w-3.5 h-3.5 text-pip-600" />
                    <span>{pkg.passes} Complimentary Passes</span>
                  </div>

                  <ul className="space-y-2.5 text-xs text-slate-700 pt-2 border-t border-slate-200/60">
                    {pkg.benefits.map((benefit) => (
                      <li key={benefit} className="flex items-start gap-2">
                        <Check className="h-4 w-4 shrink-0 text-pip-600 mt-0.5" />
                        <span className="leading-relaxed">{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-6 mt-6 border-t border-slate-200/80">
                  <button
                    type="button"
                    onClick={() => handleSelectPackageAndScroll(pkg.amountNum)}
                    className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-xs bg-slate-900 hover:bg-slate-800 text-white transition-all shadow-sm"
                  >
                    <span>Contribute {pkg.name} ({pkg.amount})</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </article>
            ))}
          </div>

          {/* Wellwisher Tier Banner */}
          <div className="rounded-2xl border border-pink-200 bg-white p-5 sm:flex sm:items-center sm:justify-between sm:gap-6 shadow-xs">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-slate-900 text-lg">Wellwisher — ₹5,000</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                  Special Tier
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-pink-100 text-pink-800 border border-pink-200">
                  <Gift className="w-3.5 h-3.5 text-pip-600" />
                  <span>1 Complimentary Pass</span>
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-600 leading-relaxed">
                Includes 1 complimentary event pass and official wellwisher acknowledgement. Support
                breast cancer care directly with official wellwisher recognition.
              </p>
            </div>
            <div className="mt-4 flex items-center gap-2.5 sm:mt-0 shrink-0">
              <button
                type="button"
                onClick={() => handleSelectPackageAndScroll(5000)}
                className="inline-flex items-center gap-2 rounded-xl bg-pip-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-pip-700 shadow-xs"
              >
                Contribute ₹5,000 <ArrowRight className="h-3.5 w-3.5" />
              </button>
              <a
                href="https://wa.me/918618066508?text=Hi%2C%20I%20would%20like%20to%20know%20about%20the%20Party%20In%20Pink%20Wellwisher%20package."
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100"
              >
                Inquire
              </a>
            </div>
          </div>
        </section>

        {/* SECTION 2: CONTRIBUTION FORM & SIDEBAR */}
        <section id="contribution-form" className="pt-4">
          <div className="text-center max-w-2xl mx-auto mb-8">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Contribute Online via PiP Pay
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Select an amount or specify a custom donation. You can securely pay using UPI or Direct Bank Transfer.
            </p>
          </div>

          <div className="grid lg:grid-cols-12 gap-8">
            {/* Main Form */}
            <div className="lg:col-span-8 space-y-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Amount Selection Card */}
                <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Select Donation Amount</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Choose a sponsorship/donation slab or specify your own amount.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {PRESET_AMOUNTS.map((preset) => {
                      const isSelected = !isCustom && selectedAmount === preset.amount;
                      return (
                        <button
                          key={preset.amount}
                          type="button"
                          onClick={() => handleSelectPreset(preset.amount)}
                          className={`p-4 rounded-2xl border text-left transition flex flex-col justify-between relative ${
                            isSelected
                              ? 'border-pip-600 bg-pip-50/70 ring-2 ring-pip-500/20 shadow-sm'
                              : 'border-slate-200 hover:border-slate-300 bg-white'
                          }`}
                        >
                          {preset.passes > 0 && (
                            <span className="absolute top-2.5 right-2.5 text-[10px] font-extrabold bg-pink-100 text-pink-700 px-2 py-0.5 rounded-full border border-pink-200 shadow-xs">
                              {preset.passes} Passes
                            </span>
                          )}
                          <div>
                            <div className="font-mono text-xl font-extrabold text-slate-900">
                              ₹ {preset.amount.toLocaleString('en-IN')}
                            </div>
                            <div className="text-xs font-bold text-pip-700 mt-0.5">
                              {preset.tier} Tier
                            </div>
                          </div>
                          <div className="text-[11px] font-medium text-slate-500 mt-2 line-clamp-2">
                            {preset.label}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Custom Amount Input */}
                  <div>
                    <label
                      htmlFor="customAmount"
                      className="block text-xs font-bold text-slate-700 mb-1"
                    >
                      Or Enter Custom Amount (₹)
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center font-bold text-slate-400">
                        ₹
                      </span>
                      <input
                        id="customAmount"
                        type="number"
                        min={100}
                        placeholder="e.g. 25000"
                        value={customAmount}
                        onChange={(e) => handleCustomChange(e.target.value)}
                        className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-pip-500"
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">Minimum contribution amount: ₹100</p>
                  </div>

                  {/* Dynamic Complimentary Passes Callout */}
                  {complimentaryPasses > 0 ? (
                    <div className="p-4 rounded-2xl bg-gradient-to-r from-pink-50 via-rose-50 to-pink-50 border-2 border-pink-300 text-slate-800 flex items-start gap-3 shadow-xs">
                      <div className="w-10 h-10 rounded-xl bg-pip-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                        <Gift className="w-5 h-5" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-pip-900 text-sm">
                            🎉 {complimentaryPasses} Complimentary Event Passes Included!
                          </span>
                          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-pip-600 text-white">
                            VIP Benefit
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          On payment approval, you will receive a <strong>Donation Receipt & Thank You Email</strong> along with{' '}
                          <strong>{complimentaryPasses} complimentary event passes with QR codes</strong> sent directly to your registered email!
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-pip-600 shrink-0" />
                        <span>Sponsorship tiers of ₹5,000 and above include complimentary event passes (Wellwisher: 1, Silver: 2, Gold: 5, Platinum: 7 passes).</span>
                      </span>
                    </div>
                  )}
                </div>

                {/* Donor Details Card */}
                <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                  <h3 className="text-lg font-bold text-slate-900 pb-2 border-b border-slate-100">
                    Contributor Information
                  </h3>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="donorName"
                        className="block text-xs font-bold text-slate-700 mb-1"
                      >
                        Full Name *
                      </label>
                      <input
                        id="donorName"
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="e.g. Sunita Rao"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-pip-500"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="donorEmail"
                        className="block text-xs font-bold text-slate-700 mb-1"
                      >
                        Email Address *
                      </label>
                      <input
                        id="donorEmail"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="e.g. sunita@example.com"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-pip-500"
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="donorMobile"
                        className="block text-xs font-bold text-slate-700 mb-1"
                      >
                        Mobile Number *
                      </label>
                      <input
                        id="donorMobile"
                        type="tel"
                        maxLength={10}
                        required
                        value={mobileNumber}
                        onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, ''))}
                        placeholder="e.g. 9876543210"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-pip-500"
                      />

                      <div className="mt-2">
                        <label className="flex items-center space-x-2 text-[11px] font-semibold text-slate-600 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={whatsappSame}
                            onChange={(e) => setWhatsappSame(e.target.checked)}
                            className="w-3.5 h-3.5 text-pip-600 rounded border-slate-300 focus:ring-pip-500"
                          />
                          <span>WhatsApp updates on same mobile number</span>
                        </label>
                      </div>

                      {!whatsappSame && (
                        <div className="mt-2">
                          <input
                            id="donorWhatsapp"
                            type="tel"
                            maxLength={10}
                            value={whatsappNumber}
                            onChange={(e) => setWhatsappNumber(e.target.value.replace(/\D/g, ''))}
                            placeholder="WhatsApp number"
                            className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-pip-500"
                          />
                        </div>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="donorPan"
                        className="block text-xs font-bold text-slate-700 mb-1"
                      >
                        PAN Number (Optional)
                      </label>
                      <input
                        id="donorPan"
                        type="text"
                        maxLength={10}
                        value={pan}
                        onChange={(e) => setPan(e.target.value.toUpperCase())}
                        placeholder="e.g. ABCDE1234F"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-pip-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="donorOrg" className="block text-xs font-bold text-slate-700 mb-1">
                      Club / Company / Brand Name (Optional)
                    </label>
                    <input
                      id="donorOrg"
                      type="text"
                      value={organisationName}
                      onChange={(e) => setOrganisationName(e.target.value)}
                      placeholder="e.g. Rotary Bangalore South or Acme Corp"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-pip-500"
                    />
                  </div>

                  {/* Anonymous checkbox */}
                  <div className="pt-2">
                    <label className="flex items-center space-x-2 text-xs font-semibold text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isAnonymous}
                        onChange={(e) => setIsAnonymous(e.target.checked)}
                        className="w-4 h-4 text-pip-600 rounded border-slate-300 focus:ring-pip-500"
                      />
                      <span>
                        Make my contribution anonymous on the public donor recognition board
                      </span>
                    </label>
                  </div>
                </div>

                {/* Submit CTA */}
                <button
                  type="submit"
                  disabled={loading || effectiveAmountPaise < 10000}
                  className="w-full flex items-center justify-center space-x-2 py-4 px-6 rounded-2xl bg-pip-600 hover:bg-pip-700 text-white font-bold text-base shadow-lg shadow-pip-600/30 transition disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Preparing PiP Pay...</span>
                    </>
                  ) : (
                    <>
                      <span>Proceed to Donate {formatINR(effectiveAmountPaise)}</span>
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Right Column: Tax Exemption & Passes Notice */}
            <div className="lg:col-span-4 space-y-6">
              {/* Complimentary Passes & Entry Notice */}
              <div className="p-5 bg-gradient-to-br from-pink-50 to-rose-50 rounded-3xl border border-pink-200 text-slate-800 space-y-3 text-xs shadow-xs">
                <div className="flex items-center space-x-2 font-bold text-pip-900">
                  <Gift className="w-4 h-4 text-pip-600 shrink-0" />
                  <span className="text-sm">Complimentary Passes Included</span>
                </div>
                <p className="text-slate-600 leading-relaxed">
                  Official sponsorship contributions include complimentary passes to the Party In Pink 5.0 Zumba event:
                </p>
                <div className="space-y-1.5 font-semibold text-slate-700">
                  <div className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-pink-100 shadow-xs">
                    <span>Platinum (₹20,000)</span>
                    <span className="text-pip-700 font-extrabold font-mono">7 Passes</span>
                  </div>
                  <div className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-pink-100 shadow-xs">
                    <span>Gold (₹15,000)</span>
                    <span className="text-pip-700 font-extrabold font-mono">5 Passes</span>
                  </div>
                  <div className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-pink-100 shadow-xs">
                    <span>Silver (₹10,000)</span>
                    <span className="text-pip-700 font-extrabold font-mono">2 Passes</span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed pt-1">
                  Upon payment approval, you will receive both your <strong>Donation Receipt</strong> and your <strong>Official Passes with QR codes</strong>.
                </p>
                <div className="pt-1 border-t border-pink-200/60">
                  <Link
                    to="/register"
                    className="inline-flex items-center space-x-1 font-bold text-pip-700 hover:text-pip-800"
                  >
                    <span>Looking only for individual/group tickets?</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>

              {/* 80G Tax Exemption Card */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900">80G Certificate Notice</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  The payment accounts in this online flow do not provide an 80G certificate. If you
                  require one, contact the organizing team before making any transfer.
                </p>
              </div>

              {/* Rotary Trust Info */}
              <div className="p-5 bg-slate-100 rounded-3xl border border-slate-200 text-slate-600 text-xs space-y-2">
                <div className="flex items-center space-x-1.5 font-bold text-slate-800">
                  <Building className="w-4 h-4 text-slate-500" />
                  <span>Charitable Entity</span>
                </div>
                <p className="leading-relaxed">
                  Rotaract Club of Bangalore JP Nagar (RI District 3191) conducts Party In Pink to
                  raise breast cancer awareness and funds supporting Sri Shankara Cancer Foundation.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 3: IN-KIND SUPPORT & DIRECT PARTNERSHIP */}
        <section id="inkind" className="grid gap-6 lg:grid-cols-2 pt-2">
          {/* In-Kind Contributions Card */}
          <div className="rounded-3xl border border-slate-200 bg-white p-7 sm:p-8 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-pip-50 p-2.5 text-pip-600">
                <Gift className="h-6 w-6" />
              </div>
              <h2 className="text-2xl font-extrabold text-slate-900">In-Kind Contributions</h2>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-slate-600">
              The event warmly welcomes valuable products and services that enhance participant safety, energy,
              and comfort during the Zumba fundraiser.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              {['Caps & Visors', 'Refreshments & Hydration', 'Keychains or Wristbands', 'Mementos & Trophies'].map(
                (item) => (
                  <div
                    key={item}
                    className="rounded-xl border border-pink-100 bg-pink-50/60 px-4 py-3 text-xs sm:text-sm font-bold text-slate-800 text-center"
                  >
                    {item}
                  </div>
                )
              )}
            </div>
          </div>

          {/* Partnership Contact Card */}
          <div id="contact" className="rounded-3xl bg-gradient-to-br from-pip-700 to-pink-700 p-7 sm:p-8 text-white shadow-lg flex flex-col justify-between">
            <div>
              <h2 className="text-2xl font-extrabold">Discuss a Custom Partnership</h2>
              <p className="mt-3 text-sm leading-relaxed text-pink-100">
                Connect directly with our leadership team for corporate sponsorships, CSR alignments,
                or customized brand deliverables.
              </p>
              <div className="mt-6 space-y-3 text-sm">
                <a
                  href="tel:+918618066508"
                  className="flex items-center gap-3 font-bold hover:text-pink-100 transition"
                >
                  <Phone className="h-5 w-5" />
                  <span>Rtr. Anarghya Suvin: </span>
                  <span>+91 86180 66508</span>
                </a>
                <a
                  href="mailto:rotaractjpnagar@gmail.com"
                  className="flex items-center gap-3 font-bold hover:text-pink-100 transition"
                >
                  <Mail className="h-5 w-5" /> rotaractjpnagar@gmail.com
                </a>
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-white/20 bg-white/10 p-4 text-xs leading-relaxed text-pink-50">
              <span className="font-bold">Official SBI Account (For Direct NEFT/RTGS):</span>
              <br />
              A/C Name: <strong>Rotaract Club of Bangalore JP Nagar</strong>
              <br />
              A/C No: <code>40745246360</code> • IFSC: <code>SBIN0004408</code> (SBI RBI Layout)
            </div>
          </div>
        </section>

        {/* SECTION 4: ORGANIZING LEADERSHIP TEAM */}
        <section className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="rounded-xl bg-pip-50 p-2.5 text-pip-600">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-2xl font-extrabold text-slate-900">Organizing Leadership Team</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Party In Pink 5.0 project leadership and Rotaract Club of Bangalore JP Nagar executives
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ORGANIZERS.map((person) => (
              <div key={person.name} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-slate-900 text-sm">{person.name}</p>
                  <span className="text-[10px] font-semibold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                    {person.tag}
                  </span>
                </div>
                <p className="mt-1 text-xs font-semibold text-pip-700">{person.role}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
